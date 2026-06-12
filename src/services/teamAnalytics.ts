import type { Team, MatchStage } from '../types';

export interface TeamComparison {
  attackAdvantage: number;
  defenseAdvantage: number;
  formAdvantage: number;
  rankAdvantage: number;
  overallStrengthDiff: number;
  historicalFactor: number;
}

export interface MatchContext {
  stage: MatchStage;
  isHostMatch: boolean;
  homeTeamHost: boolean;
  awayTeamHost: boolean;
  knockoutPressure: number;
}

export function compareTeams(home: Team, away: Team): TeamComparison {
  const attackAdvantage = home.stats.attackRating - away.stats.attackRating;
  const defenseAdvantage = home.stats.defenseRating - away.stats.defenseRating;
  const formAdvantage = home.stats.recentForm - away.stats.recentForm;
  const rankAdvantage = (away.fifaRank - home.fifaRank) / 100;

  const homeStrength = calculateOverallStrength(home);
  const awayStrength = calculateOverallStrength(away);
  const overallStrengthDiff = homeStrength - awayStrength;

  const historicalFactor = calculateHistoricalFactor(home, away);

  return {
    attackAdvantage,
    defenseAdvantage,
    formAdvantage,
    rankAdvantage,
    overallStrengthDiff,
    historicalFactor,
  };
}

export function calculateOverallStrength(team: Team): number {
  const rankFactor = (200 - team.fifaRank) / 200;
  const attackFactor = team.stats.attackRating / 100;
  const defenseFactor = team.stats.defenseRating / 100;
  const formFactor = team.stats.recentForm / 100;
  const historyFactor = team.stats.worldCupHistory.titles * 0.05 + team.stats.worldCupHistory.appearances * 0.01;

  return (
    rankFactor * 0.35 +
    attackFactor * 0.25 +
    defenseFactor * 0.2 +
    formFactor * 0.15 +
    Math.min(historyFactor, 0.3) * 0.05
  );
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
  };
}

export function calculateHostAdvantage(context: MatchContext): number {
  if (!context.isHostMatch) return 0;
  if (context.homeTeamHost) return 0.12;
  if (context.awayTeamHost) return -0.12;
  return 0;
}

export function calculateKnockoutDrawFactor(stage: MatchStage): number {
  if (stage === 'group') return 1.0;
  if (stage === 'round_of_32') return 1.15;
  if (stage === 'round_of_16') return 1.25;
  if (stage === 'quarter') return 1.35;
  if (stage === 'semi') return 1.4;
  if (stage === 'final') return 1.45;
  return 1.0;
}

export function estimateGoalExpectation(
  team: Team,
  opponent: Team,
  isHome: boolean
): number {
  const baseGoals = isHome ? 1.5 : 1.2;

  const attackStrength = team.stats.attackRating / 100;
  const opponentDefense = opponent.stats.defenseRating / 100;
  const attackVsDefense = attackStrength * (1 - opponentDefense * 0.5);

  const rankFactor = (200 - team.fifaRank) / 200;
  const opponentRankFactor = (200 - opponent.fifaRank) / 200;
  const relativeRankFactor = Math.max(0.5, Math.min(1.5, rankFactor / opponentRankFactor));

  const formFactor = team.stats.recentForm / 100;

  const goals = baseGoals * attackVsDefense * relativeRankFactor * (0.9 + formFactor * 0.2);

  return Math.max(0.4, Math.min(3.5, goals));
}