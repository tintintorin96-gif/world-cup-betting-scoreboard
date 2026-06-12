export function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return '—';
}

export function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatMatchStatus(status: string): string {
  const labels: Record<string, string> = {
    scheduled: 'Scheduled',
    live: 'Live',
    finished: 'FT',
    postponed: 'Postponed',
    cancelled: 'Cancelled',
  };
  return labels[status] ?? status;
}

export function formatScore(home: number | null, away: number | null): string {
  if (home === null || away === null) return '– : –';
  return `${home} : ${away}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
