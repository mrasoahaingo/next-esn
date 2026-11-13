import { describe, expect, it } from 'vitest';
import type { DecisionAnswer } from '@/lib/llm/decide';
import type { ExtractedCV } from '@/lib/schema';
import {
  HARD_CONSTRAINT_FAILED_SCORE_CAP,
  HARD_CONSTRAINT_PASS_THRESHOLD,
  MAX_DECISION_QUESTIONS,
  buildDecisionQuestions,
  buildDecisionStateText,
  computeDecisionScore,
  decisionConfidenceBand,
  type DecisionKeyPoint,
  type DecisionQuestionIndexEntry,
} from '@/lib/services/positioning-decision-score';
import { prepareCvForMatchingPrompt } from '@/lib/utils/cv-experience-time';

// ─── Fabriques ───────────────────────────────────────────────────

function kp(overrides: Partial<DecisionKeyPoint> = {}): DecisionKeyPoint {
  return {
    id: 'react',
    label: 'React',
    aspect: 'technical',
    canonicalSkillKey: 'react',
    category: 'Frontend',
    importanceRank: 1,
    roleInMission: 'Développement des écrans',
    requirementTier: 'must_have',
    importanceWeight: 0.5,
    evidenceTypeExpected: undefined,
    valueSought: undefined,
    scoringRubricHint: undefined,
    ...overrides,
  };
}

function baseCv(overrides: Partial<ExtractedCV> = {}): ExtractedCV {
  return {
    language: 'fr',
    personalInfo: {
      firstName: 'Jean',
      lastName: 'Dupont',
      title: 'Développeur',
      yearsOfExperience: '3 ans',
    },
    summary: 'Résumé.',
    experiences: [],
    education: [],
    skills: {
      technologies: [],
      softSkills: [],
      expertises: [],
      methodologies: [],
    },
    ...overrides,
  };
}

function scoreEntry(name: string, importanceWeight: number | null): DecisionQuestionIndexEntry {
  return { name, keyPointId: `id-${name}`, type: 'score', importanceWeight, levelCount: 3 };
}

function predicateEntry(name: string): DecisionQuestionIndexEntry {
  return {
    name,
    keyPointId: `id-${name}`,
    type: 'predicate',
    importanceWeight: null,
    levelCount: null,
  };
}

/** Réponse à échelle sur 3 niveaux, avec ses probabilités (missing, partial, strong). */
function scoreAnswer(
  name: string,
  probabilities: [number, number, number],
  confidence?: number,
): DecisionAnswer {
  const [missing, partial, strong] = probabilities;
  return {
    type: 'score',
    name,
    score: partial + 2 * strong,
    ...(confidence !== undefined ? { confidence } : {}),
    probabilities: [
      { value: 0, label: 'missing', probability: missing },
      { value: 1, label: 'partial', probability: partial },
      { value: 2, label: 'strong', probability: strong },
    ],
  };
}

/** Réponse à échelle certaine sur un niveau (0, 1 ou 2), sans probabilités. */
function plainScoreAnswer(name: string, score: number): DecisionAnswer {
  return { type: 'score', name, score };
}

function predicateAnswer(name: string, probability: number): DecisionAnswer {
  return { type: 'predicate', name, probability };
}

/** Fixture S1 : score non plafonné attendu = 58. */
const S1_INDEX: DecisionQuestionIndexEntry[] = [scoreEntry('kp_0', 0.6), scoreEntry('kp_1', 0.4)];
const S1_ANSWERS: DecisionAnswer[] = [
  scoreAnswer('kp_0', [0.1, 0.2, 0.7]),
  scoreAnswer('kp_1', [0.5, 0.5, 0]),
];

// ─── buildDecisionQuestions (D5) ─────────────────────────────────

