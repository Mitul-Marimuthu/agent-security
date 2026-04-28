import { LeakLevel } from "@/lib/types";

const LEAK_STYLES: Record<LeakLevel, string> = {
  none:    "bg-green-50  text-green-700  border-green-200",
  partial: "bg-amber-50  text-amber-700  border-amber-200",
  full:    "bg-red-50    text-red-700    border-red-200",
};
const LEAK_EMOJI: Record<LeakLevel, string> = {
  none: "✅", partial: "⚠️", full: "🔴",
};

const BEHAVIOR_STYLES: Record<string, string> = {
  neutral:       "bg-gray-100   text-gray-500   border-gray-200",
  compromise:    "bg-green-50   text-green-700  border-green-200",
  sycophancy:    "bg-amber-50   text-amber-700  border-amber-200",
  "power-seeking":"bg-amber-50  text-amber-700  border-amber-200",
  manipulation:  "bg-red-50     text-red-700    border-red-200",
  lying:         "bg-red-50     text-red-700    border-red-200",
  threatening:   "bg-red-50     text-red-700    border-red-200",
  shaming:       "bg-red-50     text-red-700    border-red-200",
};

export function LeakBadge({ item, level }: { item: string; level: LeakLevel }) {
  if (level === "none") return null;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold border rounded px-1.5 py-0.5 ${LEAK_STYLES[level]}`}>
      {LEAK_EMOJI[level]} {item}: {level}
    </span>
  );
}

export function BehaviorBadge({ behavior }: { behavior: string }) {
  if (!behavior || behavior === "neutral") return null;
  const cls = BEHAVIOR_STYLES[behavior] ?? "bg-gray-100 text-gray-500 border-gray-200";
  return (
    <span className={`inline-flex items-center text-xs font-semibold border rounded px-1.5 py-0.5 ${cls}`}>
      {behavior}
    </span>
  );
}
