import { h } from '../utils/dom';
import type { KnockoutState } from '../types/results';
import type { TeamRegistry } from '../types/team';
import { getTeamDisplay } from '../normalize/team-registry';

const ROUND_LABELS: Record<string, string> = {
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-finals',
  sf: 'Semi-finals',
  third: 'Third place',
  final: 'Final',
};

export function bracket(knockout: KnockoutState[], registry: TeamRegistry): HTMLElement {
  const rounds = ['r32', 'r16', 'qf', 'sf', 'third', 'final'];
  const container = h('div', { className: 'bracket' });

  for (const round of rounds) {
    const matches = knockout.filter((k) => k.round === round);
    if (!matches.length) continue;

    container.append(
      h('div', { className: 'bracket-round' },
        h('h4', { className: 'bracket-round-label' }, ROUND_LABELS[round] ?? round),
        h('div', { className: 'bracket-matches' },
          ...matches.map((m) =>
            h('div', { className: 'bracket-match glass-panel' },
              h('span', {}, getTeamDisplay(m.homeTeamId, registry)),
              h('span', { className: 'vs' }, 'vs'),
              h('span', {}, getTeamDisplay(m.awayTeamId, registry)),
              m.winnerId
                ? h('span', { className: 'winner' }, `✓ ${getTeamDisplay(m.winnerId, registry)}`)
                : null,
            ),
          ),
        ),
      ),
    );
  }

  if (!container.children.length) {
    container.append(
      h('p', { className: 'empty-state' }, 'Knockout bracket will appear when the tournament progresses.'),
    );
  }

  return container;
}
