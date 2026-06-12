import type { Odds, MatchResult, ScorePrediction, Team, MatchStage } from '../types';
import {
  compareTeams,
  analyzeMatchContext,
  calculateHostAdvantage,
  calculateKnockoutDrawFactor,
  estimateGoalExpectation,
  type TeamComparison,
} from '../services/teamAnalytics';

/**
 * 将赔率转换为隐含概率
 */
export function oddsToProbability(odds: number): number {
  return 1 / odds;
}

/**
 * 计算庄家利润率
 */
export function calculateBookmakerMargin(homeWin: number, draw: number, awayWin: number): number {
  return oddsToProbability(homeWin) + oddsToProbability(draw) + oddsToProbability(awayWin) - 1;
}

/**
 * 计算归一化概率（去除庄家利润）
 */
export function calculateNormalizedProbabilities(homeWin: number, draw: number, awayWin: number) {
  const margin = calculateBookmakerMargin(homeWin, draw, awayWin);
  const total = 1 + margin;

  return {
    home: oddsToProbability(homeWin) / total,
    draw: oddsToProbability(draw) / total,
    away: oddsToProbability(awayWin) / total,
  };
}

/**
 * 计算多家博彩公司的加权平均概率
 */
export function calculateWeightedProbabilities(oddsList: Odds[]) {
  const weights: Record<string, number> = {
    bet365: 0.35,
    williamhill: 0.35,
    betfair: 0.30,
  };

  let totalWeight = 0;
  const weightedSum = { home: 0, draw: 0, away: 0 };

  oddsList.forEach((odds) => {
    const weight = weights[odds.source] || 0.25;
    const probs = calculateNormalizedProbabilities(odds.homeWin, odds.draw, odds.awayWin);

    weightedSum.home += probs.home * weight;
    weightedSum.draw += probs.draw * weight;
    weightedSum.away += probs.away * weight;
    totalWeight += weight;
  });

  return {
    home: weightedSum.home / totalWeight,
    draw: weightedSum.draw / totalWeight,
    away: weightedSum.away / totalWeight,
  };
}

/**
 * 增强概率计算：综合赔率 + 球队实力 + 淘汰赛因素 + 主客场优势
 */
export function calculateEnhancedProbabilities(
  oddsList: Odds[],
  homeTeam: Team,
  awayTeam: Team,
  stage: MatchStage
): { home: number; draw: number; away: number } {
  const oddsProbs = calculateWeightedProbabilities(oddsList);
  const comparison = compareTeams(homeTeam, awayTeam);
  const context = analyzeMatchContext({ stage, homeTeam, awayTeam });

  const strengthProb = calculateStrengthBasedProbabilities(comparison);
  const hostAdvantage = calculateHostAdvantage(context);
  const knockoutDrawFactor = calculateKnockoutDrawFactor(stage);

  const oddsWeight = 0.55;
  const strengthWeight = 0.35;
  const formWeight = 0.10;

  let homeProb = oddsProbs.home * oddsWeight + strengthProb.home * strengthWeight + (comparison.formAdvantage > 0 ? 0.03 : -0.01) * formWeight;
  let awayProb = oddsProbs.away * oddsWeight + strengthProb.away * strengthWeight + (comparison.formAdvantage < 0 ? 0.03 : -0.01) * formWeight;
  let drawProb = oddsProbs.draw * oddsWeight + strengthProb.draw * strengthWeight;

  drawProb *= knockoutDrawFactor;

  if (hostAdvantage !== 0) {
    if (hostAdvantage > 0) {
      homeProb += hostAdvantage;
      awayProb -= hostAdvantage * 0.3;
      drawProb -= hostAdvantage * 0.7;
    } else {
      awayProb += Math.abs(hostAdvantage);
      homeProb -= Math.abs(hostAdvantage) * 0.3;
      drawProb -= Math.abs(hostAdvantage) * 0.7;
    }
  }

  const total = homeProb + drawProb + awayProb;
  return {
    home: Math.max(0.05, Math.min(0.85, homeProb / total)),
    draw: Math.max(0.05, Math.min(0.40, drawProb / total)),
    away: Math.max(0.05, Math.min(0.85, awayProb / total)),
  };
}

