/**
 * One-time helper to generate group match refs. Run: npx tsx scripts/generate-tournament.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

interface Team {
  id: string;
  group?: string;
}

const root = path.resolve(import.meta.dirname, '..');
const registry = JSON.parse(
  readFileSync(path.join(root, 'data/teams.registry.json'), 'utf-8'),
) as { teams: Team[] };

const groups = 'ABCDEFGHIJKL'.split('');
const groupMatches: Array<{
  matchId: string;
  group: string;
  homeSlot: string;
  awaySlot: string;
  homeTeamId: string;
  awayTeamId: string;
}> = [];

for (const group of groups) {
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

const tournament = JSON.parse(
  readFileSync(path.join(root, 'config/tournament.json'), 'utf-8'),
);
tournament.groupMatches = groupMatches;
writeFileSync(path.join(root, 'config/tournament.json'), JSON.stringify(tournament, null, 2));
console.log(`Generated ${groupMatches.length} group matches`);
