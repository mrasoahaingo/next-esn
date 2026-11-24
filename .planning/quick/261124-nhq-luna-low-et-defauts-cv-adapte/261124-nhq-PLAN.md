---
phase: quick-261124-nhq
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/ai.ts
  - lib/ai.test.ts
  - lib/utils/esneo-wordmark-svg.ts
  - lib/utils/prepare-template-for-pdf.ts
  - lib/utils/prepare-template-for-pdf.test.ts
  - lib/services/pdf.service.ts
  - templates/cv-dossier-layout.ts
  - templates/cv-dossier-layout.test.ts
  - lib/utils/cv-sanitize.ts
  - lib/utils/cv-sanitize.test.ts
  - lib/schema.ts
  - lib/utils/cv-experience-time.ts
  - lib/utils/cv-experience-time.test.ts
  - lib/utils/cv-date-years.ts
  - workflows/extract-cv.ts
  - workflows/positioning-generate.ts
  - lib/services/positioning.service.ts
  - lib/services/positioning.service.test.ts
  - lib/stores/positioning.store.ts
  - lib/stores/cv-builder.store.ts
autonomous: true
requirements: [QUICK-261124-nhq]

must_haves:
  truths:
    - "Tout appel à un modèle OpenAI de raisonnement (openai/gpt-6-luna, o*, gpt-5..9 hors -chat) part avec providerOptions.openai.reasoningEffort = 'low' sauf si l'appelant fournit une autre valeur ; les modèles non-raisonnement ne reçoivent pas reasoningEffort"
    - "Le PDF (aperçu, export positionnement, génération candidat) affiche le logo Esneo par défaut quand le gabarit n'a ni url ni svgInline, sans ENOENT ni chemin file: dans le spec"
    - "Aucun champ du CV (éditeur, PDF, base après génération/extraction) n'affiche la chaîne littérale 'null' ou 'undefined' pour email/téléphone/localisation/etc."
    - "Les noms de compétences (skills.*.name, experiences[].skills) ne contiennent plus de ** / __ / emphase * ; le résumé garde son gras markdown"
    - "Le CV adapté persisté a personalInfo.yearsOfExperience égal à la valeur calculée par formatTotalExperienceYears sur le CV source, et le prompt de génération impose de réutiliser cette valeur telle quelle dans le résumé et les emails"
  artifacts:
    - path: "lib/ai.ts"
      provides: "défaut reasoningEffort 'low' injecté par le garde-fou pour les modèles OpenAI de raisonnement"
      contains: "reasoningEffort"
    - path: "lib/utils/esneo-wordmark-svg.ts"
      provides: "SVG du logo Esneo construit depuis PATH_D, couleur explicite (pas de currentColor)"
      exports: ["buildEsneoWordmarkSvg", "PDF_HEADER_LOGO_FILL"]
    - path: "lib/utils/cv-sanitize.ts"
      provides: "normalisation déterministe d'un CV (null-like → absent, markdown retiré des compétences)"
      exports: ["isNullLikeText", "stripSkillMarkdown", "sanitizeExtractedCv"]
    - path: "lib/utils/cv-experience-time.ts"
      provides: "durée d'expérience calculée au mois près, arrondie à l'inférieur ; source de vérité unique"
      exports: ["formatTotalExperienceYears", "prepareCvForMatchingPrompt"]
    - path: "lib/services/positioning.service.ts"
      provides: "bloc « Règles de sortie » ajouté au message utilisateur de génération"
      exports: ["buildGenerateUserContent", "buildGenerateOutputRulesBlock"]
  key_links:
    - from: "lib/ai.ts createGatewayGuardMiddleware"
      to: "providerOptions.openai.reasoningEffort"
      via: "transformParams (défauts avant les options de l'appelant)"
      pattern: "reasoningEffort: 'low'"
    - from: "lib/utils/prepare-template-for-pdf.ts"
      to: "lib/utils/esneo-wordmark-svg.ts"
      via: "rasterisation sharp du logo par défaut en data:image/png"
      pattern: "buildEsneoWordmarkSvg"
    - from: "workflows/positioning-generate.ts"
      to: "lib/utils/cv-sanitize.ts + computed yearsOfExperience"
      via: "normalisation de acc.tailoredCv avant safeParse, puis emit() final"
      pattern: "sanitizeExtractedCv"
    - from: "templates/cv-dossier-layout.ts buildCvDossierLayoutSpec"
      to: "lib/utils/cv-sanitize.ts"
      via: "normalisation au rendu (données déjà en base)"
      pattern: "sanitizeExtractedCv"
---

<objective>
Trois correctifs de production, sans nouvelle fonctionnalité :

1. Réduire la latence de toutes les tâches LLM sur `openai/gpt-6-luna` en passant le raisonnement à `low` par défaut via le garde-fou `lib/ai.ts` (aujourd'hui seule l'extraction l'a ; la branche skills de l'analyse est à 305 s, le CV adapté à 188 s).
2. Corriger trois défauts du CV adapté : chaîne `null` affichée (A), `**` dans les compétences (B), années d'expérience incohérentes entre tableau et résumé (C).
3. Corriger le logo manquant du PDF (ENOENT sur `/var/task/file:/var/task/public/esneo-full.svg`).

