import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('positionings')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Get positioning error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('positionings')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Update positioning error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
