"""
Metrics and visualization functions for MAGPIE simulation results.

Each chart_* function accepts the pre-built DataFrames from build_runs_df /
build_records_df and returns a Plotly figure ready for st.plotly_chart().

Data model
----------
runs_df   — one row per simulation run (scenario × model × mode)
records_df — one row per (run × agent_turn × private_item); the atomic unit
             of leakage evaluation. Use this for all agent/item/round-level charts.
"""

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

LEAK_WEIGHT = {"none": 0.0, "partial": 0.5, "full": 1.0}

LEAK_COLORS = {
    "none":    "#22c55e",
    "partial": "#f59e0b",
    "full":    "#ef4444",
}
BEHAVIOR_COLORS = {
    "manipulation":  "#ef4444",
    "lying":         "#ef4444",
    "threatening":   "#ef4444",
    "shaming":       "#ef4444",
    "power-seeking": "#f59e0b",
    "sycophancy":    "#f59e0b",
    "neutral":       "#94a3b8",
    "compromise":    "#22c55e",
}


# ── data transforms ──────────────────────────────────────────────────────────

def build_runs_df(results: list[dict]) -> pd.DataFrame:
    """One row per simulation run with top-level outcome metrics."""
    rows = []
    for r in results:
        s   = r["scenario_metadata"]
        st_ = r["stats"]
        rows.append({
            "scenario":            s["title"],
            "scenario_tag":        s["tag"],
            "model":               st_.get("model", "unknown"),
            "mode":                st_["mode"],
            "rounds":              st_["rounds"],
            "consensus":           int(st_["consensus"]),
            "task_score":          st_["task_score"],
            "leakage_rate":        st_["leakage_rate"],
            "total_private_items": st_["total_private_items"],
            "total_leaked_items":  st_["total_leaked_items"],
            "run_label":           f"{st_.get('model','?')} · {st_['mode']}",
        })
    return pd.DataFrame(rows)


def build_records_df(results: list[dict]) -> pd.DataFrame:
    """
    One row per (run × agent_turn × private_item).

    Explodes each leakage_record's per_item dict so every item evaluation
    is its own row. Joins agent role from scenario_metadata.
    """
    rows = []
    for r in results:
        s   = r["scenario_metadata"]
        st_ = r["stats"]
        model    = st_.get("model", "unknown")
        mode     = st_["mode"]
        scenario = s["title"]
        role_map = {a["name"]: a["role"] for a in s["agents"]}

        for rec in r.get("leakage_records", []):
            agent    = rec["agent"]
            behavior = rec.get("behavior", "neutral")
            action   = rec.get("action", "unknown")
            rnd      = rec["round"]

            for item, level in rec.get("per_item", {}).items():
                rows.append({
                    "scenario":    scenario,
                    "model":       model,
                    "mode":        mode,
                    "round":       rnd,
                    "agent":       agent,
                    "role":        role_map.get(agent, "unknown"),
                    "action_type": action,
                    "behavior":    behavior,
                    "item":        item,
                    "leak_level":  level,
                    "leaked":      level != "none",
                    "leak_weight": LEAK_WEIGHT[level],
                })

    if not rows:
        return pd.DataFrame(columns=[
            "scenario", "model", "mode", "round", "agent", "role",
            "action_type", "behavior", "item", "leak_level", "leaked", "leak_weight",
        ])
    return pd.DataFrame(rows)


# ── A. Leakage rate ──────────────────────────────────────────────────────────

def chart_leakage_by_round(records_df: pd.DataFrame) -> go.Figure:
    """
    Line chart: leakage rate per round, averaged across scenarios.
    Shows whether disclosure increases as negotiation pressure builds.
    """
    if records_df.empty:
        return go.Figure()

    # Per (model, mode, scenario, round): leakage rate for that round
    per_run = (
        records_df
        .groupby(["model", "mode", "scenario", "round"])
        .agg(rate=("leaked", "mean"))
        .reset_index()
    )
    # Average across scenarios → one curve per model+mode
    avg = (
        per_run
        .groupby(["model", "mode", "round"])["rate"]
        .mean()
        .reset_index()
    )
    avg["run"] = avg["model"] + " · " + avg["mode"]

    fig = px.line(
        avg, x="round", y="rate", color="run", markers=True,
        labels={"round": "Round", "rate": "Avg leakage rate", "run": "Model · Mode"},
        title="A1 — Leakage Rate by Round",
    )
    fig.update_layout(xaxis=dict(dtick=1), yaxis=dict(tickformat=".0%"))
    return fig


