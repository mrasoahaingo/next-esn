import { z } from 'zod';
import { getSupabase } from '@/lib/utils/supabase';

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
  matchThreshold: z.number().min(0).max(1).default(0.7),
  updatedAt: z.string().datetime({ offset: true }).nullable().optional(),
});

export const radarSettingsPatchSchema = z.object({
  enabledSources: radarSettingsSchema.shape.enabledSources.optional(),
  jobSearchQueries: z.array(z.string().min(1)).optional(),
  pressRssUrls: z.array(z.string().url()).optional(),
  linkedinCompanyUrls: z.array(z.string().url()).optional(),
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
  matchThreshold: 0.7,
  updatedAt: null,
};

function mapRowToSettings(orgId: string, row: Record<string, unknown> | null | undefined): RadarSettings {
  return radarSettingsSchema.parse({
    orgId,
    enabledSources: row?.enabled_sources ?? DEFAULT_RADAR_SETTINGS.enabledSources,
    jobSearchQueries: row?.job_search_queries ?? DEFAULT_RADAR_SETTINGS.jobSearchQueries,
    pressRssUrls: row?.press_rss_urls ?? DEFAULT_RADAR_SETTINGS.pressRssUrls,
    linkedinCompanyUrls: row?.linkedin_company_urls ?? DEFAULT_RADAR_SETTINGS.linkedinCompanyUrls,
    matchThreshold: row?.match_threshold ?? DEFAULT_RADAR_SETTINGS.matchThreshold,
    updatedAt: row?.updated_at ?? null,
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
      match_threshold: next.matchThreshold,
      updated_at: next.updatedAt,
    }, { onConflict: 'org_id' })
    .select('*')
    .single();

  if (error) throw error;
  return mapRowToSettings(orgId, data as Record<string, unknown>);
}
