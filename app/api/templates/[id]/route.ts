import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/utils/auth';
import { getSupabase } from '@/lib/utils/supabase';
import { normalizeTemplateConfig } from '@/lib/utils/template';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSuperAdmin();
  } catch (res) {
    return res as NextResponse;
  }

  try {
    const { id } = await params;
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .is('org_id', null)
      .single();

    if (error) throw error;
    return NextResponse.json({
      ...data,
      config: normalizeTemplateConfig(data.config),
    });
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSuperAdmin();
  } catch (res) {
    return res as NextResponse;
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const supabase = getSupabase();
    const now = new Date().toISOString();

    if (body.is_default === true) {
      const { error: clearError } = await supabase
        .from('templates')
        .update({ is_default: false, updated_at: now })
        .is('org_id', null);
      if (clearError) throw clearError;
    }

    const patch: Record<string, unknown> = { updated_at: now };
    if (body.name !== undefined) patch.name = body.name;
    if (body.config !== undefined) {
      patch.config = normalizeTemplateConfig(body.config);
    }
    if (body.is_default !== undefined) {
      patch.is_default = Boolean(body.is_default);
    }

    const { data, error } = await supabase
      .from('templates')
      .update(patch)
      .eq('id', id)
      .is('org_id', null)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSuperAdmin();
  } catch (res) {
    return res as NextResponse;
  }

  try {
    const { id } = await params;
    const supabase = getSupabase();
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id)
      .is('org_id', null);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
