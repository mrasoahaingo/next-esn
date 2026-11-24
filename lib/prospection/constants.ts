// ─── Seuil de chaleur (CONT-04, D-01..D-03) ────────────────────────────────

/** Seuil par défaut tant qu'aucune ligne `prospection_settings` n'existe pour l'org (D-03). */
export const DEFAULT_HEAT_THRESHOLD = 60;
export const HEAT_THRESHOLD_MIN = 0;
export const HEAT_THRESHOLD_MAX = 100;

// ─── Listes fermées (alignées sur les CHECK de la migration prospection_domain) ─
// Pas d'enum Postgres : chaque liste correspond à un CHECK nommé
// `prospection_<table>_<col>_check`. Toute extension = nouvelle migration
// (`ALTER TABLE … DROP CONSTRAINT IF EXISTS <nom>` puis `ADD CONSTRAINT <nom> CHECK (…)`)
// + mise à jour de la constante ci-dessous. `migration-contract.test.ts` vérifie l'alignement.

export const PROSPECTION_SIGNAL_SOURCES = ['france_travail', 'sirene', 'pappers', 'scrapin'] as const;

export const PROSPECTION_SIGNAL_TYPES = [
  'job_posting',
  'headcount_growth',
  'funding',
  'financial_growth',
  'legal_event',
  'leadership_change',
] as const;

export const PROSPECTION_COMPANY_STATUSES = ['new', 'to_call', 'called', 'dismissed'] as const;

export const PROSPECTION_CONTACT_SOURCES = ['scrapin', 'dropcontact', 'pappers', 'manual'] as const;

export const PROSPECTION_RUN_STATUSES = ['running', 'completed', 'partial', 'failed'] as const;

export const PROSPECTION_RUN_TRIGGERS = ['cron', 'manual'] as const;

export type ProspectionSignalSource = (typeof PROSPECTION_SIGNAL_SOURCES)[number];
export type ProspectionSignalType = (typeof PROSPECTION_SIGNAL_TYPES)[number];
export type ProspectionCompanyStatus = (typeof PROSPECTION_COMPANY_STATUSES)[number];
export type ProspectionContactSource = (typeof PROSPECTION_CONTACT_SOURCES)[number];
export type ProspectionRunStatus = (typeof PROSPECTION_RUN_STATUSES)[number];
export type ProspectionRunTrigger = (typeof PROSPECTION_RUN_TRIGGERS)[number];