describe('buildDecisionQuestions', () => {
  it('Q1 — trie par rang et choisit predicate / score selon le tier', () => {
    const set = buildDecisionQuestions([
      kp({ id: 'a', label: 'TypeScript', importanceRank: 2, requirementTier: 'must_have' }),
      kp({ id: 'b', label: 'Habilitation', importanceRank: 1, requirementTier: 'hard_constraint' }),
      kp({ id: 'c', label: 'Docker', importanceRank: 3, requirementTier: undefined }),
    ]);

    expect(set.questions.map((q) => [q.name, q.type])).toStrictEqual([
      ['hc_0', 'predicate'],
      ['kp_0', 'score'],
      ['kp_1', 'score'],
    ]);

    for (const question of set.questions) {
      if (question.type === 'score') {
        expect(question.levels.map((level) => level.label)).toStrictEqual([
          'missing',
          'partial',
          'strong',
        ]);
      } else {
        expect(question).not.toHaveProperty('levels');
      }
    }
    expect(set.droppedKeyPointCount).toBe(0);
  });

  it('Q2 — noms générés, uniques, jamais dérivés des identifiants du barème', () => {
    const set = buildDecisionQuestions([
      kp({ id: 'ID-BAREME-XYZ', label: 'React', importanceRank: 1 }),
      kp({ id: 'ID-BAREME-ABC', label: 'Anglais', importanceRank: 2, requirementTier: 'hard_constraint' }),
      kp({ id: 'ID-BAREME-DEF', label: 'Node.js', importanceRank: 3 }),
    ]);

    const names = set.questions.map((q) => q.name);
    for (const name of names) {
      expect(name).toMatch(/^(kp|hc)_\d+$/);
      expect(name).not.toContain('ID-BAREME-XYZ');
    }
    expect(new Set(names).size).toBe(names.length);
    // L'identifiant du barème ne part pas vers le modèle : il ne vit que dans l'index.
    expect(JSON.stringify(set.questions)).not.toContain('ID-BAREME');

    expect(set.questionIndex).toHaveLength(set.questions.length);
    expect(set.questionIndex.map((entry) => entry.name)).toStrictEqual(names);
    expect(set.questionIndex.map((entry) => entry.keyPointId)).toStrictEqual([
      'ID-BAREME-XYZ',
      'ID-BAREME-ABC',
      'ID-BAREME-DEF',
    ]);
  });

  it('Q3 — instructions construites depuis les champs présents uniquement', () => {
    const full = buildDecisionQuestions([
      kp({
        label: 'Python confirmé',
        valueSought: 'Python 3+ ans en production',
        roleInMission: 'Pipelines de données',
        scoringRubricHint: '100 si projet récent en production',
        evidenceTypeExpected: 'transferable_proven',
      }),
    ]).questions[0];

    expect(full.instructions).toContain('Python confirmé');
    expect(full.instructions).toContain('Python 3+ ans en production');
    expect(full.instructions).toContain('Pipelines de données');
    expect(full.instructions).toContain('100 si projet récent en production');
    expect(full.instructions).toContain('compétence transférable démontrée acceptable');

    const explicit = buildDecisionQuestions([kp({ evidenceTypeExpected: 'explicit' })]).questions[0];
    expect(explicit.instructions).toContain('preuve explicite dans le CV');
    const implicit = buildDecisionQuestions([kp({ evidenceTypeExpected: 'implicit_acceptable' })])
      .questions[0];
    expect(implicit.instructions).toContain('preuve implicite acceptable');

    const sparse = buildDecisionQuestions([
      kp({
        label: 'Kubernetes',
        roleInMission: '',
        valueSought: undefined,
        scoringRubricHint: undefined,
        evidenceTypeExpected: undefined,
      }),
    ]).questions[0];

    expect(sparse.instructions).toContain('Kubernetes');
    expect(sparse.instructions).not.toContain('undefined');
    expect(sparse.instructions).not.toContain('Exigence vérifiable');
    expect(sparse.instructions).not.toContain('Rôle dans la mission');
    expect(sparse.instructions).not.toContain('Type de preuve attendu');
    expect(sparse.instructions).not.toContain('Indication de barème');
    // Critère + consigne finale, rien d'autre.
    expect(sparse.instructions.split('\n')).toHaveLength(2);
  });

  it('Q3 bis — la question éliminatoire demande la satisfaction du critère', () => {
    const question = buildDecisionQuestions([
      kp({ label: 'Habilitation secret défense', requirementTier: 'hard_constraint' }),
    ]).questions[0];

    expect(question.type).toBe('predicate');
    expect(question.instructions).toContain('Habilitation secret défense');
    expect(question.instructions).toContain('éliminatoire');
    expect(question.instructions).toContain('uniquement si');
  });

  it('Q4 — plafonne à 50 questions, celles des plus petits rangs', () => {
    expect(MAX_DECISION_QUESTIONS).toBe(50);

    // 60 points fournis dans l'ordre décroissant des rangs (60 → 1).
    const points = Array.from({ length: 60 }, (_, i) =>
      kp({ id: `p-${60 - i}`, label: `Point ${60 - i}`, importanceRank: 60 - i }),
    );
    const set = buildDecisionQuestions(points);

    expect(set.questions).toHaveLength(50);
    expect(set.droppedKeyPointCount).toBe(10);
    expect(set.questionIndex.map((entry) => entry.keyPointId)).toStrictEqual(
      Array.from({ length: 50 }, (_, i) => `p-${i + 1}`),
    );

    // À rang égal, l'ordre d'origine est conservé.
    const tied = buildDecisionQuestions([
      kp({ id: 'a', importanceRank: 2 }),
      kp({ id: 'b', importanceRank: 1 }),
      kp({ id: 'c', importanceRank: 2 }),
      kp({ id: 'd', importanceRank: 1 }),
    ]);
    expect(tied.questionIndex.map((entry) => entry.keyPointId)).toStrictEqual(['b', 'd', 'a', 'c']);
  });

  it('Q5 — index : poids et nombre de niveaux selon le type', () => {
    const set = buildDecisionQuestions([
      kp({ id: 'a', importanceRank: 1, importanceWeight: 0.7 }),
      kp({ id: 'b', importanceRank: 2, importanceWeight: undefined }),
      kp({ id: 'c', importanceRank: 3, requirementTier: 'hard_constraint', importanceWeight: 0.9 }),
    ]);

    expect(set.questionIndex).toStrictEqual([
      { name: 'kp_0', keyPointId: 'a', type: 'score', importanceWeight: 0.7, levelCount: 3 },
      { name: 'kp_1', keyPointId: 'b', type: 'score', importanceWeight: null, levelCount: 3 },
      { name: 'hc_0', keyPointId: 'c', type: 'predicate', importanceWeight: null, levelCount: null },
    ]);
  });

  it('Q6 — entrées inutilisables : ensemble vide ou point écarté, sans lever', () => {
    const empty = { questions: [], questionIndex: [], droppedKeyPointCount: 0 };

    expect(buildDecisionQuestions([])).toStrictEqual(empty);
    // `jobAnalysis` peut être l'objet brut casté quand le schéma échoue.
    expect(buildDecisionQuestions({ foo: 1 } as unknown as DecisionKeyPoint[])).toStrictEqual(empty);
    expect(buildDecisionQuestions(null)).toStrictEqual(empty);
    expect(buildDecisionQuestions(undefined)).toStrictEqual(empty);

    const withBlankLabel = buildDecisionQuestions([kp({ id: 'a', label: '   ' }), kp({ id: 'b' })]);
    expect(withBlankLabel.questions).toHaveLength(1);
    expect(withBlankLabel.questionIndex[0].keyPointId).toBe('b');
    expect(withBlankLabel.droppedKeyPointCount).toBe(1);

    const withJunk = buildDecisionQuestions([
      null,
      'texte',
      kp({ id: 'ok' }),
    ] as unknown as DecisionKeyPoint[]);
    expect(withJunk.questions).toHaveLength(1);
    expect(withJunk.droppedKeyPointCount).toBe(2);
  });
});

