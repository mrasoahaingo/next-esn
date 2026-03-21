import { NextRequest, NextResponse } from 'next/server';
import { start } from 'workflow/api';
import { extractCvWorkflow } from '@/workflows/extract-cv';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgId } from '@/lib/utils/auth';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const orgId = await requireOrgId();
    const { id: missionId } = await params;
    const supabase = getSupabase();

    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .select('id, job_description')
      .eq('id', missionId)
      .eq('org_id', orgId)
      .single();

    if (missionError) throw missionError;

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files.length) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `File "${file.name}" too large (max 50 MB)` }, { status: 413 });
      }
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json({ error: `File "${file.name}" has invalid type` }, { status: 400 });
      }
    }

    const outcomes = await Promise.all(
      files.map(async (file) => {
        const sanitizedName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
        const fileName = `${orgId}/${Date.now()}_${sanitizedName}`;

        try {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          const { error: storageError } = await supabase.storage
            .from('cv-original')
            .upload(fileName, buffer, { contentType: file.type });

          if (storageError) throw storageError;

          const { data: { publicUrl: originalFileUrl } } = supabase.storage
            .from('cv-original')
            .getPublicUrl(fileName);

          const { data: candidate, error: candidateError } = await supabase
            .from('candidates')
            .insert({
              original_file_url: originalFileUrl,
              status: 'uploaded',
              org_id: orgId,
            })
            .select()
            .single();

          if (candidateError) throw candidateError;

          const { data: positioning, error: positioningError } = await supabase
            .from('positionings')
            .insert({
              candidate_id: candidate.id,
              mission_id: mission.id,
              job_description: mission.job_description,
              status: 'draft',
              org_id: orgId,
              added_via: 'cv_upload',
            })
            .select()
            .single();

          if (positioningError) throw positioningError;

          const run = await start(extractCvWorkflow, [candidate.id, mission.job_description]);

          const { error: candidateUpdateError } = await supabase
            .from('candidates')
            .update({ workflow_run_id: run.runId, status: 'extracting' })
            .eq('id', candidate.id);

          if (candidateUpdateError) throw candidateUpdateError;

          return {
            ok: true as const,
            result: {
              fileName: file.name,
              candidateId: candidate.id,
              positioningId: positioning.id,
              extractionRunId: run.runId,
            },
          };
        } catch (fileError) {
          return {
            ok: false as const,
            error: {
              fileName: file.name,
              error: fileError instanceof Error ? fileError.message : 'Unknown error',
            },
          };
        }
      }),
    );

    const results = outcomes.filter((o) => o.ok).map((o) => o.result);
    const errors = outcomes.filter((o) => !o.ok).map((o) => o.error);

    const status = results.length === 0 ? 500 : errors.length > 0 ? 207 : 200;
    return NextResponse.json({ results, errors }, { status });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('Mission upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
