import type {
  ProspectionCompanyStatus,
  ProspectionContactSource,
  ProspectionRunStatus,
  ProspectionRunTrigger,
  ProspectionSignalSource,
  ProspectionSignalType,
} from '@/lib/prospection/constants';

// Types de ligne écrits à la main, alignés sur la migration `*_prospection_domain.sql`.
// Timestamps en chaîne ISO, colonnes nullable en `T | null`.

/** Row shape for `prospection_settings` (CONT-04, D-01..D-03). */
export type ProspectionSettingsRow = {
  org_id: string;
  /** 0..100 ; défaut DB = 60 (`DEFAULT_HEAT_THRESHOLD`). */
  heat_threshold: number;
  created_at: string;
  updated_at: string;
};

/** Row shape for `prospection_automations`. */
export type ProspectionAutomationRow = {
  id: string;
  org_id: string;
  name: string;
  /** Critères de ciblage (validés par Zod côté applicatif). */
  criteria: Record<string, unknown>;
  enabled: boolean;
  created_by: string | null;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Row shape for `prospection_companies` (SIG-04 : une ligne par SIREN et par org). */
export type ProspectionCompanyRow = {
  id: string;
  org_id: string;
  /** 9 chiffres ; null tant que l'entreprise n'est pas résolue. */
  siren: string | null;
  name: string;
  normalized_name: string;
  naf_code: string | null;
  headcount_range: string | null;
  city: string | null;
  postal_code: string | null;
  website: string | null;
  linkedin_url: string | null;
  status: ProspectionCompanyStatus;
  current_score: number | null;
  current_score_at: string | null;
  /** TTL de collecte des signaux (contrôle des coûts API). */
  signal_last_fetched_at: string | null;
  /** Moment où le seuil de chaleur a ouvert l'enrichissement. */
  enrichment_gated_at: string | null;
  contacts_enriched_at: string | null;
  /** D-08 : synthèse LLM. */
  justification: string | null;
  call_pitch: string | null;
  synthesis_generated_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Row shape for `prospection_run_logs`. */
export type ProspectionRunLogRow = {
  id: string;
  org_id: string;
  automation_id: string;
  workflow_run_id: string | null;
  trigger: ProspectionRunTrigger;
  status: ProspectionRunStatus;
  /** Résultat par collecteur : `{ ok, count, error }` (SIG-06). */
  source_results: Record<string, unknown>;
  signals_upserted: number;
  companies_upserted: number;
  error: string | null;
  started_at: string;
  finished_at: string | null;
};

/** Row shape for `prospection_signals`. */
export type ProspectionSignalRow = {
  id: string;
  org_id: string;
  company_id: string;
  automation_id: string | null;
  run_id: string | null;
  source: ProspectionSignalSource;
  signal_type: ProspectionSignalType;
  /** Identifiant externe (clé de dédoublonnage avec company_id + source). */
  source_ref: string;
  title: string;
  payload: Record<string, unknown>;
  /** Date de l'événement : base de la décroissance (SCOR-02). */
  occurred_at: string;
  fetched_at: string;
  expires_at: string;
  created_at: string;
};

/** Contribution d'un signal au score (D-07). */
export type ProspectionScoreBreakdownEntry = {
  signal_id: string;
  signal_type: ProspectionSignalType;
  occurred_at: string;
  weight: number;
  decay: number;
  contribution: number;
};

/** Row shape for `prospection_scores` (D-05 : un snapshot par entreprise et par run). */
export type ProspectionScoreRow = {
  id: string;
  org_id: string;
  company_id: string;
  run_id: string | null;
  score: number;
  score_breakdown: ProspectionScoreBreakdownEntry[];
  created_at: string;
};

/** Row shape for `prospection_contacts` (CONT-05 : provenance + rétention RGPD). */
export type ProspectionContactRow = {
  id: string;
  org_id: string;
  company_id: string;
  full_name: string;
  job_title: string | null;
  linkedin_url: string | null;
  email: string | null;
  email_enriched_at: string | null;
  contact_source: ProspectionContactSource;
  contact_sourced_at: string;
  gdpr_retention_expires_at: string;
  created_at: string;
  updated_at: string;
};

/** Row shape for `prospection_actions` (LIST-02 : historique des statuts). */
export type ProspectionActionRow = {
  id: string;
  org_id: string;
  company_id: string;
  user_id: string;
  status: ProspectionCompanyStatus;
  note: string | null;
  created_at: string;
};