// ─── computeDecisionScore (D7) ───────────────────────────────────

describe('computeDecisionScore', () => {
  it('S1 — espérance pondérée par importanceWeight', () => {
    const result = computeDecisionScore({ questionIndex: S1_INDEX, answers: S1_ANSWERS });

    expect(result.uncappedScore).toBe(58);
    expect(result.decisionScore).toBe(58);
    expect(result.hardConstraintFailures).toStrictEqual([]);
    expect(result.refusalCount).toBe(0);
    expect(result.questionCount).toBe(2);
  });

  it('S2 — sans probabilités, repli sur score / (niveaux − 1)', () => {
    const result = computeDecisionScore({
      questionIndex: [scoreEntry('kp_0', 1)],
      answers: [plainScoreAnswer('kp_0', 1.5)],
    });

    expect(result.uncappedScore).toBe(75);
    expect(result.decisionScore).toBe(75);
  });

  it('S3 — probabilités de somme ≠ 1 renormalisées', () => {
    const result = computeDecisionScore({
      questionIndex: [scoreEntry('kp_0', 1)],
      answers: [scoreAnswer('kp_0', [0.2, 0, 0.6])],
    });

    expect(result.uncappedScore).toBe(75);
  });

  it('S4 — poids absents, tous absents ou tous nuls', () => {
    // Poids absent = moyenne des poids définis (0,4).
    const mixed = computeDecisionScore({
      questionIndex: [scoreEntry('kp_0', 0.6), scoreEntry('kp_1', null), scoreEntry('kp_2', 0.2)],
      answers: [
        plainScoreAnswer('kp_0', 2),
        plainScoreAnswer('kp_1', 0),
        plainScoreAnswer('kp_2', 0),
      ],
    });
    expect(mixed.uncappedScore).toBe(50);

    // Aucun poids défini : poids égaux.
    const noWeights = computeDecisionScore({
      questionIndex: [scoreEntry('kp_0', null), scoreEntry('kp_1', null), scoreEntry('kp_2', null)],
      answers: [
        plainScoreAnswer('kp_0', 2),
        plainScoreAnswer('kp_1', 0),
        plainScoreAnswer('kp_2', 1),
      ],
    });
    expect(noWeights.uncappedScore).toBe(50);

    // Tous les poids définis à 0 : poids égaux.
    const zeroWeights = computeDecisionScore({
      questionIndex: [scoreEntry('kp_0', 0), scoreEntry('kp_1', 0), scoreEntry('kp_2', 0)],
      answers: [
        plainScoreAnswer('kp_0', 2),
        plainScoreAnswer('kp_1', 0),
        plainScoreAnswer('kp_2', 1),
      ],
    });
    expect(zeroWeights.uncappedScore).toBe(50);
  });

  it('S5 — éliminatoire échoué : plafond à 39', () => {
    expect(HARD_CONSTRAINT_PASS_THRESHOLD).toBe(0.5);
    expect(HARD_CONSTRAINT_FAILED_SCORE_CAP).toBe(39);

    const index = [...S1_INDEX, predicateEntry('hc_0')];

    const failed = computeDecisionScore({
      questionIndex: index,
      answers: [...S1_ANSWERS, predicateAnswer('hc_0', 0.2)],
    });
    expect(failed.hardConstraintFailures).toStrictEqual([
      { name: 'hc_0', keyPointId: 'id-hc_0', probability: 0.2 },
    ]);
    expect(failed.decisionScore).toBe(39);
    expect(failed.uncappedScore).toBe(58);

    // Le seuil est strict : 0,5 passe.
    const atThreshold = computeDecisionScore({
      questionIndex: index,
      answers: [...S1_ANSWERS, predicateAnswer('hc_0', 0.5)],
    });
    expect(atThreshold.hardConstraintFailures).toStrictEqual([]);
    expect(atThreshold.decisionScore).toBe(58);

    // Un score déjà sous le plafond n'est pas remonté.
    const alreadyLow = computeDecisionScore({
      questionIndex: [scoreEntry('kp_0', 1), predicateEntry('hc_0')],
      answers: [scoreAnswer('kp_0', [0.5, 0.4, 0.1]), predicateAnswer('hc_0', 0.1)],
    });
    expect(alreadyLow.uncappedScore).toBe(30);
    expect(alreadyLow.decisionScore).toBe(30);
  });

  it('S6 — refus exclus et comptés', () => {
    // kp_1 refusé : le score ne repose plus que sur kp_0 (valeur 0,8).
    const oneRefusal = computeDecisionScore({
      questionIndex: S1_INDEX,
      answers: [S1_ANSWERS[0], { type: 'refusal', name: 'kp_1' }],
    });
    expect(oneRefusal.refusalCount).toBe(1);
    expect(oneRefusal.uncappedScore).toBe(80);
    expect(oneRefusal.decisionScore).toBe(80);

    const index = [...S1_INDEX, predicateEntry('hc_0')];
    const allRefused = computeDecisionScore({
      questionIndex: index,
      answers: index.map((entry) => ({ type: 'refusal' as const, name: entry.name })),
    });
    expect(allRefused.decisionScore).toBeNull();
    expect(allRefused.uncappedScore).toBeNull();
    expect(allRefused.decisionConfidence).toBeNull();
    expect(allRefused.decisionConfidenceBand).toBeNull();
    expect(allRefused.refusalCount).toBe(allRefused.questionCount);
    expect(allRefused.questionCount).toBe(3);
  });

  it('S7 — seuls des éliminatoires répondus : pas de score, échecs listés', () => {
    const result = computeDecisionScore({
      questionIndex: [scoreEntry('kp_0', 1), predicateEntry('hc_0'), predicateEntry('hc_1')],
      answers: [
        { type: 'refusal', name: 'kp_0' },
        predicateAnswer('hc_0', 0.1),
        predicateAnswer('hc_1', 0.9),
      ],
    });

    expect(result.uncappedScore).toBeNull();
    expect(result.decisionScore).toBeNull();
    expect(result.hardConstraintFailures).toStrictEqual([
      { name: 'hc_0', keyPointId: 'id-hc_0', probability: 0.1 },
    ]);
    // |2 × 0,1 − 1| = 0,8 et |2 × 0,9 − 1| = 0,8, à poids égaux.
    expect(result.decisionConfidence).toBeCloseTo(0.8, 10);
    expect(result.decisionConfidenceBand).toBe('high');
  });

  it('S8 — confiance agrégée et bandes', () => {
    const result = computeDecisionScore({
      questionIndex: [scoreEntry('kp_0', 0.6), scoreEntry('kp_1', 0.4), predicateEntry('hc_0')],
      answers: [
        scoreAnswer('kp_0', [0.1, 0.2, 0.7], 0.9),
        scoreAnswer('kp_1', [0.5, 0.5, 0], 0.4),
        predicateAnswer('hc_0', 0.9),
      ],
    });

    // (0,6 × 0,9 + 0,4 × 0,4 + 0,5 × 0,8) / 1,5
    expect(result.decisionConfidence).toBeCloseTo(0.7333, 3);
    expect(result.decisionConfidenceBand).toBe('high');

    expect(decisionConfidenceBand(0.39)).toBe('low');
    expect(decisionConfidenceBand(0.4)).toBe('medium');
    expect(decisionConfidenceBand(0.69)).toBe('medium');
    expect(decisionConfidenceBand(0.7)).toBe('high');
    expect(decisionConfidenceBand(null)).toBeNull();
  });

  it('S9 — appariement par nom, réponses inconnues, absentes ou incohérentes', () => {
    const index = [...S1_INDEX, predicateEntry('hc_0')];
    const answers = [...S1_ANSWERS, predicateAnswer('hc_0', 0.2)];
    const expected = computeDecisionScore({ questionIndex: index, answers });

    // Réponses mélangées + nom inconnu : même résultat.
    const shuffled = computeDecisionScore({
      questionIndex: index,
      answers: [answers[2], plainScoreAnswer('kp_99', 2), answers[1], answers[0]],
    });
    expect(shuffled).toStrictEqual(expected);

    // Question sans réponse : exclue, pas comptée comme refus.
    const missing = computeDecisionScore({ questionIndex: S1_INDEX, answers: [S1_ANSWERS[0]] });
    expect(missing.uncappedScore).toBe(80);
    expect(missing.refusalCount).toBe(0);
    expect(missing.questionCount).toBe(2);

    // Type de réponse incohérent avec la question : exclu.
    const mismatched = computeDecisionScore({
      questionIndex: index,
      answers: [S1_ANSWERS[0], predicateAnswer('kp_1', 1), plainScoreAnswer('hc_0', 0)],
    });
    expect(mismatched.uncappedScore).toBe(80);
    expect(mismatched.hardConstraintFailures).toStrictEqual([]);
    expect(mismatched.refusalCount).toBe(0);
  });

  it('S10 — bornage des valeurs hors plage', () => {
    const scoreOutOfRange = computeDecisionScore({
      questionIndex: [scoreEntry('kp_0', 1)],
      answers: [plainScoreAnswer('kp_0', 5)],
    });
    expect(scoreOutOfRange.uncappedScore).toBe(100);

    const probabilityOutOfRange = computeDecisionScore({
      questionIndex: [predicateEntry('hc_0')],
      answers: [predicateAnswer('hc_0', 1.4)],
    });
    expect(probabilityOutOfRange.hardConstraintFailures).toStrictEqual([]);
    // Probabilité bornée à 1 → |2 × 1 − 1| = 1.
    expect(probabilityOutOfRange.decisionConfidence).toBe(1);

    const negativeProbability = computeDecisionScore({
      questionIndex: [predicateEntry('hc_0')],
      answers: [predicateAnswer('hc_0', -0.3)],
    });
    expect(negativeProbability.hardConstraintFailures).toStrictEqual([
      { name: 'hc_0', keyPointId: 'id-hc_0', probability: 0 },
    ]);
  });
});

