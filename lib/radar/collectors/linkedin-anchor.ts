import Anchorbrowser from 'anchorbrowser';
import { z } from 'zod';

// ─── Config ───────────────────────────────────────────────────────────────────

const LINKEDIN_IDENTITY_ID = 'd979c4f3-8809-4001-b5e5-ee1253a720e2';
const PROFILES_TO_SCRAPE = 5;
const SEARCH_URL =
  'https://www.linkedin.com/search/results/people/?keywords=freelance+d%C3%A9veloppeur+paris&origin=GLOBAL_SEARCH_HEADER';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const ProfileUrlsSchema = z.object({
  profiles: z
    .array(
      z.object({
        name: z.string(),
        profileUrl: z.string(),
      }),
    )
    .default([]),
});

const ProfileCompanySchema = z.object({
  name: z.string(),
  headline: z.string().optional(),
  currentCompanyName: z.string().nullish(),
  currentCompanyUrl: z.string().nullish(),
});

const EmployeeCountSchema = z.object({
  count: z.number(),
});

export type ProfileCompany = z.infer<typeof ProfileCompanySchema>;
export type CompanyStats = {
  companyName: string;
  companyUrl: string;
  totalEmployees: number;
  freelanceCount: number;
  freelanceRatio: number;
};
export type FreelanceParisEntry = ProfileCompany & { companyStats: CompanyStats | null };

// ─── JSON Schemas pour output_schema ─────────────────────────────────────────

const OUTPUT_SCHEMA_PROFILES = {
  type: 'object',
  properties: {
    profiles: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          profileUrl: { type: 'string' },
        },
        required: ['name', 'profileUrl'],
      },
    },
  },
  required: ['profiles'],
};

const OUTPUT_SCHEMA_PROFILE_COMPANY = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    headline: { type: 'string' },
    currentCompanyName: { type: 'string' },
    currentCompanyUrl: {
      type: 'string',
      description: "URL LinkedIn de la page entreprise (format https://www.linkedin.com/company/...)",
    },
  },
  required: ['name'],
};

