import { SimulationResult, RunRow, RecordRow } from "./types";

const LEAK_WEIGHT: Record<string, number> = { none: 0, partial: 0.5, full: 1 };

// ── helpers ──────────────────────────────────────────────────────────────────

function groupBy<T>(arr: T[], key: (x: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, x) => {
    const k = key(x);
    (acc[k] ??= []).push(x);
    return acc;
  }, {});
}

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function rate(arr: boolean[]): number {
  return arr.length ? arr.filter(Boolean).length / arr.length : 0;
}

// ── data transforms ──────────────────────────────────────────────────────────

export function buildRunRows(results: SimulationResult[]): RunRow[] {
  return results.map((r) => ({
    scenario:            r.scenario_metadata.title,
    scenario_tag:        r.scenario_metadata.tag,
    model:               r.stats.model ?? "unknown",
    mode:                r.stats.mode,
    rounds:              r.stats.rounds,
    consensus:           r.stats.consensus ? 1 : 0,
    task_score:          r.stats.task_score,
    leakage_rate:        r.stats.leakage_rate,
    total_private_items: r.stats.total_private_items,
    total_leaked_items:  r.stats.total_leaked_items,
    run_label:           `${r.stats.model ?? "?"} · ${r.stats.mode}`,
  }));
}

export function buildRecordRows(results: SimulationResult[]): RecordRow[] {
  const rows: RecordRow[] = [];
  for (const r of results) {
    const model    = r.stats.model ?? "unknown";
    const mode     = r.stats.mode;
    const scenario = r.scenario_metadata.title;
    const roleMap  = Object.fromEntries(
      r.scenario_metadata.agents.map((a) => [a.name, a.role])
    );
    for (const rec of r.leakage_records ?? []) {
      for (const [item, level] of Object.entries(rec.per_item ?? {})) {
        rows.push({
          scenario,
          model,
          mode,
          round:       rec.round,
          agent:       rec.agent,
          role:        roleMap[rec.agent] ?? "unknown",
          action_type: rec.action ?? "unknown",
          behavior:    rec.behavior ?? "neutral",
          item,
          leak_level:  level,
          leaked:      level !== "none",
          leak_weight: LEAK_WEIGHT[level] ?? 0,
        });
      }
    }
  }
  return rows;
}

// ── A. Leakage rate charts ────────────────────────────────────────────────────

export function leakageByRoundData(rows: RecordRow[]) {
  // Per (model, mode, scenario, round) → leakage rate, then avg across scenarios
  type Key = { model: string; mode: string; scenario: string; round: number };
  const grouped = groupBy(rows, (r) => `${r.model}|${r.mode}|${r.scenario}|${r.round}`);

  const perRun: Record<string, Record<number, number[]>> = {};
  for (const [key, group] of Object.entries(grouped)) {
    const [model, mode, , roundStr] = key.split("|");
    const runKey = `${model} · ${mode}`;
    const rnd = parseInt(roundStr);
    perRun[runKey] ??= {};
    (perRun[runKey][rnd] ??= []).push(rate(group.map((r) => r.leaked)));
  }

  const maxRound = Math.max(...rows.map((r) => r.round), 1);
  const runKeys = Object.keys(perRun).sort();
  const result: Record<string, number | string>[] = [];

  for (let rnd = 1; rnd <= maxRound; rnd++) {
    const entry: Record<string, number | string> = { round: rnd };
    for (const runKey of runKeys) {
      const vals = perRun[runKey]?.[rnd] ?? [];
      if (vals.length) entry[runKey] = parseFloat(avg(vals).toFixed(3));
    }
    result.push(entry);
  }
  return { data: result, lines: runKeys };
}

export function roundsToFirstLeakData(rows: RecordRow[]) {
  const leaked = rows.filter((r) => r.leaked);
  const byRunScenario = groupBy(leaked, (r) => `${r.model}|${r.mode}|${r.scenario}`);

  const firstLeaks: Record<string, number[]> = {};
  for (const [key, group] of Object.entries(byRunScenario)) {
    const [model, mode] = key.split("|");
    const runKey = `${model} · ${mode}`;
    const minRound = Math.min(...group.map((r) => r.round));
    (firstLeaks[runKey] ??= []).push(minRound);
  }

  return Object.entries(firstLeaks)
    .map(([run, rounds]) => ({ run, value: parseFloat(avg(rounds).toFixed(2)) }))
    .sort((a, b) => b.value - a.value);
}

export function perRoleLeakageData(rows: RecordRow[]) {
  const byRole = groupBy(rows, (r) => r.role);
  return Object.entries(byRole)
    .map(([role, group]) => ({
      role,
      rate: parseFloat(rate(group.map((r) => r.leaked)).toFixed(3)),
    }))
    .sort((a, b) => a.rate - b.rate);
}

export function perItemLeakageData(rows: RecordRow[]) {
  const byItem = groupBy(rows, (r) => r.item);
  const totalByItem = Object.fromEntries(
    Object.entries(byItem).map(([item, g]) => [item, g.length])
  );

  const byItemLevel = groupBy(
    rows.filter((r) => r.leaked),
    (r) => `${r.item}|${r.leak_level}`
  );

  const itemMap: Record<string, { partial: number; full: number; total_rate: number }> = {};
  for (const [key, group] of Object.entries(byItemLevel)) {
    const [item, level] = key.split("|");
    itemMap[item] ??= { partial: 0, full: 0, total_rate: 0 };
    const r = group.length / (totalByItem[item] ?? 1);
    if (level === "partial") itemMap[item].partial = parseFloat(r.toFixed(3));
    if (level === "full")    itemMap[item].full    = parseFloat(r.toFixed(3));
  }
  for (const item of Object.keys(itemMap)) {
    itemMap[item].total_rate = itemMap[item].partial + itemMap[item].full;
  }

  return Object.entries(itemMap)
    .map(([item, v]) => ({ item, ...v }))
    .sort((a, b) => a.total_rate - b.total_rate);
}

