import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { Odds } from '../../types';

interface OddsTrendChartProps {
  odds: Odds[];
}

export const OddsTrendChart: React.FC<OddsTrendChartProps> = ({ odds }) => {
  // 合并所有公司的历史数据
  const data = odds[0]?.history.map((_, index) => {
    const point: Record<string, string | number> = {
      date: new Date(odds[0].history[index].timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
    };

    odds.forEach((odd) => {
      point[`${odd.sourceName}_主胜`] = odd.history[index].homeWin;
      point[`${odd.sourceName}_平局`] = odd.history[index].draw;
      point[`${odd.sourceName}_客胜`] = odd.history[index].awayWin;
    });

    return point;
  }) || [];

  const colors = ['#22c55e', '#f97316', '#ef4444', '#3b82f6', '#8b5cf6', '#06b6d4'];

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-bold mb-4">赔率变化趋势</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} />
            <Tooltip />
            <Legend />
            {odds.map((odd, companyIndex) => (
              <React.Fragment key={odd.source}>
                <Line
                  type="monotone"
                  dataKey={`${odd.sourceName}_主胜`}
                  stroke={colors[companyIndex % colors.length]}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey={`${odd.sourceName}_平局`}
                  stroke={colors[(companyIndex + 1) % colors.length]}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey={`${odd.sourceName}_客胜`}
                  stroke={colors[(companyIndex + 2) % colors.length]}
                  strokeWidth={2}
                  strokeDasharray="10 5"
                  dot={false}
                />
              </React.Fragment>
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
