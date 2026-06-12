import type { ScoringBreakdown, ScoringCategory, ScoringEvent } from '../types/scoring';
import { isGroupCategory } from './scoring-categories';

const ALL_CATEGORIES: ScoringCategory[] = [
  'exact_score',
  'correct_outcome',
  'wrong_outcome',
  'group_winner',
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'third_place_reach',
  'third_place_winner',
  'finalist',
  'champion',
  'pending',
];

export function deriveBreakdownFromEvents(
  participantId: string,
  events: ScoringEvent[],
): ScoringBreakdown {
  const scored = events.filter((e) => e.category !== 'pending');

  const pointsByCategory = Object.fromEntries(
    ALL_CATEGORIES.map((c) => [c, 0]),
  ) as Record<ScoringCategory, number>;

  for (const event of scored) {
    pointsByCategory[event.category] += event.points;
  }

  const groupStagePoints = scored
    .filter((e) => isGroupCategory(e.category))
    .reduce((sum, e) => sum + e.points, 0);

  const knockoutPoints = scored
    .filter((e) => !isGroupCategory(e.category) && e.category !== 'pending')
    .reduce((sum, e) => sum + e.points, 0);

  const totalPoints = scored.reduce((sum, e) => sum + e.points, 0);

  const correctPicks = scored.filter((e) => e.points > 0).length;
  const missedPicks = scored.filter((e) => e.points === 0).length;
  const exactScoreHits = scored.filter((e) => e.category === 'exact_score').length;
  const correctOutcomeHits = scored.filter((e) => e.category === 'correct_outcome').length;
  const groupWinnerHits = scored.filter((e) => e.category === 'group_winner' && e.points > 0).length;
  const knockoutHits = scored.filter(
    (e) => !isGroupCategory(e.category) && e.points > 0,
  ).length;

  const accuracyPct =
    correctPicks + missedPicks > 0
      ? Math.round((correctPicks / (correctPicks + missedPicks)) * 100)
      : 0;

  return {
    participantId,
    events: scored,
    totalPoints,
    groupStagePoints,
    knockoutPoints,
    pointsByCategory,
    correctPicks,
    missedPicks,
    exactScoreHits,
    correctOutcomeHits,
    groupWinnerHits,
    knockoutHits,
    accuracyPct,
  };
}
