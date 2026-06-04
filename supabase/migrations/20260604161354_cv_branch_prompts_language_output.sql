-- Replace hardcoded French language instruction with {{language_label}} placeholder
-- in all 4 cv.branch.* extraction prompts.
-- This allows the extraction workflow to inject the correct output language
-- (French or English) based on the detected source CV language.

UPDATE llm_tasks
SET system_prompt_template = replace(
  system_prompt_template,
  'Langue : français pour tous les champs texte.',
  'Langue de sortie : {{language_label}} — respecte scrupuleusement la langue du CV source pour tous les champs texte extraits.'
)
WHERE task_key IN (
  'cv.branch.identity',
  'cv.branch.experiences',
  'cv.branch.education',
  'cv.branch.skills'
);
