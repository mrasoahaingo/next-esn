import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { generateHimeoPdf } from '@/lib/services/pdf.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { tailoredCv, email, candidateEmail } = await req.json();
    const supabase = getSupabase();

    const { data: positioning, error: fetchError } = await supabase
      .from('positionings')
      .select('*, candidates(*)')
      .eq('id', id)
      .single();

    if (fetchError || !positioning) throw new Error('Positioning not found');

    const cvData = tailoredCv ?? positioning.tailored_cv;
    if (!cvData) throw new Error('No tailored CV data');

    const pdfBuffer = await generateHimeoPdf(cvData);
    const lastName = cvData.personalInfo?.lastName ?? 'candidat';
    const fileName = `HIMEO_CV_${lastName}_positioning_${Date.now()}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('cv-formatted')
      .upload(fileName, pdfBuffer, { contentType: 'application/pdf' });

    if (uploadError) throw uploadError;

    const { data: { publicUrl: fileUrl } } = supabase.storage
      .from('cv-formatted')
      .getPublicUrl(fileName);

    await supabase
      .from('positionings')
      .update({
        tailored_cv: cvData,
        email: email ?? positioning.email,
        candidate_email: candidateEmail ?? positioning.candidate_email,
        tailored_file_url: fileUrl,
        status: 'exported',
      })
      .eq('id', id);

    return NextResponse.json({ fileUrl });
  } catch (error: unknown) {
    console.error('Positioning export error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
