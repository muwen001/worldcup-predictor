import type { Odds, MatchResult, ScorePrediction, Team, MatchStage } from '../types';
import type { TeamRatings } from '../services/teamRatings';
import {
  compareTeams,
  analyzeMatchContext,
  calculateHostAdvantage,
  calculateKnockoutDrawFactor,
  calculateKnockoutLowScoreFactor,
  estimateGoalExpectation,
  getKeyPlayersImpact,
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
 * 支持动态权重：根据赔率一致性自动调整各博彩公司权重
 */
export function calculateWeightedProbabilities(oddsList: Odds[]) {
  const baseWeights: Record<string, number> = {
    bet365: 0.35,
    williamhill: 0.35,
    betfair: 0.30,
  };

  // 动态权重调整：如果某博彩公司赔率与其他偏离过大，降低其权重
  const allHomeOdds = oddsList.map(o => o.homeWin);
  const allDrawOdds = oddsList.map(o => o.draw);
  const allAwayOdds = oddsList.map(o => o.awayWin);
  const medianHome = median(allHomeOdds);
  const medianDraw = median(allDrawOdds);
  const medianAway = median(allAwayOdds);

  let totalWeight = 0;
  const weightedSum = { home: 0, draw: 0, away: 0 };

  oddsList.forEach((odds) => {
    const baseWeight = baseWeights[odds.source] || 0.25;
    // 偏离惩罚：偏离中位数越远的赔率源权重越低
    const homeDeviation = Math.abs(odds.homeWin - medianHome) / medianHome;
    const drawDeviation = Math.abs(odds.draw - medianDraw) / medianDraw;
    const awayDeviation = Math.abs(odds.awayWin - medianAway) / medianAway;
    const avgDeviation = (homeDeviation + drawDeviation + awayDeviation) / 3;
    const deviationPenalty = Math.max(0.3, 1 - avgDeviation * 2);
    const weight = baseWeight * deviationPenalty;

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

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * 增强概率计算：综合赔率 + 球队实力 + 淘汰赛因素 + 主客场优势 + 赔率趋势 + 阵容完整性
 */
export function calculateEnhancedProbabilities(
  oddsList: Odds[],
  homeTeam: Team,
  awayTeam: Team,
  stage: MatchStage,
  teamRatings?: TeamRatings
): { home: number; draw: number; away: number } {
  const oddsProbs = calculateWeightedProbabilities(oddsList);
  const homeRating = teamRatings?.[homeTeam.id];
  const awayRating = teamRatings?.[awayTeam.id];
  const comparison = compareTeams(homeTeam, awayTeam, homeRating, awayRating);
  const context = analyzeMatchContext({ stage, homeTeam, awayTeam });

  const strengthProb = calculateStrengthBasedProbabilities(comparison);
  const hostAdvantage = calculateHostAdvantage(context);
  const knockoutDrawFactor = calculateKnockoutDrawFactor(stage); // < 1.0 for knockout

  // 赔率趋势调整：如果市场赔率下降，增强对应结果的概率
  const oddsTrendAdjustment = calculateOddsTrendAdjustment(oddsList, oddsProbs);

  // 权重分配：赔率更可靠时权重更高
  const oddsConsistency = calculateOddsConsistency(oddsList);
  const oddsWeight = 0.40 + oddsConsistency * 0.15; // 0.40 ~ 0.55
  const strengthWeight = 0.35;

  // 基础概率合成（赔率系统性低估平局，对draw用更高的strength权重）
  let homeProb = oddsProbs.home * oddsWeight + strengthProb.home * strengthWeight;
  let awayProb = oddsProbs.away * oddsWeight + strengthProb.away * strengthWeight;
  let drawProb = oddsProbs.draw * (oddsWeight * 0.75) + strengthProb.draw * (strengthWeight * 1.25);

  // Form 连续调整：每10点form差→约1.5%概率偏移
  const formShift = comparison.formAdvantage / 100 * 0.15;
  homeProb += formShift;
  awayProb -= formShift;

  // 阵容完整性调整
  const squadShift = comparison.squadAdvantage * 0.10;
  homeProb += squadShift;
  awayProb -= squadShift;

  // 旅途疲劳调整
  const travelShift = (context.awayTravelFatigue - context.homeTravelFatigue) * 0.35;
  homeProb += travelShift;
  awayProb -= travelShift;

  // 赔率趋势调整（市场信号）
  homeProb += oddsTrendAdjustment.home * 0.05;
  awayProb += oddsTrendAdjustment.away * 0.05;
  drawProb += oddsTrendAdjustment.draw * 0.05;

  // 主客场优势
  if (hostAdvantage !== 0) {
    if (hostAdvantage > 0) {
      homeProb += hostAdvantage * 0.6;
      awayProb -= hostAdvantage * 0.4;
      drawProb -= hostAdvantage * 0.2;
    } else {
      awayProb += Math.abs(hostAdvantage) * 0.6;
      homeProb -= Math.abs(hostAdvantage) * 0.4;
      drawProb -= Math.abs(hostAdvantage) * 0.2;
    }
  }

  // 淘汰赛修正：降低平局概率（因为淘汰赛更倾向分胜负）
  drawProb *= knockoutDrawFactor;

  // 使用 soft-clamp 归一化：避免硬边界导致概率失真
  // 先对极小的值做下限保护，然后归一化
  homeProb = Math.max(0.02, homeProb);
  awayProb = Math.max(0.02, awayProb);
  drawProb = Math.max(0.02, drawProb);

  const total = homeProb + drawProb + awayProb;
  const normalized = {
    home: homeProb / total,
    draw: drawProb / total,
    away: awayProb / total,
  };

  // 最终 clamp + 重新归一化，确保概率总和为1.0
  const clampedHome = softClamp(normalized.home, 0.08, 0.85);
  const clampedDraw = softClamp(normalized.draw, 0.05, 0.40);
  const clampedAway = softClamp(normalized.away, 0.08, 0.85);
  const clampedTotal = clampedHome + clampedDraw + clampedAway;
  return {
    home: clampedHome / clampedTotal,
    draw: clampedDraw / clampedTotal,
    away: clampedAway / clampedTotal,
  };
}

/**
 * Soft-clamp：使用平滑边界，避免硬截断导致的信息损失
 */
function softClamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function calculateStrengthBasedProbabilities(comparison: TeamComparison): { home: number; draw: number; away: number } {
  const strengthDiff = comparison.overallStrengthDiff;

  // 使用非线性映射：小差距时更接近50/50，大差距时差距加速
  const sigmoidDiff = Math.tanh(strengthDiff * 3) * 0.5; // 0.5 * tanh(3x), 范围约 -0.5 ~ 0.5

  const homeBase = 0.38 + sigmoidDiff;
  const awayBase = 0.38 - sigmoidDiff;
  // 世界杯小组赛实际平局率约25-28%，提高基础平局概率
  // 实力接近时平局概率更高，差距大时降低但保持下限
  const drawBase = Math.max(0.22, 0.28 - Math.abs(sigmoidDiff) * 0.20);

  // 阵容和历史微调
  const squadShift = comparison.squadAdvantage * 0.02;
  const historyShift = comparison.historicalFactor * 0.03;

  const home = Math.max(0.1, Math.min(0.65, homeBase + squadShift + historyShift));
  const away = Math.max(0.1, Math.min(0.65, awayBase - squadShift - historyShift));
  const draw = Math.max(0.20, Math.min(0.38, drawBase));

  const total = home + draw + away;
  return { home: home / total, draw: draw / total, away: away / total };
}

/**
 * 赔率一致性：各家博彩公司赔率的一致性程度
 */
function calculateOddsConsistency(oddsList: Odds[]): number {
  if (oddsList.length < 2) return 0.5;
  const homeOdds = oddsList.map(o => o.homeWin);
  const drawOdds = oddsList.map(o => o.draw);
  const awayOdds = oddsList.map(o => o.awayWin);
  const homeStd = standardDeviation(homeOdds) / mean(homeOdds);
  const drawStd = standardDeviation(drawOdds) / mean(drawOdds);
  const awayStd = standardDeviation(awayOdds) / mean(awayOdds);
  const avgCv = (homeStd + drawStd + awayStd) / 3;
  // 变异系数越小，一致性越高，赔率权重越大
  return Math.max(0, Math.min(1, 1 - avgCv * 3));
}

function standardDeviation(values: number[]): number {
  const avg = mean(values);
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * 根据赔率变化趋势计算概率调整
 * 赔率下降 = 市场更看好该结果 = 增加概率
 */
function calculateOddsTrendAdjustment(
  oddsList: Odds[],
  currentProbs: { home: number; draw: number; away: number }
): { home: number; draw: number; away: number } {
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

  // 赔率下降 = 趋势为负 = 概率增加（赔率与概率反向）
  return {
    home: -avgTrend.home * currentProbs.home * 2,
    draw: -avgTrend.draw * currentProbs.draw * 2,
    away: -avgTrend.away * currentProbs.away * 2,
  };
}

/**
 * 计算赔率变化趋势
 */
export function calculateOddsTrend(odds: Odds): { home: number; draw: number; away: number } {
  const history = odds.history;
  if (history.length < 2) return { home: 0, draw: 0, away: 0 };

  // 使用加权移动平均趋势：近期变化权重更高
  let homeTrend = 0;
  let drawTrend = 0;
  let awayTrend = 0;
  let totalWeight = 0;

  for (let i = 1; i < history.length; i++) {
    const weight = i / history.length; // 近期权重更高
    const prev = history[i - 1];
    const curr = history[i];
    homeTrend += ((curr.homeWin - prev.homeWin) / prev.homeWin) * weight;
    drawTrend += ((curr.draw - prev.draw) / prev.draw) * weight;
    awayTrend += ((curr.awayWin - prev.awayWin) / prev.awayWin) * weight;
    totalWeight += weight;
  }

  return {
    home: homeTrend / totalWeight,
    draw: drawTrend / totalWeight,
    away: awayTrend / totalWeight,
  };
}

/**
 * 计算预测置信度（基础版）
 */
export function calculateConfidence(
  probabilities: { home: number; draw: number; away: number },
  oddsList: Odds[]
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

  return Math.round((concentration * 0.4 + consistency * 0.35 + stability * 0.25) * 10) / 10;
}

/**
 * 生成预测理由（基础版）
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
// 比分预测：基于泊松分布 + Dixon-Coles 低比分修正
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
 * Dixon-Coles 低比分相关性修正（自适应rho）
 * 强弱悬殊时rho接近0（进球多、低比分相关性弱）
 * 势均力敌时rho=-0.12（低比分更常见）
 * 淘汰赛rho=-0.15（更保守）
 */
function adaptiveRho(probabilities: { home: number; draw: number; away: number }, stage: MatchStage): number {
  const probGap = Math.abs(probabilities.home - probabilities.away);
  // 差距越大rho越接近0，差距小rho保持标准值
  const baseRho = stage !== 'group' ? -0.15 : -0.12;
  const gapReduction = Math.min(0.10, probGap * 0.10); // 每10%差距减少0.01
  return baseRho + gapReduction; // 范围: -0.12 ~ -0.02
}

function dixonColesCorrection(
  homeGoals: number,
  awayGoals: number,
  lambdaHome: number,
  lambdaAway: number,
  rho: number
): number {
  const isLowScore = homeGoals <= 1 && awayGoals <= 1;
  if (!isLowScore) return 1.0;

  const tau = homeGoals === 0 && awayGoals === 0 ? 1 + rho * lambdaHome * lambdaAway :
    homeGoals === 0 && awayGoals === 1 ? 1 - rho * lambdaHome :
    homeGoals === 1 && awayGoals === 0 ? 1 - rho * lambdaAway :
    homeGoals === 1 && awayGoals === 1 ? 1 + rho :
    1.0;

  return Math.max(0.5, tau);
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
 * 增强预期进球计算：基于球队进攻/防守能力 + 阵容完整性 + 旅途疲劳
 */
export function calculateEnhancedExpectedGoals(
  homeTeam: Team,
  awayTeam: Team,
  probabilities: { home: number; draw: number; away: number },
  stage: MatchStage = 'group',
  teamRatings?: TeamRatings
): { home: number; away: number } {
  const homeRating = teamRatings?.[homeTeam.id];
  const awayRating = teamRatings?.[awayTeam.id];
  const homeGoals = estimateGoalExpectation(homeTeam, awayTeam, true, homeRating, awayRating);
  const awayGoals = estimateGoalExpectation(awayTeam, homeTeam, false, awayRating, homeRating);

  // 概率微调：强队概率高时提升其预期进球
  const probAdjustment = (probabilities.home - probabilities.away) * 0.08;

  // 平局概率与总进球的关系：高平局=低总进球，低平局=高总进球
  const drawAdjustment = (0.28 - probabilities.draw) * 0.08;

  // 淘汰赛低比分因子：仅淘汰赛应用，小组赛不降低进球
  const lowScoreFactor = calculateKnockoutLowScoreFactor(stage);

  const adjustedHome = Math.max(0.5, Math.min(3.0, homeGoals + probAdjustment + drawAdjustment)) / (lowScoreFactor > 1.0 ? lowScoreFactor * 0.85 : 1.0);
  const adjustedAway = Math.max(0.5, Math.min(3.0, awayGoals - probAdjustment + drawAdjustment)) / (lowScoreFactor > 1.0 ? lowScoreFactor * 0.85 : 1.0);

  return {
    home: Math.round(adjustedHome * 100) / 100,
    away: Math.round(adjustedAway * 100) / 100,
  };
}

/**
 * 增强比分预测：基于球队实力 + Dixon-Coles 修正 + 淘汰赛调整
 * 推荐逻辑：强队推荐多球胜(2-0/2-1/3-0)，势均力敌推荐1-1
 */
export function calculateEnhancedScorePredictions(
  probabilities: { home: number; draw: number; away: number },
  homeTeam: Team,
  awayTeam: Team,
  stage: MatchStage,
  teamRatings?: TeamRatings
): ScorePrediction[] {
  const expectedGoals = calculateEnhancedExpectedGoals(homeTeam, awayTeam, probabilities, stage, teamRatings);
  const lambdaHome = expectedGoals.home;
  const lambdaAway = expectedGoals.away;

  const scores: ScorePrediction[] = [];
  const lowScoreFactor = calculateKnockoutLowScoreFactor(stage);
  const rho = adaptiveRho(probabilities, stage);

  for (let h = 0; h <= 5; h++) {
    for (let a = 0; a <= 5; a++) {
      let prob = poissonProbability(lambdaHome, h) * poissonProbability(lambdaAway, a);
      prob *= dixonColesCorrection(h, a, lambdaHome, lambdaAway, rho);

      if (stage !== 'group' && h + a <= 2) {
        prob *= lowScoreFactor;
      }

      scores.push({
        homeScore: h,
        awayScore: a,
        probability: prob,
        isMostLikely: false,
      });
    }
  }

  // 归一化：确保所有比分概率总和为1.0
  const totalProb = scores.reduce((sum, s) => sum + s.probability, 0);
  scores.forEach(s => s.probability /= totalProb);

  scores.sort((a, b) => b.probability - a.probability);
  const top5 = scores.slice(0, 5);

  // 智能推荐：不再简单取概率最高的，而是根据比赛特征选最合理的比分
  const maxProb = Math.max(probabilities.home, probabilities.draw, probabilities.away);
  const favoredSide = probabilities.home > probabilities.away ? 'home' : 'away';
  const probGap = Math.abs(probabilities.home - probabilities.away);

  let recommendedIdx = 0;

  if (probGap > 0.15 && maxProb > 0.55) {
    // 强弱悬殊：推荐2球以上差距的比分(2-0, 3-0, 0-2等)
    const multiGoalScores = top5.filter(s => {
      const diff = Math.abs(s.homeScore - s.awayScore);
      const winnerCorrect = (favoredSide === 'home' && s.homeScore > s.awayScore) ||
                            (favoredSide === 'away' && s.awayScore > s.homeScore);
      return diff >= 2 && winnerCorrect;
    });
    if (multiGoalScores.length > 0) {
      // 在top5中找多球差距的比分，只要概率不低于榜首的80%就推荐
      const threshold = top5[0].probability * 0.80;
      const qualified = multiGoalScores.filter(s => s.probability >= threshold);
      if (qualified.length > 0) {
        recommendedIdx = top5.indexOf(qualified[0]);
      }
    }
  } else if (probGap < 0.08) {
    // 势均力敌：推荐平局或最小差距比分
    const drawScores = top5.filter(s => s.homeScore === s.awayScore);
    if (drawScores.length > 0) {
      const threshold = top5[0].probability * 0.85;
      const qualified = drawScores.filter(s => s.probability >= threshold);
      if (qualified.length > 0) {
        recommendedIdx = top5.indexOf(qualified[0]);
      }
    }
  }
  // 中等差距(8-15%)：保持概率最高的作为推荐

  if (top5.length > 0) top5[recommendedIdx].isMostLikely = true;

  return top5.map((s) => ({
    ...s,
    probability: Math.round(s.probability * 1000) / 10,
  }));
}

/**
 * 增强置信度计算：考虑球队实力差异、阵容完整性、赔率一致性
 */
export function calculateEnhancedConfidence(
  probabilities: { home: number; draw: number; away: number },
  oddsList: Odds[],
  homeTeam: Team,
  awayTeam: Team,
  stage: MatchStage,
  teamRatings?: TeamRatings
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
  const consistency = (majorityPrediction / oddsList.length) * 100;

  let stability = 100;
  oddsList.forEach((odds) => {
    const trend = calculateOddsTrend(odds);
    const avgTrend = (Math.abs(trend.home) + Math.abs(trend.draw) + Math.abs(trend.away)) / 3;
    stability -= avgTrend * 50;
  });
  stability = Math.max(0, stability);

  const homeRating = teamRatings?.[homeTeam.id];
  const awayRating = teamRatings?.[awayTeam.id];
  const comparison = compareTeams(homeTeam, awayTeam, homeRating, awayRating);
  const strengthClarity = Math.abs(comparison.overallStrengthDiff) * 50;

  // 赔率一致性额外加分
  const oddsConsistency = calculateOddsConsistency(oddsList) * 15;

  // 阵容完整性不确定性：如果关键球员缺阵，降低置信度
  const squadUncertainty = (2.0 - getKeyPlayersImpact(homeTeam) - getKeyPlayersImpact(awayTeam)) * 10;

  const knockoutUncertainty = stage !== 'group' ? 5 : 0;

  const hostBonus = (homeTeam.stats.isHostNation || awayTeam.stats.isHostNation) ? 3 : 0;

  return Math.round(
    Math.min(95,
      concentration * 0.32 +
      consistency * 0.22 +
      stability * 0.18 +
      strengthClarity * 0.14 +
      oddsConsistency -
      squadUncertainty -
      knockoutUncertainty +
      hostBonus
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
  stage: MatchStage,
  teamRatings?: TeamRatings
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

  const homeRating = teamRatings?.[homeTeam.id];
  const awayRating = teamRatings?.[awayTeam.id];
  const comparison = compareTeams(homeTeam, awayTeam, homeRating, awayRating);

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

  // 阵容完整性提示
  if (homeTeam.stats.keyPlayersAvailable < 80 || awayTeam.stats.keyPlayersAvailable < 80) {
    const weakTeam = homeTeam.stats.keyPlayersAvailable < awayTeam.stats.keyPlayersAvailable ? homeTeam : awayTeam;
    reasons.push(`${weakTeam.nameCn}阵容完整性较低（${weakTeam.stats.keyPlayersAvailable}%），可能影响发挥`);
  }

  // 旅途疲劳提示
  if (comparison.travelAdvantage > 0.05) {
    reasons.push(`${homeTeam.nameCn}旅途压力更小，体能储备更优`);
  } else if (comparison.travelAdvantage < -0.05) {
    reasons.push(`${awayTeam.nameCn}旅途压力更小，体能储备更优`);
  }

  if (stage !== 'group') {
    const stageName = stage === 'final' ? '决赛' : stage === 'semi' ? '半决赛' : stage === 'quarter' ? '四分之一决赛' : '淘汰赛';
    reasons.push(`${stageName}阶段比赛更保守，总进球数可能减少`);
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
      let prob = poissonProbability(lambdaHome, h) * poissonProbability(lambdaAway, a);
      // 基础 Dixon-Coles 修正
      prob *= dixonColesCorrection(h, a, lambdaHome, lambdaAway, -0.10);
      scores.push({
        homeScore: h,
        awayScore: a,
        probability: prob,
        isMostLikely: false,
      });
    }
  }

  // 归一化：确保所有比分概率总和为1.0
  const totalProb = scores.reduce((sum, s) => sum + s.probability, 0);
  scores.forEach(s => s.probability /= totalProb);

  // 按概率降序排序，取前5
  scores.sort((a, b) => b.probability - a.probability);
  const top5 = scores.slice(0, 5);

  // 标记最可能比分
  if (top5.length > 0) top5[0].isMostLikely = true;

  return top5.map((s) => ({
    ...s,
    probability: Math.round(s.probability * 1000) / 10,
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
