import type { FileLoadErrorKind } from '../lib/types';

export function LoadingState() {
  return (
    <div className="status-state" role="status">
      <p>데이터를 불러오는 중입니다…</p>
    </div>
  );
}

export function DataErrorState({
  kind,
  message,
  onRetry,
}: {
  kind: FileLoadErrorKind;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="status-state status-state--error" role="alert">
      <p>데이터를 불러오지 못했습니다.</p>
      <p className="muted">
        [{kind}] {message}
      </p>
      <button type="button" className="btn" onClick={onRetry}>
        다시 시도
      </button>
    </div>
  );
}

export function InitialGuideState() {
  return (
    <div className="status-state" role="note">
      <p>예산·카테고리·팔로워 규모를 입력하고 ‘추천 보기’를 눌러 후보를 확인하세요.</p>
    </div>
  );
}

export function ExcludedRowsWarning({ count }: { count: number }) {
  return (
    <p className="notice notice--warning" role="status">
      일부 데이터 {count}건을 제외했습니다.
    </p>
  );
}
