import { loadAllResults } from "@/lib/data";
import {
  buildRunRows, buildRecordRows,
  leakageByRoundData, roundsToFirstLeakData,
  perRoleLeakageData, perItemLeakageData,
  actionTypeLeakageData, behaviorLeakageData,
  modelModeComparisonData, modelModeRunKeys, explicitDeltaData,
  severitySplitData, weightedSeverityData,
  privacyUtilityData, consensusTaskLeakageData,
} from "@/lib/metrics";
import LineChartCard from "@/components/charts/LineChartCard";
import BarChartCard from "@/components/charts/BarChartCard";
import ScatterCard from "@/components/charts/ScatterCard";

const LEAK_COLORS = { none: "#22c55e", partial: "#f59e0b", full: "#ef4444" };
const METRIC_COLORS = {
  "Consensus rate": "#22c55e",
  "Task score":     "#3b82f6",
  "Leakage rate":   "#ef4444",
};

export default function MetricsPage() {
  const results   = loadAllResults();
  const runs      = buildRunRows(results);
  const records   = buildRecordRows(results);

  const { data: byRound, lines }     = leakageByRoundData(records);
  const firstLeak                    = roundsToFirstLeakData(records);
  const perRole                      = perRoleLeakageData(records);
  const perItem                      = perItemLeakageData(records);
  const byAction                     = actionTypeLeakageData(records);
  const byBehavior                   = behaviorLeakageData(records);
  const mmData                       = modelModeComparisonData(runs);
  const mmKeys                       = modelModeRunKeys(runs);
  const { data: deltaData, models }  = explicitDeltaData(runs);
  const severity                     = severitySplitData(records);
  const weighted                     = weightedSeverityData(records);
  const scatter                      = privacyUtilityData(runs);
  const ctlData                      = consensusTaskLeakageData(runs);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Metrics</h1>
      <p className="text-sm text-gray-400 mb-8">Structured analysis across all {results.length} simulation runs.</p>

      {/* ── A. Leakage Rate ─────────────────────────────────────── */}
      <h2 className="text-lg font-bold text-gray-700 mb-4 mt-2">A — Leakage Rate</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <LineChartCard
          title="A1 — Leakage Rate by Round"
          caption="Rising curves = agents disclose more as pressure builds."
          data={byRound} lines={lines} xKey="round" pct
        />
        <BarChartCard
          title="A1a — Average Round of First Leak"
          caption="Higher = agents held out longer before first disclosure."
          data={firstLeak}
          bars={[{ key: "value", label: "Avg round" }]}
          xKey="run" pct={false}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <BarChartCard
          title="A2 — Per-Role Leakage Rate"
          caption="Pooled across all runs. Which roles consistently fail to keep secrets?"
          data={perRole}
          bars={[{ key: "rate", label: "Leakage rate" }]}
          xKey="role" layout="horizontal" pct
        />
        <BarChartCard
          title="A3 — Per-Item Leakage Rate"
          caption="Stacked by severity. Which secrets are hardest to conceal?"
          data={perItem}
          bars={[
            { key: "full",    label: "Full",    color: LEAK_COLORS.full    },
            { key: "partial", label: "Partial", color: LEAK_COLORS.partial },
          ]}
          xKey="item" layout="horizontal" stacked pct
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        <BarChartCard
          title="A4 — Leakage by Action Type"
          caption="Does leakage happen more in messages, proposals, or accept/reject reasons?"
          data={byAction}
          bars={[{ key: "rate", label: "Leakage rate" }]}
          xKey="action_type" pct
        />
        <BarChartCard
          title="A5 — Behavior vs In-Turn Leakage Rate"
          caption="Fraction of turns per behavior where at least one item leaked."
          data={byBehavior}
          bars={[{ key: "rate", label: "Leakage rate" }]}
          xKey="behavior" pct
        />
      </div>

      {/* ── B. Mode / Model Comparison ──────────────────────────── */}
      <h2 className="text-lg font-bold text-gray-700 mb-4">B — Mode and Model Comparison</h2>
      <div className="mb-5">
        <BarChartCard
          title="B1 — Leakage Rate: Model × Mode × Scenario"
          caption="Hold mode fixed to compare models; hold model fixed to compare modes."
          data={mmData}
          bars={mmKeys.map((k, i) => ({ key: k, label: k }))}
          xKey="scenario" pct height={360}
        />
      </div>
      <div className="mb-8">
        <BarChartCard
          title="B2 — Explicit Warning Effect (implicit − explicit leakage)"
          caption="Bars above zero = explicit framing reduced leakage. Near zero = model ignores privacy instructions under pressure."
          data={deltaData}
          bars={models.map((m) => ({ key: m, label: m }))}
          xKey="scenario" refLine={0} pct height={320}
        />
      </div>

      {/* ── C. Severity ─────────────────────────────────────────── */}
      <h2 className="text-lg font-bold text-gray-700 mb-4">C — Weighted Severity</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        <BarChartCard
          title="C1 — Leak Severity Distribution"
          caption="A model that mostly hints (amber) is different from one that fully discloses (red)."
          data={severity}
          bars={[
            { key: "full",    label: "Full",    color: LEAK_COLORS.full    },
            { key: "partial", label: "Partial", color: LEAK_COLORS.partial },
            { key: "none",    label: "None",    color: LEAK_COLORS.none    },
          ]}
          xKey="run" stacked pct
        />
        <BarChartCard
          title="C2 — Raw Rate vs Weighted Severity (0.5 / 1.0)"
          caption="If weighted >> raw, most leaks are full disclosures rather than hints."
          data={weighted}
          bars={[
            { key: "Raw leakage rate",            label: "Raw leakage rate"   },
            { key: "Weighted severity (0.5/1.0)", label: "Weighted severity"  },
          ]}
          xKey="run" pct={false}
        />
      </div>

      {/* ── D. Privacy vs Utility ───────────────────────────────── */}
      <h2 className="text-lg font-bold text-gray-700 mb-4">D — Privacy vs Utility</h2>
      <div className="mb-8">
        <ScatterCard
          title="D — Privacy vs Utility (one dot = one run)"
          caption="Ideal runs cluster top-left: low leakage, high task score."
          data={scatter}
        />
      </div>

      {/* ── E. Consensus / Task / Leakage ───────────────────────── */}
      <h2 className="text-lg font-bold text-gray-700 mb-4">E — Consensus, Task Score, and Leakage</h2>
      <BarChartCard
        title="E — Three Headline Outcomes per Model/Mode"
        caption="Good models have high green and blue bars with a low red bar."
        data={ctlData}
        bars={[
          { key: "Consensus rate", label: "Consensus rate", color: METRIC_COLORS["Consensus rate"] },
          { key: "Task score",     label: "Task score",     color: METRIC_COLORS["Task score"]     },
          { key: "Leakage rate",   label: "Leakage rate",   color: METRIC_COLORS["Leakage rate"]   },
        ]}
        xKey="run" pct height={340}
      />
    </div>
  );
}
