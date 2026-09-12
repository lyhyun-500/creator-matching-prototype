import { describe, expect, it } from 'vitest';
import { loadFixtureDataset } from './testUtils';
import { parseCreatorsFromCsvText } from '../dataLoad';
import { resolveSizeTier } from '../constants';

describe('dataLoad (AC01, AC06, AC15)', () => {
  it('parses the BOM-prefixed CSV and preserves all 200 rows without loss', () => {
    const { creators, excluded, totalRows } = loadFixtureDataset();
    expect(totalRows).toBe(200);
    expect(creators.length + excluded.length).toBe(200);
    expect(excluded).toHaveLength(0);
  });

  it('keeps the 27 history-less rows as normal new candidates, not errors', () => {
    const { creators } = loadFixtureDataset();
    const newCandidates = creators.filter((c) => c.isNew);
    expect(newCandidates).toHaveLength(27);
    for (const c of newCandidates) {
      expect(c.totalCampaignCount).toBe(0);
      expect(c.advertiserRating).toBeNull();
      expect(c.avgCampaignBudgetKrw).toBe(0);
      expect(c.totalCampaignBudgetKrw).toBe(0);
    }
  });

  it('never treats a null rating as a 0 score display value', () => {
    const { creators } = loadFixtureDataset();
    const newCandidates = creators.filter((c) => c.isNew);
    expect(newCandidates.every((c) => c.advertiserRating === null)).toBe(true);
  });

  it('excludes rows with zero campaigns but a lingering rating or budget signal (history mismatch)', () => {
    const csv =
      'creator_id,creator_name,category,platform,followers,avg_view_count,engagement_rate,total_campaign_count,total_campaign_budget_krw,avg_campaign_budget_krw,advertiser_rating\r\n' +
      'X0000,정상,뷰티,유튜브,1000,500,5.0,0,0,0,\r\n' +
      'X0001,테스트1,뷰티,유튜브,1000,500,5.0,0,0,0,4.5\r\n';
    const { creators, excluded } = parseCreatorsFromCsvText(csv);
    expect(creators).toHaveLength(1);
    expect(excluded).toHaveLength(1);
    expect(excluded[0].reason).toContain('이력 불일치');
  });

  it('excludes rows with campaigns but zero avg/total budget (history mismatch)', () => {
    const csv =
      'creator_id,creator_name,category,platform,followers,avg_view_count,engagement_rate,total_campaign_count,total_campaign_budget_krw,avg_campaign_budget_krw,advertiser_rating\r\n' +
      'X0000,정상,뷰티,유튜브,1000,500,5.0,0,0,0,\r\n' +
      'X0002,테스트2,뷰티,유튜브,1000,500,5.0,3,0,0,4.5\r\n';
    const { creators, excluded } = parseCreatorsFromCsvText(csv);
    expect(creators).toHaveLength(1);
    expect(excluded[0].reason).toContain('이력 불일치');
  });

  it('keeps a candidate with valid history but a blank rating, substituting neutrally', () => {
    const csv =
      'creator_id,creator_name,category,platform,followers,avg_view_count,engagement_rate,total_campaign_count,total_campaign_budget_krw,avg_campaign_budget_krw,advertiser_rating\r\n' +
      'X0003,테스트3,뷰티,유튜브,1000,500,5.0,3,3000000,1000000,\r\n';
    const { creators, excluded } = parseCreatorsFromCsvText(csv);
    expect(excluded).toHaveLength(0);
    expect(creators).toHaveLength(1);
    expect(creators[0].isRatingUnverified).toBe(true);
    expect(creators[0].isNew).toBe(false);
    expect(creators[0].advertiserRating).toBeNull();
  });

  it('reports a file-level error on duplicate creator_id', () => {
    const csv =
      'creator_id,creator_name,category,platform,followers,avg_view_count,engagement_rate,total_campaign_count,total_campaign_budget_krw,avg_campaign_budget_krw,advertiser_rating\r\n' +
      'X0004,테스트4,뷰티,유튜브,1000,500,5.0,0,0,0,\r\n' +
      'X0004,테스트4중복,뷰티,유튜브,1000,500,5.0,0,0,0,\r\n';
    expect(() => parseCreatorsFromCsvText(csv)).toThrowError(/중복/);
  });

  it('reports a file-level error when required headers are missing', () => {
    const csv = 'creator_id,creator_name\r\nX0005,테스트5\r\n';
    expect(() => parseCreatorsFromCsvText(csv)).toThrowError(/헤더/);
  });

  it('reports a data error when every row is excluded', () => {
    const csv =
      'creator_id,creator_name,category,platform,followers,avg_view_count,engagement_rate,total_campaign_count,total_campaign_budget_krw,avg_campaign_budget_krw,advertiser_rating\r\n' +
      ',테스트,뷰티,유튜브,1000,500,5.0,0,0,0,\r\n';
    expect(() => parseCreatorsFromCsvText(csv)).toThrowError();
  });
});

describe('size tier boundaries (AC02)', () => {
  it('classifies boundary follower counts into the correct tier', () => {
    expect(resolveSizeTier(9_999)).toBe('나노');
    expect(resolveSizeTier(10_000)).toBe('마이크로');
    expect(resolveSizeTier(99_999)).toBe('마이크로');
    expect(resolveSizeTier(100_000)).toBe('매크로');
  });
});
