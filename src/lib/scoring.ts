import {
  COLLABORATION_WEIGHTS,
  NEW_CANDIDATE_SCORE_DIVISOR,
  RATING_SCALE_MAX,
  SCORE_WEIGHTS,
  UNVERIFIED_RATING_SUBSTITUTE,
  type SizeTier,
} from './constants';
import type { Creator, ScoreBreakdown } from './types';

/**
 * 규모별 기준 집합: CSV 로드 시 1회 고정한다. 예산·카테고리·정렬이 바뀌어도
 * 여기서 만든 값 배열은 그대로 재사용해 같은 후보의 점수가 변하지 않게 한다.
 */
export interface SizeTierBaseline {
  avgViewCounts: number[];
  engagementRates: number[];
}

export function buildSizeTierBaselines(creators: Creator[]): Record<SizeTier, SizeTierBaseline> {
  const baselines: Record<SizeTier, SizeTierBaseline> = {
    나노: { avgViewCounts: [], engagementRates: [] },
    마이크로: { avgViewCounts: [], engagementRates: [] },
    매크로: { avgViewCounts: [], engagementRates: [] },
  };
  for (const creator of creators) {
    const bucket = baselines[creator.sizeTier];
    bucket.avgViewCounts.push(creator.avgViewCount);
    bucket.engagementRates.push(creator.engagementRate);
  }
  return baselines;
}

export function computeMaxCampaignCount(creators: Creator[]): number {
  let max = 0;
  for (const creator of creators) {
    if (creator.totalCampaignCount > max) max = creator.totalCampaignCount;
  }
  return max;
}

/** 100 × (L + (T - 1) / 2) / (N - 1); N === 1이면 50. */
export function percentileScore(value: number, allValues: number[]): number {
  const n = allValues.length;
  if (n === 1) return 50;
  let lessCount = 0;
  let equalCount = 0;
  for (const v of allValues) {
    if (v < value) lessCount += 1;
    else if (v === value) equalCount += 1;
  }
  return (100 * (lessCount + (equalCount - 1) / 2)) / (n - 1);
}

export function collaborationScore(
  creator: Creator,
  maxCampaignCount: number,
): { score: number; ratingComponent: number; experienceComponent: number } {
  const ratingComponent = creator.isRatingUnverified
    ? UNVERIFIED_RATING_SUBSTITUTE
    : ((creator.advertiserRating ?? 0) / RATING_SCALE_MAX) * 100;

  const experienceComponent =
    maxCampaignCount > 0
      ? (100 * Math.log1p(creator.totalCampaignCount)) / Math.log1p(maxCampaignCount)
      : 0;

  const score =
    COLLABORATION_WEIGHTS.rating * ratingComponent +
    COLLABORATION_WEIGHTS.experience * experienceComponent;

  return { score, ratingComponent, experienceComponent };
}

export function scoreExistingCandidate(
  creator: Creator,
  baseline: SizeTierBaseline,
  maxCampaignCount: number,
): { score: number; breakdown: ScoreBreakdown } {
  const reachPercentile = percentileScore(creator.avgViewCount, baseline.avgViewCounts);
  const engagementPercentile = percentileScore(creator.engagementRate, baseline.engagementRates);
  const { score: collaborationScoreValue, ratingComponent, experienceComponent } =
    collaborationScore(creator, maxCampaignCount);

  const weightedReach = SCORE_WEIGHTS.reach * reachPercentile;
  const weightedEngagement = SCORE_WEIGHTS.engagement * engagementPercentile;
  const weightedCollaboration = SCORE_WEIGHTS.collaboration * collaborationScoreValue;

  const score = weightedReach + weightedEngagement + weightedCollaboration;

  return {
    score,
    breakdown: {
      reachPercentile,
      engagementPercentile,
      collaborationScore: collaborationScoreValue,
      ratingComponent,
      experienceComponent,
      weightedReach,
      weightedEngagement,
      weightedCollaboration,
    },
  };
}

export function scoreNewCandidate(
  creator: Creator,
  baseline: SizeTierBaseline,
): { internalScore: number; reachPercentile: number; engagementPercentile: number } {
  const reachPercentile = percentileScore(creator.avgViewCount, baseline.avgViewCounts);
  const engagementPercentile = percentileScore(creator.engagementRate, baseline.engagementRates);
  const internalScore =
    (SCORE_WEIGHTS.reach * reachPercentile + SCORE_WEIGHTS.engagement * engagementPercentile) /
    NEW_CANDIDATE_SCORE_DIVISOR;

  return { internalScore, reachPercentile, engagementPercentile };
}

export function costPer1000Views(creator: Creator): number | null {
  if (creator.avgCampaignBudgetKrw > 0 && creator.avgViewCount > 0) {
    return (creator.avgCampaignBudgetKrw / creator.avgViewCount) * 1000;
  }
  return null;
}
