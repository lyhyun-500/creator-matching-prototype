import { SIZE_TIERS, type SizeTier } from './constants';
import { filterByBudget, filterByCategoryAndSize, splitExistingAndNew } from './filter';
import type { Alternative, Creator } from './types';

export function computeAlternatives(
  allCreators: Creator[],
  categories: string[],
  sizeTier: SizeTier,
  budgetKrw: number,
): Alternative[] {
  const alternatives: Alternative[] = [];

  const sameCategoryAndSize = filterByCategoryAndSize(allCreators, categories, sizeTier);
  const { existing: existingSameTier } = splitExistingAndNew(sameCategoryAndSize);

  if (existingSameTier.length > 0) {
    const minBudget = Math.min(...existingSameTier.map((c) => c.avgCampaignBudgetKrw));
    if (minBudget > budgetKrw) {
      const resultingCount = filterByBudget(existingSameTier, minBudget).length;
      alternatives.push({
        type: 'budget',
        suggestedBudgetKrw: minBudget,
        resultingCount,
      });
    }
  }

  for (const otherTier of SIZE_TIERS) {
    if (otherTier === sizeTier) continue;
    const candidatesInTier = filterByCategoryAndSize(allCreators, categories, otherTier);
    const { existing } = splitExistingAndNew(candidatesInTier);
    const withinBudget = filterByBudget(existing, budgetKrw);
    if (withinBudget.length > 0) {
      alternatives.push({
        type: 'size',
        sizeTier: otherTier,
        resultingCount: withinBudget.length,
      });
    }
  }

  return alternatives;
}
