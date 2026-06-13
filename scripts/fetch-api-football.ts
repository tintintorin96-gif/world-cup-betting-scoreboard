import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import tournamentJson from '../config/tournament.json';
import registryJson from '../data/teams.registry.json';
import { fetchApiFootballResults } from '../src/adapters/api-football';
import { fetchFootballDataResults } from '../src/adapters/football-data-org';
import { fetchWorldCup2026Results } from '../src/adapters/worldcup2026';
import { mergeResults } from './merge-results';
import { generateGroupMatches } from './tournament-utils';
import type { ResultsBundle, TournamentConfig } from '../src/types';
import type { TeamRegistry } from '../src/types/team';

const ROOT = path.resolve(import.meta.dirname, '..');
const RESULTS_PATH = path.join(ROOT, 'public/data/results.json');
const MANUAL_PATH = path.join(ROOT, 'public/data/results.manual.json');

async function main() {
  const worldCup2026Token = process.env.WORLDCUP2026_TOKEN;
  const footballKey = process.env.FOOTBALL_DATA_API_KEY;
  const apiFootballKey = process.env.API_FOOTBALL_KEY;

  const registry = registryJson as TeamRegistry;
  const tournament = generateGroupMatches(tournamentJson as TournamentConfig, registry);
  const previous = existsSync(RESULTS_PATH)
    ? (JSON.parse(readFileSync(RESULTS_PATH, 'utf-8')) as ResultsBundle)
    : null;
  const manual = existsSync(MANUAL_PATH)
    ? (JSON.parse(readFileSync(MANUAL_PATH, 'utf-8')) as ResultsBundle)
    : null;

  let worldCup2026: ResultsBundle | null = null;
  let footballData: ResultsBundle | null = null;
  let apiFootball: ResultsBundle | null = null;

  try {
    worldCup2026 = await fetchWorldCup2026Results(tournament, registry, worldCup2026Token);
    console.log(`worldcup2026: mapped ${worldCup2026.matches.length} group matches`);
  } catch (err) {
    console.warn('worldcup2026 fetch failed:', err);
  }

  if (footballKey) {
    try {
      footballData = await fetchFootballDataResults(footballKey, tournament, registry);
    } catch (err) {
      console.warn('football-data.org fetch failed:', err);
    }
  }

  if (apiFootballKey) {
    try {
      apiFootball = await fetchApiFootballResults(apiFootballKey, tournament, registry);
    } catch (err) {
      console.warn('API-Football fetch failed:', err);
    }
  }

  const merged = mergeResults(manual, previous, worldCup2026, footballData, apiFootball);
  writeFileSync(RESULTS_PATH, JSON.stringify(merged, null, 2));
  console.log(`Results merged v${merged.version}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
