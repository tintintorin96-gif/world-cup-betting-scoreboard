import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import tournamentJson from '../config/tournament.json';
import registryJson from '../data/teams.registry.json';
import type { TournamentConfig } from '../src/types/tournament';
import type { TeamRegistry } from '../src/types/team';
import type { ResultsBundle, Snapshot } from '../src/types';
import { parseRulesFile } from '../src/parser/parse-rules';
import { parseParticipantFile } from '../src/parser/parse-participant';
import {
  calculateFinalScore,
  calculateLeaderboard,
  generateAuditTrail,
  shouldCreateSnapshot,
  computeMaxPossibleScore,
  deriveBreakdownFromEvents,
} from '../src/engine';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUBLIC_DATA = path.join(ROOT, 'public/data');
const VAULT_PARTICIPANTS = path.join(ROOT, 'vault/participants');
const RULES_FILE = path.join(ROOT, 'vault/rules/Mästerskapstips 2026.md');

function ensureDir(dir: string) {
  mkdirSync(dir, { recursive: true });
}

function readJson<T>(filePath: string): T | null {
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
}

function writeJson(filePath: string, data: unknown) {
  ensureDir(path.dirname(filePath));
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function generateGroupMatches(tournament: TournamentConfig, registry: TeamRegistry): TournamentConfig {
  if (tournament.groupMatches.length > 0) return tournament;

  const groups = tournament.groups;
  const groupMatches: TournamentConfig['groupMatches'] = [];

  for (const group of groups) {
    const teams = registry.teams.filter((t) => t.group === group);
    let matchNum = 1;
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        groupMatches.push({
          matchId: `${group}-${matchNum}`,
          group,
          homeSlot: teams[i].id,
          awaySlot: teams[j].id,
          homeTeamId: teams[i].id,
          awayTeamId: teams[j].id,
        });
        matchNum++;
      }
    }
  }

  return { ...tournament, groupMatches };
}

function getDemoResults(tournament: TournamentConfig): ResultsBundle {
  const now = new Date().toISOString();
  const demoFinished = ['A-1', 'G-2'];
  const matches = tournament.groupMatches.map((m) => {
    const isDemo = demoFinished.includes(m.matchId);
    if (m.matchId === 'A-1') {
      return {
        matchId: m.matchId,
        status: 'finished' as const,
        homeTeamId: m.homeTeamId!,
        awayTeamId: m.awayTeamId!,
        homeScore: 2,
        awayScore: 1,
        winnerId: m.homeTeamId,
        updatedAt: now,
        source: 'manual' as const,
      };
    }
    if (m.matchId === 'G-2') {
      return {
        matchId: m.matchId,
        status: 'finished' as const,
        homeTeamId: m.homeTeamId!,
        awayTeamId: m.awayTeamId!,
        homeScore: 1,
        awayScore: 1,
        updatedAt: now,
        source: 'manual' as const,
      };
    }
    return {
      matchId: m.matchId,
      status: 'scheduled' as const,
      homeTeamId: m.homeTeamId!,
      awayTeamId: m.awayTeamId!,
      homeScore: null,
      awayScore: null,
      updatedAt: now,
      source: 'manual' as const,
    };
  });

  return {
    version: 1,
    fetchedAt: now,
    matches,
    groupStandings: [],
    knockout: [],
  };
}

