import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgId } from '@/lib/utils/auth';
import { generateCvPdf } from '@/lib/services/pdf.service';
import { getTemplateConfig, sanitizePdfExportPrefix } from '@/lib/utils/template';
import { logSupabaseWriteError } from '@/lib/utils/supabase-write-error';

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
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (fetchError || !positioning) throw new Error('Positioning not found');

    const cvData = tailoredCv ?? positioning.tailored_cv;
    if (!cvData) throw new Error('No tailored CV data');

    const templateConfig = await getTemplateConfig(orgId, undefined);
    const pdfBuffer = await generateCvPdf(cvData, templateConfig);
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

    // supabase-js ne lève pas : sans lire `{ error }`, un échec d'écriture renverrait une URL
    // de PDF que plus aucune ligne ne référence — un faux succès indiscernable d'un vrai.
    const { error: updateError } = await supabase
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

    if (updateError) {
      logSupabaseWriteError({
        table: 'positionings',
        recordId: id,
        operation: 'positioning.export.update',
        supabaseError: updateError,
      });

      // PDF orphelin : le fichier est uploadé et son URL calculée, mais aucune ligne ne la
      // référencera. On préfère le supprimer — un nouvel export le regénère à l'identique —
      // plutôt que de laisser s'accumuler dans le bucket des fichiers qu'aucune ligne ne
      // référence et qu'aucun écran ne permet de purger. L'échec du nettoyage est lui-même
      // logué mais ne doit jamais masquer l'erreur d'écriture initiale.
      const { error: cleanupError } = await supabase.storage
        .from('cv-formatted')
        .remove([fileName]);

      if (cleanupError) {
        logSupabaseWriteError({
          table: 'storage:cv-formatted',
          recordId: fileName,
          operation: 'positioning.export.orphan-cleanup',
          supabaseError: cleanupError,
        });
      }

      // Le catch du handler transforme déjà ce throw en 500 portant ce message.
      throw new Error("Échec de l'enregistrement de l'export : " + updateError.message);
    }

    return NextResponse.json({ fileUrl });
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error('Positioning export error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
