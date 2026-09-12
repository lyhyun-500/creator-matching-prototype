import type { SizeTier } from './constants';

export type { SizeTier };

export interface Creator {
  id: string;
  name: string;
  category: string;
  platform: string;
  followers: number;
  avgViewCount: number;
  engagementRate: number;
  totalCampaignCount: number;
  totalCampaignBudgetKrw: number;
  avgCampaignBudgetKrw: number;
  /** null = 평점 미확인/공란. 이력 없는 신규 후보는 항상 null. */
  advertiserRating: number | null;
  sizeTier: SizeTier;
  /** 캠페인 이력이 전혀 없는 신규 후보 여부 */
  isNew: boolean;
  /** 이력은 있으나 평점이 공란인 후보 (방어 케이스) */
  isRatingUnverified: boolean;
}

export interface ExcludedRow {
  rowNumber: number;
  creatorId: string | null;
  reason: string;
}

export interface DataLoadResult {
  creators: Creator[];
  excluded: ExcludedRow[];
  totalRows: number;
}

export type FileLoadErrorKind =
  | 'fetch_failed'
  | 'parse_failed'
  | 'missing_headers'
  | 'duplicate_id'
  | 'no_valid_rows';

export class FileLoadError extends Error {
  kind: FileLoadErrorKind;
  constructor(kind: FileLoadErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = 'FileLoadError';
  }
}

export interface SearchCriteria {
  budgetKrw: number;
  categories: string[];
  sizeTier: SizeTier;
}

export interface ScoreBreakdown {
  reachPercentile: number;
  engagementPercentile: number;
  collaborationScore: number;
  ratingComponent: number;
  experienceComponent: number;
  weightedReach: number;
  weightedEngagement: number;
  weightedCollaboration: number;
}

export interface ExistingCandidate {
  creator: Creator;
  score: number;
  breakdown: ScoreBreakdown;
  costPer1000Views: number | null;
}

export interface NewCandidate {
  creator: Creator;
  internalScore: number;
  reachPercentile: number;
  engagementPercentile: number;
}

export type SortOption =
  | 'recommended'
  | 'viewsDesc'
  | 'engagementDesc'
  | 'collaborationDesc'
  | 'costAsc';

export interface BudgetAlternative {
  type: 'budget';
  suggestedBudgetKrw: number;
  resultingCount: number;
}

export interface SizeAlternative {
  type: 'size';
  sizeTier: SizeTier;
  resultingCount: number;
}

export type Alternative = BudgetAlternative | SizeAlternative;

export interface SearchResult {
  criteria: SearchCriteria;
  existing: ExistingCandidate[];
  newCandidates: NewCandidate[];
  alternatives: Alternative[];
}
