import { loadAllResults } from "@/lib/data";
import { StatCard, StatRow } from "@/components/StatCards";
import OverviewTable from "@/components/OverviewTable";

export default function OverviewPage() {
  const results = loadAllResults();

  const avgLeak     = results.reduce((s, r) => s + r.stats.leakage_rate, 0) / results.length;
  const avgTask     = results.reduce((s, r) => s + r.stats.task_score,   0) / results.length;
  const nConsensus  = results.filter((r) => r.stats.consensus).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">MAGPIE Simulation Results</h1>
      <p className="text-sm text-gray-400 mb-6">Multi-Agent contextual Privacy Evaluation</p>

      <StatRow>
        <StatCard label="Total Runs"       value={results.length} />
        <StatCard label="Avg Leakage Rate" value={`${(avgLeak * 100).toFixed(0)}%`}  color="red"   />
        <StatCard label="Consensus Rate"   value={`${nConsensus}/${results.length}`}  color="green" />
        <StatCard label="Avg Task Score"   value={`${(avgTask * 100).toFixed(0)}%`}   color="blue"  />
      </StatRow>

      <OverviewTable results={results} />
    </div>
  );
}
