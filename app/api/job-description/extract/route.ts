import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgId } from '@/lib/utils/auth';
import { extractJobPostingTextFromFile } from '@/lib/services/job-posting-text-extract.service';

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

export async function POST(req: NextRequest) {
  try {
    const orgId = await requireOrgId();
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 50 Mo)' }, { status: 413 });
    }

    const nameLower = file.name.toLowerCase();
    const isPlainText =
      nameLower.endsWith('.txt') ||
      file.type === 'text/plain' ||
      file.type.startsWith('text/plain;');

    if (!isPlainText && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non autorisé (PDF, Word ou .txt)' },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (isPlainText) {
      const text = buffer.toString('utf8').trim();
      if (!text) {
        return NextResponse.json({ error: 'Fichier texte vide' }, { status: 400 });
      }
      return NextResponse.json({ text });
    }

    const supabase = getSupabase();

    const { text } = await extractJobPostingTextFromFile(supabase, {
      buffer,
      fileName: file.name,
      mimeType: file.type,
      orgId,
    });

    if (!text.trim()) {
      return NextResponse.json({ error: 'Texte extrait vide' }, { status: 400 });
    }

    return NextResponse.json({ text });
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error('Job description extract error:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