function calculateStrengthBasedProbabilities(comparison: TeamComparison): { home: number; draw: number; away: number } {
  const strengthDiff = comparison.overallStrengthDiff;

  const homeBase = 0.4 + strengthDiff * 0.5;
  const awayBase = 0.4 - strengthDiff * 0.5;
  const drawBase = 0.2 - Math.abs(strengthDiff) * 0.15;

  return {
    home: Math.max(0.1, Math.min(0.7, homeBase)),
    draw: Math.max(0.15, Math.min(0.35, drawBase)),
    away: Math.max(0.1, Math.min(0.7, awayBase)),
  };
}

/**
 * 计算赔率变化趋势
 */
export function calculateOddsTrend(odds: Odds): { home: number; draw: number; away: number } {
  const history = odds.history;
  if (history.length < 2) return { home: 0, draw: 0, away: 0 };

  const first = history[0];
  const last = history[history.length - 1];

  return {
    home: (last.homeWin - first.homeWin) / first.homeWin,
    draw: (last.draw - first.draw) / first.draw,
    away: (last.awayWin - first.awayWin) / first.awayWin,
  };
}

/**
 * 计算预测置信度
 */
export function calculateConfidence(
  probabilities: { home: number; draw: number; away: number },
  oddsList: Odds[]
): number {
  const maxProb = Math.max(probabilities.home, probabilities.draw, probabilities.away);
  const minProb = Math.min(probabilities.home, probabilities.draw, probabilities.away);
  const concentration = (maxProb - minProb) * 100;

  let consistency = 0;
  const predictions = oddsList.map((odds) => {
    const probs = calculateNormalizedProbabilities(odds.homeWin, odds.draw, odds.awayWin);
    if (probs.home > probs.draw && probs.home > probs.away) return 'home';
    if (probs.away > probs.draw && probs.away > probs.home) return 'away';
    return 'draw';
  });

  const majorityPrediction = predictions.filter((p) => p === predictions[0]).length;
  consistency = (majorityPrediction / predictions.length) * 100;

  let stability = 100;
  oddsList.forEach((odds) => {
    const trend = calculateOddsTrend(odds);
    const avgTrend = (Math.abs(trend.home) + Math.abs(trend.draw) + Math.abs(trend.away)) / 3;
    stability -= avgTrend * 50;
  });
  stability = Math.max(0, stability);

  return Math.round((concentration * 0.4 + consistency * 0.35 + stability * 0.25) * 10) / 10;
}

/**
 * 生成预测理由
 */
export function generateReasoning(
  probabilities: { home: number; draw: number; away: number },
  oddsList: Odds[],
  predictedOutcome: MatchResult
): string[] {
  const reasons: string[] = [];
  const maxProb = Math.max(probabilities.home, probabilities.draw, probabilities.away);

  if (maxProb > 0.5) {
    reasons.push(`概率优势明显（${(maxProb * 100).toFixed(1)}%），市场高度看好此结果`);
  } else if (maxProb > 0.4) {
    reasons.push(`概率相对领先（${(maxProb * 100).toFixed(1)}%），市场倾向此结果`);
  } else {
    reasons.push(`概率较为接近，但仍有微弱优势（${(maxProb * 100).toFixed(1)}%）`);
  }

  const avgTrend = { home: 0, draw: 0, away: 0 };
  oddsList.forEach((odds) => {
    const trend = calculateOddsTrend(odds);
    avgTrend.home += trend.home;
    avgTrend.draw += trend.draw;
    avgTrend.away += trend.away;
  });
  avgTrend.home /= oddsList.length;
  avgTrend.draw /= oddsList.length;
  avgTrend.away /= oddsList.length;

  const trendMap = { home: avgTrend.home, draw: avgTrend.draw, away: avgTrend.away };
  const trend = trendMap[predictedOutcome];

  if (trend < -0.05) {
    reasons.push('近期赔率持续下降，市场信心增强');
  } else if (trend > 0.05) {
    reasons.push('近期赔率有所上升，需关注市场变化');
  } else {
    reasons.push('近期赔率相对稳定，市场预期一致');
  }

  const predictions = oddsList.map((odds) => {
    const probs = calculateNormalizedProbabilities(odds.homeWin, odds.draw, odds.awayWin);
    if (probs.home > probs.draw && probs.home > probs.away) return 'home';
    if (probs.away > probs.draw && probs.away > probs.home) return 'away';
    return 'draw';
  });

  const majorityCount = predictions.filter((p) => p === predictedOutcome).length;
  if (majorityCount === oddsList.length) {
    reasons.push('所有主流博彩公司一致看好此结果');
  } else if (majorityCount >= oddsList.length * 0.75) {
    reasons.push('多数主流博彩公司倾向此结果');
  }

  return reasons;
}

