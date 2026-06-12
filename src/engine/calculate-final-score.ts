import type { Prediction } from '../types/prediction';
import type { ResultsBundle } from '../types/results';
import type { ScoringBreakdown, ScoringConfig, ScoringEvent } from '../types/scoring';
import type { TournamentConfig } from '../types/tournament';
import type { TeamRegistry } from '../types/team';
import { getTeamDisplay } from '../normalize/team-registry';
import { calculateGroupWinnerScore } from './calculate-group-winner-score';
import { calculateKnockoutScore } from './calculate-knockout-score';
import { calculateMatchScore } from './calculate-match-score';
import { resetEventCounter } from './create-scoring-event';
import { deriveBreakdownFromEvents } from './derive-breakdown';

export function calculateFinalScore(
  prediction: Prediction,
  results: ResultsBundle,
  config: ScoringConfig,
  tournament: TournamentConfig,
  registry: TeamRegistry,
): ScoringBreakdown {
  resetEventCounter();

  const events: ScoringEvent[] = [];
  const timestamp = results.fetchedAt;
  const participantId = prediction.participantId;
  const getLabel = (id: string) => getTeamDisplay(id, registry);

  for (const gm of prediction.groupMatches) {
    const matchRef = tournament.groupMatches.find((m) => m.matchId === gm.matchId);
    const result = results.matches.find((m) => m.matchId === gm.matchId);
    if (!matchRef || !result) continue;

    events.push(
      calculateMatchScore(
        participantId,
        gm,
        result,
        config,
        getLabel(matchRef.homeTeamId!),
        getLabel(matchRef.awayTeamId!),
        timestamp,
      ),
    );
  }

  for (const gw of prediction.groupWinners) {
    const standing = results.groupStandings.find((s) => s.group === gw.group);
    const event = calculateGroupWinnerScore(
      participantId,
      gw,
      standing,
      config,
      getLabel(gw.winnerId),
      getLabel,
      timestamp,
    );
    if (event) events.push(event);
  }

  events.push(
    ...calculateKnockoutScore(
      participantId,
      prediction.knockout,
      results,
      config,
      tournament,
      getLabel,
      timestamp,
    ),
  );

  const pending = events.filter((e) => e.category === 'pending');
  const scored = events.filter((e) => e.category !== 'pending');

  return {
    ...deriveBreakdownFromEvents(participantId, scored),
    events: [...scored, ...pending],
  };
}
