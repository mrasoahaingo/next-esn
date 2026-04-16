import { z, ZodSchema } from 'zod';

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = 'https://enrichlayer.com';
const PAGE_SIZE = 5;

// ─── Schemas ──────────────────────────────────────────────────────────────────

const PersonSearchResponseSchema = z.object({
  results: z
    .array(
      z.object({
        linkedin_profile_url: z.string(),
        profile: z
          .object({
            full_name: z.string().optional(),
            headline: z.string().optional(),
          })
          .nullish(),
      }),
    )
    .default([]),
  total_result_count: z.number().optional(),
});

const PersonProfileResponseSchema = z.object({
  full_name: z.string().optional(),
  headline: z.string().optional(),
  experiences: z
    .array(
      z.object({
        company: z.string().nullish(),
        company_linkedin_profile_url: z.string().nullish(),
        ends_at: z.unknown().nullish(),
      }),
    )
    .default([]),
});

const CompanyProfileResponseSchema = z.object({
  name: z.string().optional(),
});

// Enrichlayer retourne estimated_employee_count et verified_employee_count (pas "count")
const EmployeeCountResponseSchema = z.object({
  estimated_employee_count: z.number().optional(),
  verified_employee_count: z.number().optional(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProfileCompany = {
  name: string;
  headline?: string;
  currentCompanyName?: string | null;
  currentCompanyUrl?: string | null;
};

export type CompanyStats = {
  companyName: string;
  companyUrl: string;
  totalEmployees: number;
  freelanceCount: number;
  freelanceRatio: number;
};

export type FreelanceParisEntry = ProfileCompany & { companyStats: CompanyStats | null };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(event: string, payload: Record<string, unknown>) {
  console.info('[enrichlayer][linkedin]', event, payload);
}

async function enrichlayerFetch<T>(
  path: string,
  params: Record<string, string>,
  schema: ZodSchema<T>,
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const headers = {
    Authorization: `Bearer ${process.env.ENRICHLAYER_API_KEY}`,
  };

  const response = await fetch(url.toString(), { headers });
  const body = await response.text();

  console.info('[enrichlayer] response', {
    path,
    status: response.status,
    body: body.slice(0, 500),
  });

  if (!response.ok) {
    throw new Error(`Enrichlayer ${path} failed (${response.status}): ${body}`);
  }

  const json: unknown = JSON.parse(body);
  return schema.parse(json);
}

// ─── Collecte complète via API Proxycurl ──────────────────────────────────────

export async function collectParisFreelanceData(): Promise<FreelanceParisEntry[]> {
  if (!process.env.ENRICHLAYER_API_KEY) throw new Error('ENRICHLAYER_API_KEY manquant');

  // Étape 1 — Person Search : freelances à Paris
  const searchResponse = await enrichlayerFetch(
    '/api/v2/search/person',
    { country: 'FR', city: 'Paris', headline: 'freelance développeur', page_size: String(PAGE_SIZE) },
    PersonSearchResponseSchema,
  );

  log('profiles_found', { count: searchResponse.results.length });

  const results: FreelanceParisEntry[] = [];

  // Étape 2 — Pour chaque profil trouvé
  for (const result of searchResponse.results) {
    try {
      const profileResponse = await enrichlayerFetch(
        '/api/v2/profile',
        { profile_url: result.linkedin_profile_url },
        PersonProfileResponseSchema,
      );

      // Trouver le poste actuel (ends_at null ou undefined)
      const currentExperience = profileResponse.experiences.find(
        (exp) => exp.ends_at === null || exp.ends_at === undefined,
      );

      const profile: ProfileCompany = {
        name: profileResponse.full_name ?? result.profile?.full_name ?? '',
        headline: profileResponse.headline ?? result.profile?.headline,
        currentCompanyName: currentExperience?.company ?? null,
        currentCompanyUrl: currentExperience?.company_linkedin_profile_url ?? null,
      };

      log('profile_extracted', {
        name: profile.name,
        company: profile.currentCompanyName ?? '(inconnu)',
      });

      const companyUrl = profile.currentCompanyUrl;

      if (!companyUrl) {
        results.push({ ...profile, companyStats: null });
        continue;
      }

      // Étape 3 — Company Profile (pour le nom canonique)
      const companyProfile = await enrichlayerFetch(
        '/api/v2/company',
        { url: companyUrl },
        CompanyProfileResponseSchema,
      );

      log('company_page', { companyName: companyProfile.name, companyUrl });

      // Étape 4a — Employee Count total via /api/v2/company/employees/count
      const totalResponse = await enrichlayerFetch(
        '/api/v2/company/employees/count',
        { url: companyUrl, estimated_employee_count: 'include' },
        EmployeeCountResponseSchema,
      );
      const totalEmployees = totalResponse.estimated_employee_count ?? 0;

      // Étape 4b — Freelances dans l'entreprise via Person Search avec current_company_profile_url
      // Enrichlayer ne supporte pas keyword_regex sur /employees/count, on utilise la search API
      const freelanceSearchResponse = await enrichlayerFetch(
        '/api/v2/search/person',
        { current_company_profile_url: companyUrl, headline: 'freelance', page_size: '1' },
        PersonSearchResponseSchema,
      );
      const freelanceCount = freelanceSearchResponse.total_result_count ?? 0;

      const freelanceRatio =
        totalEmployees > 0 ? Math.round((freelanceCount / totalEmployees) * 100) : 0;

      const companyStats: CompanyStats = {
        companyName: companyProfile.name ?? profile.currentCompanyName ?? '',
        companyUrl,
        totalEmployees,
        freelanceCount,
        freelanceRatio,
      };

      log('company_analyzed', {
        companyName: companyStats.companyName,
        totalEmployees,
        freelanceCount,
        freelanceRatio,
      });

      results.push({ ...profile, companyStats });
    } catch (error) {
      console.error('[enrichlayer][linkedin] profile error', {
        url: result.linkedin_profile_url,
        error: error instanceof Error ? error.message : String(error),
      });
      results.push({
        name: result.profile?.full_name ?? '',
        headline: result.profile?.headline,
        currentCompanyName: null,
        currentCompanyUrl: null,
        companyStats: null,
      });
    }
  }

  return results;
}
