import { useState } from 'react';
import { formatCost, formatCount, formatKrw, formatPercent, formatScore } from '../lib/format';
import type { ExistingCandidate, SizeTier } from '../lib/types';

interface Props {
  candidate: ExistingCandidate;
  sizeTier: SizeTier;
  budgetKrw: number;
}

function buildReasons(
  candidate: ExistingCandidate,
  sizeTier: SizeTier,
  budgetKrw: number,
): { core: string; extra: string[] } {
  const { creator, breakdown } = candidate;
  const core = `${sizeTier} 내 평균 조회수 백분위 ${breakdown.reachPercentile.toFixed(1)}점`;
  const extra = [
    `과거 평균 집행액 ${formatKrw(creator.avgCampaignBudgetKrw)} ≤ 입력 예산 ${formatKrw(budgetKrw)}`,
    creator.isRatingUnverified
      ? `광고주 평점 미확인 · 집행 ${formatCount(creator.totalCampaignCount)}건`
      : `광고주 평점 ${creator.advertiserRating?.toFixed(1)}/5 · 집행 ${formatCount(creator.totalCampaignCount)}건`,
  ];
  return { core, extra };
}

export function CandidateCard({ candidate, sizeTier, budgetKrw }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { creator, breakdown } = candidate;
  const { core, extra } = buildReasons(candidate, sizeTier, budgetKrw);

  return (
    <article className="candidate-card">
      <header className="candidate-card__header">
        <div>
          <h3>
            {creator.name} <span className="muted">({creator.id})</span>
          </h3>
          <p className="muted candidate-card__subline">
            {creator.platform} · {creator.category} · 팔로워 {formatCount(creator.followers)}명 (
            {sizeTier})
          </p>
        </div>
        <div className="candidate-card__score">
          <span className="score-value">{formatScore(candidate.score)}</span>
          <span className="score-label">종합점수</span>
        </div>
      </header>

      <ul className="metrics-inline">
        <li>
          <strong>조회수</strong> {formatCount(creator.avgViewCount)}
        </li>
        <li>
          <strong>참여율</strong> {formatPercent(creator.engagementRate)}
        </li>
        <li>
          <strong>평점</strong>{' '}
          {creator.isRatingUnverified ? '미확인' : `${creator.advertiserRating?.toFixed(1)}/5`}
        </li>
        <li>
          <strong>집행</strong> {formatCount(creator.totalCampaignCount)}건
        </li>
        <li>
          <strong>평균 집행액</strong> {formatKrw(creator.avgCampaignBudgetKrw)}
        </li>
        <li>
          <strong>참고 1천 조회당 비용</strong> {formatCost(candidate.costPer1000Views)}
        </li>
      </ul>

      <p className="candidate-card__core-reason">{core}</p>

      <button type="button" className="btn btn--link" onClick={() => setExpanded((v) => !v)}>
        {expanded ? '추천 근거 접기' : '추천 근거 상세 보기'}
      </button>

      {expanded && (
        <div className="candidate-card__detail">
          <ul className="candidate-card__reasons">
            {extra.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <p className="muted">
            같은 팔로워 규모 내 상대 지표를 조합한 점수입니다. 광고 성과를 보장하지 않습니다.
          </p>
          <table>
            <thead>
              <tr>
                <th>항목</th>
                <th>규모 내 백분위 / 점수</th>
                <th>가중 기여점</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>도달 (V)</td>
                <td>{breakdown.reachPercentile.toFixed(2)}</td>
                <td>{breakdown.weightedReach.toFixed(2)}</td>
              </tr>
              <tr>
                <td>참여 (E)</td>
                <td>{breakdown.engagementPercentile.toFixed(2)}</td>
                <td>{breakdown.weightedEngagement.toFixed(2)}</td>
              </tr>
              <tr>
                <td>협업 이력 (C)</td>
                <td>{breakdown.collaborationScore.toFixed(2)}</td>
                <td>{breakdown.weightedCollaboration.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          <p className="muted">
            참고 1천 조회당 비용: 과거 평균 집행액을 평균 조회수로 나눈 참고값입니다. 광고 콘텐츠의 실제
            CPM이나 보장 성과가 아닙니다.
          </p>
        </div>
      )}
    </article>
  );
}
