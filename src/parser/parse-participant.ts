import { z } from 'zod';
import type { KnockoutRound, TournamentConfig } from '../types/tournament';
import type { Participant, Prediction, PredictionBundle } from '../types/prediction';
import type { TeamRegistry } from '../types/team';
import { resolveTeamId, tryResolveTeamId } from '../normalize/resolve-team';
import { ParseError } from './errors';
import { assertRequiredHeadings, splitByH2 } from './parse-sections';
import {
  getTableColumnIndex,
  normalizeTableHeader,
  parseMarkdownTable,
  parseOrderedList,
} from './parse-tables';

const KNOCKOUT_HEADINGS: Record<string, KnockoutRound> = {
  'round of 32': 'r32',
  'round of 16': 'r16',
  'quarter-finals': 'qf',
  'quarter finals': 'qf',
  'quarterfinals': 'qf',
  'quarter-final': 'qf',
  'semi-finals': 'sf',
  'semi finals': 'sf',
  'semifinals': 'sf',
  'semi-final': 'sf',
  'third-place match': 'third',
  'third place match': 'third',
  'third place': 'third',
  final: 'final',
  champion: 'final',
};

function isHeaderRow(cells: string[]): boolean {
  const joined = cells.map(normalizeTableHeader).join('|');
  return joined.includes('match_id') || joined.includes('pick_home_goals') || /^group\|/.test(joined);
}

function isV3GroupTable(rows: { cells: string[] }[]): boolean {
  const header = rows[0]?.cells ?? [];
  return getTableColumnIndex(header, 'pick_home_goals', 'pick_away_goals') >= 0;
}

function isV3StandingsTable(rows: { cells: string[] }[]): boolean {
  const header = rows[0]?.cells ?? [];
  return (
    getTableColumnIndex(header, 'position') >= 0 &&
    getTableColumnIndex(header, 'team') >= 0 &&
    getTableColumnIndex(header, 'predicted_winner') < 0
  );
}

function isV3WinnersTable(rows: { cells: string[] }[]): boolean {
  const header = rows[0]?.cells ?? [];
  return getTableColumnIndex(header, 'predicted_winner') >= 0;
}

function isV3KnockoutTable(rows: { cells: string[] }[]): boolean {
  const header = rows[0]?.cells ?? [];
  return (
    getTableColumnIndex(header, 'pick_winner') >= 0 &&
    getTableColumnIndex(header, 'team_1') >= 0
  );
}

function parseKnockoutRoundLabel(label: string): KnockoutRound | null {
  const normalized = label.toLowerCase().trim();
  return KNOCKOUT_HEADINGS[normalized] ?? null;
}

