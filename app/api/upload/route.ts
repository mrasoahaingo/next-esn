import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const supabase = getSupabase();
    // Sanitize filename: replace spaces with underscores, remove non-alphanumeric chars except . - _
    const sanitizedName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    const fileName = `${Date.now()}_${sanitizedName}`;
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Upload to Supabase Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('cv-original')
      .upload(fileName, buffer, {
        contentType: file.type,
      });

    if (storageError) throw storageError;

    const { data: { publicUrl: originalFileUrl } } = supabase.storage
      .from('cv-original')
      .getPublicUrl(fileName);

    // 2. Create Candidate in DB
    const { data: candidate, error: dbError } = await supabase
      .from('candidates')
      .insert({
        original_file_url: originalFileUrl,
        status: 'uploaded',
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json(candidate);
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
