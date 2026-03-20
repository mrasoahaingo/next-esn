import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgAdmin } from '@/lib/utils/auth';

const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
const MAX_BYTES = 2 * 1024 * 1024;

function extForMime(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/svg+xml') return 'svg';
  return 'bin';
}

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireOrgAdmin();
    const form = await req.formData();
    const file = form.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
    }

    const mime = file.type || 'application/octet-stream';
    if (!ALLOWED.has(mime)) {
      return NextResponse.json({ error: 'Format non supporté (PNG, JPEG, WebP, SVG)' }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 2 Mo)' }, { status: 400 });
    }

    const supabase = getSupabase();
    const path = `${orgId}/app-logo-${Date.now()}.${extForMime(mime)}`;
    const { error: upErr } = await supabase.storage.from('org-branding').upload(path, buf, {
      contentType: mime,
      upsert: true,
    });
    if (upErr) throw upErr;

    const {
      data: { publicUrl },
    } = supabase.storage.from('org-branding').getPublicUrl(path);

    const { data: existing } = await supabase
      .from('organization_settings')
      .select('*')
      .eq('org_id', orgId)
      .maybeSingle();

    let row;
    if (existing) {
      const { data, error: dbErr } = await supabase
        .from('organization_settings')
        .update({
          app_logo_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('org_id', orgId)
        .select()
        .single();
      if (dbErr) throw dbErr;
      row = data;
    } else {
      const { data, error: dbErr } = await supabase
        .from('organization_settings')
        .insert({
          org_id: orgId,
          display_name: '',
          app_logo_url: publicUrl,
        })
        .select()
        .single();
      if (dbErr) throw dbErr;
      row = data;
    }

    return NextResponse.json({ url: publicUrl, settings: row });
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error('Org logo upload error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
