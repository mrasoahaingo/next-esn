export type PositioningAnalysisBranch =
  | 'skills'
  | 'experiences'
  | 'gaps'
  | 'questions'
  | 'synthesis';

export type PositioningAnalysisStreamMeta = {
  phase?: 'extracting' | 'synthesizing';
  activeBranches?: PositioningAnalysisBranch[];
};