Purpose : Core Value — l'IA doit rendre un résultat fiable et dans des délais tenables ; un CV envoyé à un client ne doit pas contenir « null », du markdown brut ou deux durées d'expérience contradictoires.
Output : garde-fou mis à jour, normaliseur de CV, calcul d'expérience au mois près, bloc de règles de sortie côté code, logo rastérisé. Aucune migration de données ni de prompt à appliquer en prod.
</objective>

<execution_context>
@/Users/mrasoahaingo/Projects/perso/next-esn/.claude/get-shit-done/workflows/execute-plan.md
@/Users/mrasoahaingo/Projects/perso/next-esn/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
Répertoire de travail OBLIGATOIRE : `/Users/mrasoahaingo/Projects/perso/next-esn-fix-a` (worktree git, branche `luna-low-defauts-cv`, depuis origin/main). Lire/écrire uniquement là. `node_modules` est un lien symbolique : ne jamais le committer. Ne pas toucher aux `.env*`. Aucun accès base distante. Docs et messages de commit en français.

@/Users/mrasoahaingo/Projects/perso/next-esn-fix-a/CLAUDE.md
@/Users/mrasoahaingo/Projects/perso/next-esn-fix-a/.planning/STATE.md
@/Users/mrasoahaingo/Projects/perso/next-esn-fix-a/lib/ai.ts
@/Users/mrasoahaingo/Projects/perso/next-esn-fix-a/lib/ai.test.ts