function pushGroupMatchPrediction(
  predictions: Prediction['groupMatches'],
  homeRaw: string,
  awayRaw: string,
  pickHome: number,
  pickAway: number,
  filePath: string,
  tournament: TournamentConfig,
  registry: TeamRegistry,
) {
  const matchId = findMatchId(homeRaw, awayRaw, tournament, registry);
  if (!matchId) {
    console.warn(`[warn] Skipping unmapped match in ${filePath}: ${homeRaw} vs ${awayRaw}`);
    return;
  }
  const matchRef = tournament.groupMatches.find((m) => m.matchId === matchId)!;
  const homeId = resolveTeamId(homeRaw, registry);
  const isHomeFirst = matchRef.homeTeamId === homeId;
  predictions.push({
    matchId,
    homeScore: isHomeFirst ? pickHome : pickAway,
    awayScore: isHomeFirst ? pickAway : pickHome,
  });
}

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
): string | null {
  const homeId = tryResolveTeamId(homeRaw, registry);
  const awayId = tryResolveTeamId(awayRaw, registry);
  if (!homeId || !awayId) return null;

  const match = tournament.groupMatches.find(
    (m) =>
      (m.homeTeamId === homeId && m.awayTeamId === awayId) ||
      (m.homeTeamId === awayId && m.awayTeamId === homeId),
  );

  return match?.matchId ?? null;
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

  if (rows.length > 0 && isV3GroupTable(rows)) {
    const header = rows[0].cells;
    const homeIdx = getTableColumnIndex(header, 'home_team');
    const awayIdx = getTableColumnIndex(header, 'away_team');
    const homeGoalsIdx = getTableColumnIndex(header, 'pick_home_goals');
    const awayGoalsIdx = getTableColumnIndex(header, 'pick_away_goals');

    for (const row of rows.slice(1)) {
      if (isHeaderRow(row.cells)) continue;
      const homeRaw = row.cells[homeIdx] ?? '';
      const awayRaw = row.cells[awayIdx] ?? '';
      const pickHome = parseInt(row.cells[homeGoalsIdx] ?? '', 10);
      const pickAway = parseInt(row.cells[awayGoalsIdx] ?? '', 10);
      if (!homeRaw || !awayRaw || Number.isNaN(pickHome) || Number.isNaN(pickAway)) {
        throw new ParseError(`Invalid group match row: ${row.cells.join(' | ')}`, filePath, line);
      }
      pushGroupMatchPrediction(
        predictions,
        homeRaw,
        awayRaw,
        pickHome,
        pickAway,
        filePath,
        tournament,
        registry,
      );
    }
    return predictions;
  }

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
      pushGroupMatchPrediction(
        predictions,
        teams.home,
        teams.away,
        score.home,
        score.away,
        filePath,
        tournament,
        registry,
      );
    }
    return predictions;
  }

  for (const lineText of content.split('\n')) {
    const trimmed = lineText.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const alt = trimmed.match(/^(.+?)\s+(\d+)\s*[-–]\s*(\d+)\s+(.+)$/);
    if (alt) {
      const matchId = findMatchId(alt[1], alt[4], tournament, registry);
      if (!matchId) {
        console.warn(`[warn] Skipping unmapped match in ${filePath}: ${alt[1]} vs ${alt[4]}`);
        continue;
      }
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
  const rows = parseMarkdownTable(content);

  if (rows.length > 0 && isV3StandingsTable(rows)) {
    const header = rows[0].cells;
    const groupIdx = getTableColumnIndex(header, 'group');
    const positionIdx = getTableColumnIndex(header, 'position');
    const teamIdx = getTableColumnIndex(header, 'team');
    const byGroup = new Map<string, Array<{ position: number; teamId: string }>>();

    for (const row of rows.slice(1)) {
      if (isHeaderRow(row.cells)) continue;
      const group = (row.cells[groupIdx] ?? '').trim();
      const position = parseInt(row.cells[positionIdx] ?? '', 10);
      const team = row.cells[teamIdx] ?? '';
      if (!group || Number.isNaN(position) || !team) continue;
      const teamId = tryResolveTeamId(team, registry);
      if (!teamId) {
        console.warn(`[warn] Skipping unknown team in ${filePath} Group ${group}: ${team}`);
        continue;
      }
      const entries = byGroup.get(group) ?? [];
      entries.push({ position, teamId });
      byGroup.set(group, entries);
    }

    for (const [group, entries] of byGroup) {
      if (entries.length < 4) {
        throw new ParseError(`Group ${group} standings need 4 teams`, filePath);
      }
      standings.push({
        group,
        positions: entries.sort((a, b) => a.position - b.position).map((entry) => entry.teamId),
      });
    }

    return standings.sort((a, b) => a.group.localeCompare(b.group));
  }

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
      positions: items.slice(0, 4).flatMap((t) => {
        const id = tryResolveTeamId(t, registry);
        if (!id) console.warn(`[warn] Skipping unknown team in ${filePath} Group ${group}: ${t}`);
        return id ? [id] : [];
      }),
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

  if (rows.length && isV3WinnersTable(rows)) {
    const header = rows[0].cells;
    const groupIdx = getTableColumnIndex(header, 'group');
    const winnerIdx = getTableColumnIndex(header, 'predicted_winner', 'winner');

    for (const row of rows.slice(1)) {
      if (isHeaderRow(row.cells)) continue;
      const group = (row.cells[groupIdx] ?? '').replace(/group\s*/i, '').trim();
      const team = row.cells[winnerIdx] ?? '';
      if (!group || !team) continue;
      const winnerId = tryResolveTeamId(team, registry);
      if (winnerId) winners.push({ group, winnerId });
      else console.warn(`[warn] Skipping unknown group winner in Group ${group}: ${team}`);
    }
    return winners;
  }

  if (rows.length) {
    for (const row of rows) {
      const group = (row.cells[0] ?? '').replace(/group\s*/i, '').trim();
      const team = row.cells[1] ?? '';
      if (/^group$/i.test(group) || /^winner$/i.test(team)) continue;
      if (group && team) {
        const winnerId = tryResolveTeamId(team, registry);
        if (winnerId) winners.push({ group, winnerId });
        else console.warn(`[warn] Skipping unknown group winner in Group ${group}: ${team}`);
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
  let championId: string | undefined;
  const rows = parseMarkdownTable(content);

  if (rows.length > 0 && isV3KnockoutTable(rows)) {
    const header = rows[0].cells;
    const roundIdx = getTableColumnIndex(header, 'round');
    const team1Idx = getTableColumnIndex(header, 'team_1');
    const team2Idx = getTableColumnIndex(header, 'team_2');
    const winnerIdx = getTableColumnIndex(header, 'pick_winner');
    const byRound = new Map<KnockoutRound, string[]>();

    for (const row of rows.slice(1)) {
      if (isHeaderRow(row.cells)) continue;
      const roundLabel = row.cells[roundIdx] ?? '';
      const round = parseKnockoutRoundLabel(roundLabel);
      if (!round) continue;

      const team1Raw = row.cells[team1Idx] ?? '';
      const team2Raw = row.cells[team2Idx] ?? '';
      const pickWinnerRaw = row.cells[winnerIdx] ?? '';
      const team1Id = tryResolveTeamId(team1Raw, registry);
      const team2Id = tryResolveTeamId(team2Raw, registry);
      const pickWinnerId = tryResolveTeamId(pickWinnerRaw, registry);
      if (!pickWinnerId) {
        console.warn(`[warn] Skipping knockout row with unknown winner in ${filePath}: ${pickWinnerRaw}`);
        continue;
      }

      const ids = byRound.get(round) ?? [];

      if (round === 'final') {
        const otherFinalist =
          pickWinnerId === team1Id ? team2Id : pickWinnerId === team2Id ? team1Id : team1Id;
        if (otherFinalist) {
          ids.push(pickWinnerId, otherFinalist);
          championId = pickWinnerId;
        }
      } else if (round === 'third') {
        if (team1Id) ids.push(team1Id);
        if (team2Id && team2Id !== team1Id) ids.push(team2Id);
        ids.push(pickWinnerId);
      } else {
        ids.push(pickWinnerId);
      }

      byRound.set(round, ids);
    }

    for (const [round, advancingTeamIds] of byRound) {
      if (advancingTeamIds.length) {
        knockout.push({ round, advancingTeamIds });
      }
    }

    const finalists = knockout.find((k) => k.round === 'final')?.advancingTeamIds;
    return { knockout, championId, finalists };
  }

  const blocks = content.split(/(?=^###\s+)/im);

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
