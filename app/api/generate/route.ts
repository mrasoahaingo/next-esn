import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgId } from '@/lib/utils/auth';
import { generateHimeoPdf } from '@/lib/services/pdf.service';
import { getTemplateConfig, sanitizePdfExportPrefix } from '@/lib/utils/template';

const generateSchema = z.object({
  candidateId: z.string().uuid(),
  data: z.record(z.string(), z.unknown()),
});

export async function POST(req: NextRequest) {
  try {
    const orgId = await requireOrgId();
    const parsed = generateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { candidateId, data } = parsed.data;
    const supabase = getSupabase();

    if (data) {
      const { error: updateError } = await supabase
        .from('candidates')
        .update({ extracted_data: data })
        .eq('id', candidateId)
        .eq('org_id', orgId);

      if (updateError) throw updateError;
    }

    const { data: candidate } = await supabase
      .from('candidates')
      .select('template_id')
      .eq('id', candidateId)
      .eq('org_id', orgId)
      .single();

    const templateConfig = await getTemplateConfig(orgId, candidate?.template_id);
    const pdfBuffer = await generateHimeoPdf(data, templateConfig, orgId);
    const prefix = sanitizePdfExportPrefix(templateConfig?.exportFilePrefix);
    const personalInfo = data.personalInfo as Record<string, unknown> | undefined;
    const safeLast = String(personalInfo?.lastName ?? 'cv').replace(/[^a-zA-Z0-9_-]+/g, '_');
    const fileName = `${orgId}/${prefix}_${safeLast}_${Date.now()}.pdf`;

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
      .eq('org_id', orgId)
      .select()
      .single();

    if (finalUpdateError) throw finalUpdateError;

    return NextResponse.json(updatedCandidate);
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error('Generation error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
