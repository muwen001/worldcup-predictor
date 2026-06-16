import React from 'react';
import { Trophy, RefreshCw, Clock, Wifi, WifiOff, AlertCircle, Database } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Header: React.FC = () => {
  const { refreshData, state } = useApp();

  const hasErrors = state.dataErrors.length > 0;
  const activeSources = state.sourceStatus.filter(s => s.connected && s.lastFetch);
  const staticOnly = !state.isRealTime && activeSources.some(s => s.source === 'static-cache');

  return (
    <header className="bg-primary text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-accent" />
            <div>
              <h1 className="text-xl font-bold">2026世界杯预测系统</h1>
              <p className="text-sm text-gray-300">基于实时赔率的智能预测</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* 数据源状态指示 */}
            <div className="flex items-center gap-2 text-sm">
              {state.isRealTime ? (
                <span className="flex items-center gap-1 text-green-400">
                  <Wifi className="w-4 h-4" />
                  实时数据
                </span>
              ) : staticOnly ? (
                <span className="flex items-center gap-1 text-yellow-400">
                  <Database className="w-4 h-4" />
                  静态数据
                </span>
              ) : (
                <span className="flex items-center gap-1 text-gray-400">
                  <WifiOff className="w-4 h-4" />
                  离线模式
                </span>
              )}
              {hasErrors && (
                <span className="flex items-center gap-1 text-red-400" title={state.dataErrors.join('\n')}>
                  <AlertCircle className="w-4 h-4" />
                  {state.dataErrors.length} 错误
                </span>
              )}
            </div>

            <div className="text-sm text-gray-300 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>
                更新: {new Date(state.lastUpdated).toLocaleTimeString('zh-CN')}
              </span>
            </div>
            <button
              onClick={() => refreshData()}
              disabled={state.isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-primary-dark rounded-lg hover:bg-accent-light transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${state.isLoading ? 'animate-spin' : ''}`} />
              <span>刷新数据</span>
            </button>
          </div>
        </div>

        {/* 数据源详情 */}
        {activeSources.length > 0 && (
          <div className="mt-2 flex gap-3 text-xs text-gray-400">
            {activeSources.map(s => (
              <span key={s.source} className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${s.oddsAvailable ? 'bg-green-500' : 'bg-yellow-500'}`} />
                {s.source}
                {s.lastFetch && ` (${new Date(s.lastFetch).toLocaleTimeString('zh-CN')})`}
              </span>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};