// =============================================================================
// 比分预测：基于泊松分布和赔率隐含概率
// =============================================================================

/**
 * 泊松分布概率 P(X = k) = (λ^k * e^(-λ)) / k!
 */
function poissonProbability(lambda: number, k: number): number {
  if (k < 0) return 0;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

/**
 * 计算预期进球期望值（基于概率和排名差异）
 */
export function calculateExpectedGoals(
  probabilities: { home: number; draw: number; away: number },
  homeRank: number,
  awayRank: number
): { home: number; away: number } {
  const baseHomeGoals = 1.4;
  const baseAwayGoals = 1.1;

  const rankDiff = awayRank - homeRank;
  const rankFactor = Math.max(-0.5, Math.min(0.5, rankDiff * 0.015));

  const probDiff = probabilities.home - probabilities.away;
  const probFactor = Math.max(-0.5, Math.min(0.5, probDiff * 1.2));

  const drawFactor = (0.33 - probabilities.draw) * 0.4;

  const homeExpected = Math.max(0.3, baseHomeGoals + rankFactor + probFactor + drawFactor);
  const awayExpected = Math.max(0.3, baseAwayGoals - rankFactor - probFactor + drawFactor);

  return {
    home: Math.round(homeExpected * 100) / 100,
    away: Math.round(awayExpected * 100) / 100,
  };
}

/**
 * 增强预期进球计算：基于球队进攻/防守能力
 */
export function calculateEnhancedExpectedGoals(
  homeTeam: Team,
  awayTeam: Team,
  probabilities: { home: number; draw: number; away: number }
): { home: number; away: number } {
  const homeGoals = estimateGoalExpectation(homeTeam, awayTeam, true);
  const awayGoals = estimateGoalExpectation(awayTeam, homeTeam, false);

  const probAdjustment = (probabilities.home - probabilities.away) * 0.15;
  const drawAdjustment = (0.28 - probabilities.draw) * 0.08;

  const adjustedHome = Math.max(0.3, Math.min(3.0, homeGoals + probAdjustment + drawAdjustment));
  const adjustedAway = Math.max(0.3, Math.min(3.0, awayGoals - probAdjustment + drawAdjustment));

  return {
    home: Math.round(adjustedHome * 100) / 100,
    away: Math.round(adjustedAway * 100) / 100,
  };
}

/**
 * 增强比分预测：基于球队实力
 */
export function calculateEnhancedScorePredictions(
  probabilities: { home: number; draw: number; away: number },
  homeTeam: Team,
  awayTeam: Team,
  stage: MatchStage
): ScorePrediction[] {
  const expectedGoals = calculateEnhancedExpectedGoals(homeTeam, awayTeam, probabilities);
  const lambdaHome = expectedGoals.home;
  const lambdaAway = expectedGoals.away;

  const scores: ScorePrediction[] = [];

  for (let h = 0; h <= 5; h++) {
    for (let a = 0; a <= 5; a++) {
      const prob = poissonProbability(lambdaHome, h) * poissonProbability(lambdaAway, a);

      if (stage !== 'group' && h === a) {
        const knockoutDrawBoost = calculateKnockoutDrawFactor(stage);
        scores.push({
          homeScore: h,
          awayScore: a,
          probability: prob * knockoutDrawBoost,
          isMostLikely: false,
        });
      } else {
        scores.push({
          homeScore: h,
          awayScore: a,
          probability: prob,
          isMostLikely: false,
        });
      }
    }
  }

  scores.sort((a, b) => b.probability - a.probability);
  const top5 = scores.slice(0, 5);

  if (top5.length > 0) top5[0].isMostLikely = true;

  return top5.map((s) => ({
    ...s,
    probability: Math.round(s.probability * 1000) / 10,
  }));
}

/**
 * 增强置信度计算：考虑球队实力差异
 */
export function calculateEnhancedConfidence(
  probabilities: { home: number; draw: number; away: number },
  oddsList: Odds[],
  homeTeam: Team,
  awayTeam: Team,
  stage: MatchStage
): number {
  const maxProb = Math.max(probabilities.home, probabilities.draw, probabilities.away);
  const minProb = Math.min(probabilities.home, probabilities.draw, probabilities.away);
  const concentration = (maxProb - minProb) * 100;

  const predictions = oddsList.map((odds) => {
    const probs = calculateNormalizedProbabilities(odds.homeWin, odds.draw, odds.awayWin);
    if (probs.home > probs.draw && probs.home > probs.away) return 'home';
    if (probs.away > probs.draw && probs.away > probs.home) return 'away';
    return 'draw';
  });

  const majorityPrediction = predictions.filter((p) => p === predictions[0]).length;
  const consistency = (majorityPrediction / predictions.length) * 100;

  let stability = 100;
  oddsList.forEach((odds) => {
    const trend = calculateOddsTrend(odds);
    const avgTrend = (Math.abs(trend.home) + Math.abs(trend.draw) + Math.abs(trend.away)) / 3;
    stability -= avgTrend * 50;
  });
  stability = Math.max(0, stability);

  const comparison = compareTeams(homeTeam, awayTeam);
  const strengthClarity = Math.abs(comparison.overallStrengthDiff) * 50;

  const knockoutUncertainty = stage !== 'group' ? 5 : 0;

  const hostBonus = (homeTeam.stats.isHostNation || awayTeam.stats.isHostNation) ? 3 : 0;

  return Math.round(
    Math.min(95,
      concentration * 0.35 +
      consistency * 0.25 +
      stability * 0.20 +
      strengthClarity * 0.15 +
      hostBonus -
      knockoutUncertainty
    ) * 10
  ) / 10;
}

/**
 * 增强预测理由生成
 */
export function generateEnhancedReasoning(
  probabilities: { home: number; draw: number; away: number },
  oddsList: Odds[],
  predictedOutcome: MatchResult,
  homeTeam: Team,
  awayTeam: Team,
  stage: MatchStage
): string[] {
  const reasons: string[] = [];
  const maxProb = Math.max(probabilities.home, probabilities.draw, probabilities.away);

  if (maxProb > 0.55) {
    reasons.push(`综合分析显示明显优势（${(maxProb * 100).toFixed(1)}%），预测可信度高`);
  } else if (maxProb > 0.40) {
    reasons.push(`综合分析显示相对优势（${(maxProb * 100).toFixed(1)}%），预测可信度中等`);
  } else {
    reasons.push(`双方实力接近（${(maxProb * 100).toFixed(1)}%），比赛结果不确定性较高`);
  }

  const comparison = compareTeams(homeTeam, awayTeam);

  if (Math.abs(comparison.overallStrengthDiff) > 0.15) {
    const strongerTeam = comparison.overallStrengthDiff > 0 ? homeTeam.nameCn : awayTeam.nameCn;
    reasons.push(`${strongerTeam}整体实力明显更强（进攻${comparison.attackAdvantage > 0 ? '优势' : '劣势'}，防守${comparison.defenseAdvantage > 0 ? '优势' : '劣势'}）`);
  } else if (Math.abs(comparison.overallStrengthDiff) > 0.08) {
    const strongerTeam = comparison.overallStrengthDiff > 0 ? homeTeam.nameCn : awayTeam.nameCn;
    reasons.push(`${strongerTeam}实力略占优势`);
  }

  if (comparison.formAdvantage > 0.05) {
    reasons.push(`${homeTeam.nameCn}近期状态更佳（评分${homeTeam.stats.recentForm}）`);
  } else if (comparison.formAdvantage < -0.05) {
    reasons.push(`${awayTeam.nameCn}近期状态更佳（评分${awayTeam.stats.recentForm}）`);
  }

  if (homeTeam.stats.isHostNation) {
    reasons.push(`${homeTeam.nameCn}作为东道主享有主场优势`);
  } else if (awayTeam.stats.isHostNation) {
    reasons.push(`${awayTeam.nameCn}作为东道主享有主场优势`);
  }

  if (stage !== 'group') {
    const stageName = stage === 'final' ? '决赛' : stage === 'semi' ? '半决赛' : stage === 'quarter' ? '四分之一决赛' : '淘汰赛';
    reasons.push(`${stageName}阶段比赛压力较大，平局概率相对提高`);
  }

  if (homeTeam.stats.worldCupHistory.titles > 0 || awayTeam.stats.worldCupHistory.titles > 0) {
    const champion = homeTeam.stats.worldCupHistory.titles > awayTeam.stats.worldCupHistory.titles ? homeTeam : awayTeam;
    if (champion.stats.worldCupHistory.titles >= 2) {
      reasons.push(`${champion.nameCn}世界杯历史战绩辉煌（${champion.stats.worldCupHistory.titles}次夺冠）`);
    }
  }

  const avgTrend = { home: 0, draw: 0, away: 0 };
  oddsList.forEach((odds) => {
    const trend = calculateOddsTrend(odds);
    avgTrend.home += trend.home;
    avgTrend.draw += trend.draw;
    avgTrend.away += trend.away;
  });
  avgTrend.home /= oddsList.length;
  avgTrend.draw /= oddsList.length;
  avgTrend.away /= oddsList.length;

  const trendMap = { home: avgTrend.home, draw: avgTrend.draw, away: avgTrend.away };
  const trend = trendMap[predictedOutcome];

  if (trend < -0.05) {
    reasons.push('博彩市场赔率持续下降，市场信心增强');
  } else if (trend > 0.05) {
    reasons.push('博彩市场赔率有所波动，需关注最新变化');
  }

  return reasons;
}

/**
 * 生成比分预测列表（Top 5 最可能比分）
 */
export function calculateScorePredictions(
  probabilities: { home: number; draw: number; away: number },
  homeRank: number,
  awayRank: number
): ScorePrediction[] {
  const expectedGoals = calculateExpectedGoals(probabilities, homeRank, awayRank);
  const lambdaHome = expectedGoals.home;
  const lambdaAway = expectedGoals.away;

  const scores: ScorePrediction[] = [];

  // 计算所有可能比分 (0-5) x (0-5) 的概率
  for (let h = 0; h <= 5; h++) {
    for (let a = 0; a <= 5; a++) {
      const prob = poissonProbability(lambdaHome, h) * poissonProbability(lambdaAway, a);
      scores.push({
        homeScore: h,
        awayScore: a,
        probability: prob,
        isMostLikely: false,
      });
    }
  }

  // 按概率降序排序，取前5
  scores.sort((a, b) => b.probability - a.probability);
  const top5 = scores.slice(0, 5);

  // 标记最可能比分
  if (top5.length > 0) top5[0].isMostLikely = true;

  return top5.map((s) => ({
    ...s,
    probability: Math.round(s.probability * 1000) / 10, // 转换为百分比，保留1位
  }));
}

/**
 * 格式化概率为百分比
 */
export function formatProbability(probability: number): string {
  return `${(probability * 100).toFixed(1)}%`;
}

/**
 * 格式化赔率
 */
export function formatOdds(odds: number): string {
  return odds.toFixed(2);
}

/**
 * 获取结果中文名称
 */
export function getResultName(result: MatchResult): string {
  const names = { home: '主胜', draw: '平局', away: '客胜' };
  return names[result];
}

/**
 * 获取比分预测描述
 */
export function getScorePredictionText(score: ScorePrediction): string {
  return `${score.homeScore} - ${score.awayScore}`;
}
