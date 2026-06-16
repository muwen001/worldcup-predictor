import type { Team, MatchStage } from '../types';
import { getInitialRating } from './teamRatings';

export interface TeamComparison {
  attackAdvantage: number;
  defenseAdvantage: number;
  formAdvantage: number;
  rankAdvantage: number;
  overallStrengthDiff: number;
  historicalFactor: number;
  squadAdvantage: number; // 阵容完整性优势
  travelAdvantage: number; // 旅途优势（东道主 vs 远道而来）
}

export interface MatchContext {
  stage: MatchStage;
  isHostMatch: boolean;
  homeTeamHost: boolean;
  awayTeamHost: boolean;
  knockoutPressure: number;
  homeTravelFatigue: number; // 0 = 无疲劳, 1 = 最大疲劳
  awayTravelFatigue: number;
}

export function compareTeams(
  home: Team,
  away: Team,
  homeRating?: number,
  awayRating?: number
): TeamComparison {
  const attackAdvantage = home.stats.attackRating - away.stats.attackRating;
  const defenseAdvantage = home.stats.defenseRating - away.stats.defenseRating;
  const formAdvantage = home.stats.recentForm - away.stats.recentForm;
  const rankAdvantage = (away.fifaRank - home.fifaRank) / 100;

  const homeStrength = calculateOverallStrength(home, homeRating);
  const awayStrength = calculateOverallStrength(away, awayRating);
  const overallStrengthDiff = homeStrength - awayStrength;

  const historicalFactor = calculateHistoricalFactor(home, away);
  const squadAdvantage = getKeyPlayersImpact(home) - getKeyPlayersImpact(away);
  const travelAdvantage = calculateTravelFatigue(away) - calculateTravelFatigue(home); // 主队疲劳低 = 优势

  return {
    attackAdvantage,
    defenseAdvantage,
    formAdvantage,
    rankAdvantage,
    overallStrengthDiff,
    historicalFactor,
    squadAdvantage,
    travelAdvantage,
  };
}

export function calculateOverallStrength(team: Team, teamRating?: number): number {
  const rankFactor = (200 - team.fifaRank) / 200;
  const attackFactor = team.stats.attackRating / 100;
  const defenseFactor = team.stats.defenseRating / 100;
  const formFactor = team.stats.recentForm / 100;
  const historyFactor = team.stats.worldCupHistory.titles * 0.05 + team.stats.worldCupHistory.appearances * 0.01;
  const squadFactor = getKeyPlayersImpact(team); // 0.7 ~ 1.0

  const staticStrength =
    rankFactor * 0.30 +
    attackFactor * 0.25 +
    defenseFactor * 0.20 +
    formFactor * 0.15 +
    Math.min(historyFactor, 0.3) * 0.05 +
    squadFactor * 0.05;

  if (teamRating === undefined) return staticStrength;

  const initialRating = getInitialRating(team);
  // 只有当球队已经有足够比赛样本（评分相对初始值有明显变化）时才应用动态修正
  const ratingDelta = Math.abs(teamRating - initialRating);
  if (ratingDelta < 20) return staticStrength;

  // 将 Elo-like 评分（约 800-2000）映射到 0-1 区间；以 0.5 为中心做偏差调整
  const ratingFactor = Math.max(0, Math.min(1, (teamRating - 800) / 1200));
  const dynamicAdjustment = (ratingFactor - 0.5) * 0.25; // 约 ±0.125 的修正幅度

  // 以静态实力为锚点，叠加滚动评分带来的修正。初期样本少时影响有限，后期比赛增多后自然放大。
  return Math.max(0.1, Math.min(1.0, staticStrength + dynamicAdjustment));
}

/**
 * 关键球员可用性影响：90 = 完整阵容，70 = 多名主力伤缺
 * 返回 0.7 ~ 1.0 的阵容强度系数
 */
export function getKeyPlayersImpact(team: Team): number {
  const availability = team.stats.keyPlayersAvailable;
  // 非线性映射：90以上几乎无影响，80以下影响加速
  if (availability >= 90) return 1.0;
  if (availability >= 80) return 0.95;
  if (availability >= 70) return 0.88;
  if (availability >= 60) return 0.78;
  return 0.70;
}

/**
 * 旅途疲劳：2026世界杯跨美加墨三国举办
 * 东道主球队疲劳 = 0，非东道主根据 FIFA 排名区域推测
 * 简化模型：排名高的欧洲/南美球队到北美 = 中等疲劳
 */
export function calculateTravelFatigue(team: Team): number {
  if (team.stats.isHostNation) return 0.0;
  // 高排名球队（欧洲/南美）通常需要更长途旅行
  // 排名低的大洲球队（中北美）旅行距离较短
  if (team.fifaRank <= 30) return 0.12; // 欧洲/南美强队
  if (team.fifaRank <= 60) return 0.08; // 中等球队
  return 0.04; // 附近区域球队
}