async function main() {
  const registry = registryJson as TeamRegistry;
  let tournament = generateGroupMatches(tournamentJson as TournamentConfig, registry);

  const rulesMarkdown = readFileSync(RULES_FILE, 'utf-8');
  const { config: scoringConfig, warnings } = parseRulesFile(rulesMarkdown);
  warnings.forEach((w) => console.warn(`[warn] ${w}`));

  const maxComputed = computeMaxPossibleScore(scoringConfig, tournament);
  if (maxComputed !== scoringConfig.maxPoints) {
    console.warn(
      `[warn] Max points mismatch: config=${scoringConfig.maxPoints}, computed=${maxComputed}`,
    );
  }

  const participantFiles = readdirSync(VAULT_PARTICIPANTS).filter((f) => f.endsWith('.md'));
  const bundles = participantFiles.map((file) => {
    const filePath = path.join(VAULT_PARTICIPANTS, file);
    const markdown = readFileSync(filePath, 'utf-8');
    return parseParticipantFile(markdown, filePath, tournament, registry);
  });

  let results =
    readJson<ResultsBundle>(path.join(PUBLIC_DATA, 'results.json')) ??
    getDemoResults(tournament);

  if (!results.matches.length) {
    results = getDemoResults(tournament);
  }

  const prevSnapshots = existsSync(path.join(PUBLIC_DATA, 'snapshots'))
    ? readdirSync(path.join(PUBLIC_DATA, 'snapshots'))
        .filter((f) => f.endsWith('.json') && f !== 'index.json')
        .sort()
    : [];

  const prevSnapshot = prevSnapshots.length
    ? readJson<Snapshot>(path.join(PUBLIC_DATA, 'snapshots', prevSnapshots[prevSnapshots.length - 1]))
    : undefined;

  const breakdowns = bundles.map((b) => {
    const breakdown = calculateFinalScore(b.prediction, results, scoringConfig, tournament, registry);
    const derived = deriveBreakdownFromEvents(breakdown.participantId, breakdown.events);
    if (derived.totalPoints !== breakdown.totalPoints) {
      throw new Error(
        `Audit integrity failed for ${breakdown.participantId}: stored=${breakdown.totalPoints} derived=${derived.totalPoints}`,
      );
    }
    return breakdown;
  });

  const leaderboard = calculateLeaderboard(bundles, breakdowns, scoringConfig, prevSnapshot);

  const auditTrail = generateAuditTrail(
    breakdowns,
    undefined,
    results.version,
    results.fetchedAt,
    prevSnapshot ? 'new_match' : 'initial',
  );

  ensureDir(PUBLIC_DATA);
  ensureDir(path.join(PUBLIC_DATA, 'breakdowns'));
  ensureDir(path.join(PUBLIC_DATA, 'snapshots'));

  writeJson(path.join(PUBLIC_DATA, 'teams.json'), registry);
  writeJson(path.join(PUBLIC_DATA, 'predictions.json'), bundles);
  writeJson(path.join(PUBLIC_DATA, 'results.json'), results);
  writeJson(path.join(PUBLIC_DATA, 'leaderboard.json'), leaderboard);
  writeJson(path.join(PUBLIC_DATA, 'tournament.json'), tournament);
  writeJson(path.join(PUBLIC_DATA, 'meta.json'), {
    appName: 'World Cup Betting Scoreboard',
    version: results.version,
    resultsVersion: results.version,
    lastUpdated: new Date().toISOString(),
    participantCount: bundles.length,
    maxPoints: scoringConfig.maxPoints,
    degraded: false,
  });

  for (const breakdown of breakdowns) {
    writeJson(path.join(PUBLIC_DATA, 'breakdowns', `${breakdown.participantId}.json`), breakdown);
  }

  if (shouldCreateSnapshot(leaderboard, prevSnapshot)) {
    const snapshot: Snapshot = {
      timestamp: new Date().toISOString(),
      resultsVersion: results.version,
      leaderboard,
    };
    const filename = `${snapshot.timestamp.replace(/[:.]/g, '-')}.json`;
    writeJson(path.join(PUBLIC_DATA, 'snapshots', filename), snapshot);
  }

  const allSnapshots = existsSync(path.join(PUBLIC_DATA, 'snapshots'))
    ? readdirSync(path.join(PUBLIC_DATA, 'snapshots')).filter((f) => f.endsWith('.json') && f !== 'index.json')
    : [];
  writeJson(path.join(PUBLIC_DATA, 'snapshots/index.json'), allSnapshots.sort());

  if (auditTrail.length) {
    writeJson(path.join(PUBLIC_DATA, 'audit-trail.json'), auditTrail);
  }

  console.log(
    `Scoreboard data built: ${bundles.length} participants, ${leaderboard.length} leaderboard entries`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
