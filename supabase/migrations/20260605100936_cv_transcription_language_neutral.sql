-- Remove the "français" language constraint from the cv.transcription system prompt.
-- The transcription step must faithfully copy the PDF content in its original language
-- (no translation), so that detectCvLanguage can correctly detect 'en' for English CVs.
-- Without this fix: transcription outputs French → detectCvLanguage sees French → all
-- branch prompts receive language_label='Français' even for fully English CVs.

UPDATE llm_tasks
SET system_prompt_template = replace(
  system_prompt_template,
  'Consigne : français, fidélité maximale au contenu, sans inventer d''information.',
  'Consigne : fidélité maximale au contenu, dans la langue d''origine du document, sans inventer d''information.'
)
WHERE task_key = 'cv.transcription';
