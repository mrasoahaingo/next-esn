/** Identifiants stables pour `llm_tasks.task_key` et `logAiUsage.taskKey`. */
export const TASK_KEY = {
  CV_TRANSCRIPTION: 'cv.transcription',
  CV_BRANCH_IDENTITY: 'cv.branch.identity',
  CV_BRANCH_EXPERIENCES: 'cv.branch.experiences',
  CV_BRANCH_EDUCATION: 'cv.branch.education',
  CV_BRANCH_SKILLS: 'cv.branch.skills',
  CV_EXTRACTION_AGGREGATE: 'cv.extraction.aggregate',

  POSITIONING_ANALYSIS_SKILLS: 'positioning.analysis.skills',
  POSITIONING_ANALYSIS_EXPERIENCES: 'positioning.analysis.experiences',
  POSITIONING_ANALYSIS_GAPS: 'positioning.analysis.gaps',
  POSITIONING_ANALYSIS_QUESTIONS: 'positioning.analysis.questions',
  POSITIONING_ANALYSIS_SYNTHESIS: 'positioning.analysis.synthesis',

  POSITIONING_GENERATE_TAILORED_CV: 'positioning.generate.tailoredCv',
  POSITIONING_GENERATE_EXPERTISE_CONFIRMATIONS: 'positioning.generate.expertiseConfirmations',
  POSITIONING_GENERATE_EMAIL: 'positioning.generate.email',
  POSITIONING_GENERATE_EMAIL_FIRST_CONTACT: 'positioning.generate.emailFirstContact',
  POSITIONING_GENERATE_EMAIL_BULLETS: 'positioning.generate.emailBullets',
  POSITIONING_GENERATE_CANDIDATE_EMAIL: 'positioning.generate.candidateEmail',

  MISSION_JOB_POSTING_EXECUTIVE: 'mission.jobPosting.executive',
  MISSION_JOB_POSTING_KEY_POINTS: 'mission.jobPosting.keyPoints',
  /** Audit : run workflow annulé (doublon, autre requête a gagné le claim). */
  MISSION_JOB_POSTING_WORKFLOW_DEDUP: 'mission.jobPosting.workflowDedup',
  MISSION_KEY_POINT_EXPLAIN: 'mission.keyPoint.explain',
} as const;

export type TaskKey = (typeof TASK_KEY)[keyof typeof TASK_KEY];
