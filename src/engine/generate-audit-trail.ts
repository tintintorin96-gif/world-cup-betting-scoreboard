import type { AuditTrailEntry, ScoringBreakdown, ScoringEvent, Snapshot } from '../types/scoring';

export function generateAuditTrail(
  breakdowns: ScoringBreakdown[],
  prevBreakdowns: ScoringBreakdown[] | undefined,
  resultsVersion: number,
  timestamp: string,
  reason: 'new_match' | 'result_correction' | 'initial' = 'initial',
): AuditTrailEntry[] {
  const trail: AuditTrailEntry[] = [];
  const prevMap = new Map(
    prevBreakdowns?.map((b) => [b.participantId, eventKeyMap(b.events)]) ?? [],
  );

  for (const breakdown of breakdowns) {
    const prevEvents = prevMap.get(breakdown.participantId) ?? new Map<string, number>();
    const currentMap = eventKeyMap(breakdown.events);

    for (const event of breakdown.events) {
      const key = eventKey(event);
      const prevPoints = prevEvents.get(key);
      const delta = prevPoints === undefined ? event.points : event.points - prevPoints;

      if (prevPoints === undefined && event.points > 0) {
        trail.push({
          timestamp,
          resultsVersion,
          participantId: breakdown.participantId,
          event,
          pointsDelta: event.points,
          reason: prevBreakdowns ? reason : 'initial',
        });
      } else if (prevPoints !== undefined && delta !== 0) {
        trail.push({
          timestamp,
          resultsVersion,
          participantId: breakdown.participantId,
          event,
          pointsDelta: delta,
          reason: 'result_correction',
        });
      }
    }
  }

  return trail;
}

function eventKey(event: ScoringEvent): string {
  return event.id;
}

function eventKeyMap(events: ScoringEvent[]): Map<string, number> {
  return new Map(events.map((e) => [eventKey(e), e.points]));
}

export function shouldCreateSnapshot(
  current: { participantId: string; totalPoints: number }[],
  prev?: Snapshot,
): boolean {
  if (!prev) return true;
  const prevMap = new Map(prev.leaderboard.map((e) => [e.participantId, e.totalPoints]));
  return current.some((e) => prevMap.get(e.participantId) !== e.totalPoints);
}
