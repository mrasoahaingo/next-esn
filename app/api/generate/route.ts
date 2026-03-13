import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { generateHimeoDocx } from '@/lib/services/docx.service';

export async function POST(req: NextRequest) {
  try {
    const { candidateId, data } = await req.json();
    const supabase = getSupabase();

    // If data is provided, update the candidate first
    if (data) {
      const { error: updateError } = await supabase
        .from('candidates')
        .update({ extracted_data: data })
        .eq('id', candidateId);
      
      if (updateError) throw updateError;
    }

    // Get candidate (to get names etc if not in data, or just to be safe)
    // Actually if data is provided we have it. But we need names for filename.
    // Let's assume data is complete ExtractedCV.
    
    // Generate buffer
    const docBuffer = await generateHimeoDocx(data);
    const fileName = `HIMEO_CV_${data.personalInfo.lastName}_${Date.now()}.docx`;

    // Upload to formatted bucket
    const { error: uploadError } = await supabase.storage
      .from('cv-formatted')
      .upload(fileName, docBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl: formattedFileUrl } } = supabase.storage
      .from('cv-formatted')
      .getPublicUrl(fileName);

    // Update candidate status and url
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
  } catch (error: any) {
    console.error('Generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
