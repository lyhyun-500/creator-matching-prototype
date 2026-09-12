import { computeAlternatives } from './alternatives';
import type { SizeTierBaseline } from './scoring';
import { costPer1000Views, scoreExistingCandidate, scoreNewCandidate } from './scoring';
import { filterByBudget, filterByCategoryAndSize, splitExistingAndNew } from './filter';
import { sortExistingCandidates, sortNewCandidates } from './sort';
import type { Creator, ExistingCandidate, NewCandidate, SearchCriteria, SearchResult } from './types';
import type { SizeTier } from './constants';

export interface ScoringContext {
  baselines: Record<SizeTier, SizeTierBaseline>;
  maxCampaignCount: number;
}

export function runSearch(
  allCreators: Creator[],
  criteria: SearchCriteria,
  context: ScoringContext,
): SearchResult {
  const matching = filterByCategoryAndSize(allCreators, criteria.categories, criteria.sizeTier);
  const { existing, newCandidates: newMatching } = splitExistingAndNew(matching);
  const withinBudget = filterByBudget(existing, criteria.budgetKrw);

  const baseline = context.baselines[criteria.sizeTier];

  const existingResults: ExistingCandidate[] = withinBudget.map((creator) => {
    const { score, breakdown } = scoreExistingCandidate(creator, baseline, context.maxCampaignCount);
    return { creator, score, breakdown, costPer1000Views: costPer1000Views(creator) };
  });

  const newResults: NewCandidate[] = newMatching.map((creator) => {
    const { internalScore, reachPercentile, engagementPercentile } = scoreNewCandidate(
      creator,
      baseline,
    );
    return { creator, internalScore, reachPercentile, engagementPercentile };
  });

  const alternatives =
    existingResults.length === 0
      ? computeAlternatives(allCreators, criteria.categories, criteria.sizeTier, criteria.budgetKrw)
      : [];

  return {
    criteria,
    existing: sortExistingCandidates(existingResults, 'recommended'),
    newCandidates: sortNewCandidates(newResults),
    alternatives,
  };
}
