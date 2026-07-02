import { describe, expect, it } from 'vitest';
import {
  mapWorldCup2026KnockoutRound,
  mapWorldCup2026Status,
  parseWorldCup2026Score,
  resolveKnockoutWinner,
} from '../../src/adapters/worldcup2026';

describe('worldcup2026 adapter helpers', () => {
  it('parses API score strings', () => {
    expect(parseWorldCup2026Score('2')).toBe(2);
    expect(parseWorldCup2026Score('0')).toBe(0);
    expect(parseWorldCup2026Score('null')).toBeNull();
    expect(parseWorldCup2026Score(undefined)).toBeNull();
  });

  it('maps match status from finished/time_elapsed', () => {
    expect(mapWorldCup2026Status({ finished: 'TRUE', time_elapsed: 'finished' })).toBe('finished');
    expect(mapWorldCup2026Status({ finished: 'FALSE', time_elapsed: '45' })).toBe('live');
    expect(mapWorldCup2026Status({ finished: 'FALSE', time_elapsed: 'notstarted' })).toBe('scheduled');
  });

  it('maps API knockout round types', () => {
    expect(mapWorldCup2026KnockoutRound('r32')).toBe('r32');
    expect(mapWorldCup2026KnockoutRound('final')).toBe('final');
    expect(mapWorldCup2026KnockoutRound('group')).toBeNull();
  });

  it('resolves knockout winners including penalties', () => {
    expect(
      resolveKnockoutWinner(
        { finished: 'TRUE', time_elapsed: 'finished', home_score: '2', away_score: '1' },
        'GER',
        'JPN',
      ),
    ).toBe('GER');

    expect(
      resolveKnockoutWinner(
        {
          finished: 'TRUE',
          time_elapsed: 'finished',
          home_score: '1',
          away_score: '1',
          home_penalty_score: '3',
          away_penalty_score: '4',
        },
        'GER',
        'PAR',
      ),
    ).toBe('PAR');

    expect(
      resolveKnockoutWinner(
        { finished: 'FALSE', time_elapsed: 'notstarted', home_score: '0', away_score: '0' },
        'GER',
        'JPN',
      ),
    ).toBeUndefined();
  });
});
