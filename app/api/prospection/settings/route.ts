import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgAdmin, requireOrgId } from '@/lib/utils/auth';
import { getProspectionSettings } from '@/lib/prospection/settings';
import { prospectionSettingsPutSchema } from '@/lib/validation/prospection-settings';

/** Seuil de chaleur de l'org (lisible par tout membre). Sans ligne : défaut 60, rien n'est créé. */
export async function GET() {
  try {
    const orgId = await requireOrgId();
    return NextResponse.json(await getProspectionSettings(orgId));
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    const message = (error as Error).message;
    console.error('GET /api/prospection/settings:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Enregistre le seuil (admin d'org uniquement). L'org_id vient toujours de la session Clerk. */
export async function PUT(req: NextRequest) {
  try {
    // Autorisation avant toute lecture du corps.
    const { orgId } = await requireOrgAdmin();

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
    }

    const parsed = prospectionSettingsPutSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { data, error } = await getSupabase()
      .from('prospection_settings')
      .upsert(
        {
          org_id: orgId,
          heat_threshold: parsed.data.heat_threshold,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'org_id' },
      )
      .select('org_id, heat_threshold, updated_at')
      .single();

    if (error) throw error;

    return NextResponse.json({
      heat_threshold: data.heat_threshold,
      is_default: false,
      updated_at: data.updated_at,
    });
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    const message = (error as Error).message;
    console.error('PUT /api/prospection/settings:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
