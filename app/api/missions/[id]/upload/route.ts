import { NextRequest, NextResponse } from 'next/server';
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

    const results: { candidateId: string; positioningId: string }[] = [];

    for (const file of files) {
      // 1. Upload file to storage
      const sanitizedName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
      const fileName = `${Date.now()}_${sanitizedName}`;
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

      results.push({ candidateId: candidate.id, positioningId: positioning.id });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Mission upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
