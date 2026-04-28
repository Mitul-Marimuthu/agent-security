"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";

const PALETTE = [
  "#6366f1", "#f59e0b", "#22c55e", "#ef4444",
  "#3b82f6", "#8b5cf6", "#06b6d4", "#f97316",
];

interface Props {
  title: string;
  caption?: string;
  data: Record<string, string | number>[];
  bars: { key: string; label?: string; color?: string }[];
  xKey: string;
  layout?: "vertical" | "horizontal";
  stacked?: boolean;
  pct?: boolean;
  refLine?: number;
  height?: number;
}

function fmt(pct: boolean) {
  return (v: number) => (pct ? `${(v * 100).toFixed(0)}%` : v.toFixed(2));
}

export default function BarChartCard({
  title, caption, data, bars, xKey,
  layout = "vertical", stacked = false, pct = false,
  refLine, height = 320,
}: Props) {
  const isHoriz = layout === "horizontal";
  const stackId = stacked ? "s" : undefined;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <p className="font-semibold text-gray-800 mb-0.5">{title}</p>
      {caption && <p className="text-xs text-gray-400 mb-4">{caption}</p>}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout={isHoriz ? "vertical" : "horizontal"}
          margin={{ top: 4, right: 24, bottom: 4, left: isHoriz ? 140 : 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          {isHoriz ? (
            <>
              <XAxis type="number" tickFormatter={fmt(pct)} fontSize={11} />
              <YAxis type="category" dataKey={xKey} width={136} fontSize={11} tick={{ fill: "#4b5563" }} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} fontSize={11} tick={{ fill: "#4b5563" }} />
              <YAxis tickFormatter={fmt(pct)} fontSize={11} />
            </>
          )}
          <Tooltip formatter={(v: number) => fmt(pct)(v)} />
          {bars.length > 1 && <Legend />}
          {refLine !== undefined && (
            <ReferenceLine
              {...(isHoriz ? { x: refLine } : { y: refLine })}
              stroke="#94a3b8"
              strokeDasharray="4 4"
            />
          )}
          {bars.map(({ key, label, color }, i) => (
            <Bar
              key={key}
              dataKey={key}
              name={label ?? key}
              fill={color ?? PALETTE[i % PALETTE.length]}
              stackId={stackId}
              radius={stacked || bars.length > 1 ? 0 : [3, 3, 0, 0]}
            >
              {!color && bars.length === 1
                ? data.map((_, j) => (
                    <Cell key={j} fill={PALETTE[j % PALETTE.length]} />
                  ))
                : null}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
