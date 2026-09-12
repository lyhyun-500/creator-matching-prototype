import { parseCsv } from './csvParser';
import { resolveSizeTier } from './constants';
import { FileLoadError, type Creator, type DataLoadResult, type ExcludedRow } from './types';

const REQUIRED_HEADERS = [
  'creator_id',
  'creator_name',
  'category',
  'platform',
  'followers',
  'avg_view_count',
  'engagement_rate',
  'total_campaign_count',
  'total_campaign_budget_krw',
  'avg_campaign_budget_krw',
  'advertiser_rating',
] as const;

function isFiniteNonNegativeInt(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && value >= 0;
}

/** 결측/NaN/Infinity/음수/범위 위반이면 null (제외 사유용). 빈 문자열은 숫자 0으로 변환하지 않는다. */
function parseNonNegativeInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  if (!isFiniteNonNegativeInt(value)) return null;
  return value;
}

function parseEngagementRate(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0 || value > 100) return null;
  return value;
}

function parseRating(raw: string): { value: number | null; wasBlank: boolean; invalid: boolean } {
  const trimmed = raw.trim();
  if (trimmed === '') return { value: null, wasBlank: true, invalid: false };
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0 || value > 5) {
    return { value: null, wasBlank: false, invalid: true };
  }
  return { value, wasBlank: false, invalid: false };
}

export async function loadCreators(csvPath: string): Promise<DataLoadResult> {
  let raw: string;
  try {
    const response = await fetch(csvPath);
    if (!response.ok) {
      throw new FileLoadError('fetch_failed', `CSV 파일을 불러오지 못했습니다 (HTTP ${response.status}).`);
    }
    raw = await response.text();
  } catch (err) {
    if (err instanceof FileLoadError) throw err;
    throw new FileLoadError('fetch_failed', 'CSV 파일을 불러오지 못했습니다.');
  }

  return parseCreatorsFromCsvText(raw);
}

