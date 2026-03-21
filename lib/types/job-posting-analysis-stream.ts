export type JobPostingAnalysisBranch = 'executive' | 'keyPoints';

export type JobPostingAnalysisStreamMeta = {
  phase?: 'extracting' | 'finalizing';
  activeBranches?: JobPostingAnalysisBranch[];
};
