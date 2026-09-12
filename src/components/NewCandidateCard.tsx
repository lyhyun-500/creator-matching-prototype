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
          <p className="muted">
            {creator.platform} · {creator.category} · 팔로워 {formatCount(creator.followers)}명 (
            {sizeTier})
          </p>
        </div>
        <span className="badge badge--new">견적 확인 필요</span>
      </header>

      <dl className="candidate-card__metrics">
        <div>
          <dt>평균 조회수</dt>
          <dd>{formatCount(creator.avgViewCount)}</dd>
        </div>
        <div>
          <dt>참여율</dt>
          <dd>{formatPercent(creator.engagementRate)}</dd>
        </div>
        <div>
          <dt>평점</dt>
          <dd>평가 없음</dd>
        </div>
        <div>
          <dt>가격</dt>
          <dd>가격 미확인</dd>
        </div>
      </dl>

      <ul className="candidate-card__reasons">
        <li>캠페인 이력 없음 — {sizeTier} 내 평균 조회수 백분위 {reachPercentile.toFixed(1)}점</li>
        <li>{sizeTier} 내 참여율 백분위 {engagementPercentile.toFixed(1)}점</li>
      </ul>
    </article>
  );
}
