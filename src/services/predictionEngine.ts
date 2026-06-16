import type { Match, Prediction, MatchResult } from '../types';
import type { TeamRatings } from './teamRatings';
import {
  calculateEnhancedProbabilities,
  calculateEnhancedConfidence,
  generateEnhancedReasoning,
  calculateEnhancedScorePredictions,
  calculateEnhancedExpectedGoals,
  calculateWeightedProbabilities,
  calculateConfidence,
  generateReasoning,
  calculateScorePredictions,
  calculateExpectedGoals,
} from '../utils/oddsCalculator';

export class PredictionEngine {
  static predict(match: Match, teamRatings?: TeamRatings, useEnhanced: boolean = true): Prediction {
    const probabilities = useEnhanced
      ? calculateEnhancedProbabilities(match.odds, match.homeTeam, match.awayTeam, match.stage, teamRatings)
      : calculateWeightedProbabilities(match.odds);

    const predictedOutcome = this.selectOutcome(probabilities);

    const confidence = useEnhanced
      ? calculateEnhancedConfidence(probabilities, match.odds, match.homeTeam, match.awayTeam, match.stage, teamRatings)
      : calculateConfidence(probabilities, match.odds);

    const reasoning = useEnhanced
      ? generateEnhancedReasoning(probabilities, match.odds, predictedOutcome, match.homeTeam, match.awayTeam, match.stage, teamRatings)
      : generateReasoning(probabilities, match.odds, predictedOutcome);

    const scorePredictions = useEnhanced
      ? calculateEnhancedScorePredictions(probabilities, match.homeTeam, match.awayTeam, match.stage, teamRatings)
      : calculateScorePredictions(probabilities, match.homeTeam.fifaRank, match.awayTeam.fifaRank);

    const expectedGoals = useEnhanced
      ? calculateEnhancedExpectedGoals(match.homeTeam, match.awayTeam, probabilities, match.stage, teamRatings)
      : calculateExpectedGoals(probabilities, match.homeTeam.fifaRank, match.awayTeam.fifaRank);

    return {
      matchId: match.id,
      predictedOutcome,
      confidence,
      probabilities,
      scorePredictions,
      expectedGoals,
      reasoning,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 智能选择预测结果：引入"平局窗口"机制
   * 足球中平局概率很少是最高的，但当胜负概率非常接近（diff <= 15%）且平局概率足够高（>=22%）时，预测平局更合理
   */
  private static selectOutcome(
    probabilities: { home: number; draw: number; away: number }
  ): MatchResult {
    const { home, draw, away } = probabilities;
    const diff = Math.abs(home - away);

    // 当胜负概率非常接近且平局概率足够高时，预测平局
    const drawThreshold = 0.22;
    const diffThreshold = 0.15;

    if (draw >= drawThreshold && diff <= diffThreshold) {
      return 'draw';
    }

    // 标准选择：概率最高的结果
    if (home >= away && home >= draw) return 'home';
    if (away >= home && away >= draw) return 'away';
    return 'draw';
  }

  static predictBatch(matches: Match[], teamRatings?: TeamRatings, useEnhanced: boolean = true): Prediction[] {
    return matches.map((match) => this.predict(match, teamRatings, useEnhanced));
  }

  static rePredict(match: Match, previousPrediction?: Prediction, teamRatings?: TeamRatings, useEnhanced: boolean = true): Prediction {
    const newPrediction = this.predict(match, teamRatings, useEnhanced);

    if (previousPrediction && previousPrediction.predictedOutcome !== newPrediction.predictedOutcome) {
      newPrediction.reasoning.unshift(
        `⚠️ 预测结果发生变化：从${previousPrediction.predictedOutcome === 'home' ? '主胜' : previousPrediction.predictedOutcome === 'away' ? '客胜' : '平局'}变为${newPrediction.predictedOutcome === 'home' ? '主胜' : newPrediction.predictedOutcome === 'away' ? '客胜' : '平局'}`
      );
    }

    return newPrediction;
  }
}
