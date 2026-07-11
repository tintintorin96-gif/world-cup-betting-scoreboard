import { h } from '../utils/dom';
import type { AppData } from '../services/data-loader';
import { loadBreakdown } from '../services/data-loader';
import {
  scoringInspector,
  scoringInspectorSummary,
  chronologicalEventList,
} from '../components/scoring-inspector';
import { deriveBreakdownFromEvents } from '../engine/derive-breakdown';

export async function renderParticipantPage(main: HTMLElement, data: AppData, participantId: string) {
  const bundle = data.predictions.find((p) => p.participant.id === participantId);
  if (!bundle) {
    main.append(h('div', { className: 'error-panel glass-panel' }, h('p', {}, 'Participant not found.')));
    return;
  }

  const breakdown = await loadBreakdown(participantId);
  const derived = deriveBreakdownFromEvents(participantId, breakdown.events);
  const entry = data.leaderboard.find((e) => e.participantId === participantId);

  main.append(
    h('section', { className: 'page participant-page' },
      h('a', { className: 'back-link', href: '#/' }, '← Leaderboard'),

      h('div', { className: 'inspector-hero glass-panel' },
        h('div', { className: 'inspector-hero-top' },
          h('div', {},
            h('p', { className: 'inspector-rank' }, entry ? `Rank #${entry.rank}` : 'Unranked'),
            h('h2', { className: 'participant-name' }, bundle.participant.displayName),
          ),
          h('div', { className: 'inspector-total-hero' },
            h('span', { className: 'total-label' }, 'Total points'),
            h('strong', { className: 'total-value' }, `${derived.totalPoints}`),
          ),
        ),
        h('p', { className: 'inspector-tagline' },
          'Every point below is a scored event. The total is the sum of these events — not a separate calculation.',
        ),
        h('div', { className: 'category-totals' },
          h('span', {}, `Group stage: ${derived.groupStagePoints}`),
          h('span', {}, `Knockout: ${derived.knockoutPoints}`),
          h('span', {}, `Accuracy: ${derived.accuracyPct}%`),
        ),
        scoringInspectorSummary(breakdown),
      ),

      h('div', { className: 'inspector-main' },
        h('div', { className: 'inspector-panel glass-panel' },
          h('h3', { className: 'panel-title' }, `Why ${derived.totalPoints} points?`),
          h('p', { className: 'panel-desc' }, 'Grouped scoring statement — every transaction that builds the total.'),
          scoringInspector(breakdown, { showPending: false }),
        ),
        h('div', { className: 'inspector-panel glass-panel' },
          h('h3', { className: 'panel-title' }, 'Chronological audit trail'),
          h('p', { className: 'panel-desc' }, 'Events in the order they were recorded, with running totals.'),
          chronologicalEventList(breakdown.events),
        ),
      ),
    ),
  );
}
