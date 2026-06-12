import type { Team, TeamId, TeamRegistry } from '../types/team';
import aliases from '../../config/teams.aliases.json';

export function buildLookupMaps(registry: TeamRegistry): {
  byId: Map<TeamId, Team>;
  byNormalizedName: Map<string, TeamId>;
} {
  const byId = new Map<TeamId, Team>();
  const byNormalizedName = new Map<string, TeamId>();

  for (const team of registry.teams) {
    byId.set(team.id, team);
    const names = new Set([
      team.id.toLowerCase(),
      team.name.toLowerCase(),
      ...team.aliases.map((a) => a.toLowerCase()),
    ]);
    if (team.fifaName) names.add(team.fifaName.toLowerCase());
    for (const name of names) {
      byNormalizedName.set(name, team.id);
    }
  }

  for (const [alias, id] of Object.entries(aliases)) {
    byNormalizedName.set(alias.toLowerCase(), id);
  }

  return { byId, byNormalizedName };
}

export function getTeamDisplay(teamId: TeamId, registry: TeamRegistry): string {
  const team = registry.teams.find((t) => t.id === teamId);
  if (!team) return teamId;
  return team.emoji ? `${team.emoji} ${team.name}` : team.name;
}
