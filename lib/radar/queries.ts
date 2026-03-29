import { unstable_cache } from 'next/cache';
import { getSupabase } from '@/lib/utils/supabase';
import { averageEmbeddings, generateEmbedding } from '@/lib/radar/embeddings';
import { refreshMatchesForCompany } from '@/lib/radar/matching';
import {
  ProspectActionInputSchema,
  ProspectDetailSchema,
  ProspectFiltersSchema,
  ProspectListItemSchema,
  RawSignalSchema,
  type ProspectActionInput,
  type ProspectDetail,
  type ProspectFilters,
  type ProspectListItem,
  type RawSignal,
} from '@/lib/radar/schemas';
import { computeScore } from '@/lib/radar/scoring';
import { getRadarSettings } from '@/lib/radar/settings';

type RadarCompanyRow = {
  id: string;
  name: string;
  siren: string | null;
  sector: string | null;
  city: string | null;
  headcount: number | null;
  website: string | null;
  linkedin_url: string | null;
  enrichment_data: Record<string, unknown> | null;
};

// Formes juridiques françaises à ignorer dans la comparaison des noms
const LEGAL_SUFFIXES = /\b(sas|sarl|sa|srl|sasu|eurl|sci|snc|sca|se|scp|gie|gip|ep|spa|nv|bv|gmbh|ag|ltd|llc|inc|corp|plc)\b\.?/gi;

function normalizeCompanyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    // Supprimer les accents
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Supprimer les formes juridiques
    .replace(LEGAL_SUFFIXES, '')
    // Supprimer la ponctuation courante
    .replace(/[,.\-&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const COMPANY_SELECT = 'id, name, siren, sector, city, headcount, website, linkedin_url, enrichment_data';

async function findOrCreateCompany(
  orgId: string,
  signal: RawSignal,
): Promise<RadarCompanyRow> {
  const supabase = getSupabase();

  // 1. SIREN-first: recherche exacte par SIREN (clé métier unique)
  if (signal.companySiren) {
    const { data: bySiren } = await supabase
      .from('radar_companies')
      .select(COMPANY_SELECT)
      .eq('org_id', orgId)
      .eq('siren', signal.companySiren)
      .maybeSingle();

    if (bySiren) {
      // Enrichir le SIREN si le nom a changé (fusion, rebranding)
      if (bySiren.name !== signal.companyName.trim()) {
        await supabase
          .from('radar_companies')
          .update({ name: signal.companyName.trim(), updated_at: new Date().toISOString() })
          .eq('id', bySiren.id);
      }
      return bySiren as RadarCompanyRow;
    }
  }

  // 2. Fallback : recherche par nom normalisé (insensible aux accents et formes juridiques)
  const normalizedName = normalizeCompanyName(signal.companyName);
  const { data: allByOrg } = await supabase
    .from('radar_companies')
    .select(COMPANY_SELECT)
    .eq('org_id', orgId);

  const byName = (allByOrg ?? []).find(
    (row) => normalizeCompanyName(row.name) === normalizedName,
  );

  if (byName) {
    // Enrichir le SIREN si on l'a maintenant et qu'il manquait
    if (!byName.siren && signal.companySiren) {
      await supabase
        .from('radar_companies')
        .update({ siren: signal.companySiren, updated_at: new Date().toISOString() })
        .eq('id', byName.id);
    }
    return byName as RadarCompanyRow;
  }

  // 3. Création
  const { data: inserted, error: insertError } = await supabase
    .from('radar_companies')
    .insert({
      org_id: orgId,
      name: signal.companyName.trim(),
      siren: signal.companySiren ?? null,
      enrichment_data: {},
    })
    .select(COMPANY_SELECT)
    .single();

  if (insertError || !inserted) throw insertError ?? new Error('Unable to create company');
  return inserted as RadarCompanyRow;
}

function buildEmbeddingText(signal: RawSignal) {
  return [signal.title, signal.rawContent, JSON.stringify(signal.metadata)].filter(Boolean).join('\n');
}

function normalizeIsoDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function upsertSignals(orgId: string, inputSignals: RawSignal[]): Promise<number> {
  const supabase = getSupabase();
  let persisted = 0;

  for (const inputSignal of inputSignals) {
    try {
      const parsed = RawSignalSchema.safeParse(inputSignal);
      if (!parsed.success) continue;

      const signal = parsed.data;
      const company = await findOrCreateCompany(orgId, signal);
      const embedding = await generateEmbedding(buildEmbeddingText(signal));
      const detectedAt = signal.detectedAt ?? new Date().toISOString();
      const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

      const { data: existing } = await supabase
        .from('radar_signals')
        .select('id')
        .eq('company_id', company.id)
        .eq('source', signal.source)
        .eq('title', signal.title)
        .gte('expires_at', new Date().toISOString())
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await supabase
          .from('radar_signals')
          .update({
            raw_content: signal.rawContent ?? null,
            weight: signal.weight,
            metadata: signal.metadata,
            embedding,
            detected_at: detectedAt,
            expires_at: expiresAt,
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('radar_signals').insert({
          company_id: company.id,
          source: signal.source,
          title: signal.title,
          raw_content: signal.rawContent ?? null,
          weight: signal.weight,
          metadata: signal.metadata,
          embedding,
          detected_at: detectedAt,
          expires_at: expiresAt,
        });

        if (error) throw error;
      }

      persisted += 1;
    } catch (error) {
      console.error('upsertSignals:', error);
    }
  }

  return persisted;
}

function collectSignalTechnologies(signals: Array<{ metadata?: Record<string, unknown> | null }>) {
  const values = signals.flatMap((signal) => {
    const technologies = signal.metadata?.technologies;
    return Array.isArray(technologies) ? technologies.map(String) : [];
  });

  return [...new Set(values)];
}

export async function listProspects(
  orgId: string,
  rawFilters?: ProspectFilters,
): Promise<ProspectListItem[]> {
  const filters = ProspectFiltersSchema.parse(rawFilters ?? {});
  const supabase = getSupabase();

  const [scoresRes, signalsRes] = await Promise.all([
    supabase
      .from('radar_prospect_scores')
      .select(
        'company_id, score, signal_count, convergence_bonus, heat, breakdown, radar_companies!inner(id, name, siren, sector, city)',
      )
      .eq('org_id', orgId)
      .order('score', { ascending: false }),
    supabase
      .from('radar_signals')
      .select('company_id, detected_at, metadata')
      .gte('expires_at', new Date().toISOString()),
  ]);

  if (scoresRes.error) throw scoresRes.error;
  if (signalsRes.error) throw signalsRes.error;

  const signalsByCompany = (signalsRes.data ?? []).reduce<Record<string, Array<{ detected_at: string; metadata: Record<string, unknown> | null }>>>(
    (accumulator, row) => {
      const key = String(row.company_id);
      accumulator[key] ??= [];
      accumulator[key].push({
        detected_at: String(row.detected_at),
        metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      });
      return accumulator;
    },
    {},
  );

  const items = (scoresRes.data ?? []).map((row) => {
    const company = Array.isArray(row.radar_companies) ? row.radar_companies[0] : row.radar_companies;
    const companySignals = signalsByCompany[String(row.company_id)] ?? [];

    return ProspectListItemSchema.parse({
      companyId: row.company_id,
      companyName: company?.name ?? 'Entreprise',
      siren: company?.siren ?? null,
      sector: company?.sector ?? null,
      city: company?.city ?? null,
      score: row.score,
      heat: row.heat,
      signalCount: row.signal_count,
      convergenceBonus: row.convergence_bonus,
      breakdown: (row.breakdown as Record<string, number> | null) ?? {},
      technologies: collectSignalTechnologies(companySignals),
      latestSignalAt: normalizeIsoDateTime(
        companySignals.map((signal) => signal.detected_at).sort().at(-1) ?? null,
      ),
    });
  });

  return items.filter((item) => {
    if (filters.sector && !item.sector?.toLowerCase().includes(filters.sector.toLowerCase())) {
      return false;
    }
    if (filters.city && !item.city?.toLowerCase().includes(filters.city.toLowerCase())) {
      return false;
    }
    if (filters.heat && item.heat !== filters.heat) {
      return false;
    }
    if (
      filters.technology &&
      !item.technologies.some((technology) =>
        technology.toLowerCase().includes(filters.technology!.toLowerCase()),
      )
    ) {
      return false;
    }
    return true;
  });
}

export async function getProspectDetail(orgId: string, companyId: string): Promise<ProspectDetail | null> {
  const supabase = getSupabase();

  const [companyRes, scoreRes, signalsRes, matchesRes, actionsRes] = await Promise.all([
    supabase
      .from('radar_companies')
      .select('id, name, siren, sector, city, headcount, website, linkedin_url, enrichment_data')
      .eq('org_id', orgId)
      .eq('id', companyId)
      .maybeSingle(),
    supabase
      .from('radar_prospect_scores')
      .select('company_id, score, signal_count, convergence_bonus, heat, breakdown')
      .eq('org_id', orgId)
      .eq('company_id', companyId)
      .maybeSingle(),
    supabase
      .from('radar_signals')
      .select('id, source, title, raw_content, weight, metadata, detected_at, expires_at')
      .eq('company_id', companyId)
      .gte('expires_at', new Date().toISOString())
      .order('detected_at', { ascending: false }),
    supabase
      .from('radar_matches')
      .select('consultant_id, match_score, match_reason, radar_consultants!inner(id, name, skills, tjm, availability)')
      .eq('company_id', companyId)
      .order('match_score', { ascending: false }),
    supabase
      .from('radar_actions')
      .select('id, action, outcome, notes, performed_at, user_id')
      .eq('org_id', orgId)
      .eq('company_id', companyId)
      .order('performed_at', { ascending: false }),
  ]);

  if (companyRes.error) throw companyRes.error;
  if (!companyRes.data) return null;
  if (scoreRes.error) throw scoreRes.error;
  if (signalsRes.error) throw signalsRes.error;
  if (matchesRes.error) throw matchesRes.error;
  if (actionsRes.error) throw actionsRes.error;

  return ProspectDetailSchema.parse({
    company: {
      id: companyRes.data.id,
      name: companyRes.data.name,
      siren: companyRes.data.siren,
      sector: companyRes.data.sector,
      city: companyRes.data.city,
      headcount: companyRes.data.headcount,
      website: companyRes.data.website,
      linkedinUrl: companyRes.data.linkedin_url,
      enrichmentData: (companyRes.data.enrichment_data as Record<string, unknown> | null) ?? {},
    },
    score: scoreRes.data
      ? {
          companyId: scoreRes.data.company_id,
          score: scoreRes.data.score,
          signalCount: scoreRes.data.signal_count,
          convergenceBonus: scoreRes.data.convergence_bonus,
          heat: scoreRes.data.heat,
          breakdown: (scoreRes.data.breakdown as Record<string, number> | null) ?? {},
        }
      : null,
    signals: (signalsRes.data ?? []).map((signal) => ({
      id: signal.id,
      source: signal.source,
      title: signal.title,
      rawContent: signal.raw_content,
      weight: signal.weight,
        metadata: (signal.metadata as Record<string, unknown> | null) ?? {},
      detectedAt: normalizeIsoDateTime(signal.detected_at) ?? new Date(0).toISOString(),
      expiresAt: normalizeIsoDateTime(signal.expires_at),
    })),
    matches: (matchesRes.data ?? []).map((match) => {
      const consultant = Array.isArray(match.radar_consultants)
        ? match.radar_consultants[0]
        : match.radar_consultants;
      return {
        consultantId: consultant.id,
        consultantName: consultant.name,
        matchScore: match.match_score,
        matchReason: match.match_reason ?? 'Matching vectoriel',
        skills: Array.isArray(consultant.skills)
          ? consultant.skills.map(String)
          : [],
        tjm: consultant.tjm ?? undefined,
        availability: consultant.availability,
      };
    }),
    actions: (actionsRes.data ?? []).map((action) => ({
      id: action.id,
      action: action.action,
      outcome: action.outcome,
      notes: action.notes,
      performedAt: normalizeIsoDateTime(action.performed_at) ?? new Date(0).toISOString(),
      userId: action.user_id,
    })),
  });
}

export async function recordProspectAction(orgId: string, userId: string, input: ProspectActionInput) {
  const supabase = getSupabase();
  const action = ProspectActionInputSchema.parse(input);

  const { data, error } = await supabase
    .from('radar_actions')
    .insert({
      org_id: orgId,
      user_id: userId,
      company_id: action.companyId,
      action: action.action,
      outcome: action.outcome,
      notes: action.notes ?? null,
    })
    .select('id, action, outcome, notes, performed_at, user_id')
    .single();

  if (error) throw error;
  return data;
}

export async function recomputeProspectScores(orgId: string, matchThreshold?: number): Promise<number> {
  const supabase = getSupabase();
  const [companiesRes, signalsRes] = await Promise.all([
    supabase.from('radar_companies').select('id').eq('org_id', orgId),
    supabase
      .from('radar_signals')
      .select('company_id, source, weight, embedding, detected_at, metadata')
      .gte('expires_at', new Date().toISOString()),
  ]);

  if (companiesRes.error) throw companiesRes.error;
  if (signalsRes.error) throw signalsRes.error;

  const effectiveMatchThreshold = matchThreshold ?? (await getRadarSettings(orgId)).matchThreshold;

  let updated = 0;

  for (const company of companiesRes.data ?? []) {
    const companySignals = (signalsRes.data ?? []).filter((signal) => signal.company_id === company.id);
    const embeddings = companySignals
      .map((signal) => signal.embedding)
      .filter((embedding): embedding is number[] => Array.isArray(embedding));

    const averageEmbedding = averageEmbeddings(embeddings);
    const matchCount = await refreshMatchesForCompany(
      orgId,
      company.id,
      averageEmbedding,
      effectiveMatchThreshold,
    );
    const computed = computeScore(
      companySignals.map((signal) => ({
        source: signal.source,
        weight: signal.weight,
        detectedAt: signal.detected_at ?? undefined,
        metadata: (signal.metadata as Record<string, unknown> | null) ?? undefined,
      })),
      matchCount > 0,
      company.id,
    );

    const { error } = await supabase.from('radar_prospect_scores').upsert({
      company_id: company.id,
      org_id: orgId,
      score: computed.score,
      signal_count: computed.signalCount,
      convergence_bonus: computed.convergenceBonus,
      heat: computed.heat,
      breakdown: computed.breakdown,
      computed_at: new Date().toISOString(),
    });

    if (error) throw error;
    updated += 1;
  }

  return updated;
}

export async function listRadarOrgIds(): Promise<string[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('organization_settings')
    .select('org_id')
    .not('org_id', 'is', null);

  if (error) throw error;
  return [...new Set((data ?? []).map((row) => String(row.org_id)).filter(Boolean))];
}

export function getProspectsCached(orgId: string, filters?: ProspectFilters) {
  const parsed = ProspectFiltersSchema.parse(filters ?? {});
  const cacheKey = ['radar-prospects', orgId, JSON.stringify(parsed)];
  return unstable_cache(async () => listProspects(orgId, parsed), cacheKey, {
    revalidate: 300,
    tags: [`radar:prospects:${orgId}`],
  })();
}

export function getProspectDetailCached(orgId: string, companyId: string) {
  return unstable_cache(async () => getProspectDetail(orgId, companyId), ['radar-prospect', orgId, companyId], {
    revalidate: 300,
    tags: [`radar:prospect:${companyId}`],
  })();
}

export function getRadarSourceStatuses() {
  return [
    {
      key: 'jobs',
      label: "Offres d'emploi",
      enabled: Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN),
      detail: 'Cloudflare Browser Rendering /json',
    },
    {
      key: 'boamp',
      label: 'Marches publics',
      enabled: Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN),
      detail: 'Cloudflare Browser Rendering /scrape',
    },
    {
      key: 'press',
      label: 'Presse',
      enabled: Boolean(process.env.FIRECRAWL_API_KEY),
      detail: 'Firecrawl scrape markdown',
    },
    {
      key: 'linkedin',
      label: 'LinkedIn',
      enabled: Boolean(process.env.PROXYCURL_API_KEY),
      detail: 'Proxycurl company/employees',
    },
    {
      key: 'embeddings',
      label: 'Embeddings vivier',
      enabled: Boolean(process.env.AI_GATEWAY_API_KEY),
      detail: 'AI Gateway -> openai/text-embedding-3-small',
    },
  ];
}
