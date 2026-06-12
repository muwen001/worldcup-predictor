import React from 'react';
import { MatchCard } from '../../components/ui/MatchCard';
import { useMatches, usePredictions } from '../../hooks/useMatches';
import { TrendingUp, Target, BarChart3, Calendar } from 'lucide-react';

export const HomePage: React.FC = () => {
  const matches = useMatches();
  const predictions = usePredictions();

  // 获取时序上最近的 upcoming/live 比赛作为今日焦点（最多3场）
  const featuredMatches = matches
    .filter((m) => m.status === 'upcoming' || m.status === 'live')
    .slice(0, 3);

  // 获取最近已完成的比赛（最多2场）
  const recentFinished = matches
    .filter((m) => m.status === 'finished')
    .slice(-2);

  // 计算系统整体准确率（模拟）
  const totalPredictions = predictions.length;
  const correctPredictions = Math.floor(totalPredictions * 0.68);
  const accuracy = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;

  // 高置信度预测
  const highConfidencePredictions = predictions
    .filter((p) => p.confidence >= 70)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalPredictions}</div>
              <div className="text-sm text-gray-500">总预测场次</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-success/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
            <div>
              <div className="text-2xl font-bold">{accuracy.toFixed(1)}%</div>
              <div className="text-sm text-gray-500">预测准确率</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-accent/10 rounded-lg">
              <BarChart3 className="w-6 h-6 text-accent-dark" />
            </div>
            <div>
              <div className="text-2xl font-bold">{highConfidencePredictions.length}</div>
              <div className="text-sm text-gray-500">高置信度预测</div>
            </div>
          </div>
        </div>
      </div>

      {/* 今日焦点 */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">今日焦点</h2>
          <span className="text-sm text-gray-500 ml-auto">
            {featuredMatches.length > 0
              ? `${featuredMatches[0].date} 起`
              : '暂无即将进行的比赛'}
          </span>
        </div>
        {featuredMatches.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {featuredMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                prediction={predictions.find((p) => p.matchId === match.id)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-8 text-center text-gray-500">
            所有比赛已结束
          </div>
        )}
      </div>

      {/* 最近赛果 */}
      {recentFinished.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">最近赛果</h2>
          <div className="grid grid-cols-1 gap-4">
            {recentFinished.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                prediction={predictions.find((p) => p.matchId === match.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 高置信度预测 */}
      {highConfidencePredictions.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">高置信度预测推荐</h2>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="space-y-3">
              {highConfidencePredictions.map((pred) => {
                const match = matches.find((m) => m.id === pred.matchId);
                if (!match) return null;
                return (
                  <div
                    key={pred.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{match.homeTeam.flag}</span>
                      <span className="font-medium">{match.homeTeam.nameCn}</span>
                      <span className="text-gray-400">vs</span>
                      <span className="font-medium">{match.awayTeam.nameCn}</span>
                      <span className="text-2xl">{match.awayTeam.flag}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        {match.date} {match.time}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-success text-white rounded-full text-sm font-medium">
                        {pred.predictedOutcome === 'home'
                          ? '主胜'
                          : pred.predictedOutcome === 'away'
                          ? '客胜'
                          : '平局'}
                      </span>
                      <span className="text-sm text-gray-500">
                        置信度: {pred.confidence}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
