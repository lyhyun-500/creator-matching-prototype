import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseCreatorsFromCsvText } from '../dataLoad';
import { buildSizeTierBaselines, computeMaxCampaignCount } from '../scoring';
import { runSearch, type ScoringContext } from '../search';
import type { Creator, SearchCriteria } from '../types';

const here = path.dirname(fileURLToPath(import.meta.url));
const CSV_FIXTURE_PATH = path.resolve(here, '../../../dummy_creators.csv');

export function loadFixtureCsvText(): string {
  return readFileSync(CSV_FIXTURE_PATH, 'utf-8');
}

export function loadFixtureDataset() {
  const raw = readFileSync(CSV_FIXTURE_PATH, 'utf-8');
  return parseCreatorsFromCsvText(raw);
}

export function buildContext(creators: Creator[]): ScoringContext {
  return {
    baselines: buildSizeTierBaselines(creators),
    maxCampaignCount: computeMaxCampaignCount(creators),
  };
}

export function search(creators: Creator[], criteria: SearchCriteria) {
  return runSearch(creators, criteria, buildContext(creators));
}
