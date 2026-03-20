import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgId } from '@/lib/utils/auth';
import { generateHimeoPdf } from '@/lib/services/pdf.service';
import { getTemplateConfig, sanitizePdfExportPrefix } from '@/lib/utils/template';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const orgId = await requireOrgId();
    const { id } = await params;
    const { tailoredCv, email, candidateEmail } = await req.json();
    const supabase = getSupabase();

    const { data: positioning, error: fetchError } = await supabase
      .from('positionings')
      .select('*, candidates(template_id)')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (fetchError || !positioning) throw new Error('Positioning not found');

    const cvData = tailoredCv ?? positioning.tailored_cv;
    if (!cvData) throw new Error('No tailored CV data');

    const templateConfig = await getTemplateConfig(orgId, positioning.candidates?.template_id);
    const pdfBuffer = await generateHimeoPdf(cvData, templateConfig, orgId);
    const prefix = sanitizePdfExportPrefix(templateConfig?.exportFilePrefix);
    const lastName = String(cvData.personalInfo?.lastName ?? 'candidat').replace(/[^a-zA-Z0-9_-]+/g, '_');
    const fileName = `${orgId}/${prefix}_${lastName}_positioning_${Date.now()}.pdf`;

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
      .eq('id', id)
      .eq('org_id', orgId);

    return NextResponse.json({ fileUrl });
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error('Positioning export error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