const OUTPUT_SCHEMA_EMPLOYEE_COUNT = {
  type: 'object',
  properties: {
    count: { type: 'number' },
  },
  required: ['count'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(event: string, payload: Record<string, unknown>) {
  console.info('[anchor][linkedin]', event, payload);
}

// ─── Collecte via Anchor Browser tools.performWebTask ────────────────────────

export async function collectParisFreelanceData(): Promise<FreelanceParisEntry[]> {
  if (!process.env.ANCHOR_API_KEY) throw new Error('ANCHOR_API_KEY manquant');

  const anchorClient = new Anchorbrowser({ apiKey: process.env.ANCHOR_API_KEY });

  // 1. Créer la session Anchor Browser avec l'identité LinkedIn authentifiée
  log('session_creating', { identityId: LINKEDIN_IDENTITY_ID });
  let anchorSession;
  try {
    anchorSession = await anchorClient.sessions.create({
      session: {
        proxy: { active: true },
      },
      browser: {
        captcha_solver: { active: true },
        extra_stealth: { active: true },
      },
      identities: [{ id: LINKEDIN_IDENTITY_ID }],
    });
  } catch (err) {
    throw new Error(`Anchor sessions.create échoué : ${String(err)}`);
  }

  const sessionId = anchorSession.data?.id;
  if (!sessionId) {
    throw new Error(
      `Anchor Browser : session manquante — réponse : ${JSON.stringify(anchorSession)}`,
    );
  }
  log('session_created', { sessionId });

  const results: FreelanceParisEntry[] = [];

  try {
    // ── Étape 1 : récupérer les profils depuis la page de recherche ───────────

    log('task_profiles_start', { url: SEARCH_URL });
    const searchResponse = await anchorClient.tools.performWebTask({
      sessionId,
      url: SEARCH_URL,
      prompt: `Extrais les ${PROFILES_TO_SCRAPE} premiers profils visibles : nom complet et URL exacte du profil LinkedIn (format https://www.linkedin.com/in/...).`,
      output_schema: OUTPUT_SCHEMA_PROFILES,
      detect_elements: true,
    });

    const searchParsed = ProfileUrlsSchema.safeParse(searchResponse.data?.result);
    if (!searchParsed.success) {
      console.warn('[anchor][linkedin] parse profiles failed', searchParsed.error.flatten());
      return [];
    }

    const profiles = searchParsed.data.profiles.slice(0, PROFILES_TO_SCRAPE);
    log('profiles_found', { count: profiles.length });

    // ── Étapes 2 + 3 : Pour chaque profil → entreprise → onglet Personnes ────

    for (const { name, profileUrl } of profiles) {
      log('profile_visiting', { name, profileUrl });

      // Étape 2 : extraire les infos du profil + URL entreprise
      const profileResponse = await anchorClient.tools.performWebTask({
        sessionId,
        url: profileUrl,
        prompt: `Sur ce profil LinkedIn, extrais : nom de la personne, headline, nom de l'entreprise actuelle et URL LinkedIn de la page de cette entreprise (format https://www.linkedin.com/company/...).`,
        output_schema: OUTPUT_SCHEMA_PROFILE_COMPANY,
        detect_elements: true,
      });

      const profileParsed = ProfileCompanySchema.safeParse(profileResponse.data?.result);
      const profile = profileParsed.success
        ? profileParsed.data
        : { name, headline: undefined, currentCompanyName: undefined, currentCompanyUrl: undefined };

      log('profile_extracted', {
        name: profile.name,
        company: profile.currentCompanyName ?? '(inconnu)',
        companyUrl: profile.currentCompanyUrl ?? '(manquant)',
      });

      if (!profile.currentCompanyUrl) {
        log('company_url_missing', { name: profile.name });
        results.push({ ...profile, companyStats: null });
        continue;
      }

      const companyPageUrl = profile.currentCompanyUrl.replace(/\/$/, '');

      // Étape 3a : /people → nombre total d'employés
      const totalResponse = await anchorClient.tools.performWebTask({
        sessionId,
        url: `${companyPageUrl}/people`,
        prompt: `Extrais le nombre total d'employés (membres associés) affiché sur cette page.`,
        output_schema: OUTPUT_SCHEMA_EMPLOYEE_COUNT,
      });
      const totalParsed = EmployeeCountSchema.safeParse(totalResponse.data?.result);
      const totalEmployees = totalParsed.success ? totalParsed.data.count : 0;

      // Étape 3b : /people?keywords=freelance → nombre de freelances
      const freelanceResponse = await anchorClient.tools.performWebTask({
        sessionId,
        url: `${companyPageUrl}/people?keywords=freelance`,
        prompt: `Extrais le nombre de résultats affichés sur cette page (nombre de profils trouvés pour "freelance").`,
        output_schema: OUTPUT_SCHEMA_EMPLOYEE_COUNT,
      });
      const freelanceParsed = EmployeeCountSchema.safeParse(freelanceResponse.data?.result);
      const freelanceCount = freelanceParsed.success ? freelanceParsed.data.count : 0;

      const companyStats: CompanyStats = {
        companyName: profile.currentCompanyName ?? '',
        companyUrl: companyPageUrl,
        totalEmployees,
        freelanceCount,
        freelanceRatio: totalEmployees > 0 ? Math.round((freelanceCount / totalEmployees) * 100) : 0,
      };

      log('company_analyzed', {
        company: profile.currentCompanyName,
        totalEmployees,
        freelanceCount,
        freelanceRatio: companyStats.freelanceRatio,
      });

      results.push({ ...profile, companyStats });
    }
  } finally {
    await anchorClient.sessions.delete(sessionId).catch((err) =>
      console.error('[anchor][linkedin] session.delete error', err),
    );
    log('session_closed', { sessionId });
  }

  return results;
}
