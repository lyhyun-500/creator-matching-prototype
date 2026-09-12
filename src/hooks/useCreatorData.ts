import { useEffect, useState } from 'react';
import { CSV_PATH } from '../lib/constants';
import { loadCreators } from '../lib/dataLoad';
import { buildSizeTierBaselines, computeMaxCampaignCount, type SizeTierBaseline } from '../lib/scoring';
import type { Creator, ExcludedRow, FileLoadErrorKind } from '../lib/types';
import type { SizeTier } from '../lib/constants';

export type CreatorDataState =
  | { status: 'loading' }
  | { status: 'error'; kind: FileLoadErrorKind; message: string }
  | {
      status: 'ready';
      creators: Creator[];
      excluded: ExcludedRow[];
      categories: string[];
      baselines: Record<SizeTier, SizeTierBaseline>;
      maxCampaignCount: number;
    };

export function useCreatorData(reloadToken = 0): CreatorDataState {
  const [state, setState] = useState<CreatorDataState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    loadCreators(CSV_PATH)
      .then(({ creators, excluded }) => {
        if (cancelled) return;
        const categories = Array.from(new Set(creators.map((c) => c.category))).sort((a, b) =>
          a.localeCompare(b, 'ko'),
        );
        setState({
          status: 'ready',
          creators,
          excluded,
          categories,
          baselines: buildSizeTierBaselines(creators),
          maxCampaignCount: computeMaxCampaignCount(creators),
        });
      })
      .catch((err) => {
        if (cancelled) return;
        const kind: FileLoadErrorKind = err?.kind ?? 'fetch_failed';
        const message: string = err?.message ?? 'CSV 파일을 불러오지 못했습니다.';
        setState({ status: 'error', kind, message });
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return state;
}
