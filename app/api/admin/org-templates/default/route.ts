import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSuperAdmin } from '@/lib/utils/auth';
import { getSupabase } from '@/lib/utils/supabase';

const bodySchema = z.object({
  orgId: z.string().min(1),
  templateId: z.string().uuid(),
});

/**
 * Définit le gabarit PDF par défaut pour une organisation (super_admin).
 * Stocké dans `organization_settings.default_template_id` (gabarits globaux dans `templates`).
 */
export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();
  } catch (res) {
    return res as NextResponse;
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { orgId, templateId } = parsed.data;
  const supabase = getSupabase();

  const { data: tmpl, error: fetchError } = await supabase
    .from('templates')
    .select('id')
    .eq('id', templateId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!tmpl) {
    return NextResponse.json({ error: 'Gabarit introuvable' }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from('organization_settings')
    .select('*')
    .eq('org_id', orgId)
    .maybeSingle();

  const now = new Date().toISOString();

  if (existing) {
    const { error: upErr } = await supabase
      .from('organization_settings')
      .update({
        default_template_id: templateId,
        updated_at: now,
      })
      .eq('org_id', orgId);
    if (upErr) throw upErr;
  } else {
    const { error: insErr } = await supabase.from('organization_settings').insert({
      org_id: orgId,
      display_name: '',
      contact_email: null,
      website_url: null,
      app_logo_url: null,
      positioning_brand_context: null,
      matching_weights: null,
      extra: {},
      default_template_id: templateId,
      updated_at: now,
    });
    if (insErr) throw insErr;
  }

  return NextResponse.json({ ok: true });
}
