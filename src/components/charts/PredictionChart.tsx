import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import type { Prediction } from '../../types';
import { getResultName } from '../../utils/oddsCalculator';

interface PredictionChartProps {
  prediction: Prediction;
}

const COLORS = ['#22c55e', '#f97316', '#ef4444'];

export const PredictionChart: React.FC<PredictionChartProps> = ({ prediction }) => {
  const data = [
    { name: getResultName('home'), value: prediction.probabilities.home, key: 'home' },
    { name: getResultName('draw'), value: prediction.probabilities.draw, key: 'draw' },
    { name: getResultName('away'), value: prediction.probabilities.away, key: 'away' },
  ];

  const predictedIndex =
    prediction.predictedOutcome === 'home' ? 0 : prediction.predictedOutcome === 'draw' ? 1 : 2;

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-bold mb-4">预测概率分布</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
              label={({ name, value }) => `${name}: ${(value * 100).toFixed(1)}%`}
            >
              {data.map((_entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index]}
                  stroke={index === predictedIndex ? '#1e3a5f' : 'none'}
                  strokeWidth={index === predictedIndex ? 3 : 0}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 space-y-2">
        {data.map((item, index) => (
          <div key={item.key} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: COLORS[index] }}
            />
            <span className="flex-1">{item.name}</span>
            <span className="font-bold">{(item.value * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
