import type { ExistingCandidate, NewCandidate, SortOption } from './types';

type Comparator<T> = (a: T, b: T) => number;

function chain<T>(...comparators: Comparator<T>[]): Comparator<T> {
  return (a, b) => {
    for (const cmp of comparators) {
      const result = cmp(a, b);
      if (result !== 0) return result;
    }
    return 0;
  };
}

const byScoreDesc: Comparator<ExistingCandidate> = (a, b) => b.score - a.score;
const byViewsDesc: Comparator<ExistingCandidate> = (a, b) => b.creator.avgViewCount - a.creator.avgViewCount;
const byBudgetAsc: Comparator<ExistingCandidate> = (a, b) => a.creator.avgCampaignBudgetKrw - b.creator.avgCampaignBudgetKrw;
const byIdAsc: Comparator<ExistingCandidate> = (a, b) => a.creator.id.localeCompare(b.creator.id);
const byEngagementDesc: Comparator<ExistingCandidate> = (a, b) => b.creator.engagementRate - a.creator.engagementRate;
const byCollaborationDesc: Comparator<ExistingCandidate> = (a, b) =>
  b.breakdown.collaborationScore - a.breakdown.collaborationScore;
const byCostAsc: Comparator<ExistingCandidate> = (a, b) => {
  if (a.costPer1000Views === null && b.costPer1000Views === null) return 0;
  if (a.costPer1000Views === null) return 1;
  if (b.costPer1000Views === null) return -1;
  return a.costPer1000Views - b.costPer1000Views;
};

/** 기본 동점 해소: 점수 내림차순 → 평균 조회수 내림차순 → 평균 집행액 오름차순 → ID 사전순. */
export const defaultTieBreak = chain(byScoreDesc, byViewsDesc, byBudgetAsc, byIdAsc);

const SORTERS: Record<SortOption, Comparator<ExistingCandidate>> = {
  recommended: defaultTieBreak,
  viewsDesc: chain(byViewsDesc, defaultTieBreak),
  engagementDesc: chain(byEngagementDesc, defaultTieBreak),
  collaborationDesc: chain(byCollaborationDesc, defaultTieBreak),
  costAsc: chain(byCostAsc, defaultTieBreak),
};

export function sortExistingCandidates(
  candidates: ExistingCandidate[],
  option: SortOption,
): ExistingCandidate[] {
  return [...candidates].sort(SORTERS[option]);
}

export function sortNewCandidates(candidates: NewCandidate[]): NewCandidate[] {
  return [...candidates].sort((a, b) => {
    if (b.internalScore !== a.internalScore) return b.internalScore - a.internalScore;
    if (b.creator.avgViewCount !== a.creator.avgViewCount) {
      return b.creator.avgViewCount - a.creator.avgViewCount;
    }
    return a.creator.id.localeCompare(b.creator.id);
  });
}
