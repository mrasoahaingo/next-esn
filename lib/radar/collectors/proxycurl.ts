import { z, ZodSchema } from 'zod';

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = 'https://nubela.co/proxycurl';
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
          .optional(),
      }),
    )
    .default([]),
});

const PersonProfileResponseSchema = z.object({
  full_name: z.string().optional(),
  headline: z.string().optional(),
  experiences: z
    .array(
      z.object({
        company: z.string().optional(),
        company_linkedin_profile_url: z.string().optional(),
        ends_at: z.unknown().optional(),
      }),
    )
    .default([]),
});

const CompanyProfileResponseSchema = z.object({
  name: z.string().optional(),
  company_size_on_linkedin: z.string().optional(),
});

const EmployeeCountResponseSchema = z.object({
  count: z.number(),
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
  console.info('[proxycurl][linkedin]', event, payload);
}

async function proxycurlFetch<T>(
  path: string,
  params: Record<string, string>,
  schema: ZodSchema<T>,
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const headers = {
    Authorization: `Bearer ${process.env.PROXYCURL_API_KEY}`,
  };

  const response = await fetch(url.toString(), { headers });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Proxycurl ${path} failed (${response.status}): ${body}`);
  }

  const json: unknown = await response.json();
  return schema.parse(json);
}

// ─── Collecte complète via API Proxycurl ──────────────────────────────────────

export async function collectParisFreelanceData(): Promise<FreelanceParisEntry[]> {
  if (!process.env.PROXYCURL_API_KEY) throw new Error('PROXYCURL_API_KEY manquant');

  // Étape 1 — Person Search
  const searchResponse = await proxycurlFetch(
    '/proxycurl/api/v2/search/person',
    { country: 'FR', city: 'Paris', headline: 'freelance', page_size: String(PAGE_SIZE) },
    PersonSearchResponseSchema,
  );

  log('profiles_found', { count: searchResponse.results.length });

  const results: FreelanceParisEntry[] = [];

  // Étape 2 — Pour chaque profil trouvé
  for (const result of searchResponse.results) {
    try {
      const profileResponse = await proxycurlFetch(
        '/proxycurl/api/v2/linkedin',
        { linkedin_profile_url: result.linkedin_profile_url },
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

      // Étape 3 — Company Profile
      const companyProfile = await proxycurlFetch(
        '/proxycurl/api/linkedin/company',
        { url: companyUrl },
        CompanyProfileResponseSchema,
      );

      log('company_page', { companyName: companyProfile.name, companyUrl });

      // Étape 4a — Employee Count total
      const totalResponse = await proxycurlFetch(
        '/proxycurl/api/linkedin/company/employees/count',
        { url: companyUrl },
        EmployeeCountResponseSchema,
      );
      const totalEmployees = totalResponse.count;

      // Étape 4b — Employee Count freelances
      const freelanceResponse = await proxycurlFetch(
        '/proxycurl/api/linkedin/company/employees/count',
        { url: companyUrl, keyword_regex: 'freelance' },
        EmployeeCountResponseSchema,
      );
      const freelanceCount = freelanceResponse.count;

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
      console.error('[proxycurl][linkedin] profile error', {
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
