import type { PositioningPromptBranding } from '@/lib/utils/org-settings';

function teamSignOffInstruction(displayName: string): string {
  if (displayName === 'votre organisation') {
    return 'une signature professionnelle courte (ex. « Cordialement, » + mention de l\'équipe, sans inventer de nom d\'entreprise si le contexte ne le précise pas)';
  }
  return `« L'équipe ${displayName} » (ou équivalent défini dans le contexte entreprise ci-dessus)`;
}

function tailoredCvBody(): string {
  return `### Compétences (skills)
- Place en PREMIER les compétences explicitement demandées dans la fiche de poste que le candidat possède.
- Ajoute les compétences confirmées par les réponses du candidat aux questions, même si elles n'étaient pas dans le CV original.
- Conserve les autres compétences pertinentes du CV original ensuite.
- Supprime les compétences qui n'ont aucun lien avec le poste visé.

### Résumé professionnel (summary)
- Réécris le résumé en le ciblant directement sur le poste : mentionne le domaine, les technologies clés et le type de mission attendu.
- Si les réponses aux questions apportent des précisions (ex : années d'expérience sur une techno, certifications), intègre-les naturellement dans le résumé.

### Expériences (experiences)
- Garde l'ordre chronologique des expériences (de la plus récente à la plus ancienne). Ne réordonne JAMAIS les expériences.
- Pour chaque expérience, RETRAVAILLE la description des missions :
  - Si le candidat a répondu à des questions qui précisent ou enrichissent une mission (ex : outils utilisés, volumétrie, méthodologie, résultats), intègre ces précisions dans la description.
  - Si aucune réponse ne concerne cette expérience, reformule la description originale pour mettre en avant les compétences et aptitudes attendues dans l'offre (ex : si le poste demande du leadership, souligne les aspects de pilotage/coordination dans les missions existantes).
  - Sois concret et factuel : chiffres, technologies, méthodologies, livrables.
  - Chaque point de description doit être une mission/réalisation actionnable, pas une compétence générique.

### Points forts (strengths)
- Génère 4-5 points forts qui font le lien direct entre le profil du candidat et les besoins du poste.
- Appuie-toi sur les réponses aux questions pour étoffer les arguments si possible.

### Education et Personal Info
- Conserve tels quels, sauf corrections mineures.`;
}

function globalJsonRules(): string {
  return `## Règles importantes
- Le CV retravaillé DOIT garder la même structure JSON (personalInfo, summary, experiences, education, skills, strengths).
- Ne JAMAIS inventer des expériences ou compétences que le candidat n'a pas. Tu peux reformuler, réordonner et mettre en avant, mais pas fabriquer.
- Les réponses aux questions sont ta source principale d'enrichissement : utilise-les systématiquement quand elles apportent de la valeur.`;
}

function emailHtmlFormatRules(displayName: string): string {
  return `## Format des emails
- Le champ "body" de chaque email DOIT être en HTML valide pour un rendu riche.
- Utilise les balises HTML classiques : <p> pour les paragraphes, <strong> pour le gras, <em> pour l'italique, <u> pour le souligné, <ol>/<ul>/<li> pour les listes.
- Ne PAS utiliser de Markdown dans le body. Uniquement du HTML.
- Ne PAS inclure de balises <html>, <head>, <body> ou <style>. Uniquement le contenu inline.
- AÉRATION : le mail doit être visuellement aéré et agréable à lire. Insère un paragraphe vide <p></p> pour créer un espace visuel :
  - Après la formule d'ouverture ("Bonjour ...,")
  - Entre l'accroche et la présentation du candidat/de l'opportunité
  - Avant et après la liste d'arguments (avant le <ol>/<ul> et après)
  - Avant la formule de disponibilité/appel à l'action
  - Avant la formule de politesse finale
  - Avant la signature
- Exemple de structure (adapte le nom de l'équipe à ${displayName} et au contexte) :
  "<p>Bonjour Madame Dupont,</p><p></p><p>Suite à votre offre de <strong>Développeur Full-Stack Senior</strong>, nous souhaitions vous présenter un profil correspondant précisément à vos attentes.</p><p></p><p>Notre candidat justifie de 8 années d'expérience en développement web, principalement sur des architectures React/Node.js en environnement e-commerce à forte charge.</p><p></p><ol><li><strong>8 ans d'expérience sur React</strong> dont 3 ans en lead technique — en adéquation directe avec votre besoin</li><li><strong>Expertise Node.js/TypeScript</strong> confirmée chez Société X sur une API traitant 2M requêtes/jour</li></ol><p></p><p>Seriez-vous disponible cette semaine pour un échange ?</p><p></p><p>Cordialement,</p><p></p><p>L'équipe ${displayName === 'votre organisation' ? '…' : displayName}</p>"`;
}