export function calculateHistoricalFactor(home: Team, away: Team): number {
  const homeHistory = home.stats.worldCupHistory.titles * 0.3 + home.stats.worldCupHistory.appearances * 0.1;
  const awayHistory = away.stats.worldCupHistory.titles * 0.3 + away.stats.worldCupHistory.appearances * 0.1;
  return Math.max(-0.15, Math.min(0.15, homeHistory - awayHistory));
}

export function analyzeMatchContext(match: { stage: MatchStage; homeTeam: Team; awayTeam: Team }): MatchContext {
  const homeTeamHost = match.homeTeam.stats.isHostNation;
  const awayTeamHost = match.awayTeam.stats.isHostNation;
  const isHostMatch = homeTeamHost || awayTeamHost;

  const knockoutPressure = match.stage === 'final' ? 1.0 :
    match.stage === 'semi' ? 0.9 :
    match.stage === 'quarter' ? 0.75 :
    match.stage === 'round_of_16' ? 0.6 :
    match.stage === 'round_of_32' ? 0.5 : 0.3;

  return {
    stage: match.stage,
    isHostMatch,
    homeTeamHost,
    awayTeamHost,
    knockoutPressure,
    homeTravelFatigue: calculateTravelFatigue(match.homeTeam),
    awayTravelFatigue: calculateTravelFatigue(match.awayTeam),
  };
}

export function calculateHostAdvantage(context: MatchContext): number {
  if (!context.isHostMatch) return 0;
  if (context.homeTeamHost) return 0.08; // 从 0.12 降低到 0.08
  if (context.awayTeamHost) return -0.08; // 从 -0.12 降低到 -0.08
  return 0;
}

/**
 * 淘汰赛90分钟平局概率调整因子
 * 小组赛 = 1.0（无调整）
 * 淘汰赛 = 0.85 ~ 0.95（降低平局概率，因为淘汰赛更倾向分胜负）
 * 但比分预测中保留低比分概率
 */
export function calculateKnockoutDrawFactor(stage: MatchStage): number {
  if (stage === 'group') return 1.0;
  if (stage === 'round_of_32') return 0.95;
  if (stage === 'round_of_16') return 0.92;
  if (stage === 'quarter') return 0.90;
  if (stage === 'semi') return 0.88;
  if (stage === 'final') return 0.85;
  return 1.0;
}

/**
 * 淘汰赛低比分（0-0, 1-0, 0-1, 1-1）概率提升因子
 * 淘汰赛球队更保守，总进球数减少
 */
export function calculateKnockoutLowScoreFactor(stage: MatchStage): number {
  if (stage === 'group') return 1.0;
  if (stage === 'round_of_32') return 1.08;
  if (stage === 'round_of_16') return 1.12;
  if (stage === 'quarter') return 1.15;
  if (stage === 'semi') return 1.18;
  if (stage === 'final') return 1.20;
  return 1.0;
}

export function estimateGoalExpectation(
  team: Team,
  opponent: Team,
  isHome: boolean,
  teamRating?: number,
  opponentRating?: number
): number {
  // 加法模型：避免乘法折扣因子叠加过度压缩lambda值
  // 世界杯场均进球约2.6，主队均值约1.5客队约1.1
  const baseGoals = isHome ? 1.40 : 1.05;

  // 攻击力加成：每10点攻击力(高于50)增加0.15进球，上限0.6
  const attackBonus = Math.max(0, (team.stats.attackRating - 50) / 100 * 0.6);

  // 对手防守压制：每10点防守(高于50)减少0.08进球，上限-0.35
  const defenseSuppression = Math.min(0, -(opponent.stats.defenseRating - 50) / 100 * 0.35);

  // 排名差加成：排名差每10位(强队排名低)增加0.06进球，上限0.4
  const rankDiff = opponent.fifaRank - team.fifaRank;
  const rankBonus = Math.max(-0.2, Math.min(0.4, rankDiff / 100 * 0.4));

  // 近期状态加成：form每10点(高于50)增加0.08进球，上限0.25
  const formBonus = Math.max(0, (team.stats.recentForm - 50) / 100 * 0.25);

  // 阵容完整性：90%以上≈0加成，80%≈-0.05，70%≈-0.12
  const squadImpact = getKeyPlayersImpact(team);
  const squadBonus = (squadImpact - 0.85) * 0.3; // 以0.85为基准，偏移±0.15

  let goals = baseGoals + attackBonus + defenseSuppression + rankBonus + formBonus + squadBonus;

  // 引入滚动评分修正：以双方评分差为信号，但仅当双方都有足够样本时才生效
  if (teamRating !== undefined && opponentRating !== undefined) {
    const teamDelta = Math.abs(teamRating - getInitialRating(team));
    const opponentDelta = Math.abs(opponentRating - getInitialRating(opponent));
    if (teamDelta >= 20 && opponentDelta >= 20) {
      const ratingDiff = teamRating - opponentRating;
      const ratingAdjustment = Math.max(-0.2, Math.min(0.2, ratingDiff / 400 * 0.15));
      goals += ratingAdjustment;
    }
  }

  return Math.max(0.5, Math.min(2.8, goals));
}
