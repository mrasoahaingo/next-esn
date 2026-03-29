import { z } from 'zod';

const PROXYCURL_BASE = 'https://nubela.co/proxycurl/api';

// Titres décideurs IT recherchés — priorité DSI/CTO puis DRH/DAF
const DECISION_MAKER_TITLES = [
  'DSI',
  'CTO',
  'Directeur des systèmes d\'information',
  'Directeur informatique',
  'Directeur technique',
  'VP Engineering',
  'DRH',
  'Directeur des ressources humaines',
  'CEO',
  'DAF',
];

const CompanyResolveSchema = z.object({
  url: z.string().url().nullable().optional(),
});

const PersonSearchResultSchema = z.object({
  linkedin_profile_url: z.string().url(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  headline: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  profile_pic_url: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
});

const PersonSearchResponseSchema = z.object({
  results: z.array(PersonSearchResultSchema).default([]),
  next_page: z.string().nullable().optional(),
});

export const ContactSchema = z.object({
  name: z.string(),
  title: z.string(),
  linkedinUrl: z.string().url(),
  profilePicture: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  enrichedAt: z.string(),
});
export type Contact = z.infer<typeof ContactSchema>;

function logEnrich(event: string, payload: Record<string, unknown>) {
  console.info('[radar][linkedin-enrichment]', event, payload);
}

/**
 * Résout l'URL LinkedIn d'une entreprise à partir de son nom et domaine web.
 * Utilise le endpoint Proxycurl company resolve — ~1 crédit.
 */
export async function resolveCompanyLinkedInUrl(
  companyName: string,
  website?: string | null,
): Promise<string | null> {
  const apiKey = process.env.PROXYCURL_API_KEY;
  if (!apiKey) return null;

  const params = new URLSearchParams({ company_name: companyName });
  if (website) {
    // Extraire le domaine propre (sans https:// ni chemins)
    try {
      params.set('company_domain', new URL(website).hostname);
    } catch {
      // URL invalide — ignorer le paramètre domaine
    }
  }

  try {
    const response = await fetch(
      `${PROXYCURL_BASE}/linkedin/company/resolve?${params}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );

    logEnrich('company_resolve_response', {
      companyName,
      status: response.status,
      ok: response.ok,
    });

    if (!response.ok) return null;

    const json = await response.json();
    const parsed = CompanyResolveSchema.safeParse(json);
    const url = parsed.success ? (parsed.data.url ?? null) : null;

    logEnrich('company_resolve_result', { companyName, url });
    return url;
  } catch (error) {
    console.error('resolveCompanyLinkedInUrl:', error);
    return null;
  }
}

/**
 * Recherche les décideurs IT d'une entreprise à partir de son URL LinkedIn.
 * Utilise Proxycurl person search — ~2-3 crédits selon résultats.
 */
export async function findDecisionMakers(
  companyLinkedInUrl: string,
  companyName: string,
): Promise<Contact[]> {
  const apiKey = process.env.PROXYCURL_API_KEY;
  if (!apiKey) return [];

  const headers = { Authorization: `Bearer ${apiKey}` };
  const contacts: Contact[] = [];
  const seenUrls = new Set<string>();

  // Chercher par rôles prioritaires en 2 appels : IT decision makers + RH/Direction
  const searchGroups = [
    {
      // Décideurs IT — cible principale pour une ESN
      headline_keyword_regex: 'DSI|CTO|directeur.*syst.mes|directeur.*informatique|directeur.*technique|VP.*engineering|chief.*technology|chief.*information',
    },
    {
      // Direction générale et RH — contacts secondaires
      headline_keyword_regex: 'DRH|directeur.*ressources|CEO|PDG|DAF|directeur.*achats|directeur.*opérations',
    },
  ];

  for (const searchParams of searchGroups) {
    try {
      const params = new URLSearchParams({
        current_company_linkedin_profile_url: companyLinkedInUrl,
        ...searchParams,
        page_size: '5',
      });

      const response = await fetch(
        `${PROXYCURL_BASE}/linkedin/search/person?${params}`,
        { headers },
      );

      logEnrich('person_search_response', {
        companyLinkedInUrl,
        headline: searchParams.headline_keyword_regex,
        status: response.status,
        ok: response.ok,
      });

      if (!response.ok) continue;

      const json = await response.json();
      const parsed = PersonSearchResponseSchema.safeParse(json);
      if (!parsed.success) continue;

      for (const result of parsed.data.results) {
        if (seenUrls.has(result.linkedin_profile_url)) continue;
        seenUrls.add(result.linkedin_profile_url);

        const fullName = [result.first_name, result.last_name].filter(Boolean).join(' ');
        if (!fullName) continue;

        const contact = ContactSchema.safeParse({
          name: fullName,
          title: result.headline ?? 'Décideur',
          linkedinUrl: result.linkedin_profile_url,
          profilePicture: result.profile_pic_url ?? null,
          city: result.city ?? null,
          enrichedAt: new Date().toISOString(),
        });

        if (contact.success) {
          contacts.push(contact.data);
        }
      }
    } catch (error) {
      console.error('findDecisionMakers search group:', error);
    }
  }

  logEnrich('decision_makers_found', {
    companyLinkedInUrl,
    companyName,
    count: contacts.length,
    titles: contacts.map((c) => c.title).slice(0, 5),
  });

  return contacts;
}

/**
 * Pipeline complet d'enrichissement LinkedIn pour une entreprise :
 * 1. Résout l'URL LinkedIn si manquante
 * 2. Cherche les décideurs
 * Retourne les données pour mise à jour en base.
 */
export async function enrichCompany(company: {
  id: string;
  name: string;
  website?: string | null;
  linkedinUrl?: string | null;
}): Promise<{
  linkedinUrl: string | null;
  contacts: Contact[];
}> {
  let linkedinUrl = company.linkedinUrl ?? null;

  // Résoudre l'URL si elle n'existe pas encore
  if (!linkedinUrl) {
    linkedinUrl = await resolveCompanyLinkedInUrl(company.name, company.website);
  }

  if (!linkedinUrl) {
    return { linkedinUrl: null, contacts: [] };
  }

  const contacts = await findDecisionMakers(linkedinUrl, company.name);
  return { linkedinUrl, contacts };
}
