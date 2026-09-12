import { BUDGET_QUICK_ADD_OPTIONS } from '../lib/constants';
import { resolveBudgetBaseForAdd } from '../lib/validation';

interface Props {
  /** 원 단위 숫자 문자열(쉼표 없음). 공란이면 미입력 상태. */
  value: string;
  onChange: (nextRaw: string) => void;
  error?: string;
  /** 금액 추가 버튼 클릭 시 기존 값이 유효하지 않아 계산할 수 없을 때 호출한다. */
  onAddError: (message: string) => void;
}

function formatDisplay(raw: string): string {
  if (raw === '') return '';
  const value = Number(raw);
  if (!Number.isFinite(value)) return raw;
  return value.toLocaleString('ko-KR');
}

export function BudgetInput({ value, onChange, error, onAddError }: Props) {
  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = event.target.value.replace(/[^\d]/g, '');
    onChange(digitsOnly);
  };

  const handleQuickAdd = (amount: number) => {
    const result = resolveBudgetBaseForAdd(value);
    if ('error' in result) {
      onAddError(result.error);
      return;
    }
    const next = result.base + amount;
    if (!Number.isSafeInteger(next)) {
      onAddError('입력 가능한 금액 범위를 초과했습니다.');
      return;
    }
    onChange(String(next));
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className="budget-input">
      <div className="budget-input__row">
        <input
          id="budget-input"
          type="text"
          inputMode="numeric"
          placeholder="예: 2,000,000"
          value={formatDisplay(value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'budget-error' : undefined}
          onChange={handleTextChange}
        />
        <span className="budget-input__suffix">원</span>
      </div>
      <div className="budget-input__actions" role="group" aria-label="예산 빠른 조정">
        {BUDGET_QUICK_ADD_OPTIONS.map((option) => (
          <button
            key={option.label}
            type="button"
            className="btn btn--chip"
            onClick={() => handleQuickAdd(option.amount)}
          >
            {option.label}
          </button>
        ))}
        <button type="button" className="btn btn--chip btn--ghost" onClick={handleClear}>
          금액 지우기
        </button>
      </div>
      {error && (
        <p className="field-error" id="budget-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
