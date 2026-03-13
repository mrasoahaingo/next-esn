import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';

export async function GET() {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('candidates')
      .select('id, status, extracted_data, created_at, original_file_url')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
