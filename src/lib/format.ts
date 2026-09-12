export function formatKrw(value: number): string {
  return `${value.toLocaleString('ko-KR')}원`;
}

export function formatCount(value: number): string {
  return value.toLocaleString('ko-KR');
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatScore(value: number): string {
  return value.toFixed(2);
}

export function formatCost(value: number | null): string {
  if (value === null) return '계산 불가';
  return `약 ${Math.round(value).toLocaleString('ko-KR')}원`;
}
