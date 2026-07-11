import type { KnockoutPrediction } from '../types/prediction';
import type { ResultsBundle } from '../types/results';
import type { KnockoutRound, TournamentConfig } from '../types/tournament';
import type { ScoringConfig, ScoringEvent, ScoringEventType } from '../types/scoring';
import { createScoringEvent } from './create-scoring-event';
import { getPoints } from './scoring-config';

function knockoutEventType(round: KnockoutRound): ScoringEventType | null {
  const map: Partial<Record<KnockoutRound, ScoringEventType>> = {
    r32: 'knockout_r32',
    r16: 'knockout_r16',
    qf: 'knockout_qf',
    sf: 'knockout_sf',
  };
  return map[round] ?? null;
}

function getRoundMatches(round: KnockoutRound, results: ResultsBundle) {
  return results.knockout.filter((k) => k.round === round);
}

function getActualAdvancers(round: KnockoutRound, results: ResultsBundle): Set<string> {
  const advancers = new Set<string>();
  for (const m of getRoundMatches(round, results)) {
    if (m.winnerId) advancers.add(m.winnerId);
  }
  return advancers;
}

function isInUnplayedRoundMatch(
  teamId: string,
  round: KnockoutRound,
  results: ResultsBundle,
): boolean {
  return getRoundMatches(round, results).some(
    (m) => !m.winnerId && (m.homeTeamId === teamId || m.awayTeamId === teamId),
  );
}

export function calculateKnockoutScore(
  participantId: string,
  predictions: KnockoutPrediction[],
  results: ResultsBundle,
  config: ScoringConfig,
  tournament: TournamentConfig,
  getTeamLabel: (id: string) => string,
  timestamp: string,
): ScoringEvent[] {
  const events: ScoringEvent[] = [];

  for (const pred of predictions) {
    if (pred.round === 'third') {
      const thirdMatches = results.knockout.filter((k) => k.round === 'third');
      const participants = new Set<string>();
      for (const m of thirdMatches) {
        participants.add(m.homeTeamId);
        participants.add(m.awayTeamId);
      }

      for (const teamId of pred.advancingTeamIds) {
        if (thirdMatches.length === 0) {
          events.push(
            createScoringEvent({
              participantId,
              type: 'pending',
              points: 0,
              label: 'Awaiting third-place match',
              description: getTeamLabel(teamId),
              prediction: 'Reaches third-place match',
              actualResult: 'Knockout stage in progress',
              teamId,
              round: 'third',
              timestamp,
            }),
          );
          continue;
        }

        const reached = participants.has(teamId);
        events.push(
          createScoringEvent({
            participantId,
            type: 'knockout_third_reach',
            points: reached ? getPoints(config, 'knockout_third_reach') : 0,
            label: reached ? 'Third-place reach' : 'Missed third-place reach',
            description: getTeamLabel(teamId),
            prediction: 'Reaches third-place match',
            actualResult: reached ? 'Played third-place match' : 'Did not reach third-place match',
            teamId,
            round: 'third',
            timestamp,
          }),
        );
      }

      const winner = thirdMatches.find((m) => m.winnerId)?.winnerId;
      const predictedWinner = pred.advancingTeamIds[pred.advancingTeamIds.length - 1];
      if (predictedWinner && winner) {
        const correct = predictedWinner === winner;
        events.push(
          createScoringEvent({
            participantId,
            type: 'knockout_third_winner',
            points: correct ? getPoints(config, 'knockout_third_winner') : 0,
            label: correct ? 'Third-place winner' : 'Wrong third-place winner',
            description: getTeamLabel(predictedWinner),
            prediction: getTeamLabel(predictedWinner),
            actualResult: getTeamLabel(winner),
            teamId: predictedWinner,
            round: 'third',
            timestamp,
          }),
        );
      }
      continue;
    }

    if (pred.round === 'final') {
      const actualFinalists = new Set<string>();
      for (const m of results.knockout.filter((k) => k.round === 'final')) {
        actualFinalists.add(m.homeTeamId);
        actualFinalists.add(m.awayTeamId);
      }

      for (const teamId of pred.advancingTeamIds) {
        const correct = actualFinalists.has(teamId);
        if (actualFinalists.size) {
          events.push(
            createScoringEvent({
              participantId,
              type: 'finalist',
              points: correct ? getPoints(config, 'finalist') : 0,
              label: correct ? 'Correct finalist' : 'Missed finalist',
              description: getTeamLabel(teamId),
              prediction: 'Reaches final',
              actualResult: correct ? 'Finalist' : 'Did not reach final',
              teamId,
              round: 'final',
              timestamp,
            }),
          );
        }
      }
      continue;
    }

    const eventType = knockoutEventType(pred.round);
    if (!eventType) continue;

    const actualAdvancers = getActualAdvancers(pred.round, results);
    const roundConfig = tournament.knockoutRounds.find((r) => r.round === pred.round);
    const pointsEach = getPoints(config, eventType);

    for (const teamId of pred.advancingTeamIds) {
      if (!actualAdvancers.size) continue;

      if (isInUnplayedRoundMatch(teamId, pred.round, results)) {
        events.push(
          createScoringEvent({
            participantId,
            type: 'pending',
            points: 0,
            label: `Awaiting ${roundConfig?.label ?? pred.round}`,
            description: getTeamLabel(teamId),
            prediction: 'Advances',
            actualResult: 'Knockout stage in progress',
            teamId,
            round: pred.round,
            timestamp,
          }),
        );
        continue;
      }

      const correct = actualAdvancers.has(teamId);
      events.push(
        createScoringEvent({
          participantId,
          type: eventType,
          points: correct ? pointsEach : 0,
          label: correct
            ? `${roundConfig?.label ?? pred.round} correct`
            : `${roundConfig?.label ?? pred.round} missed`,
          description: getTeamLabel(teamId),
          prediction: 'Advances',
          actualResult: correct ? 'Advanced' : 'Eliminated',
          teamId,
          round: pred.round,
          timestamp,
        }),
      );
    }
  }

  if (results.championId) {
    const championPred = predictions.find((p) => p.round === 'final');
    const championPick = championPred?.advancingTeamIds[0];
    if (championPick) {
      const correct = championPick === results.championId;
      events.push(
        createScoringEvent({
          participantId,
          type: 'champion',
          points: correct ? getPoints(config, 'champion') : 0,
          label: correct ? 'Champion' : 'Wrong champion',
          description: getTeamLabel(championPick),
          prediction: getTeamLabel(championPick),
          actualResult: getTeamLabel(results.championId),
          teamId: championPick,
          timestamp,
        }),
      );
    }
  }

  return events;
}
