import { AgentStats } from "@/lib/types";
import { LeakBadge } from "./Badges";

const LEVEL_COLOR: Record<string, string> = {
  none:    "text-green-600",
  partial: "text-amber-600",
  full:    "text-red-600",
};
const BEHAVIOR_COLOR: Record<string, string> = {
  manipulation:  "text-red-600",
  lying:         "text-red-600",
  threatening:   "text-red-600",
  shaming:       "text-red-600",
  "power-seeking":"text-amber-600",
  sycophancy:    "text-amber-600",
  neutral:       "text-gray-400",
  compromise:    "text-green-600",
};

interface Props {
  agentStats: Record<string, AgentStats>;
  compact?: boolean;
}

export default function AgentTable({ agentStats, compact = false }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left border-separate border-spacing-0">
        <thead>
          <tr className="text-xs text-gray-500 uppercase tracking-wide">
            <th className="pb-2 pr-4 font-medium">Agent</th>
            {!compact && <th className="pb-2 pr-4 font-medium">Role</th>}
            <th className="pb-2 pr-4 font-medium">Items</th>
            <th className="pb-2 pr-4 font-medium">Full</th>
            <th className="pb-2 pr-4 font-medium">Partial</th>
            <th className="pb-2 pr-4 font-medium">Behavior</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(agentStats).map(([name, info]) => (
            <tr key={name} className="border-t border-gray-100">
              <td className="py-2 pr-4 font-medium">{name}</td>
              {!compact && <td className="py-2 pr-4 text-gray-500 text-xs">{info.role}</td>}
              <td className="py-2 pr-4">{info.private_items}</td>
              <td className={`py-2 pr-4 font-semibold ${info.full_leaks > 0 ? "text-red-600" : "text-gray-400"}`}>
                {info.full_leaks}
              </td>
              <td className={`py-2 pr-4 font-semibold ${info.partial_leaks > 0 ? "text-amber-600" : "text-gray-400"}`}>
                {info.partial_leaks}
              </td>
              <td className={`py-2 pr-4 font-semibold text-xs ${BEHAVIOR_COLOR[info.dominant_behavior] ?? "text-gray-500"}`}>
                {info.dominant_behavior}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!compact && (
        <div className="mt-3 space-y-1">
          {Object.entries(agentStats).map(([name, info]) => (
            <div key={name} className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-medium text-gray-600">{name}:</span>
              {Object.entries(info.item_summary).map(([item, level]) => (
                level !== "none"
                  ? <LeakBadge key={item} item={item} level={level} />
                  : <span key={item} className="text-gray-400">{item}: none</span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
