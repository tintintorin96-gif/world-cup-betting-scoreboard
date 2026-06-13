import { describe, it, expect } from 'vitest';
import scoringDefaults from '../../config/scoring.defaults.json';
import tournamentJson from '../../config/tournament.json';
import registryJson from '../../data/teams.registry.json';
import {
  calculateMatchScore,
  calculateGroupWinnerScore,
  calculateLeaderboard,
  computeMaxPossibleScore,
  computeGroupStanding,
  deriveBreakdownFromEvents,
  createScoringEvent,
  isGroupStageComplete,
} from '../../src/engine';
import type { ScoringConfig } from '../../src/types/scoring';
import type { TournamentConfig } from '../../src/types/tournament';
import type { TeamRegistry } from '../../src/types/team';
import type { PredictionBundle } from '../../src/types/prediction';

const config = scoringDefaults as ScoringConfig;
const registry = registryJson as TeamRegistry;

function buildTournament(): TournamentConfig {
  const t = tournamentJson as TournamentConfig;
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

function groupAMatchesFinished() {
  const mexicoWins = new Set(['A-1', 'A-2', 'A-3']);
  return {
    version: 1,
    fetchedAt: new Date().toISOString(),
    matches: tournament.groupMatches
      .filter((match) => match.group === 'A')
      .map((match) => ({
        matchId: match.matchId,
        status: 'finished' as const,
        homeTeamId: match.homeTeamId!,
        awayTeamId: match.awayTeamId!,
        homeScore: mexicoWins.has(match.matchId)
          ? 1
          : match.homeTeamId === 'MEX'
            ? 1
            : 0,
        awayScore: mexicoWins.has(match.matchId)
          ? 0
          : match.awayTeamId === 'MEX'
            ? 0
            : 1,
        updatedAt: new Date().toISOString(),
        source: 'manual' as const,
      })),
    groupStandings: [],
    knockout: [],
  };
}

describe('scoring engine', () => {
  it('awards exact score points with full audit fields', () => {
    const event = calculateMatchScore(
      'wilmer',
      { matchId: 'A-1', homeScore: 2, awayScore: 1 },
      {
        matchId: 'A-1',
        status: 'finished',
        homeTeamId: 'MEX',
        awayTeamId: 'RSA',
        homeScore: 2,
        awayScore: 1,
        updatedAt: new Date().toISOString(),
        source: 'manual',
      },
      config,
      'Mexico',
      'South Africa',
      new Date().toISOString(),
    );
    expect(event.points).toBe(5);
    expect(event.category).toBe('exact_score');
    expect(event.prediction).toBe('2-1');
    expect(event.actualResult).toBe('2-1');
    expect(event.participantId).toBe('wilmer');
    expect(event.id).toBeTruthy();
  });

  it('awards outcome-only points', () => {
    const event = calculateMatchScore(
      'wilmer',
      { matchId: 'G-2', homeScore: 2, awayScore: 2 },
      {
        matchId: 'G-2',
        status: 'finished',
        homeTeamId: 'ESP',
        awayTeamId: 'CPV',
        homeScore: 1,
        awayScore: 1,
        updatedAt: new Date().toISOString(),
        source: 'manual',
      },
      config,
      'Spain',
      'Cape Verde',
      new Date().toISOString(),
    );
    expect(event.points).toBe(2);
    expect(event.category).toBe('correct_outcome');
  });

  it('derives totals exclusively from events', () => {
    const events = [
      createScoringEvent({
        participantId: 'wilmer',
        type: 'group_exact_score',
        points: 5,
        label: 'Exact score',
        description: 'Mexico vs South Africa',
        prediction: '2-1',
        actualResult: '2-1',
        matchId: 'A-1',
        timestamp: new Date().toISOString(),
      }),
      createScoringEvent({
        participantId: 'wilmer',
        type: 'group_correct_outcome',
        points: 2,
        label: 'Correct outcome',
        description: 'Spain vs Uruguay',
        prediction: 'Draw',
        actualResult: '1-1',
        matchId: 'G-2',
        timestamp: new Date().toISOString(),
      }),
      createScoringEvent({
        participantId: 'wilmer',
        type: 'knockout_r32',
        points: 2,
        label: 'Round of 32 correct',
        description: 'Germany',
        prediction: 'Advances',
        actualResult: 'Advanced',
        teamId: 'GER',
        timestamp: new Date().toISOString(),
      }),
    ];

    const breakdown = deriveBreakdownFromEvents('wilmer', events);
    expect(breakdown.totalPoints).toBe(9);
    expect(breakdown.groupStagePoints).toBe(7);
    expect(breakdown.knockoutPoints).toBe(2);
    expect(breakdown.exactScoreHits).toBe(1);
    expect(breakdown.correctOutcomeHits).toBe(1);
  });

  it('max possible score equals 657', () => {
    expect(computeMaxPossibleScore(config, tournament)).toBe(657);
  });

  it('does not award group winner points until the group is complete', () => {
    const groupAMatches = tournament.groupMatches.filter((match) => match.group === 'A');
    const partialResults = {
      version: 1,
      fetchedAt: new Date().toISOString(),
      matches: [
        {
          matchId: 'A-1',
          status: 'finished' as const,
          homeTeamId: 'MEX',
          awayTeamId: 'RSA',
          homeScore: 2,
          awayScore: 0,
          updatedAt: new Date().toISOString(),
          source: 'manual' as const,
        },
      ],
      groupStandings: [],
      knockout: [],
    };

    expect(isGroupStageComplete('A', tournament, partialResults)).toBe(false);
    expect(computeGroupStanding('A', tournament, partialResults, registry)).toBeNull();

    const pending = calculateGroupWinnerScore(
      'wilmer',
      { group: 'A', winnerId: 'MEX' },
      null,
      false,
      config,
      'Mexico',
      (id) => id,
      new Date().toISOString(),
    );
    expect(pending.category).toBe('pending');
    expect(pending.points).toBe(0);
  });

  it('awards group winner points after all group matches finish', () => {
    const finishedGroupA = groupAMatchesFinished();
    expect(isGroupStageComplete('A', tournament, finishedGroupA)).toBe(true);

    const standing = computeGroupStanding('A', tournament, finishedGroupA, registry);
    expect(standing?.positions[0]).toBe('MEX');

    const event = calculateGroupWinnerScore(
      'wilmer',
      { group: 'A', winnerId: 'MEX' },
      standing,
      true,
      config,
      'Mexico',
      (id) => id,
      new Date().toISOString(),
    );
    expect(event.points).toBe(5);
    expect(event.category).toBe('group_winner');
  });

  it('calculates leaderboard with tiebreak', () => {
    const bundles: PredictionBundle[] = [
      {
        participant: { id: 'a', displayName: 'A', filePath: 'a.md' },
        prediction: { participantId: 'a', groupMatches: [], groupStandings: [], groupWinners: [], knockout: [] },
      },
      {
        participant: { id: 'b', displayName: 'B', filePath: 'b.md' },
        prediction: { participantId: 'b', groupMatches: [], groupStandings: [], groupWinners: [], knockout: [] },
      },
    ];
    const breakdowns = [
      deriveBreakdownFromEvents('a', [
        createScoringEvent({
          participantId: 'a',
          type: 'group_exact_score',
          points: 6,
          label: 'Exact',
          description: 'x',
          prediction: '1-0',
          actualResult: '1-0',
          timestamp: new Date().toISOString(),
        }),
        createScoringEvent({
          participantId: 'a',
          type: 'knockout_r32',
          points: 4,
          label: 'R32',
          description: 'y',
          prediction: 'Advances',
          actualResult: 'Advanced',
          timestamp: new Date().toISOString(),
        }),
      ]),
      deriveBreakdownFromEvents('b', [
        createScoringEvent({
          participantId: 'b',
          type: 'group_exact_score',
          points: 4,
          label: 'Exact',
          description: 'x',
          prediction: '1-0',
          actualResult: '1-0',
          timestamp: new Date().toISOString(),
        }),
        createScoringEvent({
          participantId: 'b',
          type: 'knockout_r32',
          points: 6,
          label: 'R32',
          description: 'y',
          prediction: 'Advances',
          actualResult: 'Advanced',
          timestamp: new Date().toISOString(),
        }),
      ]),
    ];
    const board = calculateLeaderboard(bundles, breakdowns, config);
    expect(board[0].participantId).toBe('a');
    expect(board[1].participantId).toBe('b');
  });
});
