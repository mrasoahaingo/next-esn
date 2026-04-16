import { collectParisFreelanceData } from '@/lib/radar/collectors/linkedin-anchor';

// ─── Step unique ──────────────────────────────────────────────────────────────
// Pas de throw — si une erreur survient elle est retournée dans le résultat.
// Cela empêche le runtime de retenter le step et d'ouvrir de nouvelles sessions.

async function runFreelanceParisAnalysis() {
  'use step';

  try {
    const freelancers = await collectParisFreelanceData();

    return {
      ok: true as const,
      scrapedAt: new Date().toISOString(),
      count: freelancers.length,
      freelancers,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[freelance-paris] step error (no retry):', message);
    return { ok: false as const, error: message, scrapedAt: new Date().toISOString() };
  }
}

// ─── Workflow ─────────────────────────────────────────────────────────────────

export async function freelanceParisWorkflow() {
  'use workflow';

  return runFreelanceParisAnalysis();
}
