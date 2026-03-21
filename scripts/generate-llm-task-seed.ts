/**
 * Génère la migration SQL des `llm_tasks` à partir des builders actuels
 * (placeholders {{displayName}} / {{brandContextBlock}} pour le positionnement).
 *
 * Exécution : pnpm exec tsx scripts/generate-llm-task-seed.ts > supabase/migrations/20260326_seed_llm_tasks_data.sql
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { TASK_KEY } from '../lib/llm/task-keys';
import {
  EXTRACTION_SYSTEM_EDUCATION,
  EXTRACTION_SYSTEM_EXPERIENCES,
  EXTRACTION_SYSTEM_IDENTITY,
  EXTRACTION_SYSTEM_SKILLS_STRENGTHS,
  TRANSCRIPTION_SYSTEM,
  buildPositioningAnalysisExperiencesSystemPrompt,
  buildPositioningAnalysisGapsSystemPrompt,
  buildPositioningAnalysisQuestionsSystemPrompt,
  buildPositioningAnalysisSkillsSystemPrompt,
  buildPositioningSynthesisPrompt,
  buildPositioningGenerateCandidateEmailSystemPrompt,
  buildPositioningGenerateEmailBulletPointsSystemPrompt,
  buildPositioningGenerateEmailFirstContactSystemPrompt,
  buildPositioningGenerateEmailSystemPrompt,
  buildPositioningGenerateTailoredCvSystemPrompt,
  buildJobPostingAnalysisExecutivePrompt,
  buildJobPostingAnalysisKeyPointsPrompt,
  buildJobPostingKeyPointExplainPrompt,
} from './llm-seed-prompt-builders';

const B: { displayName: string; brandContextBlock: string } = {
  displayName: '{{displayName}}',
  brandContextBlock: '{{brandContextBlock}}',
};

function esc(s: string): string {
  return "'" + s.replace(/'/g, "''") + "'";
}

type Row = {
  key: string;
  label: string;
  desc: string | null;
  prompt: string;
  useJson: boolean;
};

const rows: Row[] = [
  { key: TASK_KEY.CV_TRANSCRIPTION, label: 'Transcription PDF CV', desc: null, prompt: TRANSCRIPTION_SYSTEM, useJson: false },
  { key: TASK_KEY.CV_BRANCH_IDENTITY, label: 'Extraction identité CV', desc: null, prompt: EXTRACTION_SYSTEM_IDENTITY, useJson: true },
  { key: TASK_KEY.CV_BRANCH_EXPERIENCES, label: 'Extraction expériences CV', desc: null, prompt: EXTRACTION_SYSTEM_EXPERIENCES, useJson: true },
  { key: TASK_KEY.CV_BRANCH_EDUCATION, label: 'Extraction formations CV', desc: null, prompt: EXTRACTION_SYSTEM_EDUCATION, useJson: true },
  { key: TASK_KEY.CV_BRANCH_SKILLS, label: 'Extraction compétences / forces CV', desc: null, prompt: EXTRACTION_SYSTEM_SKILLS_STRENGTHS, useJson: true },
  { key: TASK_KEY.POSITIONING_ANALYSIS_SKILLS, label: 'Analyse positionnement — compétences', desc: null, prompt: buildPositioningAnalysisSkillsSystemPrompt(B), useJson: true },
  { key: TASK_KEY.POSITIONING_ANALYSIS_EXPERIENCES, label: 'Analyse positionnement — expériences', desc: null, prompt: buildPositioningAnalysisExperiencesSystemPrompt(B), useJson: true },
  { key: TASK_KEY.POSITIONING_ANALYSIS_GAPS, label: 'Analyse positionnement — lacunes', desc: null, prompt: buildPositioningAnalysisGapsSystemPrompt(B), useJson: true },
  { key: TASK_KEY.POSITIONING_ANALYSIS_QUESTIONS, label: 'Analyse positionnement — questions', desc: null, prompt: buildPositioningAnalysisQuestionsSystemPrompt(B), useJson: true },
  { key: TASK_KEY.POSITIONING_ANALYSIS_SYNTHESIS, label: 'Analyse positionnement — synthèse score', desc: null, prompt: buildPositioningSynthesisPrompt(B), useJson: true },
  { key: TASK_KEY.POSITIONING_GENERATE_TAILORED_CV, label: 'Génération — CV adapté', desc: null, prompt: buildPositioningGenerateTailoredCvSystemPrompt(B), useJson: true },
  { key: TASK_KEY.POSITIONING_GENERATE_EMAIL, label: 'Génération — email client', desc: null, prompt: buildPositioningGenerateEmailSystemPrompt(B), useJson: true },
  { key: TASK_KEY.POSITIONING_GENERATE_EMAIL_FIRST_CONTACT, label: 'Génération — premier contact', desc: null, prompt: buildPositioningGenerateEmailFirstContactSystemPrompt(B), useJson: true },
  { key: TASK_KEY.POSITIONING_GENERATE_EMAIL_BULLETS, label: 'Génération — email puces', desc: null, prompt: buildPositioningGenerateEmailBulletPointsSystemPrompt(B), useJson: true },
  { key: TASK_KEY.POSITIONING_GENERATE_CANDIDATE_EMAIL, label: 'Génération — email candidat', desc: null, prompt: buildPositioningGenerateCandidateEmailSystemPrompt(B), useJson: true },
  { key: TASK_KEY.MISSION_JOB_POSTING_EXECUTIVE, label: 'Mission — résumé exécutif fiche de poste', desc: null, prompt: buildJobPostingAnalysisExecutivePrompt(), useJson: true },
  { key: TASK_KEY.MISSION_JOB_POSTING_KEY_POINTS, label: 'Mission — points clés fiche de poste', desc: null, prompt: buildJobPostingAnalysisKeyPointsPrompt(), useJson: true },
  { key: TASK_KEY.MISSION_KEY_POINT_EXPLAIN, label: 'Mission — explication point clé', desc: null, prompt: buildJobPostingKeyPointExplainPrompt(), useJson: false },
];

const out: string[] = [];
out.push(`-- Seed llm_tasks (généré par scripts/generate-llm-task-seed.ts)
-- Ne pas éditer à la main : régénérer le script si les prompts changent.

`);

const values = rows.map((r) => {
  const desc = r.desc === null ? 'NULL' : esc(r.desc);
  return `(${esc(r.key)}, ${esc(r.label)}, ${desc}, (SELECT id FROM llm_models WHERE gateway_model_id = 'google/gemini-2.5-flash' LIMIT 1), ${esc(r.prompt)}, ${r.useJson})`;
});

out.push(`INSERT INTO llm_tasks (task_key, label, description, model_id, system_prompt_template, use_extract_json_middleware)
VALUES
${values.join(',\n')}
ON CONFLICT (task_key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  model_id = EXCLUDED.model_id,
  system_prompt_template = EXCLUDED.system_prompt_template,
  use_extract_json_middleware = EXCLUDED.use_extract_json_middleware,
  updated_at = now();
`);

const target = join(process.cwd(), 'supabase/migrations/20260326_seed_llm_tasks_data.sql');
writeFileSync(target, out.join('\n'), 'utf8');
console.error('Written:', target);
