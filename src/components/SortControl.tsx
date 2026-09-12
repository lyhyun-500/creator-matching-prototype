import type { SortOption } from '../lib/types';

const OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recommended', label: '추천순' },
  { value: 'viewsDesc', label: '평균 조회수 높은 순' },
  { value: 'engagementDesc', label: '참여율 높은 순' },
  { value: 'collaborationDesc', label: '협업점수 높은 순' },
  { value: 'costAsc', label: '참고 1천 조회당 비용 낮은 순' },
];

interface Props {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

export function SortControl({ value, onChange }: Props) {
  return (
    <label className="sort-control">
      정렬
      <select value={value} onChange={(e) => onChange(e.target.value as SortOption)}>
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
