import { z } from 'zod';
import type { KnockoutRound, TournamentConfig } from '../types/tournament';
import type { Participant, Prediction, PredictionBundle } from '../types/prediction';
import type { TeamRegistry } from '../types/team';
import { resolveTeamId } from '../normalize/resolve-team';
import { ParseError } from './errors';
import { assertRequiredHeadings, splitByH2 } from './parse-sections';
import { parseMarkdownTable, parseOrderedList } from './parse-tables';

const KNOCKOUT_HEADINGS: Record<string, KnockoutRound> = {
  'round of 32': 'r32',
  'round of 16': 'r16',
  'quarter-finals': 'qf',
  'quarter finals': 'qf',
  'quarterfinals': 'qf',
  'semi-finals': 'sf',
  'semi finals': 'sf',
  'semifinals': 'sf',
  'third-place match': 'third',
  'third place match': 'third',
  'third place': 'third',
  final: 'final',
  champion: 'final',
};

const PredictionSchema = z.object({
  participantId: z.string(),
  groupMatches: z.array(
    z.object({ matchId: z.string(), homeScore: z.number().int().min(0), awayScore: z.number().int().min(0) }),
  ),
  groupStandings: z.array(
    z.object({ group: z.string(), positions: z.array(z.string()).min(4).max(4) }),
  ),
  groupWinners: z.array(z.object({ group: z.string(), winnerId: z.string() })),
  knockout: z.array(
    z.object({ round: z.string(), advancingTeamIds: z.array(z.string()) }),
  ),
  championId: z.string().optional(),
  finalists: z.array(z.string()).optional(),
});

