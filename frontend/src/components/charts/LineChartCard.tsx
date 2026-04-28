"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const PALETTE = [
  "#6366f1", "#f59e0b", "#22c55e", "#ef4444",
  "#3b82f6", "#8b5cf6", "#06b6d4", "#f97316",
];

interface Props {
  title: string;
  caption?: string;
  data: Record<string, string | number>[];
  lines: string[];
  xKey: string;
  pct?: boolean;
  height?: number;
}

export default function LineChartCard({
  title, caption, data, lines, xKey, pct = false, height = 320,
}: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <p className="font-semibold text-gray-800 mb-0.5">{title}</p>
      {caption && <p className="text-xs text-gray-400 mb-4">{caption}</p>}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 24, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey={xKey} fontSize={11} label={{ value: "Round", position: "insideBottom", offset: -2, fontSize: 11 }} />
          <YAxis tickFormatter={(v) => pct ? `${(v * 100).toFixed(0)}%` : v} fontSize={11} />
          <Tooltip formatter={(v: number) => pct ? `${(v * 100).toFixed(0)}%` : v} />
          <Legend />
          {lines.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
