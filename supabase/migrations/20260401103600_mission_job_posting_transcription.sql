-- Transcription PDF fiche de poste (import fichier → texte, même principe que cv.transcription)

INSERT INTO llm_tasks (task_key, label, description, model_id, system_prompt_template, use_extract_json_middleware)
VALUES (
  'mission.jobPosting.transcription',
  'Mission — transcription PDF fiche de poste',
  'Extraction texte brut depuis PDF pour remplir la description de poste',
  (SELECT id FROM llm_models WHERE gateway_model_id = 'google/gemini-2.5-flash' LIMIT 1),
  $prompt$Tu transcris une fiche de poste depuis le document PDF en texte brut.
Consigne : français, fidélité maximale au contenu, sans inventer d''information.
Préserve la structure : titres, puces, listes de compétences, contraintes, localisation, type de contrat.
Ne produis pas de JSON ; uniquement du texte brut ou markdown léger (titres ##).$prompt$,
  false
)
ON CONFLICT (task_key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  model_id = EXCLUDED.model_id,
  system_prompt_template = EXCLUDED.system_prompt_template,
  use_extract_json_middleware = EXCLUDED.use_extract_json_middleware,
  updated_at = now();