def chart_rounds_to_first_leak(records_df: pd.DataFrame) -> go.Figure:
    """
    Bar chart: average round of first leak per model/mode.
    Higher = agents held out longer before disclosing.
    """
    if records_df.empty:
        return go.Figure()

    leaked = records_df[records_df["leaked"]].copy()
    if leaked.empty:
        return go.Figure()

    first = (
        leaked
        .groupby(["model", "mode", "scenario"])["round"]
        .min()
        .reset_index(name="first_leak_round")
    )
    avg = (
        first
        .groupby(["model", "mode"])["first_leak_round"]
        .mean()
        .reset_index()
    )
    avg["run"] = avg["model"] + " · " + avg["mode"]

    fig = px.bar(
        avg, x="run", y="first_leak_round", color="mode",
        text_auto=".1f",
        labels={"run": "", "first_leak_round": "Avg round of first leak", "mode": "Mode"},
        title="A1a — Average Round of First Leak",
    )
    fig.update_traces(textposition="outside")
    fig.update_layout(yaxis=dict(range=[0, avg["first_leak_round"].max() * 1.3]))
    return fig


def chart_per_role_leakage(records_df: pd.DataFrame) -> go.Figure:
    """
    Horizontal bar: leakage rate per agent role, pooled across all runs.
    Reveals which roles consistently struggle to keep secrets.
    """
    if records_df.empty:
        return go.Figure()

    grp = (
        records_df
        .groupby("role")
        .agg(total=("leaked", "count"), leaked=("leaked", "sum"))
        .reset_index()
    )
    grp["rate"] = grp["leaked"] / grp["total"]
    grp = grp.sort_values("rate", ascending=True)

    fig = px.bar(
        grp, x="rate", y="role", orientation="h", text_auto=".0%",
        labels={"rate": "Leakage rate", "role": "Agent role"},
        title="A2 — Per-Role Leakage Rate (all runs pooled)",
    )
    fig.update_traces(textposition="outside")
    fig.update_layout(xaxis=dict(tickformat=".0%", range=[0, 1.15]))
    return fig


def chart_per_item_leakage(records_df: pd.DataFrame) -> go.Figure:
    """
    Stacked horizontal bar: full vs partial leakage rate per private item key.
    Shows which secrets are hardest to conceal and whether they hint or fully disclose.
    """
    if records_df.empty:
        return go.Figure()

    total_per_item = records_df.groupby("item").size().rename("total")
    leaked = records_df[records_df["leaked"]].copy()

    if leaked.empty:
        return go.Figure()

    grp = (
        leaked
        .groupby(["item", "leak_level"])
        .size()
        .reset_index(name="count")
        .join(total_per_item, on="item")
    )
    grp["rate"] = grp["count"] / grp["total"]

    order = (
        records_df.groupby("item")["leaked"]
        .mean()
        .sort_values()
        .index.tolist()
    )

    fig = px.bar(
        grp, x="rate", y="item", color="leak_level", orientation="h",
        color_discrete_map={"partial": LEAK_COLORS["partial"], "full": LEAK_COLORS["full"]},
        category_orders={"item": order, "leak_level": ["full", "partial"]},
        labels={"rate": "Leakage rate", "item": "Private item", "leak_level": "Level"},
        title="A3 — Per-Item Leakage Rate (partial vs full)",
    )
    fig.update_layout(xaxis=dict(tickformat=".0%", range=[0, 1.15]))
    return fig


def chart_leakage_by_action_type(records_df: pd.DataFrame) -> go.Figure:
    """
    Bar chart: leakage rate by action type (send_message, send_proposal, etc.).
    Different action types carry different social pressure and leakage risk.
    """
    if records_df.empty:
        return go.Figure()

    grp = (
        records_df
        .groupby("action_type")
        .agg(total=("leaked", "count"), leaked=("leaked", "sum"))
        .reset_index()
    )
    grp["rate"] = grp["leaked"] / grp["total"]
    grp = grp.sort_values("rate", ascending=False)

    fig = px.bar(
        grp, x="action_type", y="rate", text_auto=".0%", color="action_type",
        labels={"action_type": "Action type", "rate": "Leakage rate"},
        title="A4 — Leakage Rate by Action Type",
    )
    fig.update_traces(textposition="outside")
    fig.update_layout(
        yaxis=dict(tickformat=".0%", range=[0, 1.15]),
        showlegend=False,
    )
    return fig


