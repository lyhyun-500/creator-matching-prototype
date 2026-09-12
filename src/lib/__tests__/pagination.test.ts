import { describe, expect, it } from 'vitest';
import { loadFixtureDataset } from './testUtils';
import { search } from './testUtils';
import { paginate, totalPages } from '../pagination';
import { sortExistingCandidates } from '../sort';
import type { SortOption } from '../types';

const { creators } = loadFixtureDataset();
const PAGE_SIZE = 10;

describe('pagination helpers', () => {
  it('computes total pages correctly, minimum 1', () => {
    expect(totalPages(0, PAGE_SIZE)).toBe(1);
    expect(totalPages(1, PAGE_SIZE)).toBe(1);
    expect(totalPages(10, PAGE_SIZE)).toBe(1);
    expect(totalPages(11, PAGE_SIZE)).toBe(2);
    expect(totalPages(21, PAGE_SIZE)).toBe(3);
  });

  it('slices pages without gaps or overlaps', () => {
    const items = Array.from({ length: 21 }, (_, i) => i);
    const pages = [paginate(items, 1, PAGE_SIZE), paginate(items, 2, PAGE_SIZE), paginate(items, 3, PAGE_SIZE)];
    expect(pages[0]).toHaveLength(10);
    expect(pages[1]).toHaveLength(10);
    expect(pages[2]).toHaveLength(1);
    expect(pages.flat()).toEqual(items);
  });
});

describe('탭/페이지 이동 시 후보 무결성 (뷰티·패션 / 마이크로 / 200만 원, 21명)', () => {
  const result = search(creators, {
    budgetKrw: 2_000_000,
    categories: ['뷰티', '패션'],
    sizeTier: '마이크로',
  });

  it('concatenating every existing-tab page reproduces the full sorted list exactly once each', () => {
    const sorted = sortExistingCandidates(result.existing, 'recommended');
    const pages = totalPages(sorted.length, PAGE_SIZE);
    const reconstructed = Array.from({ length: pages }, (_, i) => paginate(sorted, i + 1, PAGE_SIZE)).flat();

    expect(reconstructed).toHaveLength(sorted.length);
    expect(reconstructed.map((c) => c.creator.id)).toEqual(sorted.map((c) => c.creator.id));

    const ids = reconstructed.map((c) => c.creator.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('switching sort options keeps the same 21 candidates and identical per-candidate scores, only order changes', () => {
    const options: SortOption[] = ['recommended', 'viewsDesc', 'engagementDesc', 'collaborationDesc', 'costAsc'];
    const idSetsAndScores = options.map((option) => {
      const sorted = sortExistingCandidates(result.existing, option);
      return {
        option,
        ids: new Set(sorted.map((c) => c.creator.id)),
        scoreById: new Map(sorted.map((c) => [c.creator.id, c.score])),
      };
    });

    const [first, ...rest] = idSetsAndScores;
    for (const other of rest) {
      expect(other.ids.size).toBe(first.ids.size);
      expect([...other.ids].sort()).toEqual([...first.ids].sort());
      for (const [id, score] of first.scoreById) {
        expect(other.scoreById.get(id)).toBe(score);
      }
    }
  });

  it('every existing-tab page is disjoint from the new-candidate tab (no cross-tab duplicates)', () => {
    const existingIds = new Set(result.existing.map((c) => c.creator.id));
    const newIds = new Set(result.newCandidates.map((c) => c.creator.id));
    for (const id of newIds) {
      expect(existingIds.has(id)).toBe(false);
    }
  });

  it('new-candidate pages reproduce the full sorted new list exactly once each', () => {
    const pages = totalPages(result.newCandidates.length, PAGE_SIZE);
    const reconstructed = Array.from({ length: pages }, (_, i) =>
      paginate(result.newCandidates, i + 1, PAGE_SIZE),
    ).flat();
    expect(reconstructed).toHaveLength(result.newCandidates.length);
    expect(reconstructed.map((c) => c.creator.id)).toEqual(result.newCandidates.map((c) => c.creator.id));
  });
});

describe('빈 예산 탭에서도 신규 후보 수는 정확히 유지 (피트니스 / 매크로 / 50만 원)', () => {
  it('existing is empty, new candidates (if any) are fully addressable via pagination', () => {
    const result = search(creators, {
      budgetKrw: 500_000,
      categories: ['피트니스'],
      sizeTier: '매크로',
    });
    expect(result.existing).toHaveLength(0);
    const pages = totalPages(result.newCandidates.length, PAGE_SIZE);
    const reconstructed = Array.from({ length: pages }, (_, i) =>
      paginate(result.newCandidates, i + 1, PAGE_SIZE),
    ).flat();
    expect(reconstructed).toHaveLength(result.newCandidates.length);
  });
});