export function slugifyParticipantId(filename: string): string {
  return filename
    .replace(/\.md$/i, '')
    .toLowerCase()
    .replace(/&/g, '-and-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseScore(scoreStr: string): { home: number; away: number } | null {
  const m = scoreStr.trim().match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (!m) return null;
  return { home: parseInt(m[1], 10), away: parseInt(m[2], 10) };
}

function parseMatchTeams(matchStr: string): { home: string; away: string } | null {
  const vsMatch = matchStr.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
  if (vsMatch) return { home: vsMatch[1].trim(), away: vsMatch[2].trim() };

  const scoreMatch = matchStr.match(/^(.+?)\s+(\d+)\s*[-–]\s*(\d+)\s+(.+)$/);
  if (scoreMatch) return { home: scoreMatch[1].trim(), away: scoreMatch[4].trim() };

  return null;
}

function findMatchId(
  homeRaw: string,
  awayRaw: string,
  tournament: TournamentConfig,
  registry: TeamRegistry,
): string {
  const homeId = resolveTeamId(homeRaw, registry);
  const awayId = resolveTeamId(awayRaw, registry);

  const match = tournament.groupMatches.find(
    (m) =>
      (m.homeTeamId === homeId && m.awayTeamId === awayId) ||
      (m.homeTeamId === awayId && m.awayTeamId === homeId),
  );

  if (!match) {
    throw new ParseError(
      `No tournament match found for ${homeRaw} vs ${awayRaw}`,
      'tournament',
    );
  }
  return match.matchId;
}

function parseGroupStage(
  content: string,
  filePath: string,
  line: number,
  tournament: TournamentConfig,
  registry: TeamRegistry,
) {
  const predictions: Prediction['groupMatches'] = [];
  const rows = parseMarkdownTable(content);

  if (rows.length > 0) {
    for (const row of rows) {
      const matchCol = row.cells[0] ?? '';
      const scoreCol = row.cells[1] ?? row.cells[row.cells.length - 1];
      if (/^match$/i.test(matchCol) || /^prediction$/i.test(scoreCol)) continue;
      const teams = parseMatchTeams(matchCol);
      const score = parseScore(scoreCol);
      if (!teams || !score) {
        throw new ParseError(`Invalid group match row: ${row.cells.join(' | ')}`, filePath, line);
      }
      const matchId = findMatchId(teams.home, teams.away, tournament, registry);
      const matchRef = tournament.groupMatches.find((m) => m.matchId === matchId)!;
      const homeId = resolveTeamId(teams.home, registry);
      const isHomeFirst = matchRef.homeTeamId === homeId;
      predictions.push({
        matchId,
        homeScore: isHomeFirst ? score.home : score.away,
        awayScore: isHomeFirst ? score.away : score.home,
      });
    }
    return predictions;
  }

  for (const lineText of content.split('\n')) {
    const trimmed = lineText.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const alt = trimmed.match(/^(.+?)\s+(\d+)\s*[-–]\s*(\d+)\s+(.+)$/);
    if (alt) {
      const matchId = findMatchId(alt[1], alt[4], tournament, registry);
      const matchRef = tournament.groupMatches.find((m) => m.matchId === matchId)!;
      const homeId = resolveTeamId(alt[1], registry);
      const isHomeFirst = matchRef.homeTeamId === homeId;
      predictions.push({
        matchId,
        homeScore: isHomeFirst ? parseInt(alt[2], 10) : parseInt(alt[3], 10),
        awayScore: isHomeFirst ? parseInt(alt[3], 10) : parseInt(alt[2], 10),
      });
    }
  }

  return predictions;
}

function parseStandings(content: string, filePath: string, registry: TeamRegistry) {
  const standings: Prediction['groupStandings'] = [];
  const blocks = content.split(/(?=^###\s+Group\s+)/im);

  for (const block of blocks) {
    const header = block.match(/^###\s+Group\s+([A-L])/im);
    if (!header) continue;
    const group = header[1];
    const items = parseOrderedList(block);
    if (items.length < 4) {
      throw new ParseError(`Group ${group} standings need 4 teams`, filePath);
    }
    standings.push({
      group,
      positions: items.slice(0, 4).map((t) => resolveTeamId(t, registry)),
    });
  }

  if (!standings.length) {
    const inline = content.matchAll(/Group\s+([A-L]):\s*(.+)/gi);
    for (const m of inline) {
      const teams = m[2].split(/[,>]/).map((t) => t.trim()).filter(Boolean);
      standings.push({
        group: m[1],
        positions: teams.map((t) => resolveTeamId(t, registry)),
      });
    }
  }

  return standings;
}

function parseWinners(content: string, registry: TeamRegistry) {
  const winners: Prediction['groupWinners'] = [];
  const rows = parseMarkdownTable(content);

  if (rows.length) {
    for (const row of rows) {
      const group = (row.cells[0] ?? '').replace(/group\s*/i, '').trim();
      const team = row.cells[1] ?? '';
      if (/^group$/i.test(group) || /^winner$/i.test(team)) continue;
      if (group && team) {
        winners.push({ group, winnerId: resolveTeamId(team, registry) });
      }
    }
    return winners;
  }

  const patterns = content.matchAll(/Group\s+([A-L]):\s*(.+)/gi);
  for (const m of patterns) {
    winners.push({ group: m[1], winnerId: resolveTeamId(m[2].trim(), registry) });
  }

  return winners;
}

function parseKnockout(content: string, filePath: string, registry: TeamRegistry) {
  const knockout: Prediction['knockout'] = [];
  const blocks = content.split(/(?=^###\s+)/im);
  let championId: string | undefined;

  for (const block of blocks) {
    const header = block.match(/^###\s+(.+?)\s*$/im);
    if (!header) continue;
    const label = header[1].toLowerCase().trim();
    const round = KNOCKOUT_HEADINGS[label];
    if (!round) continue;

    const teams: string[] = [];
    const listItems = parseOrderedList(block);
    teams.push(...listItems);

    const lines = block.split('\n').slice(1);
    for (const line of lines) {
      const trimmed = line.replace(/^[-*]\s+/, '').trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.match(/^\d+\./)) {
        teams.push(trimmed);
      }
    }

    const ids = teams
      .filter((t) => t.length > 0)
      .map((t) => resolveTeamId(t, registry));

    if (label === 'champion' && ids.length) {
      championId = ids[0];
    }

    if (ids.length) {
      knockout.push({ round, advancingTeamIds: ids });
    }
  }

  const finalists = knockout.find((k) => k.round === 'final')?.advancingTeamIds;

  return { knockout, championId, finalists };
}

export function parseParticipantFile(
  markdown: string,
  filePath: string,
  tournament: TournamentConfig,
  registry: TeamRegistry,
): PredictionBundle {
  const participantId = slugifyParticipantId(filePath.split('/').pop() ?? filePath);
  const displayName = (filePath.split('/').pop() ?? filePath).replace(/\.md$/i, '');

  const participant: Participant = { id: participantId, displayName, filePath };
  const sections = splitByH2(markdown);
  assertRequiredHeadings(sections, filePath);

  const groupSection = sections.get('Group Stage Predictions')!;
  const standingsSection = sections.get('Predicted Group Standings')!;
  const winnersSection = sections.get('Predicted Group Winners')!;
  const knockoutSection = sections.get('Knockout Predictions')!;

  const groupMatches = parseGroupStage(
    groupSection.content,
    filePath,
    groupSection.line,
    tournament,
    registry,
  );
  const groupStandings = parseStandings(standingsSection.content, filePath, registry);
  const groupWinners = parseWinners(winnersSection.content, registry);
  const { knockout, championId, finalists } = parseKnockout(
    knockoutSection.content,
    filePath,
    registry,
  );

  const raw = {
    participantId,
    groupMatches,
    groupStandings,
    groupWinners,
    knockout,
    championId,
    finalists,
  };

  const validated = PredictionSchema.safeParse(raw);
  if (!validated.success) {
    throw new ParseError(
      `Validation failed: ${validated.error.message}`,
      filePath,
    );
  }

  const prediction: Prediction = {
    participantId,
    groupMatches,
    groupStandings,
    groupWinners,
    knockout,
    championId,
    finalists,
  };

  return { participant, prediction };
}
