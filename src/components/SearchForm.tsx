import { useState } from 'react';
import { SIZE_TIERS, type SizeTier } from '../lib/constants';
import { validateBudgetInput, validateCategories, validateSizeTier } from '../lib/validation';

export interface DraftCriteria {
  budgetText: string;
  categories: string[];
  sizeTier: SizeTier | null;
}

export interface ValidCriteria {
  budgetKrw: number;
  categories: string[];
  sizeTier: SizeTier;
}

interface Props {
  categories: string[];
  draft: DraftCriteria;
  onDraftChange: (draft: DraftCriteria) => void;
  onSubmit: (criteria: ValidCriteria) => void;
  onReset: () => void;
  conditionsChanged: boolean;
}

interface FormErrors {
  budget?: string;
  categories?: string;
  sizeTier?: string;
}

export function SearchForm({
  categories,
  draft,
  onDraftChange,
  onSubmit,
  onReset,
  conditionsChanged,
}: Props) {
  const [errors, setErrors] = useState<FormErrors>({});

  const toggleCategory = (category: string) => {
    const isSelected = draft.categories.includes(category);
    const next = isSelected
      ? draft.categories.filter((c) => c !== category)
      : [...draft.categories, category];
    onDraftChange({ ...draft, categories: next });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const budgetResult = validateBudgetInput(draft.budgetText);
    const categoriesError = validateCategories(draft.categories);
    const sizeTierError = validateSizeTier(draft.sizeTier);

    const nextErrors: FormErrors = {
      budget: budgetResult.error ?? undefined,
      categories: categoriesError ?? undefined,
      sizeTier: sizeTierError ?? undefined,
    };
    setErrors(nextErrors);

    if (budgetResult.value === null || categoriesError || sizeTierError) {
      return;
    }

    onSubmit({
      budgetKrw: budgetResult.value,
      categories: draft.categories,
      sizeTier: draft.sizeTier as SizeTier,
    });
  };

  const handleReset = () => {
    setErrors({});
    onReset();
  };

  return (
    <form className="search-form" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="budget-input">
          예산 상한 (원)
          <span className="field-help">
            크리에이터 1명과 1회 협업하는 예산입니다. 과거 평균 집행액을 기준으로 후보를 찾으며 실제 견적은
            달라질 수 있습니다.
          </span>
        </label>
        <input
          id="budget-input"
          type="text"
          inputMode="numeric"
          placeholder="예: 2,000,000"
          value={draft.budgetText}
          aria-invalid={Boolean(errors.budget)}
          aria-describedby={errors.budget ? 'budget-error' : undefined}
          onChange={(e) => onDraftChange({ ...draft, budgetText: e.target.value })}
        />
        {errors.budget && (
          <p className="field-error" id="budget-error" role="alert">
            {errors.budget}
          </p>
        )}
      </div>

      <fieldset className="field">
        <legend>카테고리 (1개 이상 선택)</legend>
        <div className="chip-group" role="group" aria-describedby={errors.categories ? 'category-error' : undefined}>
          {categories.map((category) => {
            const selected = draft.categories.includes(category);
            return (
              <label key={category} className={`chip${selected ? ' chip--selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleCategory(category)}
                />
                {category}
              </label>
            );
          })}
        </div>
        {errors.categories && (
          <p className="field-error" id="category-error" role="alert">
            {errors.categories}
          </p>
        )}
      </fieldset>

      <fieldset className="field">
        <legend>팔로워 규모 (1개 선택)</legend>
        <div className="chip-group" role="radiogroup" aria-describedby={errors.sizeTier ? 'size-error' : undefined}>
          {SIZE_TIERS.map((tier) => {
            const selected = draft.sizeTier === tier;
            return (
              <label key={tier} className={`chip${selected ? ' chip--selected' : ''}`}>
                <input
                  type="radio"
                  name="sizeTier"
                  checked={selected}
                  onChange={() => onDraftChange({ ...draft, sizeTier: tier })}
                />
                {tier}
              </label>
            );
          })}
        </div>
        <p className="field-help">나노 0~1만 미만 · 마이크로 1만~10만 미만 · 매크로 10만 이상</p>
        {errors.sizeTier && (
          <p className="field-error" id="size-error" role="alert">
            {errors.sizeTier}
          </p>
        )}
      </fieldset>

      {conditionsChanged && (
        <p className="notice" role="status">
          조건이 변경되었습니다. 다시 추천해 주세요.
        </p>
      )}

      <div className="form-actions">
        <button type="submit" className="btn btn--primary">
          추천 보기
        </button>
        <button type="button" className="btn" onClick={handleReset}>
          초기화
        </button>
      </div>
    </form>
  );
}