/** fetch에 의존하지 않는 순수 파싱 함수. 테스트와 loadCreators가 공유한다. */
export function parseCreatorsFromCsvText(raw: string): DataLoadResult {
  let table: string[][];
  try {
    table = parseCsv(raw);
  } catch {
    throw new FileLoadError('parse_failed', 'CSV 파싱에 실패했습니다.');
  }

  if (table.length === 0) {
    throw new FileLoadError('parse_failed', 'CSV 파일이 비어 있습니다.');
  }

  const header = table[0].map((h) => h.trim());
  const missingHeaders = REQUIRED_HEADERS.filter((h) => !header.includes(h));
  if (missingHeaders.length > 0) {
    throw new FileLoadError(
      'missing_headers',
      `필수 헤더가 누락되었습니다: ${missingHeaders.join(', ')}`,
    );
  }

  const colIndex: Record<(typeof REQUIRED_HEADERS)[number], number> = REQUIRED_HEADERS.reduce(
    (acc, h) => {
      acc[h] = header.indexOf(h);
      return acc;
    },
    {} as Record<(typeof REQUIRED_HEADERS)[number], number>,
  );

  const dataRows = table.slice(1).filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''));

  const excluded: ExcludedRow[] = [];
  const seenIds = new Set<string>();
  const duplicateIds = new Set<string>();
  const creators: Creator[] = [];

  dataRows.forEach((cells, idx) => {
    const rowNumber = idx + 2; // 1-indexed + header row
    const get = (key: (typeof REQUIRED_HEADERS)[number]) => (cells[colIndex[key]] ?? '').trim();

    const id = get('creator_id');
    const name = get('creator_name');
    const category = get('category');
    const platform = get('platform');

    if (!id) {
      excluded.push({ rowNumber, creatorId: null, reason: 'creator_id 누락' });
      return;
    }
    if (seenIds.has(id)) {
      duplicateIds.add(id);
    }
    seenIds.add(id);

    if (!name) {
      excluded.push({ rowNumber, creatorId: id, reason: 'creator_name 누락' });
      return;
    }
    if (!category) {
      excluded.push({ rowNumber, creatorId: id, reason: 'category 누락' });
      return;
    }
    if (!platform) {
      excluded.push({ rowNumber, creatorId: id, reason: 'platform 누락' });
      return;
    }

    const followers = parseNonNegativeInt(get('followers'));
    if (followers === null) {
      excluded.push({ rowNumber, creatorId: id, reason: 'followers 값이 유효하지 않음' });
      return;
    }
    const avgViewCount = parseNonNegativeInt(get('avg_view_count'));
    if (avgViewCount === null) {
      excluded.push({ rowNumber, creatorId: id, reason: 'avg_view_count 값이 유효하지 않음' });
      return;
    }
    const engagementRate = parseEngagementRate(get('engagement_rate'));
    if (engagementRate === null) {
      excluded.push({ rowNumber, creatorId: id, reason: 'engagement_rate 값이 유효하지 않음' });
      return;
    }
    const totalCampaignCount = parseNonNegativeInt(get('total_campaign_count'));
    if (totalCampaignCount === null) {
      excluded.push({ rowNumber, creatorId: id, reason: 'total_campaign_count 값이 유효하지 않음' });
      return;
    }
    const totalCampaignBudgetKrw = parseNonNegativeInt(get('total_campaign_budget_krw'));
    if (totalCampaignBudgetKrw === null) {
      excluded.push({ rowNumber, creatorId: id, reason: 'total_campaign_budget_krw 값이 유효하지 않음' });
      return;
    }
    const avgCampaignBudgetKrw = parseNonNegativeInt(get('avg_campaign_budget_krw'));
    if (avgCampaignBudgetKrw === null) {
      excluded.push({ rowNumber, creatorId: id, reason: 'avg_campaign_budget_krw 값이 유효하지 않음' });
      return;
    }
    const rating = parseRating(get('advertiser_rating'));
    if (rating.invalid) {
      excluded.push({ rowNumber, creatorId: id, reason: 'advertiser_rating 값이 유효하지 않음' });
      return;
    }

    const isNewCandidate =
      totalCampaignCount === 0 &&
      rating.wasBlank &&
      avgCampaignBudgetKrw === 0 &&
      totalCampaignBudgetKrw === 0;

    const hasZeroCampaignsButHistorySignal =
      totalCampaignCount === 0 &&
      (!rating.wasBlank || avgCampaignBudgetKrw > 0 || totalCampaignBudgetKrw > 0);

    const hasCampaignsButNoBudget =
      totalCampaignCount > 0 && (avgCampaignBudgetKrw === 0 || totalCampaignBudgetKrw === 0);

    if (hasZeroCampaignsButHistorySignal || hasCampaignsButNoBudget) {
      excluded.push({ rowNumber, creatorId: id, reason: '이력 불일치 (캠페인 수와 가격/평점 정보 모순)' });
      return;
    }

    const isRatingUnverified = totalCampaignCount > 0 && rating.wasBlank;

    creators.push({
      id,
      name,
      category,
      platform,
      followers,
      avgViewCount,
      engagementRate,
      totalCampaignCount,
      totalCampaignBudgetKrw,
      avgCampaignBudgetKrw,
      advertiserRating: rating.value,
      sizeTier: resolveSizeTier(followers),
      isNew: isNewCandidate,
      isRatingUnverified,
    });
  });

  if (duplicateIds.size > 0) {
    throw new FileLoadError(
      'duplicate_id',
      `중복된 creator_id가 있습니다: ${Array.from(duplicateIds).join(', ')}`,
    );
  }

  if (creators.length === 0) {
    throw new FileLoadError('no_valid_rows', '유효한 데이터가 없습니다.');
  }

  return { creators, excluded, totalRows: dataRows.length };
}
