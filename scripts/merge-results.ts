import type { MatchResult, ResultsBundle } from '../src/types/results';

export function mergeResults(
  manual: ResultsBundle | null,
  previous: ResultsBundle | null,
  ...apiSources: (ResultsBundle | null)[]
): ResultsBundle {
  const base = previous ?? {
    version: 1,
    fetchedAt: new Date().toISOString(),
    matches: [],
    groupStandings: [],
    knockout: [],
  };

  const sources = [manual, ...apiSources].filter(Boolean) as ResultsBundle[];
  if (!sources.length) return base;

  const matchMap = new Map<string, MatchResult>();
  for (const src of [...sources].reverse()) {
    for (const m of src.matches) matchMap.set(m.matchId, m);
  }

  const standingMap = new Map<string, ResultsBundle['groupStandings'][0]>();
  for (const src of [...sources].reverse()) {
    for (const s of src.groupStandings) standingMap.set(s.group, s);
  }

  const apiOnly = apiSources.filter(Boolean) as ResultsBundle[];
  const preferredApi = [...apiOnly].reverse().find((src) => src.knockout.length) ?? apiOnly.at(-1);

  const knockout = manual?.knockout.length
    ? manual.knockout
    : preferredApi?.knockout.length
      ? preferredApi.knockout
      : base.knockout;

  const merged: ResultsBundle = {
    version: base.version,
    fetchedAt: sources[0]?.fetchedAt ?? base.fetchedAt,
    matches: Array.from(matchMap.values()),
    groupStandings: Array.from(standingMap.values()),
    knockout,
    championId:
      manual?.championId ??
      [...apiOnly].reverse().find((src) => src.championId)?.championId,
    finalists:
      manual?.finalists ??
      [...apiOnly].reverse().find((src) => src.finalists)?.finalists,
  };

  const changed =
    JSON.stringify(base.matches) !== JSON.stringify(merged.matches) ||
    JSON.stringify(base.groupStandings) !== JSON.stringify(merged.groupStandings);

  if (changed) merged.version = base.version + 1;
  return merged;
}
