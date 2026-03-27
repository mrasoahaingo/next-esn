import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgId, requireOrgAdmin } from '@/lib/utils/auth';
import { organizationSettingsPatchSchema } from '@/lib/validation/org-settings';
import { patchMatchingWeights } from '@/lib/config/matching-weights';

function emptyToNull(v: string | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  const t = v.trim();
  return t === '' ? null : t;
}

export async function GET() {
  try {
    const orgId = await requireOrgId();
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('organization_settings')
      .select('*')
      .eq('org_id', orgId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({
        org_id: orgId,
        display_name: '',
        contact_email: null,
        website_url: null,
        app_logo_url: null,
        default_template_id: null,
        positioning_brand_context: null,
        matching_weights: null,
        extra: {},
        created_at: null,
        updated_at: null,
      });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { orgId } = await requireOrgAdmin();
    const json = await req.json();
    const parsed = organizationSettingsPatchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const p = parsed.data;
    const patch: Record<string, unknown> = {
      org_id: orgId,
      updated_at: new Date().toISOString(),
    };

    if (p.display_name !== undefined) patch.display_name = p.display_name.trim();
    if (p.contact_email !== undefined) patch.contact_email = emptyToNull(p.contact_email);
    if (p.website_url !== undefined) patch.website_url = emptyToNull(p.website_url);
    if (p.app_logo_url !== undefined) patch.app_logo_url = emptyToNull(p.app_logo_url);
    if (p.positioning_brand_context !== undefined) {
      patch.positioning_brand_context = emptyToNull(p.positioning_brand_context);
    }

    const supabase = getSupabase();
    const { data: existing } = await supabase
      .from('organization_settings')
      .select('*')
      .eq('org_id', orgId)
      .maybeSingle();

    if (p.matching_weights === null) {
      patch.matching_weights = null;
    } else if (p.matching_weights !== undefined) {
      patch.matching_weights = patchMatchingWeights(
        existing?.matching_weights ?? null,
        p.matching_weights,
      );
    }

    const base = existing ?? {
      org_id: orgId,
      display_name: '',
      contact_email: null,
      website_url: null,
      app_logo_url: null,
      default_template_id: null,
      positioning_brand_context: null,
      matching_weights: null,
      extra: {},
    };

    const merged = {
      ...base,
      ...patch,
      org_id: orgId,
      extra: base.extra ?? {},
    };

    const { data, error } = await supabase
      .from('organization_settings')
      .upsert(merged, { onConflict: 'org_id' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