<diagnostic>
Causes racines établies pendant la planification (lecture du code, pas d'accès prod) :

LOGO — certain. `templates/cv-dossier-layout.ts` l.14 construit `WORDMARK_FALLBACK_LOGO_SRC = pathToFileURL(path.join(process.cwd(), 'public', 'esneo-full.svg')).href`, utilisé quand `config.logo.url` est vide (défaut `DEFAULT_TEMPLATE_CONFIG.logo.url = ''`). `@react-pdf/image@3.0.4` (`getAbsoluteLocalPath`) fait `path.resolve(src)` sur la chaîne brute : `path.resolve('file:///var/task/public/x.svg')` = `/var/task/file:/var/task/public/x.svg` → ENOENT. Bug aussi présent en local (même mécanique). Deuxième problème masqué : même avec un bon chemin, react-pdf n'accepte que JPEG/PNG (`isValidFormat`, `getImageFormat`) → un SVG échouerait (« Not valid image extension »). `lib/utils/prepare-template-for-pdf.ts` rastérise déjà un `svgInline` collé via `sharp` (dépendance 0.34.5 présente) ; le logo par défaut ne passe pas par là. Enfin `generateCvPdf` ne prépare le gabarit que si `templateConfig !== undefined`.

A « null » — très probable. Depuis le passage à gpt-6-luna avec `strictJsonSchema: false`, le modèle émet `null` (JSON) ou la chaîne `"null"` pour les champs optionnels absents. `workflows/extract-cv.ts` l.404 : `extractionSchema.safeParse(acc)` échoue sur `phone: null` (`z.string().optional()` refuse null) → le `acc` BRUT est persisté (et `prepareCvForMatchingPrompt` n'est pas appliqué). `buildGenerateUserContent` sérialise ce CV (`"phone": null`) dans le prompt ; la branche tailoredCv (schéma : string) recopie en `"null"`. `workflows/positioning-generate.ts` l.367-368 persiste aussi `acc` brut si safeParse échoue. L'éditeur (`app/review/components/PersonalInfo.tsx`, `value={data?.phone ?? ''}`) et le PDF (`if (pi.phone && …)` l.377-378 du layout) affichent donc la chaîne littérale.

B `**` — certain sur le mécanisme. `extractionSchema.summary.describe` et le prompt `cv.branch.identity` demandent du gras `**…**` ; rien n'interdit le markdown dans `skillSchema.name` / `experiences[].skills` ; le modèle généralise. Aucun nettoyage à l'écriture ni au rendu (`addSkillsBlock` l.436-449 joint les noms tels quels).

C années — certain sur la source. `personalInfo.yearsOfExperience` du CV source est recalculé par `prepareCvForMatchingPrompt` → `formatTotalExperienceYears` (union des périodes, granularité ANNÉE : début = janvier, fin = décembre, `Math.round`) — à l'extraction (si parse OK) et dans les prompts analyse/génération. Ce calcul surestime (ex. « Sept 2019 – présent » au 11/2026 → 8 ans au lieu de 7). Le tableau PDF affiche ce champ (« 10 ans ») ; le résumé est un texte libre du LLM qui reprend une autre valeur (résumé source / calcul du modèle : « plus de 7 ans »). Aucune consigne n'aligne les deux.

Raisonnement — pas de `maxDuration` dans `app/`, ni `vercel.json`. Les seuls timeouts de branche (45 s / 90 s) sont dans `workflows/extract-cv.ts` l.272-377 et l'extraction tourne déjà en `low` : rien à changer, ils restent cohérents.
</diagnostic>

<interfaces>
lib/ai.ts (existant) :
- `isOpenAiReasoningGatewayModel(gatewayModelId: string): boolean` — regex `^openai\/(o\d|gpt-[5-9])`, exclut `-chat`.
- `createGatewayGuardMiddleware(gatewayModelId)` : `transformParams` → `applyGatewayCompliance` → si `openai/*` `relaxOpenAiStrictJsonSchema` → si raisonnement retire temperature/topP.
- `relaxOpenAiStrictJsonSchema(params)` : `openai: { strictJsonSchema: false, ...(params.providerOptions?.openai ?? {}) }` (défaut puis options appelant).
- `llmExtractionSettings.providerOptions.openai.reasoningEffort = 'low'` (à conserver).

lib/utils/prepare-template-for-pdf.ts : `prepareTemplateConfigForPdf(config: TemplateConfig): Promise<TemplateConfig>` — rastérise `config.logo.svgInline` via `sharp(Buffer.from(svg), { density: 144 }).resize(w*2, h*2, { fit: 'inside' }).png()` → `logo.url = data:image/png;base64,…`, `svgInline: undefined` ; en cas d'erreur, log + `svgInline: undefined`.

lib/utils/template.ts : `resolvePdfLogoSrc(logo, fallbackSrc): string` ; `mergeTemplateWithDefaults(partial | undefined): TemplateConfig`.

templates/cv-dossier-layout.ts : `buildCvDossierLayoutSpec(data: Partial<ExtractedCV>, templateConfig?: Partial<TemplateConfig>): Spec` ; élément `header-logo` (type `FixedImage`, props.src) ; `resolveTheme(colors).headerNameColor = '#ffffff'` (bandeau sur `colors.primary`).

components/esneo-full-logo.tsx : `export const PATH_D: string` (viewBox `0 0 2816 510`, `<g transform="translate(0 -535)">`) — déjà importé côté serveur par `app/opengraph-image.tsx`.

lib/schema.ts : `skillSchema = { name, source, starred, added }` ; `extractionSchema.personalInfo = { firstName, lastName, title, email (.email().optional().catch(undefined)), phone?, location?, yearsOfExperience?, availability?, inferredSeniorityBand?, seniorityInferenceNote? }` ; `experiences[] = { role, company, companyDomain?, location?, startDate, endDate?, isCurrent, description[], skills?[], spacingAfter? }` ; `education[] = { degree, school, year, spacingAfter? }` ; `skills = { technologies, softSkills, expertises, methodologies }: Skill[]` ; `strengths?: string[]`.

lib/utils/cv-experience-time.ts : `formatTotalExperienceYears(cv, referenceDate, language = 'fr'): string | undefined` ; `prepareCvForMatchingPrompt(cv, referenceDate): ExtractedCV` (normalise poste en cours + écrase `personalInfo.yearsOfExperience`). Helper interne `experienceToInclusiveMonthInterval` (début = janvier de l'année min, fin = décembre de l'année max ou mois de référence si `isCurrent`).

lib/utils/cv-date-years.ts : `extractYearsFromDateString(s): number[]` (années 19xx/20xx).

lib/services/positioning.service.ts : `buildGenerateUserContent(cv, jobDescription, analysis, answers, jobAnalysis?, matchingWeights?, options?: { positionHeadline?, referenceDate? }): string` — calcule `cvPrepared = prepareCvForMatchingPrompt(cv, referenceDate)` puis concatène preamble + cvBlock + jobTail + analyse + réponses. Ce message utilisateur est partagé par les 5 branches de génération (tailoredCv + 4 emails).

workflows/positioning-generate.ts : `fetchAndGenerate` — `acc: PositioningGenerateAccumulator`, `emit()` (écrit un frame NDJSON du snapshot), `runLocked(fn)`, après `await Promise.all(branchTasks)` : `positioningOutputSchema.safeParse(acc)` → `object = parsed.success ? parsed.data : acc` → `sanitizeForJsonb` → update. Le client (`app/review/[id]/positioning/[positioningId]/page.tsx` l.607-610, l.650-654) copie le dernier frame dans le store puis le resauvegarde (debounce) dès que la génération n'est plus active : la correction serveur doit donc AUSSI partir dans un dernier frame.

Stores : `usePositioningStore.setTailoredCv(data | null)` ; `useCvBuilderStore.setCvData(data | null)` — utilisés au chargement et au streaming ; les modifications utilisateur passent par `updateTailoredCvField` / `updateField` (ne pas les toucher).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1 : reasoningEffort 'low' par défaut dans le garde-fou + logo PDF rastérisé</name>
  <files>lib/ai.ts, lib/ai.test.ts, lib/utils/esneo-wordmark-svg.ts, lib/utils/prepare-template-for-pdf.ts, lib/utils/prepare-template-for-pdf.test.ts, lib/services/pdf.service.ts, templates/cv-dossier-layout.ts, templates/cv-dossier-layout.test.ts</files>
  <behavior>
    - ai.test : `guardLanguageModel(base, 'openai/gpt-6-luna')` sans providerOptions → `doGenerateCalls[0].providerOptions.openai` vaut `{ strictJsonSchema: false, reasoningEffort: 'low' }`.
    - ai.test : appelant `{ openai: { reasoningEffort: 'medium' } }` sur gpt-6-luna → `reasoningEffort: 'medium'` conservé (surcharge).
    - ai.test : `'openai/gpt-4o'` (OpenAI non-raisonnement) → `openai` vaut `{ strictJsonSchema: false }`, sans `reasoningEffort`.
    - ai.test : `'google/gemini-2.5-flash'` → `providerOptions.openai` undefined (test existant conservé).
    - ai.test : mettre à jour le cas « explicit » existant (`strictJsonSchema: true` sur gpt-6-luna) → attendu `{ strictJsonSchema: true, reasoningEffort: 'low' }`. Le test existant `{ strictJsonSchema: false, reasoningEffort: 'low' }` reste vert. Vérifier aussi en streaming (doStream) une fois.
    - prepare-template-for-pdf.test : config issue de `mergeTemplateWithDefaults(undefined)` (logo.url vide, pas de svgInline) → résultat `logo.url` commence par `data:image/png;base64,` et `svgInline` undefined (sharp réel).
    - prepare-template-for-pdf.test : `logo.url = 'https://exemple.test/logo.png'` → inchangé (pas de rastérisation).
    - cv-dossier-layout.test : `buildCvDossierLayoutSpec(cvMinimal, { ...defaults, logo: { url: '', width: 90, height: 20 } })` → aucun élément `header-logo` dans `spec.elements` et aucune valeur `src` commençant par `file:` ; avec `logo.url = 'data:image/png;base64,AAAA'` → `header-logo.props.src` vaut cette data URL.
  </behavior>
  <action>
RED d'abord : écrire/adapter les tests ci-dessus, lancer vitest, constater l'échec, commit `test(quick-261124-nhq): …`. Puis GREEN.

(1) Raisonnement — `lib/ai.ts` : dans `createGatewayGuardMiddleware`, calculer une fois `const reasoning = isOpenAiReasoningGatewayModel(gatewayModelId)` (réutiliser pour le retrait temperature/topP). Remplacer l'appel à `relaxOpenAiStrictJsonSchema` par une fonction exportée `applyOpenAiDefaults(params, { reasoning: boolean }): GatewayCallParams` qui produit `openai: { strictJsonSchema: false, ...(reasoning ? { reasoningEffort: 'low' } : {}), ...(params.providerOptions?.openai ?? {}) }` — défauts d'abord, options appelant ensuite (même schéma que strictJsonSchema). Garder `relaxOpenAiStrictJsonSchema` exporté (délègue à `applyOpenAiDefaults(params, { reasoning: false })`) pour ne casser aucun import. Constante nommée `DEFAULT_OPENAI_REASONING_EFFORT = 'low'` avec commentaire FR : valeur vérifiée en prod sur l'extraction, `minimal` absent du catalogue Gateway pour gpt-6-luna, durées mesurées en medium (skills 305 s, CV adapté 188 s), surchargeable par l'appelant. Mettre à jour le commentaire de `llmFactualGenerationSettings` (raisonnement 'low' injecté par le garde-fou) et le JSDoc du middleware. Conserver `llmExtractionSettings.providerOptions.openai.reasoningEffort = 'low'` tel quel (explicite, test l.201 inchangé). Ne PAS toucher aux timeouts 45 s / 90 s de `workflows/extract-cv.ts` ; aucun `maxDuration` n'existe, n'en pas ajouter.

(2) Logo — créer `lib/utils/esneo-wordmark-svg.ts` : `export const PDF_HEADER_LOGO_FILL = '#ffffff'` (commentaire : même couleur que `resolveTheme().headerNameColor`, bandeau d'en-tête sur `colors.primary`) et `export function buildEsneoWordmarkSvg(fill: string): string` qui renvoie un SVG autonome `xmlns`, `viewBox="0 0 2816 510"`, `<g fill="${fill}" transform="translate(0 -535)"><path d="${PATH_D}"/></g>` avec `PATH_D` importé de `@/components/esneo-full-logo` (pas de `currentColor` : librsvg le rendrait noir ; pas de lecture disque → aucun besoin d'`outputFileTracingIncludes`). Dans `prepareTemplateConfigForPdf` : si `svgInline` vide/non-SVG ET `logo.url?.trim()` vide, utiliser `buildEsneoWordmarkSvg(PDF_HEADER_LOGO_FILL)` comme SVG à rastériser (même pipeline sharp existant, factoriser en une fonction interne `rasterizeSvgToPngDataUrl(svg, w, h)`). En cas d'échec sharp : `console.warn` avec contexte (« Logo PDF par défaut : rastérisation impossible ») et renvoyer `logo.url = ''` (pas de logo plutôt qu'une erreur). Dans `lib/services/pdf.service.ts` : toujours préparer — `resolved = await prepareTemplateConfigForPdf(mergeTemplateWithDefaults(templateConfig))` même si `templateConfig` est undefined. Dans `templates/cv-dossier-layout.ts` : supprimer `WORDMARK_FALLBACK_LOGO_SRC` et les imports `node:path` / `node:url` ; `const logoSrc = resolvePdfLogoSrc(config.logo, '')` ; si `logoSrc` vide, ne pas créer `header-logo` et ne pas l'ajouter aux `children` du conteneur (retirer `'header-logo'` du tableau `children: ['header-brand-name', 'header-logo']` dans ce cas). Mettre à jour le JSDoc de `resolvePdfLogoSrc` dans `lib/utils/template.ts` uniquement si nécessaire (sinon laisser le fichier hors périmètre).
  </action>
  <verify>
    <automated>cd /Users/mrasoahaingo/Projects/perso/next-esn-fix-a && npx vitest run lib/ai.test.ts lib/utils/prepare-template-for-pdf.test.ts templates/cv-dossier-layout.test.ts && npx tsc --noEmit && npx eslint lib/ai.ts lib/ai.test.ts lib/utils/esneo-wordmark-svg.ts lib/utils/prepare-template-for-pdf.ts lib/utils/prepare-template-for-pdf.test.ts lib/services/pdf.service.ts templates/cv-dossier-layout.ts templates/cv-dossier-layout.test.ts && test $(grep -v '^\s*//\|^\s*\*' templates/cv-dossier-layout.ts | grep -c "pathToFileURL\|esneo-full.svg") -eq 0</automated>
  </verify>
  <done>Tests verts ; gpt-6-luna reçoit reasoningEffort 'low' par défaut et l'appelant peut surcharger ; le spec PDF ne contient plus de src `file:` ; le logo par défaut arrive en data:image/png ; tsc et eslint propres.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2 : défauts A (« null ») et B (markdown dans les compétences) — normaliseur à la source, à l'écriture et au rendu</name>
  <files>lib/utils/cv-sanitize.ts, lib/utils/cv-sanitize.test.ts, lib/schema.ts, lib/utils/cv-experience-time.ts, workflows/extract-cv.ts, workflows/positioning-generate.ts, templates/cv-dossier-layout.ts, lib/stores/positioning.store.ts, lib/stores/cv-builder.store.ts, lib/services/positioning.service.ts, lib/services/positioning.service.test.ts</files>
  <behavior>
    - `isNullLikeText(null)`, `isNullLikeText('null')`, `isNullLikeText(' NULL ')`, `isNullLikeText('undefined')` → true ; `isNullLikeText('')` → false ; `isNullLikeText('Nullam')` → false.
    - `stripSkillMarkdown('**TypeScript**')` → 'TypeScript' ; '__Node.js__' → 'Node.js' ; '*React*' → 'React' ; '**Node.js** (Express)' → 'Node.js (Express)' ; '**Type' → 'Type' (frame de streaming) ; 'C#' / 'C++' / '*nix' → inchangés ; '  Go  ' → 'Go'.
    - `sanitizeExtractedCv({ personalInfo: { firstName: 'A', lastName: 'B', title: 'T', email: 'null', phone: null, location: 'Paris' } })` → `email` et `phone` absents (clés supprimées), `location` conservé, firstName/lastName/title intacts ; un champ requis null-like (`title: 'null'`) devient ''.
    - Compétences : `skills.technologies = [{name:'**TypeScript**',…},{name:'TypeScript',…},{name:'null',…}]` → une seule entrée 'TypeScript' (dédoublonnage insensible à la casse, premier gardé, entrée null-like/vides retirées) ; éléments chaîne legacy (`'**Go**'`) nettoyés aussi ; `experiences[0].skills = ['**AWS**', '']` → ['AWS'].
    - `experiences[i].endDate = 'null'` → clé supprimée ; `companyDomain`/`location` null-like supprimés ; `strengths` null-like retirés.
    - `summary` contenant `**React**` → inchangé (le gras est légitime).
    - Idempotence : `sanitizeExtractedCv(sanitizeExtractedCv(x))` deep-equal `sanitizeExtractedCv(x)` ; pas de mutation de l'entrée ; objet partiel (clés absentes) → aucune clé ajoutée ; entrée non-objet renvoyée telle quelle.
    - positioning.service.test : `buildGenerateUserContent(...)` contient le titre « ## Règles de sortie » et la consigne interdisant la chaîne "null" et le markdown dans les noms de compétences ; un CV source avec `phone: 'null'` ne fait PAS apparaître `"phone"` dans le JSON du CV injecté.
  </behavior>
  <action>
RED : écrire `lib/utils/cv-sanitize.test.ts` et `lib/services/positioning.service.test.ts` (fixtures minimales typées `ExtractedCV`, s'inspirer du helper `baseCv` de `lib/utils/cv-experience-time.test.ts`), constater l'échec, commit test. GREEN :

(1) Créer `lib/utils/cv-sanitize.ts` (fonctions pures, types explicites, commentaires FR expliquant la cause : sorties OpenAI non strictes depuis gpt-6-luna) : `isNullLikeText(value: unknown): boolean` (null, ou chaîne dont le trim en minuscules vaut 'null' ou 'undefined') ; `stripSkillMarkdown(name: string): string` (supprimer toutes les occurrences de `**` et `__`, puis retirer une paire `*…*` ou `_…_` qui encadre toute la chaîne, puis trim — un `*` isolé en tête comme '*nix' reste) ; `sanitizeExtractedCv<T extends Partial<ExtractedCV>>(cv: T): T` qui copie (structuredClone ou spread) et applique : personalInfo — clés optionnelles (email, phone, location, yearsOfExperience, availability, inferredSeniorityBand, seniorityInferenceNote) null-like → `delete`, clés requises (firstName, lastName, title) null-like → '' ; summary null-like → '' (markdown conservé) ; experiences[] — companyDomain/location/endDate null-like → `delete`, role/company/startDate null-like → '', `skills` : stripSkillMarkdown + filtre vides/null-like + dédoublonnage ; education[] — degree/school/year null-like → '' ; skills.{technologies,softSkills,expertises,methodologies} — pour un objet `name = stripSkillMarkdown(name)`, pour une chaîne legacy idem, retirer vides/null-like, dédoublonner par nom insensible à la casse (garder la première occurrence, donc ses flags starred/added) ; strengths — retirer null-like. Ne jamais ajouter une clé absente ; tolérer tableaux/objets manquants ou mal typés (frames partielles de streaming).

(2) Source (prompts) : `lib/schema.ts` — ajouter des `.describe()` : `skillSchema.name` « Nom brut de la compétence, en texte simple : jamais de markdown (pas de **, __, *, backticks). » ; `experiences[].skills` (compléter la description existante avec « plain text, no markdown ») ; `phone` / `location` / `availability` « Omettre le champ s'il est absent du CV ; ne jamais écrire la chaîne "null". » ; pour `email`, placer le describe AVANT `.optional().catch(undefined)` (ne pas changer la sémantique décrite dans le commentaire existant, pas de `z.preprocess`). `lib/utils/cv-experience-time.ts` — `prepareCvForMatchingPrompt` applique `sanitizeExtractedCv` en premier (couvre l'extraction quand le parse réussit + les prompts analyse et génération). `lib/services/positioning.service.ts` — ajouter et exporter `buildGenerateOutputRulesBlock(cvPrepared: ExtractedCV): string` renvoyant un bloc « ## Règles de sortie (CV adapté et emails) » avec deux consignes : champ absent/inconnu → omettre la clé, ne jamais écrire "null"/"undefined" ; noms de compétences (`skills.*.name`, `experiences[].skills`) en texte brut sans markdown, le gras `**…**` n'étant autorisé que dans `summary`. L'ajouter à la fin du retour de `buildGenerateUserContent` (précédé de `\n\n`). Solution côté code retenue : AUCUNE migration de prompt (`llm_tasks.system_prompt_template`) n'est nécessaire.

(3) Écriture : `workflows/extract-cv.ts` l.404 — `const sanitizedAcc = sanitizeExtractedCv(acc)` puis `extractionSchema.safeParse(sanitizedAcc)` et fallback `object = sanitizedAcc` (le parse ne doit plus échouer sur un `null` d'un champ optionnel, ce qui réactive `prepareCvForMatchingPrompt` sur ce chemin). `workflows/positioning-generate.ts` — après `await Promise.all(branchTasks)` et AVANT `positioningOutputSchema.safeParse(acc)` : dans `runLocked`, si `acc.tailoredCv` existe, `acc.tailoredCv = sanitizeExtractedCv(acc.tailoredCv)` puis `await emit()` pour que le client reçoive la version corrigée (sinon son autosave debouncé réécrirait la version brute en base). Ce bloc sera enrichi en Task 3 (années) : le structurer en une fonction locale `finalizeTailoredCv()`.

(4) Rendu / lecture (données déjà en base, sans migration) : `templates/cv-dossier-layout.ts` — en tête de `buildCvDossierLayoutSpec`, `const cleanData = sanitizeExtractedCv(data)` et utiliser `cleanData` partout ensuite (couvre aperçu, export positionnement, génération candidat). `lib/stores/positioning.store.ts` `setTailoredCv` et `lib/stores/cv-builder.store.ts` `setCvData` : `set({ … : data ? sanitizeExtractedCv(data) : null })` — l'éditeur affiche des données propres et l'autosave existant les réécrit en base (auto-réparation). Ne pas toucher `updateTailoredCvField` / `updateField` (saisie utilisateur).
  </action>
  <verify>
    <automated>cd /Users/mrasoahaingo/Projects/perso/next-esn-fix-a && npx vitest run lib/utils/cv-sanitize.test.ts lib/services/positioning.service.test.ts lib/utils/cv-experience-time.test.ts templates/cv-dossier-layout.test.ts && npx tsc --noEmit && npx eslint lib/utils/cv-sanitize.ts lib/utils/cv-sanitize.test.ts lib/schema.ts lib/utils/cv-experience-time.ts workflows/extract-cv.ts workflows/positioning-generate.ts templates/cv-dossier-layout.ts lib/stores/positioning.store.ts lib/stores/cv-builder.store.ts lib/services/positioning.service.ts lib/services/positioning.service.test.ts</automated>
  </verify>
  <done>Normaliseur testé (null-like, markdown, dédoublonnage, idempotence) et branché aux 3 niveaux : prompt (schéma + règles + CV source nettoyé), écriture (extraction + génération avec frame final), rendu/lecture (layout PDF + stores). Aucune migration requise.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3 : défaut C — une seule source de vérité pour les années d'expérience</name>
  <files>lib/utils/cv-date-years.ts, lib/utils/cv-experience-time.ts, lib/utils/cv-experience-time.test.ts, lib/services/positioning.service.ts, lib/services/positioning.service.test.ts, workflows/positioning-generate.ts</files>
  <behavior>
    - `extractYearMonthFromDateString('09/2019')` → `{ year: 2019, month: 8 }` (0-based) ; '2019-09' → idem ; 'Septembre 2019' / 'sept. 2019' / 'September 2019' / 'Sep 2019' → idem ; '2019' → `{ year: 2019, month: undefined }` ; 'Présent' → undefined.
    - formatTotalExperienceYears, référence 2026-11-15 : une expérience `startDate: 'Septembre 2019'`, `isCurrent: true` → '7 ans' (87 mois, arrondi inférieur) ; même cas en `startDate: '2019'` → '7 ans' (Jan 2019 → Nov 2026 = 95 mois → 7, floor) ; périodes qui se chevauchent comptées une fois (test existant d'union conservé) ; le minimum de 1 an est conservé, au singulier : '1 an' / '1 year' (pas '1 ans').
    - Les tests existants restent verts sans modifier leurs attentes ('8 ans' / '8 years' pour startDate '2018' au 2026-03-01 ; undefined sans date exploitable).
    - positioning.service.test : avec `referenceDate = new Date('2026-11-15T00:00:00Z')` et un CV dont `experiences[0] = { startDate: '09/2019', isCurrent: true }` et `personalInfo.yearsOfExperience: '10 ans'`, `buildGenerateUserContent` contient `"yearsOfExperience": "7 ans"` dans le JSON du CV ET la consigne de règles de sortie qui cite exactement « 7 ans » ; `computeReferenceYearsOfExperience(cv, ref)` renvoie '7 ans'.
  </behavior>
  <action>
RED puis GREEN, comme les tâches précédentes.

Choix documenté (à écrire en JSDoc de `formatTotalExperienceYears` et dans le SUMMARY) : la source de vérité unique est la valeur CALCULÉE par `formatTotalExperienceYears` (déterministe, déjà utilisée à l'extraction et dans les prompts d'analyse) ; le champ `personalInfo.yearsOfExperience` du CV adapté en est dérivé à l'écriture, et le texte LLM (résumé, emails) reçoit l'ordre de la reprendre telle quelle. On ne réécrit pas le texte du résumé par regex (fragile : « 3 ans d'expérience en React » est légitime). Pour que cette source soit juste, le calcul passe au mois près quand le mois est connu, et à l'arrondi inférieur (cohérent avec la formulation « plus de N ans »).

(1) `lib/utils/cv-date-years.ts` : ajouter `extractYearMonthFromDateString(s: string): { year: number; month?: number } | undefined` — formats `MM/YYYY`, `MM-YYYY`, `YYYY-MM`, `YYYY/MM`, noms de mois FR et EN complets ou abrégés (avec ou sans point, accents tolérés : janv, févr/fevr, mars, avr, mai, juin, juil, août/aout, sept, oct, nov, déc/dec ; jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec), mois 0-based ; sans mois → `month: undefined`. Pour une plage contenant plusieurs dates, le parseur cible une seule date : l'appelant (`experienceToInclusiveMonthInterval`) l'applique à `startDate` (première date) et `endDate` (dernière date) séparément.

(2) `lib/utils/cv-experience-time.ts` : dans `experienceToInclusiveMonthInterval`, utiliser le mois de début s'il est connu (sinon janvier, comportement actuel), le mois de fin s'il est connu (sinon décembre, comportement actuel ; poste en cours → mois de référence, inchangé). `formatTotalExperienceYears` : `Math.max(1, Math.floor(totalMonths / 12))` au lieu de `Math.round` ; libellé singulier pour 1 ('1 an' / '1 year'). Exporter `computeReferenceYearsOfExperience(cv: ExtractedCV, referenceDate: Date): string | undefined` = `prepareCvForMatchingPrompt(cv, referenceDate).personalInfo?.yearsOfExperience` quand le calcul a abouti (renvoyer undefined si `formatTotalExperienceYears` renvoie undefined — ne pas renvoyer la valeur LLM d'origine).

(3) `lib/services/positioning.service.ts` : `buildGenerateOutputRulesBlock` reçoit aussi `yearsOfExperience: string | undefined` (objet paramètre `{ cvPrepared, yearsOfExperience }`) ; si défini, ajouter la consigne : « Durée d'expérience totale du candidat : **{X}** (calculée sur les dates des expériences). `tailoredCv.personalInfo.yearsOfExperience` vaut exactement "{X}". Si tu mentionnes la durée d'expérience totale (summary, emails), reprends exactement ce nombre ; ne la recalcule pas et n'utilise aucune autre valeur trouvée dans le CV source (ancien résumé, intitulé). » `buildGenerateUserContent` calcule la valeur avec le même `referenceDate` que `cvPrepared`.

(4) `workflows/positioning-generate.ts` : créer `const referenceDate = new Date()` une fois dans `fetchAndGenerate`, le passer à `buildGenerateUserContent` (`options.referenceDate`) et calculer `const referenceYears = computeReferenceYearsOfExperience(cv, referenceDate)`. Dans `finalizeTailoredCv()` (Task 2), après la normalisation : si `referenceYears` est défini et `acc.tailoredCv?.personalInfo` existe, écraser `acc.tailoredCv.personalInfo.yearsOfExperience = referenceYears` (le frame final émis porte donc la valeur alignée). Ne pas forcer la valeur au rendu PDF ni dans l'éditeur : une correction manuelle du recruteur reste prioritaire après génération.

Hors périmètre, à signaler dans le SUMMARY sans le traiter : le résumé du CV CANDIDAT (branche d'extraction identity, exécutée en parallèle des expériences, donc sans accès à la valeur calculée) peut encore citer une durée différente ; le passage floor/mois modifie la valeur affichée pour les prochaines extractions et générations (les CV déjà en base ne changent pas tant qu'ils ne sont pas regénérés).
  </action>
  <verify>
    <automated>cd /Users/mrasoahaingo/Projects/perso/next-esn-fix-a && npx vitest run lib/utils/cv-experience-time.test.ts lib/services/positioning.service.test.ts && npx vitest run && npx tsc --noEmit && npx eslint lib/utils/cv-date-years.ts lib/utils/cv-experience-time.ts lib/utils/cv-experience-time.test.ts lib/services/positioning.service.ts lib/services/positioning.service.test.ts workflows/positioning-generate.ts && npx next build --webpack</automated>
  </verify>
  <done>Durée calculée au mois près, arrondi inférieur, testée ; le prompt de génération impose cette valeur ; le CV adapté persisté et le dernier frame portent cette valeur ; suite vitest complète, tsc, eslint et `next build --webpack` passent (build > 1 min : le lancer via `hc run --bg --rm` si `$HC_TERMINAL_ID` est défini).</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| LLM → workflow | Sorties de gpt-6-luna non strictes (null, "null", markdown) entrent dans la base et le PDF |
| client → /api/pdf-preview, /api/positioning/[id]/export | `data` CV fourni par le navigateur, rendu côté serveur |
| serveur → AI Gateway | providerOptions par appel (ZDR + UE imposés, désormais reasoningEffort par défaut) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-nhq-01 | Tampering | workflows/positioning-generate.ts, workflows/extract-cv.ts | mitigate | `sanitizeExtractedCv` avant safeParse et avant `sanitizeForJsonb` ; aucune valeur LLM null-like ni markdown de compétence n'est persistée |
| T-nhq-02 | Tampering | templates/cv-dossier-layout.ts (données client) | mitigate | normalisation au rendu ; logo : plus aucune résolution de chemin disque dérivée d'une chaîne (`file:` supprimé), logo par défaut construit en mémoire depuis `PATH_D` |
| T-nhq-03 | Information disclosure | lib/ai.ts | mitigate | le nouveau défaut est fusionné dans le même `transformParams` APRÈS `applyGatewayCompliance` ; les tests ZDR/UE existants (dont « middleware hostile ») restent verts — ZDR + UE toujours imposés |
| T-nhq-04 | Denial of service | prepare-template-for-pdf (sharp) | accept | SVG constant connu (pas d'entrée utilisateur) ; échec sharp → PDF sans logo + warn, pas d'erreur 500 |
| T-nhq-05 | Repudiation / qualité | reasoningEffort 'low' sur l'analyse | accept | choix produit explicite (latence au ras de la limite de 300 s) ; surchargeable par appelant si une tâche le requiert |
</threat_model>

<verification>
- `npx vitest run` (suite complète) vert.
- `npx tsc --noEmit` sans erreur.
- `npx eslint` sur tous les fichiers touchés sans erreur.
- `npx next build --webpack` réussit (Turbopack refuse le node_modules lié du worktree).
- `grep -rn "pathToFileURL" templates lib` ne renvoie plus rien dans le code PDF.
- Aucun fichier `.env*`, aucun `node_modules`, aucune migration SQL dans le diff (`git status --porcelain`).
</verification>

<success_criteria>
- Garde-fou : `reasoningEffort: 'low'` par défaut sur tous les modèles OpenAI de raisonnement, surchargeable, absent ailleurs ; ZDR + UE inchangés.
- PDF : logo Esneo par défaut rendu (PNG data URL), plus d'ENOENT `file:` ; un logo custom (url ou svgInline) continue de fonctionner.
- CV : plus de « null » ni de `**` dans les compétences, ni à la génération, ni à l'extraction, ni à l'affichage de données existantes.
- Années : `yearsOfExperience` du CV adapté = valeur calculée (mois près, arrondi inférieur) ; le prompt impose de la reprendre dans le résumé et les emails.
- Pas de migration de données ni de prompt à appliquer en prod ; à vérifier après déploiement : durées `ai_usage_log` des branches d'analyse et du CV adapté, un PDF exporté avec logo, un CV adapté regénéré.
</success_criteria>

<output>
Créer `.planning/quick/261124-nhq-luna-low-et-defauts-cv-adapte/261124-nhq-SUMMARY.md` (en français) : causes racines (logo, A, B, C), choix de la source de vérité pour les années, mention explicite « aucune migration de données ni de prompt requise », points hors périmètre (résumé du CV candidat, valeurs qui changent avec floor/mois), et contrôles à faire en prod après déploiement.
</output>
