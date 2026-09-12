import { useMemo, useState } from 'react';
import './index.css';
import { useCreatorData } from './hooks/useCreatorData';
import { runSearch } from './lib/search';
import { sortExistingCandidates } from './lib/sort';
import { RESULTS_PAGE_SIZE } from './lib/constants';
import { paginate, totalPages as computeTotalPages } from './lib/pagination';
import type { Alternative, SortOption } from './lib/types';
import { SearchForm, type DraftCriteria, type ValidCriteria } from './components/SearchForm';
import { CandidateCard } from './components/CandidateCard';
import { NewCandidateCard } from './components/NewCandidateCard';
import { SortControl } from './components/SortControl';
import { EmptyStateAlternatives } from './components/EmptyStateAlternatives';
import { Pagination } from './components/Pagination';
import { DataErrorState, ExcludedRowsWarning, InitialGuideState, LoadingState } from './components/StatusStates';

const EMPTY_DRAFT: DraftCriteria = { budgetText: '', categories: [], sizeTier: null };

type ResultsTab = 'existing' | 'new';

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

  const [activeTab, setActiveTab] = useState<ResultsTab>('existing');
  const [existingPage, setExistingPage] = useState(1);
  const [newPage, setNewPage] = useState(1);

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

  const existingTotalPages = computeTotalPages(sortedExisting.length, RESULTS_PAGE_SIZE);
  const existingPageItems = paginate(sortedExisting, Math.min(existingPage, existingTotalPages), RESULTS_PAGE_SIZE);

  const newCandidates = result?.newCandidates ?? [];
  const newTotalPages = computeTotalPages(newCandidates.length, RESULTS_PAGE_SIZE);
  const newPageItems = paginate(newCandidates, Math.min(newPage, newTotalPages), RESULTS_PAGE_SIZE);

  const conditionsChanged = Boolean(lastSubmittedDraft && !draftsEqual(draft, lastSubmittedDraft));

  const resetResultsView = () => {
    setSortOption('recommended');
    setActiveTab('existing');
    setExistingPage(1);
    setNewPage(1);
  };

  const handleSubmit = (criteria: ValidCriteria) => {
    setSubmitted(criteria);
    setLastSubmittedDraft(draft);
    resetResultsView();
  };

  const handleReset = () => {
    setDraft(EMPTY_DRAFT);
    setLastSubmittedDraft(null);
    setSubmitted(null);
    resetResultsView();
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
    resetResultsView();
  };

  const handleSortChange = (option: SortOption) => {
    setSortOption(option);
    setExistingPage(1);
  };

  const handleJumpToNewTab = () => {
    setActiveTab('new');
    setNewPage(1);
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
              </div>

              <div className="tabs" role="tablist" aria-label="추천 결과 탭">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'existing'}
                  className={`tab${activeTab === 'existing' ? ' tab--active' : ''}`}
                  onClick={() => setActiveTab('existing')}
                >
                  예산 기준 후보 ({result.existing.length}명)
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'new'}
                  className={`tab${activeTab === 'new' ? ' tab--active' : ''}`}
                  onClick={() => setActiveTab('new')}
                >
                  견적 확인 필요 ({newCandidates.length}명)
                </button>
              </div>
              <p className="muted tab-disclaimer">
                예산 기준 후보는 과거 평균 집행액을 기준으로 하며 실제 견적은 달라질 수 있습니다.
              </p>

              {activeTab === 'existing' && (
                <div className="tab-panel" role="tabpanel">
                  {result.existing.length === 0 ? (
                    <EmptyStateAlternatives
                      alternatives={result.alternatives}
                      newCandidateCount={newCandidates.length}
                      onApply={handleApplyAlternative}
                      onJumpToNewTab={handleJumpToNewTab}
                    />
                  ) : (
                    <>
                      <SortControl value={sortOption} onChange={handleSortChange} />
                      <div className="candidate-list">
                        {existingPageItems.map((candidate) => (
                          <CandidateCard
                            key={candidate.creator.id}
                            candidate={candidate}
                            sizeTier={submitted.sizeTier}
                            budgetKrw={submitted.budgetKrw}
                          />
                        ))}
                      </div>
                      <Pagination
                        page={Math.min(existingPage, existingTotalPages)}
                        totalPages={existingTotalPages}
                        onChange={setExistingPage}
                      />
                    </>
                  )}
                </div>
              )}

              {activeTab === 'new' && (
                <div className="tab-panel" role="tabpanel">
                  <p className="muted">
                    캠페인 이력이 없는 후보입니다. 과거 평균 집행액 0원은 무료 견적을 의미하지 않습니다.
                  </p>
                  {newCandidates.length === 0 ? (
                    <p className="muted">조건에 맞는 신규 후보가 없습니다.</p>
                  ) : (
                    <>
                      <div className="candidate-list">
                        {newPageItems.map((candidate) => (
                          <NewCandidateCard
                            key={candidate.creator.id}
                            candidate={candidate}
                            sizeTier={submitted.sizeTier}
                          />
                        ))}
                      </div>
                      <Pagination
                        page={Math.min(newPage, newTotalPages)}
                        totalPages={newTotalPages}
                        onChange={setNewPage}
                      />
                    </>
                  )}
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
