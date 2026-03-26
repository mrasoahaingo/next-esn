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

export async function POST(req: NextRequest) {
  try {
    const orgId = await requireOrgId();
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 50 MB)' }, { status: 413 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const supabase = getSupabase();
    const sanitizedName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    const fileName = `${orgId}/${Date.now()}_${sanitizedName}`;
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: storageError } = await supabase.storage
      .from('cv-original')
      .upload(fileName, buffer, {
        contentType: file.type,
      });

    if (storageError) throw storageError;

    const { data: { publicUrl: originalFileUrl } } = supabase.storage
      .from('cv-original')
      .getPublicUrl(fileName);

    const { data: candidate, error: dbError } = await supabase
      .from('candidates')
      .insert({
        original_file_url: originalFileUrl,
        status: 'uploaded',
        org_id: orgId,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    const run = await start(extractCvWorkflow, [candidate.id]);

    const { error: candidateUpdateError } = await supabase
      .from('candidates')
      .update({ workflow_run_id: run.runId, status: 'extracting' })
      .eq('id', candidate.id);

    if (candidateUpdateError) throw candidateUpdateError;

    const { data: refreshed, error: refreshError } = await supabase
      .from('candidates')
      .select()
      .eq('id', candidate.id)
      .single();

    if (refreshError) throw refreshError;

    return NextResponse.json(refreshed);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('Upload error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
