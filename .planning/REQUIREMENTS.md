# Requirements: Next-ESN

**Defined:** 2026-06-04  
**Milestone:** v1.2 Multi-langue  
**Core value:** L'utilisateur a toujours un feedback clair et fiable quand l'IA travaille

v1.1 requirements : `.planning/milestones/v1.1-REQUIREMENTS.md` (FLOW-*, LAT-*, RES-*)

---

## v1.2 — Modèle de données langue (LANG)

- [ ] **LANG-01** : Après l'extraction d'un CV, le système détecte la langue (`fr` ou `en`) depuis la branche identity et la persiste dans `candidates.language`.
- [ ] **LANG-02** : Après l'analyse d'une mission, le système détecte la langue (`fr` ou `en`) et la persiste dans `missions.language`.
- [ ] **LANG-03** : L'utilisateur peut voir et modifier la langue détectée d'un CV sur la page de review — sans déclencher une nouvelle extraction.
- [ ] **LANG-04** : L'utilisateur peut voir et modifier la langue d'une mission sur le formulaire d'édition.
- [ ] **LANG-05** : L'organisation dispose d'une langue par défaut (`fr|en`) dans `organization_settings.default_language`, utilisée en fallback quand la langue n'est pas encore détectée.

## v1.2 — Contenu IA langue-aware (AI)

- [ ] **AI-01** : Les branches d'extraction CV (expériences, formations, compétences) génèrent leur output dans la langue du CV (`candidates.language`).
- [ ] **AI-02** : Les branches d'analyse de mission génèrent leur output dans la langue de la mission (`missions.language`).
- [ ] **AI-03** : L'analyse de positionnement (compétences, expériences, gaps, synthèse) génère son output dans la langue de la **mission** — y compris quand le CV est dans une langue différente.
- [ ] **AI-04** : La génération de positionnement (CV tailored, emails) génère ses artefacts dans la langue de la **mission** — si CV est FR et mission est EN, le CV tailored est en EN.
- [ ] **AI-05** : La branche de transcription (`cv.transcription`) n'est **pas** soumise à la directive de langue — le texte source est préservé tel quel.
- [ ] **AI-06** : Les noms de produits, d'entreprises et de certifications sont préservés verbatim dans les artefacts générés, quelle que soit la directive de langue.

## v1.2 — Labels PDF localisés (PDF)

- [ ] **PDF-01** : Le PDF exporté depuis le CV builder affiche ses labels de section dans la langue du candidat (`candidates.language`) — ex. `Skills` / `Compétences`, `Experience` / `Expériences`.
- [ ] **PDF-02** : Le CV tailored généré depuis un positionnement affiche ses labels de section dans la langue de la mission (`missions.language`).

## v1.2 — Infrastructure prompts (PROMPT)

- [ ] **PROMPT-01** : Tous les prompts LLM affectés (extraction CV hors transcription, analyse mission, analyse et génération de positionnement) contiennent une directive `{{language}}` remplaçant le hardcoding `"Langue : français"`. La valeur injectée est en langage naturel (`French` / `English`) pour éviter l'ambiguïté dans les prompts.
- [ ] **PROMPT-02** : `resolveLlmTask` émet un `console.warn` quand le prompt rendu contient encore des placeholders non résolus (`{{`) — protection contre le silent passthrough.

---

## Out of scope (v1.2)

| Item | Reason |
|------|--------|
| I18n de l'UI applicative (sidebar, headers) | Trop large — pas de framework i18n, Clerk reste `frFR` |
| Radar (`lib/radar/brief.ts`) multi-langue | Prompt hardcodé en code, domaine séparé |
| Langues au-delà de FR + EN | Scope v1.2 limité aux 2 premières |
| Cancel fiable d'un workflow | Runtime `@workflow/next` beta |
| Re-extraction automatique sur changement de langue | LANG-03/04 : override direct sans re-run |
| Prompts séparés par langue | Un row par task_key avec `{{language}}` — pas de doublons |
| Traduction rétroactive des analyses historiques | Pas de valeur, risque de corruption |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LANG-01 | TBD | Pending |
| LANG-02 | TBD | Pending |
| LANG-03 | TBD | Pending |
| LANG-04 | TBD | Pending |
| LANG-05 | TBD | Pending |
| AI-01 | TBD | Pending |
| AI-02 | TBD | Pending |
| AI-03 | TBD | Pending |
| AI-04 | TBD | Pending |
| AI-05 | TBD | Pending |
| AI-06 | TBD | Pending |
| PDF-01 | TBD | Pending |
| PDF-02 | TBD | Pending |
| PROMPT-01 | TBD | Pending |
| PROMPT-02 | TBD | Pending |

**Coverage:** 15 exigences v1.2 — traceability à remplir par le roadmapper.

---
*Requirements defined: 2026-06-04*  
*Last updated: 2026-06-04 after initial definition*
