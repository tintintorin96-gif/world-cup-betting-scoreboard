import type { MatchResult, ResultsBundle } from '../types/results';
import type { TeamId, TeamRegistry } from '../types/team';
import type { TournamentConfig } from '../types/tournament';
import { tryResolveTeamId } from '../normalize/resolve-team';

const API_BASE = 'https://worldcup26.ir';

interface WorldCup2026Game {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: string;
  away_score: string;
  group: string;
  finished: string;
  time_elapsed: string;
  type: string;
  home_team_name_en?: string;
  away_team_name_en?: string;
  local_date?: string;
}

interface WorldCup2026Team {
  id: string;
  fifa_code?: string;
  name_en: string;
}

interface WorldCup2026GroupRow {
  team_id: string;
  pts: string;
  gd: string;
  gf: string;
}

interface WorldCup2026Group {
  name: string;
  teams: WorldCup2026GroupRow[];
}

export function parseWorldCup2026Score(raw: string | null | undefined): number | null {
  if (raw == null || raw === '' || raw === 'null') return null;
  const value = Number.parseInt(raw, 10);
  return Number.isNaN(value) ? null : value;
}

export function mapWorldCup2026Status(game: Pick<WorldCup2026Game, 'finished' | 'time_elapsed'>): MatchResult['status'] {
  const elapsed = game.time_elapsed?.toLowerCase() ?? '';
  if (game.finished === 'TRUE' || elapsed === 'finished') return 'finished';
  if (elapsed && elapsed !== 'notstarted') return 'live';
  return 'scheduled';
}

function buildAuthHeaders(token?: string): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJson<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: buildAuthHeaders(token) });
  if (!res.ok) {
    throw new Error(`worldcup2026 ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function resolveGameTeamId(
  name: string | undefined,
  teamId: string,
  byApiId: Map<string, TeamId>,
  registry: TeamRegistry,
): TeamId | null {
  if (name) {
    const fromName = tryResolveTeamId(name, registry);
    if (fromName) return fromName;
  }
  if (teamId && teamId !== '0') {
    return byApiId.get(teamId) ?? null;
  }
  return null;
}

function findTournamentMatch(
  tournament: TournamentConfig,
  homeId: TeamId,
  awayId: TeamId,
) {
  return tournament.groupMatches.find(
    (m) =>
      (m.homeTeamId === homeId && m.awayTeamId === awayId) ||
      (m.homeTeamId === awayId && m.awayTeamId === homeId),
  );
}

function sortGroupRows(rows: WorldCup2026GroupRow[]): WorldCup2026GroupRow[] {
  return [...rows].sort((a, b) => {
    const pts = Number.parseInt(b.pts, 10) - Number.parseInt(a.pts, 10);
    if (pts !== 0) return pts;
    const gd = Number.parseInt(b.gd, 10) - Number.parseInt(a.gd, 10);
    if (gd !== 0) return gd;
    return Number.parseInt(b.gf, 10) - Number.parseInt(a.gf, 10);
  });
}

export async function fetchWorldCup2026Results(
  tournament: TournamentConfig,
  registry: TeamRegistry,
  token?: string,
): Promise<ResultsBundle> {
  const now = new Date().toISOString();
  const [gamesPayload, teamsPayload, groupsPayload] = await Promise.all([
    fetchJson<{ games: WorldCup2026Game[] }>('/get/games', token),
    fetchJson<{ teams: WorldCup2026Team[] }>('/get/teams', token).catch(() => ({ teams: [] })),
    fetchJson<{ groups: WorldCup2026Group[] }>('/get/groups', token).catch(() => ({ groups: [] })),
  ]);

  const byApiId = new Map<string, TeamId>();
  for (const team of teamsPayload.teams ?? []) {
    const code = team.fifa_code?.toUpperCase();
    if (code && registry.teams.some((t) => t.id === code)) {
      byApiId.set(team.id, code);
      continue;
    }
    const fromName = tryResolveTeamId(team.name_en, registry);
    if (fromName) byApiId.set(team.id, fromName);
  }

  const matches: MatchResult[] = [];
  for (const game of gamesPayload.games ?? []) {
    if (game.type !== 'group') continue;

    const homeId = resolveGameTeamId(game.home_team_name_en, game.home_team_id, byApiId, registry);
    const awayId = resolveGameTeamId(game.away_team_name_en, game.away_team_id, byApiId, registry);
    if (!homeId || !awayId) continue;

    const tournamentMatch = findTournamentMatch(tournament, homeId, awayId);
    if (!tournamentMatch) continue;

    const isHomeFirst = tournamentMatch.homeTeamId === homeId;
    const homeScore = parseWorldCup2026Score(game.home_score);
    const awayScore = parseWorldCup2026Score(game.away_score);
    const homeGoals = isHomeFirst ? homeScore : awayScore;
    const awayGoals = isHomeFirst ? awayScore : homeScore;

    matches.push({
      matchId: tournamentMatch.matchId,
      status: mapWorldCup2026Status(game),
      homeTeamId: tournamentMatch.homeTeamId!,
      awayTeamId: tournamentMatch.awayTeamId!,
      homeScore: homeGoals,
      awayScore: awayGoals,
      winnerId:
        homeGoals !== null && awayGoals !== null
          ? homeGoals > awayGoals
            ? tournamentMatch.homeTeamId
            : awayGoals > homeGoals
              ? tournamentMatch.awayTeamId
              : undefined
          : undefined,
      updatedAt: game.local_date ?? now,
      source: 'api',
    });
  }

  const groupStandings: ResultsBundle['groupStandings'] = [];
  for (const group of groupsPayload.groups ?? []) {
    const positions = sortGroupRows(group.teams)
      .map((row) => byApiId.get(row.team_id))
      .filter((id): id is TeamId => Boolean(id));
    if (group.name && positions.length) {
      groupStandings.push({ group: group.name, positions, updatedAt: now });
    }
  }

  return {
    version: 1,
    fetchedAt: now,
    matches,
    groupStandings,
    knockout: [],
  };
}
