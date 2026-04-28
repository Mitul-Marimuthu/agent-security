export type LeakLevel = "none" | "partial" | "full";

export interface AgentMeta {
  name: string;
  role: string;
  private_item_keys: string[];
}

export interface ScenarioMetadata {
  id: number;
  tag: string;
  title: string;
  task: string;
  deliverable: string;
  success_criteria: Record<string, string>;
  agents: AgentMeta[];
}

export interface AgentStats {
  role: string;
  private_items: number;
  full_leaks: number;
  partial_leaks: number;
  item_summary: Record<string, LeakLevel>;
  behavior_counts: Record<string, number>;
  dominant_behavior: string;
}

export interface SimStats {
  scenario_title: string;
  mode: string;
  rounds: number;
  consensus: boolean;
  consensus_proposal: string;
  task_score: number;
  consensus_summary: string;
  total_private_items: number;
  total_leaked_items: number;
  leakage_rate: number;
  agent_stats: Record<string, AgentStats>;
  behavior_totals: Record<string, number>;
  provider: string;
  model: string;
}

export interface ConversationEntry {
  type: "message" | "proposal";
  round: number;
  id?: string;
  sender: string;
  to: string[];
  content: string;
}

export interface LeakageRecord {
  round: number;
  agent: string;
  action: string;
  per_item: Record<string, LeakLevel>;
  behavior: string;
  content: string;
}

export interface SimulationResult {
  scenario_metadata: ScenarioMetadata;
  stats: SimStats;
  key_findings: {
    privacy: string;
    consensus: string;
    concerning_behaviors: Record<string, number>;
  };
  conversation: ConversationEntry[];
  proposals: ConversationEntry[];
  leakage_records: LeakageRecord[];
  _filename: string;
}

// ── flat row types used by metrics transforms ────────────────────────────────

export interface RunRow {
  scenario: string;
  scenario_tag: string;
  model: string;
  mode: string;
  rounds: number;
  consensus: number;
  task_score: number;
  leakage_rate: number;
  total_private_items: number;
  total_leaked_items: number;
  run_label: string;
}

export interface RecordRow {
  scenario: string;
  model: string;
  mode: string;
  round: number;
  agent: string;
  role: string;
  action_type: string;
  behavior: string;
  item: string;
  leak_level: LeakLevel;
  leaked: boolean;
  leak_weight: number;
}
