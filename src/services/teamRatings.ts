import type { Match, Team } from '../types';

/**
 * 球队实时实力分（Elo-like 滚动评分）
 *
 * 设计思路：
 * 1. 以 FIFA 排名为初始值映射到 Elo 区间（约 1000-2000）
 * 2. 每场比赛结束后按 Elo 公式更新双方评分
 * 3. 考虑净胜球放大 K 值，让大比分胜负产生更强信号
 * 4. 预测时混合静态 FIFA 实力和动态评分，避免初期样本过少时剧烈抖动
 */

export type TeamRatings = Record<string, number>;

const K_BASE = 32;
const GOAL_DIFF_WEIGHT = 0.15;

/**
 * 将 FIFA 排名映射为初始 Elo 分数。
 * 排名 1 ≈ 2000，排名 50 ≈ 1500，排名 100 ≈ 1000。
 */
export function getInitialRating(team: Team): number {
  return Math.max(800, 2000 - team.fifaRank * 12);
}

export function initializeRatings(teams: Team[]): TeamRatings {
  const ratings: TeamRatings = {};
  for (const team of teams) {
    ratings[team.id] = getInitialRating(team);
  }
  return ratings;
}

export function getRating(ratings: TeamRatings, team: Team): number {
  return ratings[team.id] ?? getInitialRating(team);
}

/**
 * 基于已结束比赛按时间顺序重新计算实时评分。
 * 每次调用都幂等：给定相同的已结束比赛序列，得到相同结果。
 */
export function calculateRatings(finishedMatches: Match[]): TeamRatings {
  const ratings: TeamRatings = {};

  // 初始化所有参赛球队
  const teams = new Map<string, Team>();
  for (const match of finishedMatches) {
    teams.set(match.homeTeam.id, match.homeTeam);
    teams.set(match.awayTeam.id, match.awayTeam);
  }
  for (const team of teams.values()) {
    ratings[team.id] = getInitialRating(team);
  }

  // 按日期、时间排序，确保更新顺序一致
  const sorted = [...finishedMatches].sort((a, b) => {
    const dtA = new Date(a.date + 'T' + a.time + 'Z').getTime();
    const dtB = new Date(b.date + 'T' + b.time + 'Z').getTime();
    return dtA - dtB;
  });

  for (const match of sorted) {
    const homeId = match.homeTeam.id;
    const awayId = match.awayTeam.id;
    const homeRating = ratings[homeId] ?? getInitialRating(match.homeTeam);
    const awayRating = ratings[awayId] ?? getInitialRating(match.awayTeam);

    const expectedHome = 1 / (1 + Math.pow(10, (awayRating - homeRating) / 400));
    const expectedAway = 1 - expectedHome;

    let actualHome: number;
    if (match.result === 'home') actualHome = 1;
    else if (match.result === 'draw') actualHome = 0.5;
    else actualHome = 0;
    const actualAway = 1 - actualHome;

    const goalDiff = Math.abs((match.score?.home ?? 0) - (match.score?.away ?? 0));
    const k = K_BASE * (1 + goalDiff * GOAL_DIFF_WEIGHT);

    ratings[homeId] = homeRating + k * (actualHome - expectedHome);
    ratings[awayId] = awayRating + k * (actualAway - expectedAway);
  }

  return ratings;
}

const RATING_CACHE_KEY = 'worldcup_team_ratings_v1';

export function loadRatingsFromCache(): TeamRatings | null {
  try {
    const raw = localStorage.getItem(RATING_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TeamRatings;
  } catch {
    return null;
  }
}

export function saveRatingsToCache(ratings: TeamRatings): void {
  try {
    localStorage.setItem(RATING_CACHE_KEY, JSON.stringify(ratings));
  } catch {
    // ignore storage errors
  }
}

export function clearRatingsCache(): void {
  try {
    localStorage.removeItem(RATING_CACHE_KEY);
  } catch {
    // ignore
  }
}
