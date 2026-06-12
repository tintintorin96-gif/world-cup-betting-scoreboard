import { h } from '../utils/dom';

export function progressBar(pct: number, label?: string): HTMLElement {
  const clamped = Math.min(100, Math.max(0, pct));
  return h('div', { className: 'progress-bar' },
    label ? h('span', { className: 'progress-label' }, label) : null,
    h('div', { className: 'progress-track' },
      h('div', { className: 'progress-fill', style: `width: ${clamped}%` }),
    ),
    h('span', { className: 'progress-pct' }, `${clamped.toFixed(1)}%`),
  );
}
