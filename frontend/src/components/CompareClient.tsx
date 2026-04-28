"use client";

import { useState } from "react";
import { SimulationResult } from "@/lib/types";
import { StatCard, StatRow } from "./StatCards";
import AgentTable from "./AgentTable";
import ConversationFeed from "./ConversationFeed";

function resultLabel(r: SimulationResult) {
  return `${r.scenario_metadata.title}  |  ${r.stats.mode}  |  ${r.stats.model ?? "?"}`;
}

type Tab = "privacy" | "conversation" | "proposals";

function ProposalEntry({ p }: { p: SimulationResult["proposals"][0] }) {
  let content = p.content;
  try { content = JSON.stringify(JSON.parse(p.content), null, 2); } catch { /* use raw */ }
  return (
    <div className="border-l-4 border-indigo-400 bg-indigo-50 rounded-r-lg p-3 mb-2">
      <p className="text-xs font-bold text-indigo-700 mb-1">
        [{p.id?.slice(0, 8)}] — Round {p.round} — {p.sender}
      </p>
      <pre className="text-xs font-mono whitespace-pre-wrap text-indigo-900 bg-white rounded p-2 border border-indigo-100">
        {content}
      </pre>
    </div>
  );
}

function RunPanel({ r, tab }: { r: SimulationResult; tab: Tab }) {
  const s = r.stats;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="font-semibold text-gray-800 truncate">{r.scenario_metadata.title}</h3>
        <p className="text-xs text-gray-400">
          <strong>{s.mode}</strong> · {s.model}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Rounds"    value={s.rounds} />
        <StatCard label="Consensus" value={s.consensus ? "✓" : "✗"} color={s.consensus ? "green" : "red"} />
        <StatCard label="Task"      value={`${(s.task_score * 100).toFixed(0)}%`} color="blue" />
        <StatCard label="Leakage"   value={`${(s.leakage_rate * 100).toFixed(0)}%`} color="red" />
      </div>

      {tab === "privacy" && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <AgentTable agentStats={s.agent_stats} compact />
        </div>
      )}

      {tab === "conversation" && (
        <ConversationFeed
          conversation={r.conversation}
          leakageRecords={r.leakage_records ?? []}
          expandable
        />
      )}

      {tab === "proposals" && (
        <div>
          {r.proposals.length === 0
            ? <p className="text-xs text-gray-400">No proposals.</p>
            : r.proposals.map((p, i) => <ProposalEntry key={i} p={p} />)}
        </div>
      )}
    </div>
  );
}

export default function CompareClient({ results }: { results: SimulationResult[] }) {
  const [leftIdx,  setLeftIdx]  = useState(0);
  const [rightIdx, setRightIdx] = useState(Math.min(1, results.length - 1));
  const [tab,      setTab]      = useState<Tab>("privacy");

  const tabCls = (t: Tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      tab === t
        ? "border-indigo-500 text-indigo-600"
        : "border-transparent text-gray-500 hover:text-gray-800"
    }`;

  const Selector = ({ value, onChange }: { value: number; onChange: (n: number) => void }) => (
    <select
      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {results.map((r, i) => <option key={i} value={i}>{resultLabel(r)}</option>)}
    </select>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Side-by-Side Comparison</h1>
      <p className="text-sm text-gray-400 mb-5">Compare different models or modes on the same scenario.</p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Selector value={leftIdx}  onChange={setLeftIdx}  />
        <Selector value={rightIdx} onChange={setRightIdx} />
      </div>

      <div className="border-b border-gray-200 flex gap-0 mb-5">
        <button className={tabCls("privacy")}      onClick={() => setTab("privacy")}>Privacy Outcomes</button>
        <button className={tabCls("conversation")} onClick={() => setTab("conversation")}>Conversation</button>
        <button className={tabCls("proposals")}    onClick={() => setTab("proposals")}>Proposals</button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <RunPanel r={results[leftIdx]}  tab={tab} />
        <RunPanel r={results[rightIdx]} tab={tab} />
      </div>
    </div>
  );
}
