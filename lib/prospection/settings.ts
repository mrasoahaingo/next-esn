import { getSupabase } from '@/lib/utils/supabase';
import { DEFAULT_HEAT_THRESHOLD } from '@/lib/prospection/constants';
import type { ProspectionSettingsRow } from '@/lib/types/prospection';

// Lecture serveur uniquement (client service role : le filtre org_id est obligatoire).

export type ProspectionSettings = {
  heat_threshold: number;
  /** Vrai tant qu'aucune ligne `prospection_settings` n'existe pour l'org (D-03). */
  is_default: boolean;
};

/** Ligne absente → seuil par défaut (D-03). Fonction pure. */
export function toProspectionSettings(
  row: Pick<ProspectionSettingsRow, 'heat_threshold'> | null,
): ProspectionSettings {
  if (!row) return { heat_threshold: DEFAULT_HEAT_THRESHOLD, is_default: true };
  return { heat_threshold: row.heat_threshold, is_default: false };
}

/** Réglages de prospection de l'org. Ne crée jamais de ligne (upsert à la première écriture). */
export async function getProspectionSettings(orgId: string): Promise<ProspectionSettings> {
  const { data, error } = await getSupabase()
    .from('prospection_settings')
    .select('heat_threshold')
    .eq('org_id', orgId)
    .maybeSingle();

  if (error) throw error;
  return toProspectionSettings(data as Pick<ProspectionSettingsRow, 'heat_threshold'> | null);
}

/**
 * Seuil de chaleur de l'org : source unique pour la gate d'enrichissement des contacts
 * (Phase 13). Renvoie `DEFAULT_HEAT_THRESHOLD` tant que rien n'est enregistré.
 */
export async function getProspectionHeatThreshold(orgId: string): Promise<number> {
  const settings = await getProspectionSettings(orgId);
  return settings.heat_threshold;
}
