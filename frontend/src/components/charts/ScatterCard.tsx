"use client";

import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, Cell,
} from "recharts";

const PALETTE = ["#6366f1", "#f59e0b", "#22c55e", "#ef4444", "#3b82f6", "#8b5cf6"];

interface Point {
  x: number;
  y: number;
  model: string;
  mode: string;
  scenario: string;
  label: string;
}

interface Props {
  title: string;
  caption?: string;
  data: Point[];
  height?: number;
}

const CustomDot = (props: {
  cx?: number; cy?: number; payload?: Point; fill?: string;
}) => {
  const { cx = 0, cy = 0, payload, fill } = props;
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill={fill} fillOpacity={0.8} stroke={fill} strokeWidth={1.5} />
      <text x={cx} y={cy - 11} textAnchor="middle" fontSize={9} fill="#6b7280">
        {payload?.scenario}
      </text>
    </g>
  );
};

export default function ScatterCard({ title, caption, data, height = 380 }: Props) {
  const models = Array.from(new Set(data.map((d) => d.model))).sort();

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <p className="font-semibold text-gray-800 mb-0.5">{title}</p>
      {caption && <p className="text-xs text-gray-400 mb-4">{caption}</p>}
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 20, right: 24, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            type="number" dataKey="x" name="Leakage rate"
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            fontSize={11} label={{ value: "Leakage rate", position: "insideBottom", offset: -12, fontSize: 11 }}
          />
          <YAxis
            type="number" dataKey="y" name="Task score"
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            fontSize={11} label={{ value: "Task score", angle: -90, position: "insideLeft", fontSize: 11 }}
          />
          <ReferenceLine x={0.5} stroke="#cbd5e1" strokeDasharray="4 4" />
          <ReferenceLine y={0.5} stroke="#cbd5e1" strokeDasharray="4 4" />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0].payload as Point;
              return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-2 text-xs">
                  <p className="font-semibold">{d.scenario}</p>
                  <p className="text-gray-500">{d.model} · {d.mode}</p>
                  <p>Leak: <strong>{(d.x * 100).toFixed(0)}%</strong></p>
                  <p>Task: <strong>{(d.y * 100).toFixed(0)}%</strong></p>
                </div>
              );
            }}
          />
          <Legend />
          {models.map((model, i) => (
            <Scatter
              key={model}
              name={model}
              data={data.filter((d) => d.model === model)}
              fill={PALETTE[i % PALETTE.length]}
              shape={(props: { cx?: number; cy?: number; payload?: Point; fill?: string }) => (
                <CustomDot {...props} fill={PALETTE[i % PALETTE.length]} />
              )}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
      <div className="mt-2 grid grid-cols-2 text-xs text-gray-400 text-center gap-2">
        <p>✓ top-left = ideal (low leak, high task)</p>
        <p>✗ bottom-right = worst (high leak, low task)</p>
      </div>
    </div>
  );
}
