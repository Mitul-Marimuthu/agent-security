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
    <div className="border-l-4 border-indigo-400 bg-indigo-50 rounded-r-lg p-4 mb-3">
      <p className="text-xs font-bold text-indigo-700 mb-2">
        [{p.id?.slice(0, 8)}] — Round {p.round} — {p.sender}
      </p>
      <pre className="text-xs font-mono whitespace-pre-wrap text-indigo-900 bg-white rounded p-2 border border-indigo-100">
        {content}
      </pre>
    </div>
  );
}

export default function DetailClient({ results }: { results: SimulationResult[] }) {
  const [idx, setIdx] = useState(0);
  const [tab, setTab] = useState<Tab>("privacy");

  const r = results[idx];
  const s = r.stats;

  const tabCls = (t: Tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      tab === t
        ? "border-indigo-500 text-indigo-600"
        : "border-transparent text-gray-500 hover:text-gray-800"
    }`;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Run Detail</h1>

      <select
        className="mb-6 w-full max-w-xl text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        value={idx}
        onChange={(e) => { setIdx(Number(e.target.value)); setTab("privacy"); }}
      >
        {results.map((res, i) => (
          <option key={i} value={i}>{resultLabel(res)}</option>
        ))}
      </select>

      <div className="mb-1">
        <h2 className="text-lg font-semibold text-gray-800">{r.scenario_metadata.title}</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Mode: <strong>{s.mode}</strong> &nbsp;·&nbsp; Provider: <strong>{s.provider}</strong> &nbsp;·&nbsp; Model: <strong>{s.model}</strong>
        </p>
      </div>

      <StatRow>
        <StatCard label="Rounds"    value={s.rounds} />
        <StatCard label="Consensus" value={s.consensus ? "✓ Yes" : "✗ No"} color={s.consensus ? "green" : "red"} />
        <StatCard label="Task Score" value={`${(s.task_score * 100).toFixed(0)}%`} color="blue" />
        <StatCard
          label="Leakage Rate"
          value={`${(s.leakage_rate * 100).toFixed(0)}%`}
          sub={`${s.total_leaked_items}/${s.total_private_items} items`}
          color="red"
        />
      </StatRow>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6 p-4 text-sm text-gray-600 space-y-1">
        <p><strong>Privacy:</strong> {r.key_findings.privacy}</p>
        <p><strong>Consensus:</strong> {r.key_findings.consensus}</p>
        {Object.keys(r.key_findings.concerning_behaviors ?? {}).length > 0 && (
          <p><strong>Concerning behaviors:</strong>{" "}
            {Object.entries(r.key_findings.concerning_behaviors)
              .map(([b, n]) => `${b} ×${n}`)
              .join(", ")}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-0 mb-5">
        <button className={tabCls("privacy")}      onClick={() => setTab("privacy")}>Privacy & Behaviors</button>
        <button className={tabCls("conversation")} onClick={() => setTab("conversation")}>Conversation</button>
        <button className={tabCls("proposals")}    onClick={() => setTab("proposals")}>Proposals</button>
      </div>

      {tab === "privacy" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4">Agent Privacy Outcomes</h3>
          <AgentTable agentStats={s.agent_stats} />

          <h3 className="font-semibold text-gray-700 mt-6 mb-2">Behavior Totals</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(s.behavior_totals ?? {}).map(([b, n]) => (
              <span key={b} className="text-xs border rounded px-2 py-1 text-gray-600 bg-gray-50">
                {b} <strong>{n}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {tab === "conversation" && (
        <ConversationFeed conversation={r.conversation} leakageRecords={r.leakage_records ?? []} />
      )}

      {tab === "proposals" && (
        <div>
          {r.proposals.length === 0
            ? <p className="text-sm text-gray-400">No proposals recorded.</p>
            : r.proposals.map((p, i) => <ProposalEntry key={i} p={p} />)}
        </div>
      )}
    </div>
  );
}
