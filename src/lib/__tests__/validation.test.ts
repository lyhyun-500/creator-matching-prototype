import { describe, expect, it } from 'vitest';
import { resolveBudgetBaseForAdd, validateBudgetInput } from '../validation';

describe('resolveBudgetBaseForAdd (금액 추가 버튼 기준값)', () => {
  it('treats a blank field as 0 for add purposes', () => {
    const result = resolveBudgetBaseForAdd('');
    expect(result).toEqual({ base: 0 });
  });

  it('reproduces the worked example: 500,000 +100,000 +100,000 +1,000,000 = 1,700,000', () => {
    let text = '500000';
    const add = (amount: number) => {
      const r = resolveBudgetBaseForAdd(text);
      if ('error' in r) throw new Error('unexpected error');
      text = String(r.base + amount);
    };
    add(100_000);
    expect(text).toBe('600000');
    add(100_000);
    expect(text).toBe('700000');
    add(1_000_000);
    expect(text).toBe('1700000');
  });

  it('reports an error instead of silently coercing an invalid stored value', () => {
    const result = resolveBudgetBaseForAdd('12abc34');
    expect('error' in result).toBe(true);
  });

  it('rejects values beyond the safe-integer range instead of overflowing silently', () => {
    const result = resolveBudgetBaseForAdd('99999999999999999999');
    expect('error' in result).toBe(true);
  });

  it('strips comma formatting before validating', () => {
    const result = resolveBudgetBaseForAdd('2,000,000');
    expect(result).toEqual({ base: 2_000_000 });
  });
});

describe('validateBudgetInput (제출 시 최종 검증)', () => {
  it('requires a positive integer', () => {
    expect(validateBudgetInput('').error).toBeTruthy();
    expect(validateBudgetInput('0').error).toBeTruthy();
    expect(validateBudgetInput('-1').error).toBeTruthy();
    expect(validateBudgetInput('1.5').error).toBeTruthy();
  });

  it('accepts a comma-formatted positive integer', () => {
    const result = validateBudgetInput('1,700,000');
    expect(result.value).toBe(1_700_000);
    expect(result.error).toBeNull();
  });
});
