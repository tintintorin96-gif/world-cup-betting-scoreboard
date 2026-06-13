import type { GroupStanding, MatchResult, ResultsBundle } from '../types/results';
import type { TeamId, TeamRegistry } from '../types/team';
import type { TournamentConfig } from '../types/tournament';

interface TeamStats {
  teamId: TeamId;
  played: number;
  points: number;
  gf: number;
  ga: number;
}

function getGroupMatches(
  group: string,
  tournament: TournamentConfig,
): TournamentConfig['groupMatches'] {
  return tournament.groupMatches.filter((match) => match.group === group);
}

export function isGroupStageComplete(
  group: string,
  tournament: TournamentConfig,
  results: ResultsBundle,
): boolean {
  const groupMatches = getGroupMatches(group, tournament);
  if (groupMatches.length === 0) return false;

  return groupMatches.every((match) => {
    const result = results.matches.find((entry) => entry.matchId === match.matchId);
    return (
      result?.status === 'finished' &&
      result.homeScore !== null &&
      result.awayScore !== null
    );
  });
}

function initStats(teamIds: TeamId[]): Map<TeamId, TeamStats> {
  const stats = new Map<TeamId, TeamStats>();
  for (const teamId of teamIds) {
    stats.set(teamId, { teamId, played: 0, points: 0, gf: 0, ga: 0 });
  }
  return stats;
}

function applyResult(
  stats: Map<TeamId, TeamStats>,
  result: MatchResult,
  homeTeamId: TeamId,
  awayTeamId: TeamId,
) {
  if (result.homeScore === null || result.awayScore === null) return;

  const home = stats.get(homeTeamId);
  const away = stats.get(awayTeamId);
  if (!home || !away) return;

  home.played += 1;
  away.played += 1;
  home.gf += result.homeScore;
  home.ga += result.awayScore;
  away.gf += result.awayScore;
  away.ga += result.homeScore;

  if (result.homeScore > result.awayScore) {
    home.points += 3;
  } else if (result.homeScore < result.awayScore) {
    away.points += 3;
  } else {
    home.points += 1;
    away.points += 1;
  }
}

export function computeGroupStanding(
  group: string,
  tournament: TournamentConfig,
  results: ResultsBundle,
  registry: TeamRegistry,
): GroupStanding | null {
  if (!isGroupStageComplete(group, tournament, results)) return null;

  const teamIds = registry.teams.filter((team) => team.group === group).map((team) => team.id);
  const stats = initStats(teamIds);

  for (const match of getGroupMatches(group, tournament)) {
    const result = results.matches.find((entry) => entry.matchId === match.matchId);
    if (!result || !match.homeTeamId || !match.awayTeamId) continue;
    applyResult(stats, result, match.homeTeamId, match.awayTeamId);
  }

  const positions = [...stats.values()]
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.gf - a.ga;
      const gdB = b.gf - b.ga;
      if (gdB !== gdA) return gdB - gdA;
      return b.gf - a.gf;
    })
    .map((entry) => entry.teamId);

  return {
    group,
    positions,
    updatedAt: results.fetchedAt,
  };
}

export function computeAllGroupStandings(
  tournament: TournamentConfig,
  results: ResultsBundle,
  registry: TeamRegistry,
): GroupStanding[] {
  return tournament.groups
    .map((group) => computeGroupStanding(group, tournament, results, registry))
    .filter((standing): standing is GroupStanding => standing !== null);
}
