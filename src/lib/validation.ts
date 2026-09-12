export interface FieldValidation {
  value: number;
  error: null;
}
export interface FieldError {
  value: null;
  error: string;
}

/** 예산: 원 단위 양의 안전 정수만 허용. 표시용 쉼표는 제거 후 검증한다. */
export function validateBudgetInput(raw: string): FieldValidation | FieldError {
  const cleaned = raw.replace(/,/g, '').trim();
  if (cleaned === '') {
    return { value: null, error: '예산을 입력해 주세요.' };
  }
  if (!/^\d+$/.test(cleaned)) {
    return { value: null, error: '0보다 큰 정수만 입력할 수 있습니다.' };
  }
  const value = Number(cleaned);
  if (!Number.isSafeInteger(value) || value <= 0) {
    return { value: null, error: '0보다 큰 정수만 입력할 수 있습니다.' };
  }
  return { value, error: null };
}

export function validateCategories(selected: string[]): string | null {
  if (selected.length === 0) return '카테고리를 1개 이상 선택해 주세요.';
  return null;
}

export function validateSizeTier(selected: string | null): string | null {
  if (!selected) return '팔로워 규모를 선택해 주세요.';
  return null;
}
