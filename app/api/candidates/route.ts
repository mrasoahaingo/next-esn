import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgId } from '@/lib/utils/auth';

export async function GET() {
  try {
    const orgId = await requireOrgId();
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('candidates')
      .select('id, status, extracted_data, created_at, original_file_url')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
