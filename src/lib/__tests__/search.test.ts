import { describe, expect, it } from 'vitest';
import { loadFixtureDataset } from './testUtils';
import { search, buildContext } from './testUtils';
import { runSearch } from '../search';
import { percentileScore } from '../scoring';
import { sortExistingCandidates } from '../sort';

const { creators } = loadFixtureDataset();

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

describe('9.1 정상 추천 — 뷰티·패션 / 마이크로 / 200만 원 (AC04, AC07)', () => {
  const result = search(creators, {
    budgetKrw: 2_000_000,
    categories: ['뷰티', '패션'],
    sizeTier: '마이크로',
  });

  it('finds 21 existing candidates and 3 new candidates', () => {
    expect(result.existing).toHaveLength(21);
    expect(result.newCandidates).toHaveLength(3);
  });

  it('has no duplicate candidates across the OR category match', () => {
    const ids = result.existing.map((c) => c.creator.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ranks the top 3 exactly as specified', () => {
    const top3 = result.existing.slice(0, 3).map((c) => [c.creator.id, round2(c.score)]);
    expect(top3).toEqual([
      ['C0077', 78.19],
      ['C0175', 67.59],
      ['C0066', 67.24],
    ]);
  });

  it('matches the full top-5 table from the PRD within 0.01', () => {
    const expected: [string, number][] = [
      ['C0077', 78.19],
      ['C0175', 67.59],
      ['C0066', 67.24],
      ['C0013', 62.95],
      ['C0155', 62.03],
    ];
    result.existing.slice(0, 5).forEach((candidate, i) => {
      expect(candidate.creator.id).toBe(expected[i][0]);
      expect(candidate.score).toBeCloseTo(expected[i][1], 1);
    });
  });
});

describe('9.1 정상 추천 — 식품 / 나노 / 50만 원', () => {
  const result = search(creators, {
    budgetKrw: 500_000,
    categories: ['식품'],
    sizeTier: '나노',
  });

  it('finds 2 existing and 2 new candidates, ordered C0091 -> C0166', () => {
    expect(result.existing).toHaveLength(2);
    expect(result.newCandidates).toHaveLength(2);
    expect(result.existing.map((c) => c.creator.id)).toEqual(['C0091', 'C0166']);
    expect(round2(result.existing[0].score)).toBeCloseTo(79.45, 1);
    expect(round2(result.existing[1].score)).toBeCloseTo(45.79, 1);
  });
});

describe('AC08/AC09 — 피트니스 / 매크로 / 50만 원 빈 결과와 대안', () => {
  const result = search(creators, {
    budgetKrw: 500_000,
    categories: ['피트니스'],
    sizeTier: '매크로',
  });

  it('returns zero existing and zero new candidates', () => {
    expect(result.existing).toHaveLength(0);
    expect(result.newCandidates).toHaveLength(0);
  });

  it('suggests a budget alternative of 5,930,000 KRW', () => {
    const budgetAlt = result.alternatives.find((a) => a.type === 'budget');
    expect(budgetAlt).toBeDefined();
    expect(budgetAlt && budgetAlt.type === 'budget' && budgetAlt.suggestedBudgetKrw).toBe(5_930_000);
  });

  it('does not suggest 마이크로 since it yields 0 candidates at this budget', () => {
    const sizeAlt = result.alternatives.find((a) => a.type === 'size' && a.sizeTier === '마이크로');
    expect(sizeAlt).toBeUndefined();
  });
});

describe('AC11 — 참고 1천 조회당 비용', () => {
  it('computes C0077 cost as ~22,177 KRW', () => {
    const c0077 = creators.find((c) => c.id === 'C0077')!;
    const result = search(creators, {
      budgetKrw: 2_000_000,
      categories: ['뷰티', '패션'],
      sizeTier: '마이크로',
    });
    const entry = result.existing.find((c) => c.creator.id === c0077.id)!;
    expect(entry.costPer1000Views).not.toBeNull();
    expect(Math.round(entry.costPer1000Views!)).toBe(22177);
  });

  it('marks new candidates and zero-view existing candidates as null (계산 불가)', () => {
    const result = search(creators, {
      budgetKrw: 2_000_000,
      categories: ['뷰티', '패션'],
      sizeTier: '마이크로',
    });
    // no new candidates carry a cost figure at all (they're a separate list)
    expect(result.newCandidates.every((c) => !('costPer1000Views' in c))).toBe(true);
  });
});

describe('AC05 — 기준 집합 고정 (baseline invariance)', () => {
  it('keeps a candidate score identical across different budget/category filters', () => {
    const ctx = buildContext(creators);
    const criteriaA = { budgetKrw: 2_000_000, categories: ['뷰티', '패션'], sizeTier: '마이크로' as const };
    const criteriaB = { budgetKrw: 10_000_000, categories: ['뷰티', '패션', '게임', '테크'], sizeTier: '마이크로' as const };

    const resultA = runSearch(creators, criteriaA, ctx);
    const resultB = runSearch(creators, criteriaB, ctx);

    const c0077A = resultA.existing.find((c) => c.creator.id === 'C0077')!;
    const c0077B = resultB.existing.find((c) => c.creator.id === 'C0077')!;
    expect(c0077A.score).toBe(c0077B.score);
  });
});

describe('AC13 — 나눗셈 예외', () => {
  it('percentileScore returns 50 when the baseline has exactly one value', () => {
    expect(percentileScore(1234, [1234])).toBe(50);
  });

  it('percentileScore returns 50 when all baseline values are identical', () => {
    expect(percentileScore(5, [5, 5, 5, 5])).toBe(50);
    expect(Number.isFinite(percentileScore(5, [5, 5, 5, 5]))).toBe(true);
  });

  it('never produces NaN or Infinity for any candidate score in the full dataset', () => {
    const ctx = buildContext(creators);
    for (const tier of ['나노', '마이크로', '매크로'] as const) {
      const categories = Array.from(new Set(creators.map((c) => c.category)));
      const result = runSearch(creators, { budgetKrw: 999_999_999, categories, sizeTier: tier }, ctx);
      for (const c of result.existing) {
        expect(Number.isFinite(c.score)).toBe(true);
        expect(Number.isFinite(c.breakdown.reachPercentile)).toBe(true);
        expect(Number.isFinite(c.breakdown.engagementPercentile)).toBe(true);
        expect(Number.isFinite(c.breakdown.collaborationScore)).toBe(true);
      }
    }
  });
});

describe('AC12 — 정렬', () => {
  const result = search(creators, {
    budgetKrw: 2_000_000,
    categories: ['뷰티', '패션'],
    sizeTier: '마이크로',
  });

  it('viewsDesc sorts by raw avg view count descending without changing the candidate set or scores', () => {
    const sorted = sortExistingCandidates(result.existing, 'viewsDesc');
    expect(sorted).toHaveLength(result.existing.length);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].creator.avgViewCount).toBeGreaterThanOrEqual(sorted[i].creator.avgViewCount);
    }
    const scoreById = new Map(result.existing.map((c) => [c.creator.id, c.score]));
    for (const c of sorted) {
      expect(c.score).toBe(scoreById.get(c.creator.id));
    }
  });

  it('costAsc places null (계산 불가) entries last', () => {
    const sorted = sortExistingCandidates(result.existing, 'costAsc');
    const nullIndexes = sorted
      .map((c, i) => (c.costPer1000Views === null ? i : -1))
      .filter((i) => i >= 0);
    const nonNullIndexes = sorted
      .map((c, i) => (c.costPer1000Views !== null ? i : -1))
      .filter((i) => i >= 0);
    if (nullIndexes.length > 0 && nonNullIndexes.length > 0) {
      expect(Math.min(...nullIndexes)).toBeGreaterThan(Math.max(...nonNullIndexes));
    }
  });

  it('default tie-break is deterministic across repeated sorts', () => {
    const sortedOnce = sortExistingCandidates(result.existing, 'recommended').map((c) => c.creator.id);
    const sortedTwice = sortExistingCandidates([...result.existing].reverse(), 'recommended').map(
      (c) => c.creator.id,
    );
    expect(sortedTwice).toEqual(sortedOnce);
  });
});
