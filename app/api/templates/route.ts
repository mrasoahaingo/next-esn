import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_TEMPLATE_CONFIG } from '@/lib/schema';
import { requireSuperAdmin } from '@/lib/utils/auth';
import { getSupabase } from '@/lib/utils/supabase';
import { normalizeTemplateConfig } from '@/lib/utils/template';

/** Liste tous les gabarits globaux (pour l’éditeur super_admin + prévisualisation). */
export async function GET() {
  try {
    await requireSuperAdmin();
  } catch (res) {
    return res as NextResponse;
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .is('org_id', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(
      (data ?? []).map((template) => ({
        ...template,
        config: normalizeTemplateConfig(template.config),
      })),
    );
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();
  } catch (res) {
    return res as NextResponse;
  }

  try {
    const body = await req.json();
    const supabase = getSupabase();
    const config = normalizeTemplateConfig(body.config ?? DEFAULT_TEMPLATE_CONFIG);

    const { data, error } = await supabase
      .from('templates')
      .insert({
        name: body.name ?? 'Sans titre',
        config,
        is_default: false,
        org_id: null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
