import { h } from '../utils/dom';
import type { TeamRegistry } from '../types/team';
import { getTeamDisplay } from '../normalize/team-registry';

export function groupTable(
  group: string,
  teamIds: string[],
  registry: TeamRegistry,
): HTMLElement {
  return h('div', { className: 'group-table glass-panel' },
    h('h3', { className: 'group-title' }, `Group ${group}`),
    h('ol', { className: 'group-standings' },
      ...teamIds.map((id, i) =>
        h('li', { className: 'group-row' },
          h('span', { className: 'pos' }, `${i + 1}`),
          h('span', { className: 'team' }, getTeamDisplay(id, registry)),
        ),
      ),
    ),
  );
}
