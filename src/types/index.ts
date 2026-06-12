export interface Team {
  id: string;
  name: string;
  nameCn: string;
  flag: string;
  group?: string;
  fifaRank: number;
  stats: TeamStats;
}

export interface TeamStats {
  attackRating: number;
  defenseRating: number;
  recentForm: number;
  worldCupHistory: {
    appearances: number;
    bestResult: string;
    titles: number;
  };
  avgGoalsScored: number;
  avgGoalsConceded: number;
  keyPlayersAvailable: number;
  isHostNation: boolean;
}

export interface OddsHistoryPoint {
  homeWin: number;
  draw: number;
  awayWin: number;
  timestamp: string;
}

export interface Odds {
  source: string;
  sourceName: string;
  homeWin: number;
  draw: number;
  awayWin: number;
  timestamp: string;
  history: OddsHistoryPoint[];
}

export type MatchStage = 'group' | 'round_of_32' | 'round_of_16' | 'quarter' | 'semi' | 'final';
export type MatchStatus = 'upcoming' | 'live' | 'finished';
export type MatchResult = 'home' | 'draw' | 'away';

export interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  date: string;
  time: string;
  stage: MatchStage;
  group?: string;
  odds: Odds[];
  status: MatchStatus;
  result?: MatchResult;
  score?: { home: number; away: number };
}

export interface ScorePrediction {
  homeScore: number;
  awayScore: number;
  probability: number; // 该比分出现概率
  isMostLikely: boolean;
}

export interface Prediction {
  matchId: string;
  predictedOutcome: MatchResult;
  confidence: number;
  probabilities: {
    home: number;
    draw: number;
    away: number;
  };
  scorePredictions: ScorePrediction[]; // 最可能的比分预测列表
  expectedGoals: {
    home: number;
    away: number;
  };
  reasoning: string[];
  timestamp: string;
}

export interface PredictionRecord extends Prediction {
  id: string;
  actualResult?: MatchResult;
  isCorrect?: boolean;
}

export interface DataSourceStatus {
  source: string;
  connected: boolean;
  lastFetch: string | null;
  error: string | null;
  matchesAvailable: boolean;
  oddsAvailable: boolean;
}

export interface AppState {
  matches: Match[];
  predictions: PredictionRecord[];
  selectedMatchId: string | null;
  expandedMatchId: string | null;
  isLoading: boolean;
  lastUpdated: string;
  sourceStatus: DataSourceStatus[];
  dataErrors: string[];
  isRealTime: boolean;
}

export type AppAction =
  | { type: 'SET_MATCHES'; payload: Match[] }
  | { type: 'SET_PREDICTIONS'; payload: PredictionRecord[] }
  | { type: 'ADD_PREDICTION'; payload: PredictionRecord }
  | { type: 'SET_SELECTED_MATCH'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'UPDATE_ODDS'; payload: { matchId: string; odds: Odds[] } }
  | { type: 'SET_EXPANDED_MATCH'; payload: string | null }
  | { type: 'SET_LAST_UPDATED'; payload: string }
  | { type: 'SET_SOURCE_STATUS'; payload: DataSourceStatus[] }
  | { type: 'SET_DATA_ERRORS'; payload: string[] }
  | { type: 'SET_REAL_TIME'; payload: boolean };
