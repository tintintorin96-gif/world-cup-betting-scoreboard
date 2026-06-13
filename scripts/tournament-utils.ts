import type { TournamentConfig } from '../src/types/tournament';
import type { TeamRegistry } from '../src/types/team';

export function generateGroupMatches(
  tournament: TournamentConfig,
  registry: TeamRegistry,
): TournamentConfig {
  if (tournament.groupMatches.length > 0) return tournament;

  const groupMatches: TournamentConfig['groupMatches'] = [];

  for (const group of tournament.groups) {
    const teams = registry.teams.filter((t) => t.group === group);
    let matchNum = 1;
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        groupMatches.push({
          matchId: `${group}-${matchNum}`,
          group,
          homeSlot: teams[i].id,
          awaySlot: teams[j].id,
          homeTeamId: teams[i].id,
          awayTeamId: teams[j].id,
        });
        matchNum++;
      }
    }
  }

  return { ...tournament, groupMatches };
}
