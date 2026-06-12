import type {
  LeaderboardEntry,
  MetaInfo,
  PredictionBundle,
  ResultsBundle,
  ScoringBreakdown,
  Snapshot,
  TeamRegistry,
  TournamentConfig,
} from '../types';

const BASE = import.meta.env.BASE_URL;

interface CacheEntry<T> {
  data: T;
  version: number;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const STALE_MS = 60_000;

async function fetchJson<T>(path: string, version = 0): Promise<T> {
  const url = `${BASE}data/${path}${version ? `?v=${version}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  return entry.data;
}

function setCache<T>(key: string, data: T, version: number) {
  cache.set(key, { data, version, fetchedAt: Date.now() });
}

export interface AppData {
  meta: MetaInfo;
  leaderboard: LeaderboardEntry[];
  predictions: PredictionBundle[];
  results: ResultsBundle;
  tournament: TournamentConfig;
  teams: TeamRegistry;
  snapshots: Snapshot[];
}

export async function loadMeta(): Promise<MetaInfo> {
  const cached = getCached<MetaInfo>('meta');
  if (cached) return cached;
  const meta = await fetchJson<MetaInfo>('meta.json');
  setCache('meta', meta, meta.version);
  return meta;
}

export async function loadAppData(): Promise<AppData> {
  const meta = await loadMeta();
  const version = meta.version;

  const [leaderboard, predictions, results, tournament, teams] = await Promise.all([
    fetchJson<LeaderboardEntry[]>('leaderboard.json', version),
    fetchJson<PredictionBundle[]>('predictions.json', version),
    fetchJson<ResultsBundle>('results.json', version),
    fetchJson<TournamentConfig>('tournament.json', version),
    fetchJson<TeamRegistry>('teams.json', version),
  ]);

  let snapshots: Snapshot[] = [];
  try {
    const index = await fetchJson<string[]>('snapshots/index.json', version);
    snapshots = await Promise.all(
      index.map((f) => fetchJson<Snapshot>(`snapshots/${f}`, version)),
    );
  } catch {
    snapshots = [];
  }

  setCache('leaderboard', leaderboard, version);
  return { meta, leaderboard, predictions, results, tournament, teams, snapshots };
}

export async function loadBreakdown(participantId: string): Promise<ScoringBreakdown> {
  const meta = await loadMeta();
  const cacheKey = `breakdown:${participantId}`;
  const cached = getCached<ScoringBreakdown>(cacheKey);
  if (cached) return cached;
  const breakdown = await fetchJson<ScoringBreakdown>(`breakdowns/${participantId}.json`, meta.version);
  setCache(cacheKey, breakdown, meta.version);
  return breakdown;
}

export async function loadAllBreakdowns(
  participantIds: string[],
): Promise<Map<string, ScoringBreakdown>> {
  const results = await Promise.all(participantIds.map((id) => loadBreakdown(id)));
  return new Map(participantIds.map((id, i) => [id, results[i]]));
}

export async function revalidateMeta(): Promise<MetaInfo | null> {
  const entry = cache.get('meta') as CacheEntry<MetaInfo> | undefined;
  if (entry && Date.now() - entry.fetchedAt < STALE_MS) return null;
  try {
    const meta = await fetchJson<MetaInfo>('meta.json');
    if (!entry || meta.version !== entry.version) {
      cache.clear();
      setCache('meta', meta, meta.version);
      return meta;
    }
    entry.fetchedAt = Date.now();
    return null;
  } catch {
    return null;
  }
}
