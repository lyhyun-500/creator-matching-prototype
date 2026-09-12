import { formatCount, formatPercent } from '../lib/format';
import type { NewCandidate, SizeTier } from '../lib/types';

interface Props {
  candidate: NewCandidate;
  sizeTier: SizeTier;
}

export function NewCandidateCard({ candidate, sizeTier }: Props) {
  const { creator, reachPercentile, engagementPercentile } = candidate;

  return (
    <article className="candidate-card candidate-card--new">
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
        <span className="badge badge--new">견적 확인 필요</span>
      </header>

      <ul className="metrics-inline">
        <li>
          <strong>조회수</strong> {formatCount(creator.avgViewCount)}
        </li>
        <li>
          <strong>참여율</strong> {formatPercent(creator.engagementRate)}
        </li>
        <li>
          <strong>평점</strong> 평가 없음
        </li>
        <li>
          <strong>가격</strong> 가격 미확인
        </li>
      </ul>

      <p className="candidate-card__core-reason">
        캠페인 이력 없음 — {sizeTier} 내 평균 조회수 백분위 {reachPercentile.toFixed(1)}점 · 참여율
        백분위 {engagementPercentile.toFixed(1)}점
      </p>
    </article>
  );
}
