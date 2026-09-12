export const CSV_PATH = `${import.meta.env.BASE_URL}data/dummy_creators.csv`;

export const SIZE_TIERS = ['나노', '마이크로', '매크로'] as const;
export type SizeTier = (typeof SIZE_TIERS)[number];

export const SIZE_TIER_BOUNDS: Record<SizeTier, { min: number; max: number | null }> = {
  나노: { min: 0, max: 10_000 },
  마이크로: { min: 10_000, max: 100_000 },
  매크로: { min: 100_000, max: null },
};

export function resolveSizeTier(followers: number): SizeTier {
  if (followers < SIZE_TIER_BOUNDS.나노.max!) return '나노';
  if (followers < SIZE_TIER_BOUNDS.마이크로.max!) return '마이크로';
  return '매크로';
}

export const SCORE_WEIGHTS = {
  reach: 0.6,
  engagement: 0.25,
  collaboration: 0.15,
} as const;

export const COLLABORATION_WEIGHTS = {
  rating: 0.7,
  experience: 0.3,
} as const;

export const NEW_CANDIDATE_SCORE_DIVISOR = SCORE_WEIGHTS.reach + SCORE_WEIGHTS.engagement;

export const RATING_SCALE_MAX = 5;
export const UNVERIFIED_RATING_SUBSTITUTE = 50;
