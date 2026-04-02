import { z } from 'zod';
import { getSupabase } from '@/lib/utils/supabase';

export const linkedinDiscoverySchema = z.object({
  enabled: z.boolean().default(false),
  sectors: z.array(z.string().min(1)).default([]),
  regions: z.array(z.string().min(1)).default([]),
  keywords: z.array(z.string().min(1)).default([]),
  minExternalRatio: z.number().min(0).max(1).default(0.05),
  minHeadcount: z.number().int().min(1).default(200),
  maxHeadcount: z.number().int().min(1).default(10000),
  maxCompaniesPerRun: z.number().int().min(1).max(200).default(50),
});
export type LinkedInDiscovery = z.infer<typeof linkedinDiscoverySchema>;

export const DEFAULT_LINKEDIN_DISCOVERY: LinkedInDiscovery = {
  enabled: false,
  sectors: ['banque', 'assurance', 'retail', 'santé', 'industrie', 'services publics'],
  regions: ['Île-de-France', 'Lyon', 'Bordeaux', 'Nantes', 'Marseille'],
  keywords: ['informatique', 'digital', 'IT', 'DSI', 'transformation numérique'],
  minExternalRatio: 0.05,
  minHeadcount: 200,
  maxHeadcount: 10000,
  maxCompaniesPerRun: 50,
};

export const radarSettingsSchema = z.object({
  orgId: z.string(),
  enabledSources: z.object({
    jobs: z.boolean().default(true),
    boamp: z.boolean().default(true),
    press: z.boolean().default(true),
    linkedin: z.boolean().default(true),
  }),
  jobSearchQueries: z.array(z.string().min(1)).default([]),
  pressRssUrls: z.array(z.string().url()).default([]),
  linkedinCompanyUrls: z.array(z.string().url()).default([]),
  linkedinDiscovery: linkedinDiscoverySchema.default(DEFAULT_LINKEDIN_DISCOVERY),
  matchThreshold: z.number().min(0).max(1).default(0.7),
  updatedAt: z.string().datetime({ offset: true }).nullable().optional(),
  linkedinContextId: z.string().nullable().optional(),
});

export const radarSettingsPatchSchema = z.object({
  enabledSources: radarSettingsSchema.shape.enabledSources.optional(),
  jobSearchQueries: z.array(z.string().min(1)).optional(),
  pressRssUrls: z.array(z.string().url()).optional(),
  linkedinCompanyUrls: z.array(z.string().url()).optional(),
  linkedinDiscovery: linkedinDiscoverySchema.optional(),
  matchThreshold: z.number().min(0).max(1).optional(),
});

export type RadarSettings = z.infer<typeof radarSettingsSchema>;
export type RadarSettingsPatch = z.infer<typeof radarSettingsPatchSchema>;

export const DEFAULT_RADAR_SETTINGS: Omit<RadarSettings, 'orgId'> = {
  enabledSources: {
    jobs: true,
    boamp: true,
    press: true,
    linkedin: true,
  },
  jobSearchQueries: [
    'developpeur java Paris',
    'developpeur angular France',
    'devops cloud Paris',
    'data engineer France',
    'tech lead java France',
  ],
  pressRssUrls: [
    'https://www.usine-digitale.fr/rss/',
    'https://www.lemondeinformatique.fr/flux-rss/thematique/toutes-les-actualites/rss.xml',
  ],
  linkedinCompanyUrls: [],
  linkedinDiscovery: DEFAULT_LINKEDIN_DISCOVERY,
  matchThreshold: 0.7,
  updatedAt: null,
  linkedinContextId: null,
};

function mapRowToSettings(orgId: string, row: Record<string, unknown> | null | undefined): RadarSettings {
  return radarSettingsSchema.parse({
    orgId,
    enabledSources: row?.enabled_sources ?? DEFAULT_RADAR_SETTINGS.enabledSources,
    jobSearchQueries: row?.job_search_queries ?? DEFAULT_RADAR_SETTINGS.jobSearchQueries,
    pressRssUrls: row?.press_rss_urls ?? DEFAULT_RADAR_SETTINGS.pressRssUrls,
    linkedinCompanyUrls: row?.linkedin_company_urls ?? DEFAULT_RADAR_SETTINGS.linkedinCompanyUrls,
    linkedinDiscovery: row?.linkedin_discovery ?? DEFAULT_RADAR_SETTINGS.linkedinDiscovery,
    matchThreshold: row?.match_threshold ?? DEFAULT_RADAR_SETTINGS.matchThreshold,
    updatedAt: row?.updated_at ?? null,
    linkedinContextId: row?.linkedin_context_id ?? null,
  });
}

export async function getRadarSettings(orgId: string): Promise<RadarSettings> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('radar_org_settings')
    .select('*')
    .eq('org_id', orgId)
    .maybeSingle();

  if (error) throw error;
  return mapRowToSettings(orgId, data as Record<string, unknown> | null | undefined);
}

export async function upsertRadarSettings(orgId: string, patch: RadarSettingsPatch): Promise<RadarSettings> {
  const current = await getRadarSettings(orgId);
  const next = radarSettingsSchema.parse({
    orgId,
    enabledSources: patch.enabledSources ?? current.enabledSources,
    jobSearchQueries: patch.jobSearchQueries ?? current.jobSearchQueries,
    pressRssUrls: patch.pressRssUrls ?? current.pressRssUrls,
    linkedinCompanyUrls: patch.linkedinCompanyUrls ?? current.linkedinCompanyUrls,
    linkedinDiscovery: patch.linkedinDiscovery ?? current.linkedinDiscovery,
    matchThreshold: patch.matchThreshold ?? current.matchThreshold,
    updatedAt: new Date().toISOString(),
  });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('radar_org_settings')
    .upsert({
      org_id: orgId,
      enabled_sources: next.enabledSources,
      job_search_queries: next.jobSearchQueries,
      press_rss_urls: next.pressRssUrls,
      linkedin_company_urls: next.linkedinCompanyUrls,
      linkedin_discovery: next.linkedinDiscovery,
      match_threshold: next.matchThreshold,
      updated_at: next.updatedAt,
    }, { onConflict: 'org_id' })
    .select('*')
    .single();

  if (error) throw error;
  return mapRowToSettings(orgId, data as Record<string, unknown>);
}

export async function saveLinkedInContext(orgId: string, contextId: string | null): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('radar_org_settings')
    .upsert(
      { org_id: orgId, linkedin_context_id: contextId },
      { onConflict: 'org_id' }
    );
  if (error) throw error;
}
