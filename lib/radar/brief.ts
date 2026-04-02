import { streamText } from 'ai';
import { createGatewayLanguageModel, llmFactualGenerationSettings, modelName } from '@/lib/ai';
import type { Match, ProspectSignal } from '@/lib/radar/schemas';

export const RADAR_BRIEF_MODEL_ID = modelName;

export type BriefPersona = 'dsi' | 'drh' | 'ceo' | 'daf' | 'directeur_technique' | 'auto';
export type BriefChannel = 'email_froid' | 'relance_linkedin' | 'appel' | 'relance_email' | 'auto';

export type BriefAction = {
  action: string;
  outcome: string;
  notes?: string | null;
  performedAt: string;
};

const PERSONA_LABELS: Record<BriefPersona, string> = {
  dsi: 'DSI (Directeur des Systèmes d\'Information)',
  drh: 'DRH (Directeur des Ressources Humaines)',
  ceo: 'CEO / PDG',
  daf: 'DAF (Directeur Administratif et Financier)',
  directeur_technique: 'Directeur Technique / CTO',
  auto: 'auto',
};

const PERSONA_INSTRUCTIONS: Record<BriefPersona, string> = {
  dsi: 'Parle le langage du DSI : risque, résilience, dette technique, time-to-market. Mets en avant la qualité de livraison et la maîtrise technique des consultants.',
  drh: 'Parle le langage RH : flexibilité contractuelle, rapidité de mise à disposition, adéquation profil/poste, DPAE et gestion administrative simplifiée.',
  ceo: 'Parle business : ROI, délais, coûts maîtrisés, références sectorielles. Sois ultra-concis et factuel.',
  daf: 'Parle finance : TJM transparent, pas de charges patronales, flexibilité, zéro engagement long terme. Angle économique.',
  directeur_technique: 'Parle tech : stack, niveau d\'expertise, vécu en mission similaire, pair-programming ou TDD possible. Sois précis sur les technos.',
  auto: '',
};

const CHANNEL_INSTRUCTIONS: Record<BriefChannel, string> = {
  email_froid: 'Format : email professionnel. Court (< 5 lignes). Objet percutant. Un seul appel à l\'action (calendly ou réponse). Pas de signature verbose.',
  relance_linkedin: 'Format : message LinkedIn très court (< 300 caractères). Ton chaleureux mais direct. Référence au contexte de l\'entreprise.',
  appel: 'Format : script d\'appel. Accroche (15 sec), pitch (30 sec), questions de qualification (2-3), closing (15 sec). Points clés à mémoriser.',
  relance_email: 'Format : email de relance. Faire référence au premier contact. Ajouter un élément nouveau (signal récent). Proposer une alternative si pas de disponibilité.',
  auto: '',
};

function formatSignalForBrief(signal: ProspectSignal): string {
  const date = new Date(signal.detectedAt);
  const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  const freshnessLabel = daysAgo === 0 ? 'aujourd\'hui' : daysAgo === 1 ? 'hier' : `il y a ${daysAgo}j`;

  const typeLabel = (signal.metadata?.signalType as string | undefined) ?? signal.source;
  let detail = signal.title;

  // Annoter les signaux haute valeur
  if (typeLabel === 'active_job_postings') {
    const techs = (signal.metadata?.technologies as string[] | undefined) ?? [];
    detail = `🔍 OFFRES ACTIVES: ${signal.title}${techs.length > 0 ? ` [${techs.slice(0, 4).join(', ')}]` : ''}`;
  }

  return `- [${freshnessLabel}] ${detail}`;
}

function formatActionHistory(actions: BriefAction[]): string {
  if (actions.length === 0) return '— Aucun contact précédent';

  return actions
    .slice(0, 5)
    .map((action) => {
      const date = new Date(action.performedAt);
      const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
      const outcomeLabel =
        action.outcome === 'positive' ? '✅'
        : action.outcome === 'negative' ? '❌'
        : action.outcome === 'no_response' ? '⏳ sans réponse'
        : '';
      return `- il y a ${daysAgo}j : ${action.action} ${outcomeLabel}${action.notes ? ` — "${action.notes}"` : ''}`;
    })
    .join('\n');
}

