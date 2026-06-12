import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler } from 'chart.js';
import type { Snapshot } from '../../types/scoring';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler);

export function mountPointsOverTime(
  canvas: HTMLCanvasElement,
  snapshots: Snapshot[],
  participantId: string,
): Chart {
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const labels = sorted.map((s) =>
    new Date(s.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  );
  const data = sorted.map((s) => {
    const entry = s.leaderboard.find((e) => e.participantId === participantId);
    return entry?.totalPoints ?? 0;
  });

  if (!labels.length) {
    labels.push('Now');
    data.push(data[0] ?? 0);
  }

  return new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Points',
        data,
        borderColor: '#00c853',
        backgroundColor: 'rgba(0, 200, 83, 0.15)',
        fill: true,
        tension: 0.3,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      },
    },
  });
}
