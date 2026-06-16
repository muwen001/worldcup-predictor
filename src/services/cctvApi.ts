import type { Match, MatchResult, MatchStatus, Team } from '../types';
import { TEAMS, getAllMatches } from './staticData';

const CCTV_API_URL = 'https://cbs-i.sports.cctv.com/cache/f26a37123b56df9205cf3948f7a3e316';

interface CctvMatch {
  id: number;
  homeId: number;
  guestId: number;
  homeName: string;
  guestName: string;
  gameName: string;
  startTime: string;
  endTime: string;
  gameStatus: number;
  statusDesc: string;
  homeScore: number;
  guestScore: number;
  homeHalfScore: number;
  guestHalfScore: number;
  roundType: string;
  gameRound: string;
  scores: Record<string, { team1: number; team2: number }>;
}

// Build team lookup by Chinese name (CCTV uses Chinese names like 墨西哥, 南非)
const teamByNameCn = new Map<string, Team>();
for (const t of TEAMS) {
  teamByNameCn.set(t.nameCn, t);
}

// Name normalization: CCTV uses slightly different names for some teams
const NAME_ALIASES: Record<string, string> = {
  '刚果（金）': '刚果民主',
  '韩国': '韩国',
};

function resolveTeam(cctvName: string): Team | undefined {
  const alias = NAME_ALIASES[cctvName];
  if (alias) return teamByNameCn.get(alias);
  return teamByNameCn.get(cctvName);
}

// 直接使用CCTV的北京时间日期和时间（中国用户看北京时间）
function parseCctvTime(startTime: string): { date: string; time: string } {
  // startTime format: "2026-06-12 03:00:00"
  const date = startTime.slice(0, 10); // YYYY-MM-DD
  const time = startTime.slice(11, 16); // HH:MM
  return { date, time };
}

function mapStatus(gameStatus: number): MatchStatus {
  if (gameStatus === 3) return 'finished';
  if (gameStatus === 2) return 'live';
  return 'upcoming';
}

function mapResult(homeScore: number, guestScore: number): MatchResult {
  if (homeScore > guestScore) return 'home';
  if (homeScore < guestScore) return 'away';
  return 'draw';
}

function mapRoundType(roundType: string): string | undefined {
  // "A组" → "A", "B组" → "B", etc.
  const match = roundType.match(/([A-L])组/);
  return match ? match[1] : undefined;
}

export interface CctvFetchResult {
  matches: Match[];
  errors: string[];
  connected: boolean;
}

export async function fetchCctvMatches(): Promise<CctvFetchResult> {
  const errors: string[] = [];
  const matches: Match[] = [];
  let connected = false;

  try {
    const response = await fetch(CCTV_API_URL);
    if (!response.ok) {
      errors.push(`CCTV API HTTP ${response.status}`);
      return { matches, errors, connected };
    }

    const data = await response.json();
    if (!data.success || !data.results) {
      errors.push('CCTV API returned unsuccessful response');
      return { matches, errors, connected };
    }

    connected = true;
    const cctvMatches: CctvMatch[] = data.results;

    // Get static matches for odds data and match ID mapping
    const staticMatches = getAllMatches();

    for (const cctv of cctvMatches) {
      const homeTeam = resolveTeam(cctv.homeName);
      const awayTeam = resolveTeam(cctv.guestName);

      if (!homeTeam || !awayTeam) {
        errors.push(`Unknown team: ${cctv.homeName} or ${cctv.guestName}`);
        continue;
      }

      const { date, time } = parseCctvTime(cctv.startTime);
      const status = mapStatus(cctv.gameStatus);
      const group = mapRoundType(cctv.roundType);

      // Find corresponding static match for odds and consistent ID
      // Static data uses ET dates, CCTV uses BJ dates, so match by teams only (not date)
      const staticMatch = staticMatches.find(
        m => m.homeTeam.id === homeTeam.id &&
             m.awayTeam.id === awayTeam.id
      );

      const matchId = staticMatch?.id || `cctv_${cctv.id}`;

      const score = (status === 'finished' || status === 'live')
        ? { home: cctv.homeScore, away: cctv.guestScore }
        : undefined;

      const result = score
        ? mapResult(score.home, score.away)
        : undefined;

      matches.push({
        id: matchId,
        homeTeam,
        awayTeam,
        date,
        time,
        stage: 'group',
        group,
        odds: staticMatch?.odds || [],
        status,
        result,
        score,
      });
    }
  } catch (err) {
    errors.push(`CCTV fetch error: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { matches, errors, connected };
}