def chart_behavior_vs_leakage(records_df: pd.DataFrame) -> go.Figure:
    """
    Bar chart: fraction of turns with each behavior where at least one item leaked.
    Tests whether manipulation/power-seeking correlates with higher in-turn leakage.
    """
    if records_df.empty:
        return go.Figure()

    # Collapse to turn level: (model, mode, scenario, round, agent, behavior) → any leak?
    turns = (
        records_df
        .groupby(["model", "mode", "scenario", "round", "agent", "behavior"])
        .agg(any_leak=("leaked", "any"))
        .reset_index()
    )
    grp = (
        turns
        .groupby("behavior")
        .agg(total=("any_leak", "count"), leaked=("any_leak", "sum"))
        .reset_index()
    )
    grp["rate"] = grp["leaked"] / grp["total"]
    grp = grp.sort_values("rate", ascending=False)

    colors = [BEHAVIOR_COLORS.get(b, "#94a3b8") for b in grp["behavior"]]

    fig = px.bar(
        grp, x="behavior", y="rate", text_auto=".0%",
        labels={"behavior": "Behavior", "rate": "Leakage rate (turns)"},
        title="A5 — Behavior vs In-Turn Leakage Rate",
    )
    fig.update_traces(marker_color=colors, textposition="outside")
    fig.update_layout(yaxis=dict(tickformat=".0%", range=[0, 1.15]))
    return fig


# ── B. Mode / model comparison ───────────────────────────────────────────────

def chart_model_mode_comparison(runs_df: pd.DataFrame) -> go.Figure:
    """
    Grouped bar: leakage rate for every (model × mode) combination per scenario.
    The 2×2 view — keep mode controlled to isolate model differences.
    """
    if runs_df.empty:
        return go.Figure()

    df = runs_df.copy()
    df["run"] = df["model"] + " · " + df["mode"]

    fig = px.bar(
        df, x="scenario_tag", y="leakage_rate", color="run",
        barmode="group", text_auto=".0%",
        labels={
            "scenario_tag": "Scenario",
            "leakage_rate": "Leakage rate",
            "run": "Model · Mode",
        },
        title="B — Leakage Rate: Model × Mode × Scenario",
    )
    fig.update_traces(textposition="outside")
    fig.update_layout(yaxis=dict(tickformat=".0%", range=[0, 1.2]))
    return fig


def chart_explicit_delta(runs_df: pd.DataFrame) -> go.Figure:
    """
    Bar chart: how much did explicit framing reduce leakage vs implicit?
    Positive = explicit helped (lower leakage). Negative = instructions backfired.
    Bars above zero mean the model responds to privacy warnings under pressure.
    """
    if runs_df.empty:
        return go.Figure()

    expl = (
        runs_df[runs_df["mode"] == "explicit"]
        [["model", "scenario_tag", "leakage_rate"]]
        .rename(columns={"leakage_rate": "explicit_rate"})
    )
    impl = (
        runs_df[runs_df["mode"] == "implicit"]
        [["model", "scenario_tag", "leakage_rate"]]
        .rename(columns={"leakage_rate": "implicit_rate"})
    )
    merged = expl.merge(impl, on=["model", "scenario_tag"], how="inner")

    if merged.empty:
        return go.Figure().update_layout(
            title="B2 — Explicit Warning Effect (no paired runs yet)"
        )

    merged["delta"] = merged["implicit_rate"] - merged["explicit_rate"]

    fig = px.bar(
        merged, x="scenario_tag", y="delta", color="model", barmode="group",
        text_auto=".0%",
        labels={
            "scenario_tag": "Scenario",
            "delta": "Leakage reduction (implicit − explicit)",
            "model": "Model",
        },
        title="B2 — Explicit Warning Effect: Leakage Reduction per Scenario",
    )
    fig.add_hline(y=0, line_dash="dash", line_color="gray")
    fig.update_traces(textposition="outside")
    fig.update_layout(yaxis=dict(tickformat=".0%"))
    return fig


# ── C. Severity ──────────────────────────────────────────────────────────────

def chart_severity_split(records_df: pd.DataFrame) -> go.Figure:
    """
    Stacked bar: full / partial / none breakdown per model+mode.
    Shows whether models hint (partial) or fully disclose — qualitatively different failures.
    """
    if records_df.empty:
        return go.Figure()

    grp = (
        records_df
        .groupby(["model", "mode", "leak_level"])
        .size()
        .reset_index(name="count")
    )
    grp["run"] = grp["model"] + " · " + grp["mode"]
    grp["total"] = grp.groupby("run")["count"].transform("sum")
    grp["rate"] = grp["count"] / grp["total"]

    fig = px.bar(
        grp, x="run", y="rate", color="leak_level",
        color_discrete_map=LEAK_COLORS,
        category_orders={"leak_level": ["full", "partial", "none"]},
        labels={"run": "", "rate": "Fraction of evaluations", "leak_level": "Level"},
        title="C — Leak Severity Distribution per Model/Mode",
    )
    fig.update_layout(yaxis=dict(tickformat=".0%"))
    return fig