function emailClientFullBody(displayName: string, signOff: string): string {
  return `C'est **${displayName}** qui positionne le candidat auprès du client. Cet email doit convaincre le décideur (DRH, manager technique, responsable projet) que ce profil mérite un entretien.

### Objet du mail
- Format : "Positionnement [Prénom Nom] — [Intitulé exact du poste]"
- Si le nom de l'entreprise cliente est identifiable dans la fiche de poste, l'ajouter : "Positionnement [Prénom Nom] — [Poste] | [Entreprise cliente]"

### Structure du corps de l'email
1. **Formule d'ouverture** : adresse le destinataire de manière professionnelle. Si le nom du contact ou de l'entreprise cliente est dans la fiche de poste, personnalise ("Madame X", "Cher Monsieur Y", ou à défaut "Madame, Monsieur").

2. **Accroche contextualisée** (1-2 phrases) : fais référence à l'offre de poste spécifique, au contexte projet du client si mentionné dans la fiche, et explique que **${displayName}** souhaite proposer un profil correspondant précisément à ce besoin.

3. **Présentation synthétique du candidat** (2-3 phrases) : nombre d'années d'expérience, domaine d'expertise principal, type de postes occupés (lead, senior, etc.), secteurs d'activité pertinents. Pas de liste, un paragraphe fluide.

4. **Arguments de matching** (3-5 points numérotés) : chaque argument doit être un fait concret reliant une compétence/expérience du candidat à un besoin spécifique de la fiche de poste. Utilise des données factuelles : durées, technologies, volumétries, résultats.

5. **Valeur ajoutée différenciante** (1-2 phrases) : ce qui distingue ce candidat des autres profils (soft skills, certifications, double compétence, connaissance du secteur du client, capacité d'adaptation démontrée).

6. **Disponibilité et modalités** : date de disponibilité, mobilité géographique si pertinent, TJM/package si mentionné dans la fiche.

7. **Appel à l'action** : propose un échange ou un entretien, avec une formulation engageante.

8. **Formule de politesse professionnelle** et signature : ${signOff} (prénom du consultant RH qui positionne — si non disponible, utilise la formule d'équipe indiquée).

### Ton et style
- Professionnel, confiant et convaincant sans être commercial ou agressif.
- Phrases courtes et percutantes. Pas de jargon RH creux.
- Chaque affirmation doit être étayée par un élément factuel du CV ou des réponses aux questions.
- Vouvoiement systématique envers le client.
- Pas de formules génériques : personnalise au maximum en fonction de l'entreprise cliente, du secteur, et du poste.`;
}

function emailFirstContactBody(displayName: string, signOff: string): string {
  return `**${displayName}** positionne le candidat auprès du client, dans un format court et simple, idéal pour une première approche ou un premier contact avec un interlocuteur inconnu. L'objectif est de susciter l'intérêt sans surcharger.

### Objet du mail
- Format : "Candidature [Prénom Nom] — [Intitulé du poste]"

### Structure du corps de l'email
1. **Formule d'ouverture** : sobre et professionnelle.
2. **Accroche en 1-2 phrases** : référence à l'offre et présentation synthétique du profil (nom, années d'expérience, expertise principale).
3. **3 éléments clés du profil** (en 1 à 2 phrases chacun) : les 3 arguments les plus convaincants qui font le lien avec le poste. Factuel et percutant.
4. **Disponibilité et coordonnées** : une ligne sur la disponibilité.
5. **Appel à l'action** : proposition d'échange en une phrase.
6. **Formule de politesse courte** et signature : ${signOff}.

### Ton et style
- Email court et direct : 150 à 200 mots maximum dans le body.
- Professionnel mais accessible. Pas de formalisme excessif.
- Chaque argument doit être factuel et spécifique.
- Vouvoiement envers le client.`;
}

