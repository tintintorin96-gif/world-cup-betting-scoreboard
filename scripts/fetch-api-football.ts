import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import tournamentJson from '../config/tournament.json';
import registryJson from '../data/teams.registry.json';
import { fetchApiFootballResults } from '../src/adapters/api-football';
import { fetchFootballDataResults } from '../src/adapters/football-data-org';
import { mergeResults } from './merge-results';
import type { ResultsBundle, TournamentConfig } from '../src/types';
import type { TeamRegistry } from '../src/types/team';

const ROOT = path.resolve(import.meta.dirname, '..');
const RESULTS_PATH = path.join(ROOT, 'public/data/results.json');
const MANUAL_PATH = path.join(ROOT, 'public/data/results.manual.json');

async function main() {
  const footballKey = process.env.FOOTBALL_DATA_API_KEY;
  const apiFootballKey = process.env.API_FOOTBALL_KEY;

  const tournament = tournamentJson as TournamentConfig;
  const registry = registryJson as TeamRegistry;
  const previous = existsSync(RESULTS_PATH)
    ? (JSON.parse(readFileSync(RESULTS_PATH, 'utf-8')) as ResultsBundle)
    : null;
  const manual = existsSync(MANUAL_PATH)
    ? (JSON.parse(readFileSync(MANUAL_PATH, 'utf-8')) as ResultsBundle)
    : null;

  let primary: ResultsBundle | null = null;
  let fallback: ResultsBundle | null = null;

  if (footballKey) {
    try {
      primary = await fetchFootballDataResults(footballKey, tournament, registry);
    } catch (err) {
      console.warn('Primary fetch failed:', err);
    }
  }

  if (apiFootballKey && (!primary || !primary.matches.length)) {
    try {
      fallback = await fetchApiFootballResults(apiFootballKey, tournament, registry);
    } catch (err) {
      console.warn('Fallback fetch failed:', err);
    }
  }

  const merged = mergeResults(manual, primary, fallback, previous);
  writeFileSync(RESULTS_PATH, JSON.stringify(merged, null, 2));
  console.log(`Results merged v${merged.version}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
