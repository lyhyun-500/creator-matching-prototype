interface Props {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label="결과 페이지">
      <button type="button" className="btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        이전
      </button>
      <span className="pagination__status">
        {page} / {totalPages} 페이지
      </span>
      <button
        type="button"
        className="btn"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        다음
      </button>
    </nav>
  );
}
