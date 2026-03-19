import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgId } from '@/lib/utils/auth';

export async function POST(req: NextRequest) {
  try {
    const orgId = await requireOrgId();
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
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

    return NextResponse.json(candidate);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('Upload error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
