import type { Match, Prediction, MatchResult } from '../types';
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
  static predict(match: Match, useEnhanced: boolean = true): Prediction {
    const probabilities = useEnhanced
      ? calculateEnhancedProbabilities(match.odds, match.homeTeam, match.awayTeam, match.stage)
      : calculateWeightedProbabilities(match.odds);

    let predictedOutcome: MatchResult;
    if (probabilities.home >= probabilities.draw && probabilities.home >= probabilities.away) {
      predictedOutcome = 'home';
    } else if (probabilities.away >= probabilities.draw) {
      predictedOutcome = 'away';
    } else {
      predictedOutcome = 'draw';
    }

    const confidence = useEnhanced
      ? calculateEnhancedConfidence(probabilities, match.odds, match.homeTeam, match.awayTeam, match.stage)
      : calculateConfidence(probabilities, match.odds);

    const reasoning = useEnhanced
      ? generateEnhancedReasoning(probabilities, match.odds, predictedOutcome, match.homeTeam, match.awayTeam, match.stage)
      : generateReasoning(probabilities, match.odds, predictedOutcome);

    const scorePredictions = useEnhanced
      ? calculateEnhancedScorePredictions(probabilities, match.homeTeam, match.awayTeam, match.stage)
      : calculateScorePredictions(probabilities, match.homeTeam.fifaRank, match.awayTeam.fifaRank);

    const expectedGoals = useEnhanced
      ? calculateEnhancedExpectedGoals(match.homeTeam, match.awayTeam, probabilities)
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

  static predictBatch(matches: Match[], useEnhanced: boolean = true): Prediction[] {
    return matches.map((match) => this.predict(match, useEnhanced));
  }

  static rePredict(match: Match, previousPrediction?: Prediction, useEnhanced: boolean = true): Prediction {
    const newPrediction = this.predict(match, useEnhanced);

    if (previousPrediction && previousPrediction.predictedOutcome !== newPrediction.predictedOutcome) {
      newPrediction.reasoning.unshift(
        `⚠️ 预测结果发生变化：从${previousPrediction.predictedOutcome === 'home' ? '主胜' : previousPrediction.predictedOutcome === 'away' ? '客胜' : '平局'}变为${newPrediction.predictedOutcome === 'home' ? '主胜' : newPrediction.predictedOutcome === 'away' ? '客胜' : '平局'}`
      );
    }

    return newPrediction;
  }
}
