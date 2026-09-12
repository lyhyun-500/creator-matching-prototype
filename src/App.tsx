import { useMemo, useState } from 'react';
import './index.css';
import { useCreatorData } from './hooks/useCreatorData';
import { runSearch } from './lib/search';
import { sortExistingCandidates } from './lib/sort';
import { formatCount } from './lib/format';
import type { Alternative, SortOption } from './lib/types';
import { SearchForm, type DraftCriteria, type ValidCriteria } from './components/SearchForm';
import { CandidateCard } from './components/CandidateCard';
import { NewCandidateCard } from './components/NewCandidateCard';
import { SortControl } from './components/SortControl';
import { EmptyStateAlternatives } from './components/EmptyStateAlternatives';
import { DataErrorState, ExcludedRowsWarning, InitialGuideState, LoadingState } from './components/StatusStates';

const EMPTY_DRAFT: DraftCriteria = { budgetText: '', categories: [], sizeTier: null };

function draftsEqual(a: DraftCriteria, b: DraftCriteria): boolean {
  if (a.budgetText.replace(/,/g, '').trim() !== b.budgetText.replace(/,/g, '').trim()) return false;
  if (a.sizeTier !== b.sizeTier) return false;
  const aCats = [...a.categories].sort();
  const bCats = [...b.categories].sort();
  return aCats.length === bCats.length && aCats.every((c, i) => c === bCats[i]);
}

function App() {
  const [reloadToken, setReloadToken] = useState(0);
  const data = useCreatorData(reloadToken);

  const [draft, setDraft] = useState<DraftCriteria>(EMPTY_DRAFT);
  const [lastSubmittedDraft, setLastSubmittedDraft] = useState<DraftCriteria | null>(null);
  const [submitted, setSubmitted] = useState<ValidCriteria | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('recommended');

  const result = useMemo(() => {
    if (data.status !== 'ready' || !submitted) return null;
    return runSearch(data.creators, submitted, {
      baselines: data.baselines,
      maxCampaignCount: data.maxCampaignCount,
    });
  }, [data, submitted]);

  const sortedExisting = useMemo(() => {
    if (!result) return [];
    return sortExistingCandidates(result.existing, sortOption);
  }, [result, sortOption]);

  const conditionsChanged = Boolean(lastSubmittedDraft && !draftsEqual(draft, lastSubmittedDraft));

  const handleSubmit = (criteria: ValidCriteria) => {
    setSubmitted(criteria);
    setLastSubmittedDraft(draft);
    setSortOption('recommended');
  };

  const handleReset = () => {
    setDraft(EMPTY_DRAFT);
    setLastSubmittedDraft(null);
    setSubmitted(null);
    setSortOption('recommended');
  };

  const handleApplyAlternative = (alternative: Alternative) => {
    if (!submitted) return;
    const nextCriteria: ValidCriteria =
      alternative.type === 'budget'
        ? { ...submitted, budgetKrw: alternative.suggestedBudgetKrw }
        : { ...submitted, sizeTier: alternative.sizeTier };
    const nextDraft: DraftCriteria = {
      budgetText: String(nextCriteria.budgetKrw),
      categories: nextCriteria.categories,
      sizeTier: nextCriteria.sizeTier,
    };
    setDraft(nextDraft);
    setLastSubmittedDraft(nextDraft);
    setSubmitted(nextCriteria);
    setSortOption('recommended');
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>크리에이터 매칭 추천 프로토타입</h1>
        <p className="muted">
          예산·카테고리·팔로워 규모를 입력하면 조건에 맞는 크리에이터를 추천합니다. 도달(조회수)을
          우선하고 참여율·협업 이력으로 순위를 보완합니다.
        </p>
      </header>

      {data.status === 'loading' && <LoadingState />}

      {data.status === 'error' && (
        <DataErrorState kind={data.kind} message={data.message} onRetry={() => setReloadToken((t) => t + 1)} />
      )}

      {data.status === 'ready' && (
        <>
          {data.excluded.length > 0 && <ExcludedRowsWarning count={data.excluded.length} />}

          <SearchForm
            categories={data.categories}
            draft={draft}
            onDraftChange={setDraft}
            onSubmit={handleSubmit}
            onReset={handleReset}
            conditionsChanged={conditionsChanged}
          />

          {!submitted && <InitialGuideState />}

          {submitted && result && (
            <section className="results">
              <div className="results-header">
                <p>
                  제출 조건: 카테고리 {submitted.categories.join(', ')} · {submitted.sizeTier} · 예산{' '}
                  {submitted.budgetKrw.toLocaleString('ko-KR')}원
                </p>
                <p>
                  과거 평균 집행액이 예산 이하인 후보 {formatCount(result.existing.length)}명 · 견적 확인 필요{' '}
                  {formatCount(result.newCandidates.length)}명
                </p>
                {result.existing.length > 0 && <SortControl value={sortOption} onChange={setSortOption} />}
              </div>

              {result.existing.length === 0 ? (
                <EmptyStateAlternatives
                  alternatives={result.alternatives}
                  hasNewCandidates={result.newCandidates.length > 0}
                  onApply={handleApplyAlternative}
                />
              ) : (
                <div className="candidate-list">
                  {sortedExisting.map((candidate) => (
                    <CandidateCard
                      key={candidate.creator.id}
                      candidate={candidate}
                      sizeTier={submitted.sizeTier}
                      budgetKrw={submitted.budgetKrw}
                    />
                  ))}
                </div>
              )}

              {result.newCandidates.length > 0 && (
                <div className="new-candidates">
                  <h2>견적 확인 필요 ({formatCount(result.newCandidates.length)}명)</h2>
                  <p className="muted">
                    캠페인 이력이 없는 후보입니다. 과거 평균 집행액 0원은 무료 견적을 의미하지 않습니다.
                  </p>
                  <div className="candidate-list">
                    {result.newCandidates.map((candidate) => (
                      <NewCandidateCard
                        key={candidate.creator.id}
                        candidate={candidate}
                        sizeTier={submitted.sizeTier}
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default App;
