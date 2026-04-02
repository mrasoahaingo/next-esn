import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import postgres from 'postgres';

async function migrate() {
  const dbUrl = process.env.SUPABASE_MIGRATION_URL;
  if (!dbUrl) {
    console.log('[migrate] SUPABASE_MIGRATION_URL not set, skipping');
    return;
  }

  const sql = postgres(dbUrl, { ssl: 'require', max: 1 });

  try {
    const applied = await sql<{ version: string }[]>`
      SELECT version FROM supabase_migrations.schema_migrations ORDER BY version
    `;
    const appliedSet = new Set(applied.map((r) => r.version));

    const dir = join(process.cwd(), 'supabase/migrations');
    const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
    const pending = files.filter((f) => !appliedSet.has(f.replace('.sql', '')));

    if (pending.length === 0) {
      console.log('[migrate] No pending migrations');
      return;
    }

    console.log(`[migrate] ${pending.length} migration(s) to apply`);

    for (const file of pending) {
      const version = file.replace('.sql', '');
      const content = await readFile(join(dir, file), 'utf-8');
      console.log(`[migrate] Applying ${file}...`);
      await sql.unsafe(content);
      await sql`
        INSERT INTO supabase_migrations.schema_migrations (version)
        VALUES (${version})
        ON CONFLICT DO NOTHING
      `;
      console.log(`[migrate] ✓ ${file}`);
    }

    console.log('[migrate] Done');
  } finally {
    await sql.end();
  }
}

migrate().catch((err) => {
  console.error('[migrate] Error:', err);
  process.exit(1);
});
