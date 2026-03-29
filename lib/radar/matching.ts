import { z } from 'zod';
import { getSupabase } from '@/lib/utils/supabase';

const MatchRpcRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  skills: z.array(z.string()).or(z.array(z.unknown()).transform((values) => values.map(String))),
  tjm: z.number().nullable().optional(),
  availability: z.string(),
  similarity: z.number(),
});

export async function findMatchingConsultants(
  orgId: string,
  signalEmbedding: number[],
  limit = 5,
  threshold = 0.7,
) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('match_consultants', {
    query_embedding: signalEmbedding,
    match_org_id: orgId,
    match_threshold: threshold,
    match_count: limit,
  });

  if (error) throw error;
  return z.array(MatchRpcRowSchema).parse(data ?? []);
}

export async function refreshMatchesForCompany(
  orgId: string,
  companyId: string,
  embedding: number[] | null,
  threshold = 0.7,
): Promise<number> {
  if (!embedding) return 0;

  const supabase = getSupabase();
  const matches = await findMatchingConsultants(orgId, embedding, 5, threshold);

  await supabase.from('radar_matches').delete().eq('company_id', companyId);

  if (matches.length === 0) return 0;

  const { error } = await supabase.from('radar_matches').insert(
    matches.map((match) => ({
      company_id: companyId,
      consultant_id: match.id,
      match_score: match.similarity,
      match_reason: `Similarite vectorielle ${Math.round(match.similarity * 100)}%`,
    })),
  );

  if (error) throw error;
  return matches.length;
}
