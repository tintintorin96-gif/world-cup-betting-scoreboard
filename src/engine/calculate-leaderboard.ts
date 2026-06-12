import type { PredictionBundle } from '../types/prediction';
import type { LeaderboardEntry, ScoringBreakdown, ScoringConfig, Snapshot } from '../types/scoring';

export function calculateLeaderboard(
  bundles: PredictionBundle[],
  breakdowns: ScoringBreakdown[],
  config: ScoringConfig,
  prevSnapshot?: Snapshot,
): LeaderboardEntry[] {
  const prevMap = new Map(
    (prevSnapshot?.leaderboard ?? []).map((e) => [e.participantId, e.totalPoints]),
  );

  const entries = bundles.map((bundle) => {
    const breakdown = breakdowns.find((b) => b.participantId === bundle.participant.id)!;
    const prevPoints = prevMap.get(bundle.participant.id) ?? breakdown.totalPoints;

    return {
      participantId: bundle.participant.id,
      displayName: bundle.participant.displayName,
      totalPoints: breakdown.totalPoints,
      delta: breakdown.totalPoints - prevPoints,
      progressPct: Math.round((breakdown.totalPoints / config.maxPoints) * 1000) / 10,
      groupStagePoints: breakdown.groupStagePoints,
      knockoutPoints: breakdown.knockoutPoints,
      rank: 0,
    };
  });

  entries.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.groupStagePoints !== a.groupStagePoints) return b.groupStagePoints - a.groupStagePoints;
    return a.displayName.localeCompare(b.displayName);
  });

  return entries.map((e, i) => ({ ...e, rank: i + 1 }));
}
