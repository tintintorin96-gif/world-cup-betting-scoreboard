import type { MatchResult, ResultsBundle } from '../types/results';

export function createEmptyResults(): ResultsBundle {
  return {
    version: 1,
    fetchedAt: new Date().toISOString(),
    matches: [],
    groupStandings: [],
    knockout: [],
  };
}

export function bumpResultsVersion(prev: ResultsBundle, next: ResultsBundle): number {
  const changed = JSON.stringify(prev.matches) !== JSON.stringify(next.matches)
    || JSON.stringify(prev.groupStandings) !== JSON.stringify(next.groupStandings)
    || JSON.stringify(prev.knockout) !== JSON.stringify(next.knockout);
  return changed ? prev.version + 1 : prev.version;
}

export function matchResultHash(m: MatchResult): string {
  return `${m.matchId}:${m.status}:${m.homeScore}:${m.awayScore}`;
}