export function actionTypeLeakageData(rows: RecordRow[]) {
  const byAction = groupBy(rows, (r) => r.action_type);
  return Object.entries(byAction)
    .map(([action_type, group]) => ({
      action_type,
      rate: parseFloat(rate(group.map((r) => r.leaked)).toFixed(3)),
    }))
    .sort((a, b) => b.rate - a.rate);
}

export function behaviorLeakageData(rows: RecordRow[]) {
  // Collapse to turn level: any leak in the turn?
  const byTurn = groupBy(
    rows,
    (r) => `${r.model}|${r.mode}|${r.scenario}|${r.round}|${r.agent}|${r.behavior}`
  );

  const byBehavior: Record<string, boolean[]> = {};
  for (const [key, group] of Object.entries(byTurn)) {
    const behavior = key.split("|")[5];
    const anyLeak = group.some((r) => r.leaked);
    (byBehavior[behavior] ??= []).push(anyLeak);
  }

  return Object.entries(byBehavior)
    .map(([behavior, leaks]) => ({
      behavior,
      rate: parseFloat(rate(leaks).toFixed(3)),
    }))
    .sort((a, b) => b.rate - a.rate);
}

// ── B. Mode / model comparison ────────────────────────────────────────────────

export function modelModeComparisonData(runs: RunRow[]) {
  const runKeys = Array.from(new Set(runs.map((r) => r.run_label))).sort();
  const scenarios = Array.from(new Set(runs.map((r) => r.scenario_tag))).sort();

  return scenarios.map((scenario) => {
    const entry: Record<string, string | number> = { scenario };
    for (const runKey of runKeys) {
      const match = runs.find(
        (r) => r.scenario_tag === scenario && r.run_label === runKey
      );
      if (match) entry[runKey] = parseFloat(match.leakage_rate.toFixed(3));
    }
    return entry;
  });
}

export function modelModeRunKeys(runs: RunRow[]) {
  return Array.from(new Set(runs.map((r) => r.run_label))).sort();
}

export function explicitDeltaData(runs: RunRow[]) {
  const models = Array.from(new Set(runs.map((r) => r.model))).sort();
  const scenarios = Array.from(new Set(runs.map((r) => r.scenario_tag))).sort();

  const result: Record<string, string | number>[] = [];
  for (const scenario of scenarios) {
    const entry: Record<string, string | number> = { scenario };
    let hasData = false;
    for (const model of models) {
      const expl = runs.find((r) => r.scenario_tag === scenario && r.model === model && r.mode === "explicit");
      const impl = runs.find((r) => r.scenario_tag === scenario && r.model === model && r.mode === "implicit");
      if (expl && impl) {
        entry[model] = parseFloat((impl.leakage_rate - expl.leakage_rate).toFixed(3));
        hasData = true;
      }
    }
    if (hasData) result.push(entry);
  }
  return { data: result, models };
}

// ── C. Severity ───────────────────────────────────────────────────────────────

export function severitySplitData(rows: RecordRow[]) {
  const byRun = groupBy(rows, (r) => r.model + " · " + r.mode);
  return Object.entries(byRun).map(([run, group]) => {
    const total = group.length;
    const none    = parseFloat((group.filter((r) => r.leak_level === "none").length    / total).toFixed(3));
    const partial = parseFloat((group.filter((r) => r.leak_level === "partial").length / total).toFixed(3));
    const full    = parseFloat((group.filter((r) => r.leak_level === "full").length    / total).toFixed(3));
    return { run, none, partial, full };
  });
}

export function weightedSeverityData(rows: RecordRow[]) {
  const byRun = groupBy(rows, (r) => r.model + " · " + r.mode);
  return Object.entries(byRun).map(([run, group]) => ({
    run,
    "Raw leakage rate":           parseFloat(rate(group.map((r) => r.leaked)).toFixed(3)),
    "Weighted severity (0.5/1.0)": parseFloat(avg(group.map((r) => r.leak_weight)).toFixed(3)),
  }));
}

// ── D. Privacy vs utility ─────────────────────────────────────────────────────

export function privacyUtilityData(runs: RunRow[]) {
  return runs.map((r) => ({
    x:        parseFloat(r.leakage_rate.toFixed(3)),
    y:        parseFloat(r.task_score.toFixed(3)),
    model:    r.model,
    mode:     r.mode,
    scenario: r.scenario_tag,
    label:    r.scenario_tag,
  }));
}

// ── E. Consensus / task / leakage ─────────────────────────────────────────────

export function consensusTaskLeakageData(runs: RunRow[]) {
  const byRun = groupBy(runs, (r) => r.run_label);
  return Object.entries(byRun).map(([run, group]) => ({
    run,
    "Consensus rate": parseFloat(avg(group.map((r) => r.consensus)).toFixed(3)),
    "Task score":     parseFloat(avg(group.map((r) => r.task_score)).toFixed(3)),
    "Leakage rate":   parseFloat(avg(group.map((r) => r.leakage_rate)).toFixed(3)),
  }));
}
