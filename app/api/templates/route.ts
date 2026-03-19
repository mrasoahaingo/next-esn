import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgId } from '@/lib/utils/auth';
import { DEFAULT_TEMPLATE_CONFIG } from '@/lib/schema';

export async function GET() {
  try {
    const orgId = await requireOrgId();
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const orgId = await requireOrgId();
    const body = await req.json();
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('templates')
      .insert({
        name: body.name ?? 'Sans titre',
        config: body.config ?? DEFAULT_TEMPLATE_CONFIG,
        is_default: false,
        org_id: orgId,
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
