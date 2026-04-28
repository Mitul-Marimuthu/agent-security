"use client";

import { useState } from "react";
import { ConversationEntry, LeakageRecord, LeakLevel } from "@/lib/types";
import { LeakBadge, BehaviorBadge } from "./Badges";

function buildLeakLookup(records: LeakageRecord[]) {
  const map = new Map<string, LeakageRecord>();
  for (const rec of records) map.set(`${rec.round}|${rec.agent}`, rec);
  return map;
}

function parseProposalContent(raw: string) {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function ProposalCard({ entry }: { entry: ConversationEntry }) {
  const [open, setOpen] = useState(false);
  const pid = entry.id?.slice(0, 8) ?? "?";
  const content = parseProposalContent(entry.content);

  return (
    <div className="border-l-4 border-indigo-400 bg-indigo-50 rounded-r-lg p-3 my-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left flex items-center justify-between"
      >
        <span className="text-xs font-bold text-indigo-700">
          📋 PROPOSAL [{pid}] — Round {entry.round} — {entry.sender}
        </span>
        <span className="text-indigo-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <pre className="mt-2 text-xs font-mono whitespace-pre-wrap text-indigo-900 bg-white rounded p-2 border border-indigo-100">
          {content}
        </pre>
      )}
    </div>
  );
}

function MessageCard({
  entry,
  rec,
  expandable,
}: {
  entry: ConversationEntry;
  rec?: LeakageRecord;
  expandable: boolean;
}) {
  const [expanded, setExpanded] = useState(!expandable);

  const toStr =
    entry.to.length === 0 || (entry.to.length === 1 && entry.to[0] === "all")
      ? "everyone"
      : entry.to.join(", ");

  const leakedItems = Object.entries(rec?.per_item ?? {}).filter(
    ([, v]) => v !== "none"
  ) as [string, LeakLevel][];
  const hasLeak = leakedItems.length > 0;
  const behavior = rec?.behavior;

  return (
    <div
      className={`rounded-lg border p-3 my-1.5 ${
        hasLeak ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
        <span className="text-sm font-semibold">{entry.sender}</span>
        <span className="text-xs text-gray-400">→ {toStr} · Round {entry.round}</span>
        {behavior && <BehaviorBadge behavior={behavior} />}
        {leakedItems.map(([item, level]) => (
          <LeakBadge key={item} item={item} level={level} />
        ))}
        {expandable && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-auto text-xs text-indigo-500 hover:text-indigo-700"
          >
            {expanded ? "collapse" : "expand"}
          </button>
        )}
      </div>
      {expanded ? (
        <p className="text-sm text-gray-800 leading-relaxed">{entry.content}</p>
      ) : (
        <p className="text-sm text-gray-500 truncate">{entry.content}</p>
      )}
    </div>
  );
}

interface Props {
  conversation: ConversationEntry[];
  leakageRecords: LeakageRecord[];
  expandable?: boolean;
}

export default function ConversationFeed({ conversation, leakageRecords, expandable = false }: Props) {
  const lookup = buildLeakLookup(leakageRecords);

  return (
    <div>
      {conversation.map((entry, i) =>
        entry.type === "proposal" ? (
          <ProposalCard key={i} entry={entry} />
        ) : (
          <MessageCard
            key={i}
            entry={entry}
            rec={lookup.get(`${entry.round}|${entry.sender}`)}
            expandable={expandable}
          />
        )
      )}
    </div>
  );
}
