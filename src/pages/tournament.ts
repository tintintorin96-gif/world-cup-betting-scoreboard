import { h } from '../utils/dom';
import type { AppData } from '../services/data-loader';
import { groupTable } from '../components/group-table';
import { bracket } from '../components/bracket';

export function renderTournamentPage(main: HTMLElement, data: AppData) {
  const tabs = h('div', { className: 'filter-tabs' });
  const content = h('div', { className: 'tournament-content' });
  let view: 'groups' | 'bracket' = 'groups';

  function renderContent() {
    content.replaceChildren();
    if (view === 'groups') {
      const grid = h('div', { className: 'groups-grid' });
      for (const group of data.tournament.groups) {
        const standing = data.results.groupStandings.find((s) => s.group === group);
        const teams = standing?.positions.length
          ? standing.positions
          : data.teams.teams.filter((t) => t.group === group).map((t) => t.id);
        grid.append(groupTable(group, teams, data.teams));
      }
      content.append(grid);
    } else {
      content.append(bracket(data.results.knockout, data.teams));
    }
  }

  function setView(v: 'groups' | 'bracket') {
    view = v;
    tabs.querySelectorAll('.tab').forEach((t) => {
      t.classList.toggle('active', t.getAttribute('data-view') === v);
    });
    renderContent();
  }

  tabs.append(
    h('button', { className: 'tab active', 'data-view': 'groups', onClick: () => setView('groups') }, 'Groups'),
    h('button', { className: 'tab', 'data-view': 'bracket', onClick: () => setView('bracket') }, 'Bracket'),
  );

  main.append(
    h('section', { className: 'page tournament-page' },
      h('div', { className: 'page-hero' },
        h('h2', { className: 'page-title' }, 'Tournament Overview'),
        h('p', { className: 'page-desc' }, data.tournament.name),
      ),
      tabs,
      content,
    ),
  );

  renderContent();
}
