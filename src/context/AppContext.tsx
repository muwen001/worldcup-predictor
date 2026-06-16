/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import type { AppState, AppAction, PredictionRecord, Match } from '../types';
import { dataService } from '../services/dataService';
import { fetchCctvMatches } from '../services/cctvApi';
import { getDefaultSourceStatus } from '../services/apiConfig';
import { PredictionEngine } from '../services/predictionEngine';
import {
  calculateRatings,
  initializeRatings,
  loadRatingsFromCache,
  saveRatingsToCache,
  getInitialRating,
} from '../services/teamRatings';
import { TEAMS } from '../services/staticData';

const cachedRatings = loadRatingsFromCache();

const initialState: AppState = {
  matches: [],
  predictions: [],
  selectedMatchId: null,
  teamRatings: cachedRatings ?? initializeRatings(TEAMS),
  isLoading: true,
  lastUpdated: new Date().toISOString(),
  sourceStatus: getDefaultSourceStatus(),
  dataErrors: [],
  isRealTime: false,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_MATCHES':
      return { ...state, matches: action.payload };
    case 'SET_PREDICTIONS':
      return { ...state, predictions: action.payload };
    case 'ADD_PREDICTION': {
      const existing = state.predictions.find((p) => p.matchId === action.payload.matchId);
      if (existing) {
        return {
          ...state,
          predictions: state.predictions.map((p) =>
            p.matchId === action.payload.matchId ? action.payload : p
          ),
        };
      }
      return { ...state, predictions: [...state.predictions, action.payload] };
    }
    case 'SET_SELECTED_MATCH':
      return { ...state, selectedMatchId: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'UPDATE_ODDS':
      return {
        ...state,
        matches: state.matches.map((m) =>
          m.id === action.payload.matchId ? { ...m, odds: action.payload.odds } : m
        ),
      };
    case 'SET_LAST_UPDATED':
      return { ...state, lastUpdated: action.payload };
    case 'SET_SOURCE_STATUS':
      return { ...state, sourceStatus: action.payload };
    case 'SET_DATA_ERRORS':
      return { ...state, dataErrors: action.payload };
    case 'SET_REAL_TIME':
      return { ...state, isRealTime: action.payload };
    case 'SET_TEAM_RATINGS':
      return { ...state, teamRatings: action.payload };
    default:
      return state;
  }
}

// Compare scores between current state and new CCTV data
// Only return true if something actually changed (score, status, or result)
function hasMatchChanges(currentMatches: Match[], newCctvMatches: Match[]): boolean {
  for (const cctv of newCctvMatches) {
    const current = currentMatches.find(
      m => m.homeTeam.id === cctv.homeTeam.id &&
           m.awayTeam.id === cctv.awayTeam.id &&
           m.date === cctv.date
    );
    if (!current) return true; // New match not in current data
    if (current.status !== cctv.status) return true; // Status changed (e.g. upcoming→live→finished)
    if (cctv.score && (!current.score || current.score.home !== cctv.score.home || current.score.away !== cctv.score.away)) return true; // Score changed
    if (cctv.result !== current.result) return true; // Result changed
  }
  return false;
}

