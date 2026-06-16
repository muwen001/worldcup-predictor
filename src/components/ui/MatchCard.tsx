import React, { useState } from 'react';
import type { Match, MatchResult, Prediction } from '../../types';
import { formatOdds, getResultName } from '../../utils/oddsCalculator';
import { Clock } from 'lucide-react';
import { MatchDetailModal } from './MatchDetailModal';

interface MatchCardProps {
  match: Match;
  prediction?: Prediction;
}

const getResultLabel = (result: MatchResult): string => {
  const labels: Record<string, string> = { home: '主胜', draw: '平局', away: '客胜' };
  return labels[result];
};

const getResultColor = (result: MatchResult) => {
  if (result === 'home') return 'bg-success/20 text-success';
  if (result === 'draw') return 'bg-warning/20 text-warning';
  return 'bg-danger/20 text-danger';
};

export const MatchCard: React.FC<MatchCardProps> = ({ match, prediction }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const mainOdds = match.odds[0];

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

  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live';

  // 预测比分文本
  const predictedScoreText = prediction && prediction.scorePredictions.length > 0
    ? `${prediction.scorePredictions[0].homeScore}:${prediction.scorePredictions[0].awayScore}`
    : '';

  // 实际/实时比分文本
  const actualScoreText = match.score
    ? `${match.score.home}:${match.score.away}`
    : '-';

  // 预测比分是否正确（已结束比赛才判断）
  const isScoreCorrect = isFinished && match.score && prediction && prediction.scorePredictions.length > 0
    && prediction.scorePredictions[0].homeScore === match.score.home
    && prediction.scorePredictions[0].awayScore === match.score.away;

  // 预测结果是否正确（主胜/平局/客胜）
  const isOutcomeCorrect = isFinished && prediction && match.result
    && prediction.predictedOutcome === match.result;

  // 预测比分颜色：比分数字正确=绿色，错误=红色；未结束=灰色
  const predictedScoreColor = isFinished
    ? (isScoreCorrect ? 'text-[#22c55e]' : 'text-[#ef4444]')
    : 'text-gray-600';

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className={`bg-white rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow ${
          isLive ? 'ring-2 ring-danger' : ''
        }`}
      >
        {/* 比赛概览头部 */}
        <div className="p-4">
          {/* 第一行：组别 + 时间 + 状态 */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">
              {match.stage === 'group' ? `${match.group}组 · ${getStageName(match.stage)}` : getStageName(match.stage)}
            </span>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">{match.time}</span>
              {isLive && (
                <span className="bg-danger text-white text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">
                  LIVE
                </span>
              )}
              {isFinished && (
                <span className="bg-gray-300 text-gray-700 text-xs px-2 py-0.5 rounded-full font-medium">
                  已结束
                </span>
              )}
            </div>
          </div>

          {/* 第二行：两队 + 中间比分 */}
          <div className="flex items-center justify-between">
            {/* 主队 */}
            <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
              <span className="text-3xl">{match.homeTeam.flag}</span>
              <span className="font-bold text-base truncate">{match.homeTeam.nameCn}</span>
            </div>

            {/* 中间：比分区域 - 实际比分 / 预测比分 */}
            <div className="flex flex-col items-center gap-1.5 px-4">
              {/* 实际比分行 */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">比分</span>
                <span className={`text-2xl font-bold tracking-wider ${
                  isFinished ? 'text-primary' : isLive ? 'text-primary' : 'text-gray-300'
                }`}>
                  {actualScoreText}
                </span>
                {isFinished && match.result && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${getResultColor(match.result)}`}>
                    {getResultLabel(match.result)}
                  </span>
                )}
              </div>

              {/* 预测比分行 */}
              {predictedScoreText && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400">预测</span>
                  <span className={`text-sm font-semibold ${predictedScoreColor}`}>
                    {predictedScoreText}
                  </span>
                  {prediction && (
                    <>
                      {isFinished ? (
                        <>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                            isOutcomeCorrect ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-[#ef4444]/20 text-[#ef4444]'
                          }`}>
                            {getResultName(prediction.predictedOutcome)}
                          </span>
                          <span className={`text-sm font-bold ${isOutcomeCorrect ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                            {isOutcomeCorrect ? '✓' : '✗'}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-500 font-medium">
                          {getResultName(prediction.predictedOutcome)}
                        </span>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* 未开始的赔率简要 */}
              {!isFinished && !isLive && mainOdds && (
                <div className="flex gap-2 text-xs text-gray-500 mt-0.5">
                  <span>{formatOdds(mainOdds.homeWin)}</span>
                  <span>/</span>
                  <span>{formatOdds(mainOdds.draw)}</span>
                  <span>/</span>
                  <span>{formatOdds(mainOdds.awayWin)}</span>
                </div>
              )}
            </div>

            {/* 客队 */}
            <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
              <span className="text-3xl">{match.awayTeam.flag}</span>
              <span className="font-bold text-base truncate">{match.awayTeam.nameCn}</span>
            </div>
          </div>
        </div>
      </div>

      <MatchDetailModal
        match={match}
        prediction={prediction}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
