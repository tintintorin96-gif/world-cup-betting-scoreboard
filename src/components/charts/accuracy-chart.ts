import { Chart, DoughnutController, ArcElement } from 'chart.js';
import type { ScoringBreakdown } from '../../types/scoring';

Chart.register(DoughnutController, ArcElement);

export function mountAccuracyChart(canvas: HTMLCanvasElement, breakdown: ScoringBreakdown): Chart {
  return new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Correct', 'Missed'],
      datasets: [{
        data: [breakdown.correctPicks, breakdown.missedPicks],
        backgroundColor: ['#00c853', 'rgba(255,255,255,0.1)'],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#f5f5f5' } } },
    },
  });
}
