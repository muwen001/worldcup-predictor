import React from 'react';
import type { Match, MatchResult, Prediction } from '../../types';
import { formatOdds, getResultName } from '../../utils/oddsCalculator';
import { TrendingUp, Target, BarChart3, Clock, CheckCircle, XCircle } from 'lucide-react';
import { PredictionChart } from '../charts/PredictionChart';
import { Modal } from './Modal';

interface MatchDetailModalProps {
  match: Match;
  prediction?: Prediction;
  isOpen: boolean;
  onClose: () => void;
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

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({ match, prediction, isOpen, onClose }) => {
  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live';

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

  const isScoreCorrect = isFinished && match.score && prediction && prediction.scorePredictions.length > 0
    && prediction.scorePredictions[0].homeScore === match.score.home
    && prediction.scorePredictions[0].awayScore === match.score.away;

  const isOutcomeCorrect = isFinished && prediction && match.result
    && prediction.predictedOutcome === match.result;

  const predictedScoreText = prediction && prediction.scorePredictions.length > 0
    ? `${prediction.scorePredictions[0].homeScore}:${prediction.scorePredictions[0].awayScore}`
    : '';

  const actualScoreText = match.score
    ? `${match.score.home}:${match.score.away}`
    : '-';

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {/* 比赛基本信息 */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-sm text-gray-500">
            {match.stage === 'group' ? `${match.group}组 · ${getStageName(match.stage)}` : getStageName(match.stage)}
          </span>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm text-gray-600">{match.time}</span>
          </div>
          {isLive && (
            <span className="bg-danger text-white text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">
              LIVE
            </span>
          )}
          {isFinished && (
            <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full font-medium">
              已结束
            </span>
          )}
        </div>

        <div className="flex items-center justify-between px-4">
          <div className="flex-1 text-center">
            <div className="text-4xl mb-2">{match.homeTeam.flag}</div>
            <div className="font-bold text-lg">{match.homeTeam.nameCn}</div>
          </div>

          <div className="px-6">
            <div className="text-4xl font-bold text-primary tracking-wider">
              {actualScoreText}
            </div>
            {isFinished && match.result && (
              <div className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${getResultColor(match.result)}`}>
                {getResultLabel(match.result)}
              </div>
            )}
          </div>

          <div className="flex-1 text-center">
            <div className="text-4xl mb-2">{match.awayTeam.flag}</div>
            <div className="font-bold text-lg">{match.awayTeam.nameCn}</div>
          </div>
        </div>

        {predictedScoreText && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">预测比分：</span>
            <span className={`text-lg font-semibold ${
              isFinished
                ? (isScoreCorrect ? 'text-[#22c55e]' : 'text-[#ef4444]')
                : 'text-gray-700'
            }`}>
              {predictedScoreText}
            </span>
            {prediction && (
              <>
                <span className={`ml-2 text-sm px-2 py-0.5 rounded-full ${
                  isFinished
                    ? (isOutcomeCorrect ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-[#ef4444]/20 text-[#ef4444]')
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {getResultName(prediction.predictedOutcome)}
                </span>
                {isFinished && (
                  <span className={`ml-2 text-lg font-bold ${isOutcomeCorrect ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                    {isOutcomeCorrect ? '✓' : ''}
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* 已结束比赛 - 预测对比 */}
      {isFinished && prediction && match.result && (
        <div className="mb-6">
          <div className={`p-4 rounded-lg ${
            isOutcomeCorrect
              ? 'bg-success/10 border border-success/30'
              : 'bg-danger/10 border border-danger/30'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-500">预测结果</span>
                <div className="font-bold">{getResultName(prediction.predictedOutcome)}</div>
              </div>
              <div className="text-3xl">
                {isOutcomeCorrect ? <CheckCircle className="w-8 h-8 text-success" /> : <XCircle className="w-8 h-8 text-danger" />}
              </div>
              <div className="text-right">
                <span className="text-sm text-gray-500">实际结果</span>
                <div className="font-bold">{getResultLabel(match.result)}</div>
              </div>
            </div>
            {prediction.scorePredictions.length > 0 && match.score && (
              <div className="mt-3 pt-3 border-t border-gray-200/50 text-sm text-gray-600">
                预测比分: {prediction.scorePredictions[0].homeScore}:{prediction.scorePredictions[0].awayScore}
                <span className="mx-2 text-gray-400">|</span>
                实际比分: {match.score.home}:{match.score.away}
                {isScoreCorrect && (
                  <span className="text-success ml-2 font-medium">比分完全正确!</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 胜平负预测 */}
      {prediction && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              胜平负预测
            </h3>
            <span className={`text-sm font-bold ${getConfidenceText(prediction.confidence)}`}>
              置信度 {prediction.confidence}%
            </span>
          </div>

          <div className="mb-4">
            <PredictionChart prediction={prediction} />
          </div>

          {prediction.reasoning.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-gray-500 font-medium">预测理由：</div>
              {prediction.reasoning.map((reason, idx) => (
                <div key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-success mt-0.5">✓</span>
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 比分预测 */}
      {prediction && prediction.scorePredictions.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-accent-dark" />
              比分预测
            </h3>
            <div className="text-sm text-gray-500">
              预期进球: {prediction.expectedGoals.home} : {prediction.expectedGoals.away}
            </div>
          </div>

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
                  {score.homeScore}:{score.awayScore}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {score.probability.toFixed(1)}%
                </div>
                {score.isMostLikely && (
                  <div className="text-xs text-primary font-medium mt-1">最可能</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 赔率对比 */}
      {match.odds.length > 0 && (
        <div>
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
                  <tr key={odds.source} className="border-b hover:bg-gray-50">
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
      )}
    </Modal>
  );
};