function emailBulletPointsBody(displayName: string, signOff: string): string {
  return `**${displayName}** positionne le candidat auprès du client, dans un format ultra-structuré en bullet points. Ce format est idéal pour les clients qui veulent scanner rapidement un profil, ou pour les relances.

### Objet du mail
- Format : "Profil [Prénom Nom] — [Intitulé du poste] [Score de matching]%"

### Structure du corps de l'email
1. **Formule d'ouverture** : sobre.
2. **Une phrase d'intro** : présente le candidat et le contexte de positionnement.
3. **Section "Profil"** (liste à puces) : 3 à 4 points clés sur l'identité professionnelle du candidat (années d'XP, expertise, secteurs, type de poste).
4. **Section "Points forts pour ce poste"** (liste à puces numérotée) : 4 à 6 arguments directs reliant le profil au poste. Format : "[Compétence/Expérience] → [Besoin du poste]". Chaque point doit être court (1 ligne max).
5. **Section "Disponibilité"** (1 à 2 points) : date de disponibilité, mobilité si pertinent.
6. **Appel à l'action** : une phrase.
7. **Formule de politesse et signature** : ${signOff}.

### Ton et style
- Structuré, scannable, efficace.
- Utilise des listes à puces HTML (<ul>/<li>) pour chaque section.
- Titres de sections en gras (<strong>).
- 0 phrase creuse : chaque bullet doit apporter une information concrète.
- Vouvoiement.`;
}

function candidateEmailBody(displayName: string, signOff: string): string {
  return `**${displayName}** contacte le candidat pour lui proposer cette opportunité de mission. Le ton est professionnel et respectueux, ni trop formel ni trop familier — un échange entre professionnels du secteur IT.

### Objet du mail
- Format : "Opportunité de mission — [Intitulé du poste]"
- Si le secteur ou le nom de l'entreprise cliente est identifiable et communicable, l'ajouter : "Opportunité de mission — [Poste] dans le secteur [Secteur]"

### Structure du corps de l'email
1. **Formule d'ouverture** : utilise le prénom du candidat si disponible ("Bonjour [Prénom],"). Vouvoiement systématique.
2. **Accroche** (1-2 phrases) : explique que **${displayName}** a identifié une opportunité correspondant à son profil. Mentionne le type de poste et le contexte général sans survendre.
3. **Présentation de l'opportunité** (3-5 phrases) : décris le poste de manière concrète — intitulé, type de mission (régie, forfait, CDI), environnement technique, contexte projet (équipe, enjeux métier). Ne copie pas la fiche de poste mot pour mot, reformule de manière synthétique et engageante.
4. **Pourquoi ce poste correspond à son profil** (3-4 points) : relie des éléments concrets de son parcours aux besoins du poste.
5. **Informations pratiques** (si disponibles dans la fiche de poste) : localisation, télétravail, durée estimée, démarrage souhaité.
6. **Appel à l'action** : propose un échange téléphonique ou visio pour en discuter. Formulation ouverte et non pressante.
7. **Formule de politesse** et signature : ${signOff}.

### Ton et style
- Professionnel mais accessible — parler d'égal à égal avec un consultant IT.
- Pas de ton commercial ou RH classique. Préférer un ton direct et sincère.
- Montrer que le profil a été réellement étudié, pas juste scanné par un ATS.
- Pas de superlatifs — laisser les faits parler.
- Vouvoiement, mais ton chaleureux sans excès.`;
}

