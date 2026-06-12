import { h } from '../utils/dom';
import type { AppData } from '../services/data-loader';
import { liveMatchCard } from '../components/live-match-card';

type Filter = 'all' | 'live' | 'today' | 'finished';

export function renderLiveMatchesPage(main: HTMLElement, data: AppData) {
  let filter: Filter = 'all';

  const matchMap = new Map(data.tournament.groupMatches.map((m) => [m.matchId, m]));
  const container = h('div', { className: 'match-grid' });
  const tabs = h('div', { className: 'filter-tabs' });

  function renderMatches() {
    container.replaceChildren();
    const today = new Date().toDateString();
    const matches = data.results.matches.filter((m) => {
      if (filter === 'live') return m.status === 'live';
      if (filter === 'finished') return m.status === 'finished';
      if (filter === 'today') {
        return new Date(m.updatedAt).toDateString() === today || m.status === 'live';
      }
      return true;
    });

    const sorted = [...matches].sort((a, b) => {
      const order = { live: 0, scheduled: 1, finished: 2, postponed: 3, cancelled: 4 };
      return (order[a.status] ?? 5) - (order[b.status] ?? 5);
    });

    if (!sorted.length) {
      container.append(h('p', { className: 'empty-state' }, 'No matches for this filter.'));
      return;
    }

    for (const match of sorted) {
      const ref = matchMap.get(match.matchId);
      container.append(liveMatchCard(match, data.teams, ref?.group));
    }
  }

  function setFilter(f: Filter) {
    filter = f;
    tabs.querySelectorAll('.tab').forEach((t) => {
      t.classList.toggle('active', t.getAttribute('data-filter') === f);
    });
    renderMatches();
  }

  for (const [f, label] of [['all', 'All'], ['live', 'Live'], ['today', 'Today'], ['finished', 'Finished']] as const) {
    tabs.append(
      h('button', {
        className: `tab ${f === filter ? 'active' : ''}`,
        'data-filter': f,
        onClick: () => setFilter(f),
      }, label),
    );
  }

  main.append(
    h('section', { className: 'page live-page' },
      h('div', { className: 'page-hero' },
        h('h2', { className: 'page-title' }, 'Live Matches'),
        h('p', { className: 'page-desc' }, 'Fixtures and results from the tournament'),
      ),
      tabs,
      container,
    ),
  );

  renderMatches();
}
