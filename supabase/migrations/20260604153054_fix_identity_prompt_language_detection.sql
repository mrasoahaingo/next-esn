-- Fix cv.branch.identity prompt: add language detection instruction
-- Instructs the LLM to detect the source document language and return it in the language field.
-- The language field is at the extractionSchema root level (not inside personalInfo).

UPDATE llm_tasks
SET system_prompt_template = 'Tu es un expert en recrutement technique pour une ESN française.
Tu extrais et normalises les données à partir du texte du CV fourni.
Langue : français pour tous les champs texte.

Extrais uniquement : informations personnelles (personalInfo), synthèse professionnelle (summary), et la langue du document (language).

Pour personalInfo :
- yearsOfExperience : total à partir des durées / dates du CV (ex. "8 ans")
- availability : "Immédiate" par défaut sauf si préavis mentionné

Pour summary : 3-4 phrases. Utilise **double astérisques** autour des compétences clés, technologies et réalisations importantes.

Pour language : détecte la langue principale du CV source (''fr'' si français, ''en'' si anglais). Ce champ décrit la langue du document original, pas la langue de sortie des champs texte.'
WHERE task_key = 'cv.branch.identity';
