import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSuperAdmin } from '@/lib/utils/auth';
import { getSupabase } from '@/lib/utils/supabase';
import { CV_CODE_TEMPLATE_IDS, isCvCodeTemplateId } from '@/templates/registry';

const bodySchema = z.object({
  cvCodeTemplate: z
    .string()
    .min(1)
    .transform((s) => s.trim())
    .refine(isCvCodeTemplateId, {
      message: `Template inconnu. Valeurs autorisées : ${CV_CODE_TEMPLATE_IDS.join(', ')}`,
    }),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    await requireSuperAdmin();
  } catch (res) {
    return res as NextResponse;
  }

  try {
    const { orgId } = await params;
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { cvCodeTemplate } = parsed.data;
    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from('organization_settings')
      .select('*')
      .eq('org_id', orgId)
      .maybeSingle();

    const base = existing ?? {
      org_id: orgId,
      display_name: '',
      contact_email: null,
      website_url: null,
      app_logo_url: null,
      positioning_brand_context: null,
      cv_code_template: 'himeo',
      extra: {},
    };

    const merged = {
      ...base,
      org_id: orgId,
      cv_code_template: cvCodeTemplate,
      updated_at: new Date().toISOString(),
      extra: base.extra ?? {},
    };

    const { data, error } = await supabase
      .from('organization_settings')
      .upsert(merged, { onConflict: 'org_id' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, organizationSettings: data });
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error('Admin cv-code-template PATCH:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