// ─── buildDecisionStateText (D6) ─────────────────────────────────

describe('buildDecisionStateText', () => {
  const referenceDate = new Date('2026-06-15T12:00:00.000Z');
  const cv = baseCv({
    experiences: [
      {
        role: 'Développeur React',
        company: 'Acme',
        startDate: '01/2023',
        endDate: 'Présent',
        isCurrent: true,
        description: ['Refonte du portail client'],
      },
    ],
  });

  it('E1 — contient le CV préparé comme pour les branches, indenté sur 2 espaces', () => {
    const text = buildDecisionStateText({ cv, priorAnswers: null, referenceDate });

    expect(text).toContain('\n\n## CV du candidat (JSON)\n\n');
    expect(text).toContain(JSON.stringify(prepareCvForMatchingPrompt(cv, referenceDate), null, 2));
  });

  it('E1 bis — commence par la date de référence, sans laquelle un poste en cours n’a pas de durée', () => {
    const text = buildDecisionStateText({ cv, priorAnswers: null, referenceDate });

    expect(
      text.startsWith("Date de référence (aujourd'hui) : 2026-06-15\n\n## CV du candidat (JSON)\n\n"),
    ).toBe(true);
  });

  it('E2 — ajoute les réponses du recruteur quand il y en a', () => {
    const withAnswers = buildDecisionStateText({
      cv,
      priorAnswers: { 'candidat:Disponibilité ?': 'Immédiate' },
      referenceDate,
    });
    expect(withAnswers).toContain('Réponses déjà fournies');
    expect(withAnswers).toContain('Immédiate');

    const withoutAnswers = buildDecisionStateText({ cv, priorAnswers: {}, referenceDate });
    expect(withoutAnswers).not.toContain('Réponses déjà fournies');
    expect(buildDecisionStateText({ cv, referenceDate })).not.toContain('Réponses déjà fournies');
  });

  it('E3 — ni barème, ni règles d’usage, ni bloc de récence', () => {
    const text = buildDecisionStateText({
      cv,
      priorAnswers: { 'candidat:Disponibilité ?': 'Immédiate' },
      referenceDate,
    });

    expect(text).not.toContain('Barème mission');
    expect(text).not.toContain("Règles d'usage du barème");
    expect(text).not.toContain('Pondération par récence');
  });
});
