import React from 'react';
import type { Match, Prediction } from '../../types';
import { formatOdds, getResultName, getScorePredictionText } from '../../utils/oddsCalculator';
import { TrendingUp, ChevronDown, ChevronUp, Target, BarChart3 } from 'lucide-react';

interface MatchCardProps {
  match: Match;
  prediction?: Prediction;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, prediction, isExpanded, onToggle }) => {
  const mainOdds = match.odds[0];

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return 'bg-success';
    if (confidence >= 50) return 'bg-warning';
    return 'bg-gray-400';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 70) return 'text-success';
    if (confidence >= 50) return 'text-warning';
    return 'text-gray-500';
  };

  const getStageName = (stage: string): string => {
    const names: Record<string, string> = {
      group: '小组赛',
      round_of_32: '1/32决赛',
      round_of_16: '1/16决赛',
      quarter: '1/4决赛',
      semi: '半决赛',
      final: '决赛',
    };
    return names[stage] || stage;
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* 比赛概览头部 */}
      <div
        onClick={onToggle}
        className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-500">
            {match.stage === 'group' ? `${match.group}组 · ${getStageName(match.stage)}` : getStageName(match.stage)}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">{match.date}</span>
            <span className="text-sm font-medium text-gray-600">{match.time}</span>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          {/* 主队 */}
          <div className="flex flex-col items-center gap-1 flex-1">
            <span className="text-4xl">{match.homeTeam.flag}</span>
            <span className="font-bold text-lg">{match.homeTeam.nameCn}</span>
            <span className="text-xs text-gray-400">FIFA #{match.homeTeam.fifaRank}</span>
          </div>

          {/* 中间：赔率 + 预测 */}
          <div className="flex flex-col items-center gap-2 px-6">
            {mainOdds && (
              <div className="flex gap-3 text-sm">
                <div className="text-center px-2">
                  <div className="font-bold text-primary">{formatOdds(mainOdds.homeWin)}</div>
                  <div className="text-xs text-gray-400">主胜</div>
                </div>
                <div className="text-center px-2">
                  <div className="font-bold text-primary">{formatOdds(mainOdds.draw)}</div>
                  <div className="text-xs text-gray-400">平</div>
                </div>
                <div className="text-center px-2">
                  <div className="font-bold text-primary">{formatOdds(mainOdds.awayWin)}</div>
                  <div className="text-xs text-gray-400">客胜</div>
                </div>
              </div>
            )}
            {prediction && (
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full text-white font-medium ${getConfidenceColor(prediction.confidence)}`}>
                  {getResultName(prediction.predictedOutcome)}
                </span>
                {prediction.scorePredictions.length > 0 && (
                  <span className="text-sm font-bold text-primary">
                    {getScorePredictionText(prediction.scorePredictions[0])}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 客队 */}
          <div className="flex flex-col items-center gap-1 flex-1">
            <span className="text-4xl">{match.awayTeam.flag}</span>
            <span className="font-bold text-lg">{match.awayTeam.nameCn}</span>
            <span className="text-xs text-gray-400">FIFA #{match.awayTeam.fifaRank}</span>
          </div>
        </div>
      </div>

      {/* 展开预测详情 */}
      {isExpanded && prediction && (
        <div className="border-t border-gray-100 bg-gray-50/50">
          {/* 胜负预测 */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                赛果预测
              </h3>
              <span className={`text-sm font-bold ${getConfidenceText(prediction.confidence)}`}>
                置信度 {prediction.confidence}%
              </span>
            </div>

            {/* 概率条 */}
            <div className="space-y-2 mb-4">
              {[
                { label: match.homeTeam.nameCn + ' 胜', prob: prediction.probabilities.home, color: 'bg-success' },
                { label: '平局', prob: prediction.probabilities.draw, color: 'bg-warning' },
                { label: match.awayTeam.nameCn + ' 胜', prob: prediction.probabilities.away, color: 'bg-danger' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-sm w-24 text-right text-gray-600">{item.label}</span>
                  <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full flex items-center justify-end px-2`}
                      style={{ width: `${item.prob * 100}%` }}
                    >
                      <span className="text-xs text-white font-medium">{(item.prob * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 预测理由 */}
            <div className="space-y-1">
              {prediction.reasoning.map((reason, idx) => (
                <div key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-success mt-0.5">✓</span>
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 比分预测 */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                比分预测
              </h3>
              <div className="text-sm text-gray-500">
                预期进球: {prediction.expectedGoals.home} : {prediction.expectedGoals.away}
              </div>
            </div>

            {/* 最可能比分 */}
            <div className="grid grid-cols-5 gap-3">
              {prediction.scorePredictions.map((score, idx) => (
                <div
                  key={idx}
                  className={`text-center p-3 rounded-lg border-2 ${
                    score.isMostLikely
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className={`text-xl font-bold ${score.isMostLikely ? 'text-primary' : 'text-gray-700'}`}>
                    {score.homeScore} : {score.awayScore}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {score.probability.toFixed(1)}%
                  </div>
                  {score.isMostLikely && (
                    <div className="text-xs text-primary font-medium mt-0.5">最可能</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 赔率对比 */}
          <div className="p-5">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              主流博彩公司赔率
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="text-left py-2 px-3">博彩公司</th>
                    <th className="text-center py-2 px-3">{match.homeTeam.nameCn} 胜</th>
                    <th className="text-center py-2 px-3">平局</th>
                    <th className="text-center py-2 px-3">{match.awayTeam.nameCn} 胜</th>
                  </tr>
                </thead>
                <tbody>
                  {match.odds.map((odds) => (
                    <tr key={odds.source} className="border-b hover:bg-white">
                      <td className="py-2 px-3 font-medium">{odds.sourceName}</td>
                      <td className="text-center py-2 px-3">{formatOdds(odds.homeWin)}</td>
                      <td className="text-center py-2 px-3">{formatOdds(odds.draw)}</td>
                      <td className="text-center py-2 px-3">{formatOdds(odds.awayWin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};