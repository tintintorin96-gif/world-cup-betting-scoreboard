import type { MatchResult, ResultsBundle } from '../types/results';
import type { TeamRegistry } from '../types/team';
import type { TournamentConfig } from '../types/tournament';
import { tryResolveTeamId } from '../normalize/resolve-team';

const API_BASE = 'https://v3.football.api-sports.io';

interface ApiFootballFixture {
  fixture: { id: number; status: { short: string }; date: string };
  teams: { home: { name: string }; away: { name: string } };
  goals: { home: number | null; away: number | null };
}

function mapStatus(short: string): MatchResult['status'] {
  const map: Record<string, MatchResult['status']> = {
    NS: 'scheduled',
    TBD: 'scheduled',
    '1H': 'live',
    HT: 'live',
    '2H': 'live',
    ET: 'live',
    FT: 'finished',
    AET: 'finished',
    PEN: 'finished',
    PST: 'postponed',
    CANC: 'cancelled',
  };
  return map[short] ?? 'scheduled';
}

export async function fetchApiFootballResults(
  apiKey: string,
  tournament: TournamentConfig,
  registry: TeamRegistry,
  leagueId = 1,
  season = 2026,
): Promise<ResultsBundle> {
  const headers = { 'x-apisports-key': apiKey };
  const now = new Date().toISOString();

  const url = `${API_BASE}/fixtures?league=${leagueId}&season=${season}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`API-Football failed: ${res.status}`);

  const data = (await res.json()) as { response: ApiFootballFixture[] };
  const matches: MatchResult[] = [];

  for (const fixture of data.response ?? []) {
    const homeId = tryResolveTeamId(fixture.teams.home.name, registry);
    const awayId = tryResolveTeamId(fixture.teams.away.name, registry);
    if (!homeId || !awayId) continue;

    const tournamentMatch = tournament.groupMatches.find(
      (m) =>
        (m.homeTeamId === homeId && m.awayTeamId === awayId) ||
        (m.homeTeamId === awayId && m.awayTeamId === homeId),
    );
    if (!tournamentMatch) continue;

    const isHomeFirst = tournamentMatch.homeTeamId === homeId;
    const homeScore = fixture.goals.home;
    const awayScore = fixture.goals.away;

    matches.push({
      matchId: tournamentMatch.matchId,
      status: mapStatus(fixture.fixture.status.short),
      homeTeamId: tournamentMatch.homeTeamId!,
      awayTeamId: tournamentMatch.awayTeamId!,
      homeScore: isHomeFirst ? homeScore : awayScore,
      awayScore: isHomeFirst ? awayScore : homeScore,
      updatedAt: fixture.fixture.date ?? now,
      source: 'api',
    });
  }

  return {
    version: 1,
    fetchedAt: now,
    matches,
    groupStandings: [],
    knockout: [],
  };
}