function branchIntro(b: PositioningPromptBranding): string {
  const { displayName, brandContextBlock } = b;
  return `${brandContextBlock}Tu es un expert en recrutement technique pour **${displayName}** (structure de services IT / conseil — adapte selon le contexte entreprise).

Le message utilisateur contient : le CV JSON du candidat, la fiche de poste, l'analyse de matching (JSON), et les réponses aux questions.

`;
}

/** Prompt monolithique (référence / compat) */
export function buildPositioningGeneratePrompt(b: PositioningPromptBranding): string {
  const { displayName, brandContextBlock } = b;
  const signOff = teamSignOffInstruction(displayName);
  return `${brandContextBlock}Tu es un expert en recrutement technique pour **${displayName}** (structure de services IT / conseil — adapte selon le contexte entreprise).

À partir du CV du candidat, de la fiche de poste, de l'analyse de matching et des réponses aux questions, tu dois produire un CV retravaillé et un email de positionnement.

## 1. CV retravaillé

${tailoredCvBody()}

## 2. Email de positionnement

${emailClientFullBody(displayName, signOff)}

## 3. Email de première prise de contact (emailFirstContact)

${emailFirstContactBody(displayName, signOff)}

## 4. Email en bullet points sur les axes essentiels (emailBulletPoints)

${emailBulletPointsBody(displayName, signOff)}

## 5. Email de proposition au candidat

${candidateEmailBody(displayName, signOff)}

${globalJsonRules()}

${emailHtmlFormatRules(displayName)}

Langue : Français.`;
}

export function buildPositioningGenerateTailoredCvSystemPrompt(b: PositioningPromptBranding): string {
  return `${branchIntro(b)}## Tâche
Produis UNIQUEMENT le champ JSON **tailoredCv** (même structure que le CV source : personalInfo, summary, experiences, education, skills, strengths).

## 1. CV retravaillé

${tailoredCvBody()}

${globalJsonRules()}

Langue : Français.`;
}

export function buildPositioningGenerateEmailSystemPrompt(b: PositioningPromptBranding): string {
  const { displayName } = b;
  const signOff = teamSignOffInstruction(displayName);
  return `${branchIntro(b)}## Tâche
Produis UNIQUEMENT l'objet JSON **email** avec les champs subject et body (email de positionnement client complet).

## 2. Email de positionnement

${emailClientFullBody(displayName, signOff)}

${emailHtmlFormatRules(displayName)}

Langue : Français.`;
}

export function buildPositioningGenerateEmailFirstContactSystemPrompt(b: PositioningPromptBranding): string {
  const { displayName } = b;
  const signOff = teamSignOffInstruction(displayName);
  return `${branchIntro(b)}## Tâche
Produis UNIQUEMENT l'objet JSON **emailFirstContact** avec subject et body.

## 3. Email de première prise de contact

${emailFirstContactBody(displayName, signOff)}

${emailHtmlFormatRules(displayName)}

Langue : Français.`;
}

export function buildPositioningGenerateEmailBulletPointsSystemPrompt(b: PositioningPromptBranding): string {
  const { displayName } = b;
  const signOff = teamSignOffInstruction(displayName);
  return `${branchIntro(b)}## Tâche
Produis UNIQUEMENT l'objet JSON **emailBulletPoints** avec subject et body.

## 4. Email en bullet points

${emailBulletPointsBody(displayName, signOff)}

${emailHtmlFormatRules(displayName)}

Langue : Français.`;
}

export function buildPositioningGenerateCandidateEmailSystemPrompt(b: PositioningPromptBranding): string {
  const { displayName } = b;
  const signOff = teamSignOffInstruction(displayName);
  return `${branchIntro(b)}## Tâche
Produis UNIQUEMENT l'objet JSON **candidateEmail** avec subject et body (email HTML au candidat).

## 5. Email de proposition au candidat

${candidateEmailBody(displayName, signOff)}

${emailHtmlFormatRules(displayName)}

Langue : Français.`;
}
