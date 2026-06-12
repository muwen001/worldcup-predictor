import React from 'react';
import { useMatches, usePredictions } from '../../hooks/useMatches';
import { CheckCircle, XCircle, Minus, TrendingUp, Target } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const matches = useMatches();
  const predictions = usePredictions();

  // 模拟历史记录（添加一些已完成的预测）
  const historicalPredictions = predictions.slice(0, 20).map((pred, index) => {
    // 模拟部分已有结果
    const hasResult = index < 8;
    const actualResults: Array<'home' | 'draw' | 'away'> = ['home', 'draw', 'away', 'home', 'away', 'home', 'draw', 'home'];
    const actualResult = hasResult ? actualResults[index % actualResults.length] : undefined;
    const isCorrect = actualResult ? actualResult === pred.predictedOutcome : undefined;

    return {
      ...pred,
      actualResult,
      isCorrect,
    };
  });

  const completedPredictions = historicalPredictions.filter((p) => p.isCorrect !== undefined);
  const correctCount = completedPredictions.filter((p) => p.isCorrect).length;
  const accuracy = completedPredictions.length > 0
    ? (correctCount / completedPredictions.length) * 100
    : 0;

  const homeCorrect = completedPredictions.filter((p) => p.isCorrect && p.predictedOutcome === 'home').length;
  const drawCorrect = completedPredictions.filter((p) => p.isCorrect && p.predictedOutcome === 'draw').length;
  const awayCorrect = completedPredictions.filter((p) => p.isCorrect && p.predictedOutcome === 'away').length;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">预测历史</h2>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{completedPredictions.length}</div>
              <div className="text-sm text-gray-500">已完成预测</div>
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
              <div className="text-sm text-gray-500">准确率</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-success/10 rounded-lg">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
            <div>
              <div className="text-2xl font-bold">{correctCount}</div>
              <div className="text-sm text-gray-500">正确预测</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-danger/10 rounded-lg">
              <XCircle className="w-6 h-6 text-danger" />
            </div>
            <div>
              <div className="text-2xl font-bold">{completedPredictions.length - correctCount}</div>
              <div className="text-sm text-gray-500">错误预测</div>
            </div>
          </div>
        </div>
      </div>

      {/* 预测类型分布 */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-bold mb-4">正确预测分布</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-success">{homeCorrect}</div>
            <div className="text-sm text-gray-500">主胜预测正确</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-warning">{drawCorrect}</div>
            <div className="text-sm text-gray-500">平局预测正确</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{awayCorrect}</div>
            <div className="text-sm text-gray-500">客胜预测正确</div>
          </div>
        </div>
      </div>

      {/* 历史记录列表 */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-bold mb-4">预测记录</h3>
        <div className="space-y-3">
          {historicalPredictions.map((pred) => {
            const match = matches.find((m) => m.id === pred.matchId);
            if (!match) return null;

            return (
              <div
                key={pred.id}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  pred.isCorrect === undefined
                    ? 'bg-gray-50'
                    : pred.isCorrect
                    ? 'bg-success/5 border border-success/20'
                    : 'bg-danger/5 border border-danger/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{match.homeTeam.flag}</span>
                  <span className="font-medium">{match.homeTeam.nameCn}</span>
                  <span className="text-gray-400">vs</span>
                  <span className="font-medium">{match.awayTeam.nameCn}</span>
                  <span className="text-2xl">{match.awayTeam.flag}</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-500">
                    预测: {pred.predictedOutcome === 'home' ? '主胜' : pred.predictedOutcome === 'away' ? '客胜' : '平局'}
                  </div>
                  <div className="text-sm text-gray-500">
                    置信度: {pred.confidence}%
                  </div>
                  {pred.isCorrect !== undefined && (
                    <div className="flex items-center gap-1">
                      {pred.isCorrect ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-success" />
                          <span className="text-success text-sm font-medium">正确</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-danger" />
                          <span className="text-danger text-sm font-medium">错误</span>
                        </>
                      )}
                    </div>
                  )}
                  {pred.isCorrect === undefined && (
                    <div className="flex items-center gap-1 text-gray-400">
                      <Minus className="w-5 h-5" />
                      <span className="text-sm">待验证</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