// Merge CCTV data into current matches, only updating changed fields
function mergeCctvUpdates(currentMatches: Match[], newCctvMatches: Match[]): Match[] {
  const updated = [...currentMatches];
  for (const cctv of newCctvMatches) {
    const idx = updated.findIndex(
      m => m.homeTeam.id === cctv.homeTeam.id &&
           m.awayTeam.id === cctv.awayTeam.id &&
           m.date === cctv.date
    );
    if (idx >= 0) {
      // Keep existing odds, update status/score/result from CCTV
      updated[idx] = {
        ...updated[idx],
        status: cctv.status,
        score: cctv.score,
        result: cctv.result,
      };
    } else {
      // New match from CCTV (shouldn't happen normally, but add it)
      updated.push(cctv);
    }
  }
  // Sort by date
  updated.sort((a, b) => {
    const dtA = new Date(a.date + 'T' + a.time);
    const dtB = new Date(b.date + 'T' + b.time);
    return dtA.getTime() - dtB.getTime();
  });
  return updated;
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  refreshOdds: () => void;
  predictMatch: (matchId: string) => void;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const matchesRef = useRef(state.matches);
  const predictionsRef = useRef(state.predictions);
  const sourceStatusRef = useRef(state.sourceStatus);
  const teamRatingsRef = useRef(state.teamRatings);

  // 保持 ref 始终指向最新状态，避免轮询 interval 因状态变化而频繁重建
  useEffect(() => {
    matchesRef.current = state.matches;
    predictionsRef.current = state.predictions;
    sourceStatusRef.current = state.sourceStatus;
    teamRatingsRef.current = state.teamRatings;
  });

  // 根据已结束比赛计算球队实时评分（同步计算，便于立即用于预测）
  const computeTeamRatings = useCallback((matches: Match[]) => {
    const finished = matches.filter((m) => m.status === 'finished');
    const ratings = finished.length > 0
      ? calculateRatings(finished)
      : initializeRatings(TEAMS);

    // 合并缓存中可能已有的评分（保证未参赛球队也有初始值）
    const merged = { ...teamRatingsRef.current, ...ratings };
    for (const team of TEAMS) {
      if (!(team.id in merged)) {
        merged[team.id] = teamRatingsRef.current[team.id] ?? getInitialRating(team);
      }
    }

    return merged;
  }, []);

  // 初始化数据：从API/缓存/静态数据获取
  const loadData = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const result = await dataService.fetchMatches();

      // 先同步计算评分，再统一 dispatch，避免使用异步更新后的 ref
      const ratings = computeTeamRatings(result.matches);
      dispatch({ type: 'SET_TEAM_RATINGS', payload: ratings });
      saveRatingsToCache(ratings);

      dispatch({ type: 'SET_MATCHES', payload: result.matches });
      dispatch({ type: 'SET_SOURCE_STATUS', payload: result.sourceStatus });
      dispatch({ type: 'SET_DATA_ERRORS', payload: result.errors });
      dispatch({ type: 'SET_REAL_TIME', payload: result.isRealTime });
      dispatch({ type: 'SET_LAST_UPDATED', payload: result.lastUpdated });

      // 生成预测（使用动态评分）
      const predictions: PredictionRecord[] = result.matches.map((match) => {
        const prediction = PredictionEngine.predict(match, ratings);
        return {
          ...prediction,
          id: `pred_${match.id}`,
        };
      });
      dispatch({ type: 'SET_PREDICTIONS', payload: predictions });
    } catch (err) {
      dispatch({
        type: 'SET_DATA_ERRORS',
        payload: [`Data load failed: ${err instanceof Error ? err.message : String(err)}`],
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [computeTeamRatings]);

  // 首次加载
  useEffect(() => {
    loadData();
  }, [loadData]);

  // CCTV 每分钟轮询：只在比分变化时刷新
  // 依赖空数组，确保 interval 只创建一次；通过 ref 读取最新状态
  useEffect(() => {
    pollingRef.current = setInterval(async () => {
      try {
        const cctvResult = await fetchCctvMatches();
        if (!cctvResult.connected || cctvResult.matches.length === 0) return;

        const currentMatches = matchesRef.current;
        const currentPredictions = predictionsRef.current;
        const currentSourceStatus = sourceStatusRef.current;

        // Check if anything changed
        if (hasMatchChanges(currentMatches, cctvResult.matches)) {
          const merged = mergeCctvUpdates(currentMatches, cctvResult.matches);

          // 同步重新计算实时评分
          const ratings = computeTeamRatings(merged);
          dispatch({ type: 'SET_TEAM_RATINGS', payload: ratings });
          saveRatingsToCache(ratings);

          dispatch({ type: 'SET_MATCHES', payload: merged });

          // Update predictions only for matches whose status/score changed
          const predictions: PredictionRecord[] = merged.map((match) => {
            const existingPred = currentPredictions.find((p) => p.matchId === match.id);
            const prevMatch = currentMatches.find(m => m.id === match.id);
            // Only re-predict if match status changed or it's a new match
            const needsRePredict = !prevMatch || prevMatch.status !== match.status;
            const prediction = needsRePredict
              ? PredictionEngine.predict(match, ratings)
              : existingPred
              ? { ...existingPred }
              : PredictionEngine.predict(match, ratings);
            return {
              ...prediction,
              id: existingPred?.id || `pred_${match.id}`,
            };
          });
          dispatch({ type: 'SET_PREDICTIONS', payload: predictions });
          dispatch({ type: 'SET_LAST_UPDATED', payload: new Date().toISOString() });

          // Update CCTV source status
          const cctvIdx = currentSourceStatus.findIndex(s => s.source === 'cctv-sports');
          if (cctvIdx >= 0) {
            const updatedStatus = [...currentSourceStatus];
            updatedStatus[cctvIdx] = {
              ...updatedStatus[cctvIdx],
              connected: true,
              lastFetch: new Date().toISOString(),
              matchesAvailable: true,
            };
            dispatch({ type: 'SET_SOURCE_STATUS', payload: updatedStatus });
          }
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 60000); // 1 minute

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [computeTeamRatings]);

  // 刷新赔率（手动触发）
  const refreshOdds = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const result = await dataService.refreshOdds(state.matches);

      if (result.hasNewData) {
        // 赔率更新后重新计算评分，再生成预测
        const ratings = computeTeamRatings(result.updatedMatches);
        dispatch({ type: 'SET_TEAM_RATINGS', payload: ratings });
        saveRatingsToCache(ratings);

        dispatch({ type: 'SET_MATCHES', payload: result.updatedMatches });
        dispatch({ type: 'SET_LAST_UPDATED', payload: new Date().toISOString() });

        const predictions: PredictionRecord[] = result.updatedMatches.map((match) => {
          const existingPred = state.predictions.find((p) => p.matchId === match.id);
          const prediction = PredictionEngine.rePredict(match, existingPred, ratings);
          return {
            ...prediction,
            id: existingPred?.id || `pred_${match.id}`,
          };
        });
        dispatch({ type: 'SET_PREDICTIONS', payload: predictions });
      }

      if (result.errors.length > 0) {
        dispatch({ type: 'SET_DATA_ERRORS', payload: result.errors });
      }
    } catch (err) {
      dispatch({
        type: 'SET_DATA_ERRORS',
        payload: [`Odds refresh failed: ${err instanceof Error ? err.message : String(err)}`],
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.matches, state.predictions, computeTeamRatings]);

  // 手动刷新所有数据
  const refreshData = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // 为指定比赛重新生成预测
  const predictMatch = useCallback(
    (matchId: string) => {
      const match = state.matches.find((m) => m.id === matchId);
      if (!match) return;

      const existingPred = state.predictions.find((p) => p.matchId === matchId);
      const prediction = PredictionEngine.rePredict(match, existingPred, state.teamRatings);

      dispatch({
        type: 'ADD_PREDICTION',
        payload: {
          ...prediction,
          id: existingPred?.id || `pred_${matchId}`,
        },
      });
    },
    [state.matches, state.predictions, state.teamRatings]
  );

  return (
    <AppContext.Provider value={{ state, dispatch, refreshOdds, predictMatch, refreshData }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
