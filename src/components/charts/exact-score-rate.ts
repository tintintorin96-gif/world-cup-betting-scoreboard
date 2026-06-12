import { Chart, BarController, BarElement, LinearScale, CategoryScale } from 'chart.js';
import type { ScoringBreakdown } from '../../types/scoring';

Chart.register(BarController, BarElement, LinearScale, CategoryScale);

export function mountExactScoreChart(canvas: HTMLCanvasElement, breakdown: ScoringBreakdown): Chart {
  const groupEvents = breakdown.events.filter((e) => e.type.startsWith('group_') && e.label !== 'Pending');
  const exact = breakdown.exactScoreHits;
  const other = groupEvents.length - exact;

  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['Exact scores', 'Other group picks'],
      datasets: [{
        data: [exact, Math.max(0, other)],
        backgroundColor: ['#ffd54f', 'rgba(255,255,255,0.15)'],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#aaa' }, grid: { display: false } },
        y: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      },
    },
  });
}
