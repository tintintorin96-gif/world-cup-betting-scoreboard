import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import registryJson from '../../data/teams.registry.json';
import tournamentJson from '../../config/tournament.json';
import { parseParticipantFile } from '../../src/parser/parse-participant';
import { ParseError } from '../../src/parser/errors';
import type { TeamRegistry } from '../../src/types/team';
import type { TournamentConfig } from '../../src/types/tournament';

const registry = registryJson as TeamRegistry;
const FIXTURES = path.resolve(import.meta.dirname, '../fixtures/participants');

function buildTournament(): TournamentConfig {
  const t = tournamentJson as TournamentConfig;
  if (t.groupMatches.length) return t;
  const groupMatches: TournamentConfig['groupMatches'] = [];
  for (const group of t.groups) {
    const teams = registry.teams.filter((team) => team.group === group);
    let n = 1;
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        groupMatches.push({
          matchId: `${group}-${n++}`,
          group,
          homeSlot: teams[i].id,
          awaySlot: teams[j].id,
          homeTeamId: teams[i].id,
          awayTeamId: teams[j].id,
        });
      }
    }
  }
  return { ...t, groupMatches };
}

const tournament = buildTournament();

describe('parseParticipantFile', () => {
  it('parses valid wilmer fixture', () => {
    const md = readFileSync(path.join(FIXTURES, 'wilmer.md'), 'utf-8');
    const result = parseParticipantFile(md, 'wilmer.md', tournament, registry);
    expect(result.participant.id).toBe('wilmer');
    expect(result.prediction.groupMatches.length).toBeGreaterThan(0);
    expect(result.prediction.groupWinners.length).toBe(2);
  });

  it('throws when knockout section missing', () => {
    const md = readFileSync(path.join(FIXTURES, 'invalid-missing-knockout.md'), 'utf-8');
    expect(() => parseParticipantFile(md, 'invalid.md', tournament, registry)).toThrow(ParseError);
  });
});
