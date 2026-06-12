import React, { useState } from 'react';
import { MatchCard } from '../../components/ui/MatchCard';
import { useMatches, usePredictions, useExpandedMatch } from '../../hooks/useMatches';
import { Filter } from 'lucide-react';
import type { MatchStage } from '../../types';

const STAGE_FILTERS: { value: MatchStage | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'group', label: '小组赛' },
  { value: 'round_of_32', label: '1/32决赛' },
  { value: 'round_of_16', label: '1/16决赛' },
  { value: 'quarter', label: '1/4决赛' },
  { value: 'semi', label: '半决赛' },
  { value: 'final', label: '决赛' },
];

export const MatchesPage: React.FC = () => {
  const matches = useMatches();
  const predictions = usePredictions();
  const { expandedMatchId, toggleExpanded } = useExpandedMatch();
  const [stageFilter, setStageFilter] = useState<MatchStage | 'all'>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');

  const filteredMatches = matches.filter((match) => {
    if (stageFilter !== 'all' && match.stage !== stageFilter) return false;
    if (groupFilter !== 'all' && match.group !== groupFilter) return false;
    return true;
  });

  const groups = Array.from(new Set(matches.filter((m) => m.group).map((m) => m.group!))).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">比赛列表</h2>
        <div className="text-sm text-gray-500">
          共 {filteredMatches.length} 场比赛
        </div>
      </div>

      {/* 筛选器 */}
      <div className="bg-white rounded-xl shadow-md p-4 space-y-4">
        <div className="flex items-center gap-2 text-gray-700">
          <Filter className="w-5 h-5" />
          <span className="font-medium">筛选</span>
        </div>

        <div className="space-y-3">
          <div>
            <span className="text-sm text-gray-500 mb-2 block">比赛阶段</span>
            <div className="flex flex-wrap gap-2">
              {STAGE_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStageFilter(filter.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    stageFilter === filter.value
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {stageFilter === 'group' && (
            <div>
              <span className="text-sm text-gray-500 mb-2 block">小组</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setGroupFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    groupFilter === 'all'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  全部
                </button>
                {groups.map((group) => (
                  <button
                    key={group}
                    onClick={() => setGroupFilter(group)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      groupFilter === group
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {group}组
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 比赛列表 */}
      <div className="grid grid-cols-1 gap-4">
        {filteredMatches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            prediction={predictions.find((p) => p.matchId === match.id)}
            isExpanded={expandedMatchId === match.id}
            onToggle={() => toggleExpanded(match.id)}
          />
        ))}
      </div>
    </div>
  );
};
