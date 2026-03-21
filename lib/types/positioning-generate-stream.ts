export type PositioningGenerateBranch =
  | 'tailoredCv'
  | 'email'
  | 'emailFirstContact'
  | 'emailBulletPoints'
  | 'candidateEmail';

export type PositioningGenerateStreamMeta = {
  phase?: 'generating';
  activeBranches?: PositioningGenerateBranch[];
};
