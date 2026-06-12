import type { TeamId, TeamRegistry } from '../types/team';
import { buildLookupMaps } from './team-registry';
import { collapseWhitespace, stripEmoji } from './strip-emoji';

export class TeamResolutionError extends Error {
  constructor(
    message: string,
    public readonly raw: string,
    public readonly suggestions: string[] = [],
  ) {
    super(message);
    this.name = 'TeamResolutionError';
  }
}

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[a.length][b.length];
}

export function normalizeTeamName(raw: string): string {
  return collapseWhitespace(stripEmoji(raw).toLowerCase());
}

export function resolveTeamId(raw: string, registry: TeamRegistry): TeamId {
  const normalized = normalizeTeamName(raw);
  if (!normalized) {
    throw new TeamResolutionError('Empty team name', raw);
  }

  const { byNormalizedName } = buildLookupMaps(registry);
  const direct = byNormalizedName.get(normalized);
  if (direct) return direct;

  const suggestions = registry.teams
    .map((t) => ({ name: t.name.toLowerCase(), id: t.id }))
    .sort((a, b) => levenshtein(normalized, a.name) - levenshtein(normalized, b.name))
    .slice(0, 3)
    .map((s) => s.id);

  throw new TeamResolutionError(
    `Could not resolve team "${raw}" (normalized: "${normalized}")`,
    raw,
    suggestions,
  );
}

export function tryResolveTeamId(raw: string, registry: TeamRegistry): TeamId | null {
  try {
    return resolveTeamId(raw, registry);
  } catch {
    return null;
  }
}
