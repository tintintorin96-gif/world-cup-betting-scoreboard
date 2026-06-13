import { describe, expect, it } from 'vitest';
import {
  mapWorldCup2026Status,
  parseWorldCup2026Score,
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
});
