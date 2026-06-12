import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import type { AppState, AppAction, PredictionRecord } from '../types';
import { dataService } from '../services/dataService';
import { getApiConfig, hasAnyApiKey, getDefaultSourceStatus } from '../services/apiConfig';
import { PredictionEngine } from '../services/predictionEngine';

const initialState: AppState = {
  matches: [],
  predictions: [],
  selectedMatchId: null,
  expandedMatchId: null,
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
    case 'SET_EXPANDED_MATCH':
      return { ...state, expandedMatchId: action.payload };
    case 'SET_LAST_UPDATED':
      return { ...state, lastUpdated: action.payload };
    case 'SET_SOURCE_STATUS':
      return { ...state, sourceStatus: action.payload };
    case 'SET_DATA_ERRORS':
      return { ...state, dataErrors: action.payload };
    case 'SET_REAL_TIME':
      return { ...state, isRealTime: action.payload };
    default:
      return state;
  }
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

  // 初始化数据：从API/缓存/静态数据获取
  const loadData = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const result = await dataService.fetchMatches();
      
      dispatch({ type: 'SET_MATCHES', payload: result.matches });
      dispatch({ type: 'SET_SOURCE_STATUS', payload: result.sourceStatus });
      dispatch({ type: 'SET_DATA_ERRORS', payload: result.errors });
      dispatch({ type: 'SET_REAL_TIME', payload: result.isRealTime });
      dispatch({ type: 'SET_LAST_UPDATED', payload: result.lastUpdated });

      // 生成预测
      const predictions: PredictionRecord[] = result.matches.map((match) => {
        const prediction = PredictionEngine.predict(match);
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
  }, []);

  // 首次加载
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 设置轮询（如果启用了API轮询）
  useEffect(() => {
    const config = getApiConfig();
    if (!config.enablePolling || !hasAnyApiKey()) return;

    pollingRef.current = setInterval(() => {
      loadData();
    }, config.pollingInterval);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [loadData]);

  // 刷新赔率（手动触发）
  const refreshOdds = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const result = await dataService.refreshOdds(state.matches);
      
      if (result.hasNewData) {
        dispatch({ type: 'SET_MATCHES', payload: result.updatedMatches });
        dispatch({ type: 'SET_LAST_UPDATED', payload: new Date().toISOString() });

        // 重新生成预测
        const predictions: PredictionRecord[] = result.updatedMatches.map((match) => {
          const existingPred = state.predictions.find((p) => p.matchId === match.id);
          const prediction = PredictionEngine.rePredict(match, existingPred);
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
  }, [state.matches, state.predictions]);

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
      const prediction = PredictionEngine.rePredict(match, existingPred);

      dispatch({
        type: 'ADD_PREDICTION',
        payload: {
          ...prediction,
          id: existingPred?.id || `pred_${matchId}`,
        },
      });
    },
    [state.matches, state.predictions]
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
