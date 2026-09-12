import type { SizeTier } from './constants';
import type { Creator } from './types';

export function matchesCategoryAndSize(
  creator: Creator,
  categories: string[],
  sizeTier: SizeTier,
): boolean {
  return creator.sizeTier === sizeTier && categories.includes(creator.category);
}

export function filterByCategoryAndSize(
  creators: Creator[],
  categories: string[],
  sizeTier: SizeTier,
): Creator[] {
  return creators.filter((c) => matchesCategoryAndSize(c, categories, sizeTier));
}

export function splitExistingAndNew(creators: Creator[]): {
  existing: Creator[];
  newCandidates: Creator[];
} {
  const existing: Creator[] = [];
  const newCandidates: Creator[] = [];
  for (const c of creators) {
    if (c.isNew) newCandidates.push(c);
    else existing.push(c);
  }
  return { existing, newCandidates };
}

export function filterByBudget(existing: Creator[], budgetKrw: number): Creator[] {
  return existing.filter((c) => c.avgCampaignBudgetKrw <= budgetKrw);
}