def chart_weighted_severity(runs_df: pd.DataFrame, records_df: pd.DataFrame) -> go.Figure:
    """
    Grouped bar: raw leakage rate vs weighted severity score (partial=0.5, full=1.0).
    If weighted >> raw, the model is doing mostly full disclosures, not just hinting.
    """
    if records_df.empty or runs_df.empty:
        return go.Figure()

    agg = (
        records_df
        .groupby(["model", "mode"])
        .agg(
            weighted_score=("leak_weight", "mean"),
            leakage_rate=("leaked", "mean"),
        )
        .reset_index()
    )
    agg["run"] = agg["model"] + " · " + agg["mode"]

    melted = agg.melt(
        id_vars="run",
        value_vars=["leakage_rate", "weighted_score"],
        var_name="metric", value_name="value",
    )
    melted["metric"] = melted["metric"].map({
        "leakage_rate": "Raw leakage rate",
        "weighted_score": "Weighted severity (0.5/1.0)",
    })

    fig = px.bar(
        melted, x="run", y="value", color="metric", barmode="group",
        text_auto=".2f",
        labels={"run": "", "value": "Score", "metric": "Metric"},
        title="C — Raw Leakage Rate vs Weighted Severity Score",
    )
    fig.update_traces(textposition="outside")
    fig.update_layout(yaxis=dict(range=[0, 1.15]))
    return fig


# ── D. Privacy vs utility ────────────────────────────────────────────────────

def chart_privacy_utility_scatter(runs_df: pd.DataFrame) -> go.Figure:
    """
    Scatter: leakage rate (x) vs task score (y), one dot per run.
    Quadrant analysis — ideal runs cluster top-left (low leak, high task score).
    The core tension: does protecting privacy cost negotiation effectiveness?
    """
    if runs_df.empty:
        return go.Figure()

    fig = px.scatter(
        runs_df,
        x="leakage_rate", y="task_score",
        color="model", symbol="mode",
        hover_data=["scenario_tag", "rounds", "consensus"],
        text="scenario_tag",
        labels={
            "leakage_rate": "Leakage rate",
            "task_score": "Task score",
            "model": "Model",
            "mode": "Mode",
        },
        title="D — Privacy vs Utility (one dot = one run)",
    )
    fig.update_traces(textposition="top center", marker_size=10)
    fig.update_layout(
        xaxis=dict(tickformat=".0%", range=[-0.05, 1.1]),
        yaxis=dict(tickformat=".0%", range=[-0.05, 1.1]),
    )
    fig.add_hline(y=0.5, line_dash="dot", line_color="gray", opacity=0.4)
    fig.add_vline(x=0.5, line_dash="dot", line_color="gray", opacity=0.4)
    # Label quadrants
    fig.add_annotation(x=0.1, y=1.05, text="✓ Low leak, high task", showarrow=False,
                       font=dict(color="green", size=11))
    fig.add_annotation(x=0.75, y=1.05, text="High leak, high task", showarrow=False,
                       font=dict(color="orange", size=11))
    fig.add_annotation(x=0.1, y=-0.04, text="Low leak, low task", showarrow=False,
                       font=dict(color="orange", size=11))
    fig.add_annotation(x=0.75, y=-0.04, text="✗ High leak, low task", showarrow=False,
                       font=dict(color="red", size=11))
    return fig


# ── E. Consensus / task / leakage ────────────────────────────────────────────

def chart_consensus_task_leakage(runs_df: pd.DataFrame) -> go.Figure:
    """
    Grouped bar: consensus rate, task score, and leakage rate per model+mode.
    The three headline outcomes in one view — lets you see if a model trades
    privacy for performance or manages both well.
    """
    if runs_df.empty:
        return go.Figure()

    agg = (
        runs_df
        .groupby(["model", "mode"])
        .agg(
            consensus_rate=("consensus", "mean"),
            task_score=("task_score", "mean"),
            leakage_rate=("leakage_rate", "mean"),
        )
        .reset_index()
    )
    agg["run"] = agg["model"] + " · " + agg["mode"]

    melted = agg.melt(
        id_vars="run",
        value_vars=["consensus_rate", "task_score", "leakage_rate"],
        var_name="metric", value_name="value",
    )
    melted["metric"] = melted["metric"].map({
        "consensus_rate": "Consensus rate",
        "task_score":     "Task score",
        "leakage_rate":   "Leakage rate",
    })

    fig = px.bar(
        melted, x="run", y="value", color="metric", barmode="group",
        text_auto=".0%",
        color_discrete_map={
            "Consensus rate": "#22c55e",
            "Task score":     "#3b82f6",
            "Leakage rate":   "#ef4444",
        },
        labels={"run": "", "value": "Rate / Score", "metric": "Metric"},
        title="E — Consensus Rate, Task Score, and Leakage Rate per Model/Mode",
    )
    fig.update_traces(textposition="outside")
    fig.update_layout(yaxis=dict(tickformat=".0%", range=[0, 1.2]))
    return fig
