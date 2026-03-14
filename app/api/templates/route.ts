import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { DEFAULT_TEMPLATE_CONFIG } from '@/lib/schema';

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('templates')
      .insert({
        name: body.name ?? 'Sans titre',
        config: body.config ?? DEFAULT_TEMPLATE_CONFIG,
        is_default: false,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
