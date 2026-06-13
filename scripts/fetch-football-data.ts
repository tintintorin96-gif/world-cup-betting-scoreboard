import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import tournamentJson from '../config/tournament.json';
import registryJson from '../data/teams.registry.json';
import { fetchFootballDataResults } from '../src/adapters/football-data-org';
import { mergeResults } from './merge-results';
import { generateGroupMatches } from './tournament-utils';
import type { ResultsBundle, TournamentConfig } from '../src/types';
import type { TeamRegistry } from '../src/types/team';

const ROOT = path.resolve(import.meta.dirname, '..');
const RESULTS_PATH = path.join(ROOT, 'public/data/results.json');
const MANUAL_PATH = path.join(ROOT, 'public/data/results.manual.json');

async function main() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    console.error('FOOTBALL_DATA_API_KEY not set');
    process.exit(1);
  }

  const tournament = generateGroupMatches(tournamentJson as TournamentConfig, registry);
  const registry = registryJson as TeamRegistry;
  const previous = existsSync(RESULTS_PATH)
    ? (JSON.parse(readFileSync(RESULTS_PATH, 'utf-8')) as ResultsBundle)
    : null;
  const manual = existsSync(MANUAL_PATH)
    ? (JSON.parse(readFileSync(MANUAL_PATH, 'utf-8')) as ResultsBundle)
    : null;

  let primary: ResultsBundle | null = null;
  try {
    primary = await fetchFootballDataResults(apiKey, tournament, registry);
    console.log(`football-data.org: ${primary.matches.length} matches`);
  } catch (err) {
    console.warn('football-data.org fetch failed:', err);
  }

  const merged = mergeResults(manual, previous, primary);
  writeFileSync(RESULTS_PATH, JSON.stringify(merged, null, 2));
  console.log(`Results written v${merged.version}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
