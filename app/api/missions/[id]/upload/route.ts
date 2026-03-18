import { NextRequest, NextResponse } from 'next/server';
import { start } from 'workflow/api';
import { extractCvWorkflow } from '@/workflows/extract-cv';
import { getSupabase } from '@/lib/utils/supabase';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: missionId } = await params;
    const supabase = getSupabase();

    // Verify mission exists and get job_description
    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .select('id, job_description')
      .eq('id', missionId)
      .single();

    if (missionError) throw missionError;

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files.length) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    const results: { fileName: string; candidateId: string; positioningId: string; extractionRunId: string }[] = [];
    const errors: { fileName: string; error: string }[] = [];

    for (const file of files) {
      const sanitizedName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
      const fileName = `${Date.now()}_${sanitizedName}`;

      try {
        // 1. Upload file to storage
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { error: storageError } = await supabase.storage
          .from('cv-original')
          .upload(fileName, buffer, { contentType: file.type });

        if (storageError) throw storageError;

        const { data: { publicUrl: originalFileUrl } } = supabase.storage
          .from('cv-original')
          .getPublicUrl(fileName);

        // 2. Create candidate
        const { data: candidate, error: candidateError } = await supabase
          .from('candidates')
          .insert({
            original_file_url: originalFileUrl,
            status: 'uploaded',
          })
          .select()
          .single();

        if (candidateError) throw candidateError;

        // 3. Create positioning linked to this mission
        const { data: positioning, error: positioningError } = await supabase
          .from('positionings')
          .insert({
            candidate_id: candidate.id,
            mission_id: mission.id,
            job_description: mission.job_description,
            status: 'draft',
          })
          .select()
          .single();

        if (positioningError) throw positioningError;

        // 4. Start extraction workflow immediately so positioning can wait on CV readiness
        const run = await start(extractCvWorkflow, [candidate.id, mission.job_description]);

        const { error: candidateUpdateError } = await supabase
          .from('candidates')
          .update({ workflow_run_id: run.runId, status: 'extracting' })
          .eq('id', candidate.id);

        if (candidateUpdateError) throw candidateUpdateError;

        results.push({
          fileName: file.name,
          candidateId: candidate.id,
          positioningId: positioning.id,
          extractionRunId: run.runId,
        });
      } catch (fileError) {
        errors.push({
          fileName: file.name,
          error: fileError instanceof Error ? fileError.message : 'Unknown error',
        });
      }
    }

    const status = results.length === 0 ? 500 : errors.length > 0 ? 207 : 200;
    return NextResponse.json({ results, errors }, { status });
  } catch (error) {
    console.error('Mission upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
