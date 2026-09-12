import { formatCount, formatKrw } from '../lib/format';
import type { Alternative } from '../lib/types';

interface Props {
  alternatives: Alternative[];
  hasNewCandidates: boolean;
  onApply: (alternative: Alternative) => void;
}

export function EmptyStateAlternatives({ alternatives, hasNewCandidates, onApply }: Props) {
  return (
    <div className="empty-state">
      <p>과거 평균 집행액이 예산 이하인 후보가 0명입니다.</p>
      {hasNewCandidates && (
        <p className="muted">캠페인 이력이 없는 후보는 ‘견적 확인 필요’ 영역에서 확인할 수 있습니다.</p>
      )}

      {alternatives.length > 0 ? (
        <div className="alternatives">
          <p>다음 조건 중 하나를 적용하면 후보를 확인할 수 있습니다.</p>
          <ul>
            {alternatives.map((alt) =>
              alt.type === 'budget' ? (
                <li key="budget">
                  <button type="button" className="btn" onClick={() => onApply(alt)}>
                    예산 {formatKrw(alt.suggestedBudgetKrw)}으로 변경하면 {formatCount(alt.resultingCount)}명
                  </button>
                </li>
              ) : (
                <li key={`size-${alt.sizeTier}`}>
                  <button type="button" className="btn" onClick={() => onApply(alt)}>
                    {alt.sizeTier}로 변경하면 {formatCount(alt.resultingCount)}명
                  </button>
                </li>
              ),
            )}
          </ul>
        </div>
      ) : (
        <p>예산 또는 카테고리·규모를 다시 설정해 주세요.</p>
      )}
    </div>
  );
}
