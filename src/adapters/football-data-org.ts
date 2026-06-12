import type { MatchResult, ResultsBundle } from '../types/results';
import type { TeamRegistry } from '../types/team';
import type { TournamentConfig } from '../types/tournament';
import { tryResolveTeamId } from '../normalize/resolve-team';

const API_BASE = 'https://api.football-data.org/v4';

interface FootballDataMatch {
  id: number;
  status: string;
  homeTeam: { name: string; shortName?: string };
  awayTeam: { name: string; shortName?: string };
  score: {
    fullTime: { home: number | null; away: number | null };
  };
  lastUpdated?: string;
}

function mapStatus(status: string): MatchResult['status'] {
  const map: Record<string, MatchResult['status']> = {
    SCHEDULED: 'scheduled',
    TIMED: 'scheduled',
    IN_PLAY: 'live',
    PAUSED: 'live',
    FINISHED: 'finished',
    POSTPONED: 'postponed',
    CANCELLED: 'cancelled',
  };
  return map[status] ?? 'scheduled';
}

function resolveTeam(name: string, registry: TeamRegistry): string | null {
  return tryResolveTeamId(name, registry) ?? tryResolveTeamId(name.split(' ')[0], registry);
}

export async function fetchFootballDataResults(
  apiKey: string,
  tournament: TournamentConfig,
  registry: TeamRegistry,
  competitionCode = 'WC',
): Promise<ResultsBundle> {
  const headers = { 'X-Auth-Token': apiKey };
  const now = new Date().toISOString();

  const matchesRes = await fetch(`${API_BASE}/competitions/${competitionCode}/matches`, { headers });
  if (!matchesRes.ok) {
    throw new Error(`football-data.org matches failed: ${matchesRes.status}`);
  }
  const matchesData = (await matchesRes.json()) as { matches: FootballDataMatch[] };

  const matches: MatchResult[] = [];
  for (const apiMatch of matchesData.matches ?? []) {
    const homeId = resolveTeam(apiMatch.homeTeam.name, registry);
    const awayId = resolveTeam(apiMatch.awayTeam.name, registry);
    if (!homeId || !awayId) continue;

    const tournamentMatch = tournament.groupMatches.find(
      (m) =>
        (m.homeTeamId === homeId && m.awayTeamId === awayId) ||
        (m.homeTeamId === awayId && m.awayTeamId === homeId),
    );
    if (!tournamentMatch) continue;

    const isHomeFirst = tournamentMatch.homeTeamId === homeId;
    const homeScore = apiMatch.score?.fullTime?.home ?? null;
    const awayScore = apiMatch.score?.fullTime?.away ?? null;

    matches.push({
      matchId: tournamentMatch.matchId,
      status: mapStatus(apiMatch.status),
      homeTeamId: tournamentMatch.homeTeamId!,
      awayTeamId: tournamentMatch.awayTeamId!,
      homeScore: isHomeFirst ? homeScore : awayScore,
      awayScore: isHomeFirst ? awayScore : homeScore,
      winnerId:
        homeScore !== null && awayScore !== null
          ? homeScore > awayScore
            ? tournamentMatch.homeTeamId
            : awayScore > homeScore
              ? tournamentMatch.awayTeamId
              : undefined
          : undefined,
      updatedAt: apiMatch.lastUpdated ?? now,
      source: 'api',
    });
  }

  let groupStandings: ResultsBundle['groupStandings'] = [];
  try {
    const standingsRes = await fetch(`${API_BASE}/competitions/${competitionCode}/standings`, { headers });
    if (standingsRes.ok) {
      const standingsData = (await standingsRes.json()) as {
        standings?: Array<{
          group?: string;
          table: Array<{ team: { name: string } }>;
        }>;
      };
      groupStandings = (standingsData.standings ?? [])
        .map((s) => {
          const group = s.group?.replace('GROUP_', '').replace('Group ', '') ?? '';
          const positions = s.table
            .map((row) => resolveTeam(row.team.name, registry))
            .filter((id): id is string => Boolean(id));
          return { group, positions, updatedAt: now };
        })
        .filter((s) => s.group && s.positions.length);
    }
  } catch {
    // standings optional
  }

  return {
    version: 1,
    fetchedAt: now,
    matches,
    groupStandings,
    knockout: [],
  };
}
