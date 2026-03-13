import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { generateHimeoPdf } from '@/lib/services/pdf.service';

export async function POST(req: NextRequest) {
  try {
    const { candidateId, data } = await req.json();
    const supabase = getSupabase();

    if (data) {
      const { error: updateError } = await supabase
        .from('candidates')
        .update({ extracted_data: data })
        .eq('id', candidateId);

      if (updateError) throw updateError;
    }

    const pdfBuffer = await generateHimeoPdf(data);
    const fileName = `HIMEO_CV_${data.personalInfo.lastName}_${Date.now()}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('cv-formatted')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl: formattedFileUrl } } = supabase.storage
      .from('cv-formatted')
      .getPublicUrl(fileName);

    const { data: updatedCandidate, error: finalUpdateError } = await supabase
      .from('candidates')
      .update({
        formatted_file_url: formattedFileUrl,
        status: 'generated',
      })
      .eq('id', candidateId)
      .select()
      .single();

    if (finalUpdateError) throw finalUpdateError;

    return NextResponse.json(updatedCandidate);
  } catch (error: unknown) {
    console.error('Generation error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