export function buildProspectBriefPrompt(input: {
  companyName: string;
  signals: ProspectSignal[];
  matches: Array<Match & { consultantName: string }>;
  persona?: BriefPersona;
  channel?: BriefChannel;
  actions?: BriefAction[];
}) {
  const persona = input.persona ?? 'auto';
  const channel = input.channel ?? 'auto';
  const actions = input.actions ?? [];

  const signalsText = input.signals.length > 0
    ? input.signals.slice(0, 10).map(formatSignalForBrief).join('\n')
    : '- Aucun signal exploitable';

  const matchesText = input.matches.length > 0
    ? input.matches
        .map(
          (match) =>
            `- ${match.consultantName} (${match.skills.join(', ') || 'compétences non précisées'}) — TJM ${match.tjm ?? 'n/a'}€ — ${match.availability}`,
        )
        .join('\n')
    : '- Aucun consultant disponible';

  const historyText = formatActionHistory(actions);

  const hasNomination = input.signals.some((s) => s.metadata?.signalType === 'nomination');
  const hasFundraising = input.signals.some((s) => s.metadata?.signalType === 'fundraising');
  const urgencyNote = hasNomination
    ? '\n⚠️  Signal NOMINATION détecté : les 100 premiers jours d\'un nouveau DSI sont la fenêtre idéale pour établir un partenariat.'
    : hasFundraising
    ? '\n⚠️  Signal LEVÉE DE FONDS détecté : les 3 premiers mois post-annonce, le budget est disponible et les recrutements s\'accélèrent.'
    : '';

  const personaBlock = persona !== 'auto' && PERSONA_INSTRUCTIONS[persona]
    ? `\nCible : ${PERSONA_LABELS[persona]}\nInstructions persona : ${PERSONA_INSTRUCTIONS[persona]}`
    : '';

  const channelBlock = channel !== 'auto' && CHANNEL_INSTRUCTIONS[channel]
    ? `\nFormat souhaité : ${CHANNEL_INSTRUCTIONS[channel]}`
    : '';

  const hasHistory = actions.some((a) => a.outcome !== 'pending');
  const followUpNote = hasHistory
    ? `\n⚠️  Contact précédent détecté — adapte le ton en conséquence. Ajoute un élément nouveau par rapport au dernier contact.`
    : '';

  return `Tu rédiges un brief de prospection pour ${input.companyName}.${urgencyNote}${personaBlock}${channelBlock}${followUpNote}

Signaux détectés :
${signalsText}

Consultants disponibles à proposer :
${matchesText}

Historique des contacts :
${historyText}

Structure ta réponse en 3 parties :
1. Contexte (2-3 lignes max : pourquoi cette entreprise, pourquoi maintenant)
2. Opportunité (ce qu'on peut leur apporter concrètement)
3. ${channel === 'appel' ? 'Script d\'appel (accroche → pitch → questions → closing)' : 'Message à envoyer (prêt à copier-coller)'}

Reste factuel, direct, actionnable. En français.`;
}

export function generateBriefStream(input: {
  companyName: string;
  signals: ProspectSignal[];
  matches: Match[];
  actions?: BriefAction[];
  persona?: BriefPersona;
  channel?: BriefChannel;
  promptOverride?: string;
}) {
  const prompt = input.promptOverride?.trim() || buildProspectBriefPrompt(input);

  return streamText({
    ...llmFactualGenerationSettings,
    model: createGatewayLanguageModel(RADAR_BRIEF_MODEL_ID, false),
    system:
      'Tu es un SDR Expert pour une ESN. Tu rédiges des briefs brefs, factuels et directement exploitables. Chaque brief doit permettre au commercial de décrocher son téléphone ou d\'envoyer un message dans les 5 minutes.',
    prompt,
  });
}
