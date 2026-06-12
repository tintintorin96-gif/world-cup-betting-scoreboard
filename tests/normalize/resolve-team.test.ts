import { describe, it, expect } from 'vitest';
import registryJson from '../../data/teams.registry.json';
import { resolveTeamId, normalizeTeamName } from '../../src/normalize/resolve-team';
import type { TeamRegistry } from '../../src/types/team';

const registry = registryJson as TeamRegistry;

describe('normalizeTeamName', () => {
  it('strips emoji and normalizes', () => {
    expect(normalizeTeamName('🇪🇸 Spain')).toBe('spain');
    expect(normalizeTeamName('  France  ')).toBe('france');
  });
});

describe('resolveTeamId', () => {
  it('resolves by name', () => {
    expect(resolveTeamId('Spain', registry)).toBe('ESP');
    expect(resolveTeamId('🇫🇷 France', registry)).toBe('FRA');
  });

  it('resolves aliases', () => {
    expect(resolveTeamId('England', registry)).toBe('ENG');
    expect(resolveTeamId('United States', registry)).toBe('USA');
  });

  it('throws for unknown teams', () => {
    expect(() => resolveTeamId('Atlantis', registry)).toThrow();
  });
});
