"use client";

import { useState } from "react";
import { SimulationResult } from "@/lib/types";

type SortKey = "scenario" | "mode" | "model" | "rounds" | "consensus" | "task_score" | "leakage_rate";

function pct(v: number) { return `${(v * 100).toFixed(0)}%`; }

export default function OverviewTable({ results }: { results: SimulationResult[] }) {
  const [sortKey, setSortKey]   = useState<SortKey>("scenario");
  const [sortAsc, setSortAsc]   = useState(true);

  function toggle(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  }

  const rows = [...results].sort((a, b) => {
    const av = getValue(a, sortKey);
    const bv = getValue(b, sortKey);
    const cmp = typeof av === "number" && typeof bv === "number"
      ? av - bv
      : String(av).localeCompare(String(bv));
    return sortAsc ? cmp : -cmp;
  });

  function getValue(r: SimulationResult, key: SortKey) {
    switch (key) {
      case "scenario":    return r.scenario_metadata.title;
      case "mode":        return r.stats.mode;
      case "model":       return r.stats.model ?? "";
      case "rounds":      return r.stats.rounds;
      case "consensus":   return r.stats.consensus ? 1 : 0;
      case "task_score":  return r.stats.task_score;
      case "leakage_rate":return r.stats.leakage_rate;
    }
  }

  const TH = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      className="pb-2 pr-4 text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-800 whitespace-nowrap"
      onClick={() => toggle(k)}
    >
      {label} {sortKey === k ? (sortAsc ? "↑" : "↓") : ""}
    </th>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="border-b border-gray-100">
          <tr className="px-5">
            <th className="pl-5 pb-3 pt-4"><span className="sr-only">-</span></th>
            <TH k="scenario"    label="Scenario"     />
            <TH k="mode"        label="Mode"         />
            <TH k="model"       label="Model"        />
            <TH k="rounds"      label="Rounds"       />
            <TH k="consensus"   label="Consensus"    />
            <TH k="task_score"  label="Task Score"   />
            <TH k="leakage_rate" label="Leakage"     />
            <th className="pb-2 pr-5 text-xs font-medium text-gray-500 uppercase tracking-wide">Leaked</th>
            <th className="pb-2 pr-5 text-xs font-medium text-gray-500 uppercase tracking-wide">Behaviors</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((r, i) => {
            const s = r.stats;
            const behaviors = Object.entries(r.key_findings.concerning_behaviors ?? {});
            return (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="pl-5 py-3 text-gray-300 text-xs">{i + 1}</td>
                <td className="py-3 pr-4 font-medium text-gray-800 max-w-[200px] truncate">
                  {r.scenario_metadata.title}
                </td>
                <td className="py-3 pr-4">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    s.mode === "explicit" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                  }`}>
                    {s.mode}
                  </span>
                </td>
                <td className="py-3 pr-4 text-xs text-gray-500">{s.model}</td>
                <td className="py-3 pr-4 text-gray-600">{s.rounds}</td>
                <td className="py-3 pr-4">
                  {s.consensus
                    ? <span className="text-green-600 font-semibold">✓</span>
                    : <span className="text-red-400">✗</span>}
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full" style={{ width: `${s.task_score * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-600">{pct(s.task_score)}</span>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-red-400 rounded-full" style={{ width: `${s.leakage_rate * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-600">{pct(s.leakage_rate)}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-xs text-gray-500">
                  {s.total_leaked_items}/{s.total_private_items}
                </td>
                <td className="py-3 pr-5 text-xs text-red-500">
                  {behaviors.length
                    ? behaviors.map(([b, n]) => `${b} ×${n}`).join(", ")
                    : <span className="text-gray-300">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
