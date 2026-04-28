"""
MAGPIE Results Viewer — Streamlit dashboard for exploring simulation outputs.

Run with:
    streamlit run app.py
"""

import json
from pathlib import Path

import pandas as pd
import streamlit as st

RESULTS_DIR = Path("results")

LEAK_EMOJI  = {"none": "✅", "partial": "⚠️", "full": "🔴"}
LEAK_COLOR  = {"none": "#1a7a1a", "partial": "#a06000", "full": "#c02020"}

BEHAVIOR_COLOR = {
    "neutral":      "#888888",
    "compromise":   "#1a7a1a",
    "sycophancy":   "#a06000",
    "manipulation": "#c02020",
    "lying":        "#c02020",
    "threatening":  "#c02020",
    "shaming":      "#c02020",
    "power-seeking":"#a06000",
}


# ── data loading ────────────────────────────────────────────────────────────

@st.cache_data
def load_all_results():
    out = []
    for path in sorted(RESULTS_DIR.glob("*.json")):
        with open(path) as f:
            data = json.load(f)
        data["_filename"] = path.name
        out.append(data)
    return out


def result_label(r):
    s   = r["scenario_metadata"]
    st_ = r["stats"]
    return f"{s['title']}  |  {st_['mode']}  |  {st_.get('model', 'unknown')}"


# ── small rendering helpers ──────────────────────────────────────────────────

def badge(text, color):
    return (
        f'<span style="background:{color}22; color:{color}; border:1px solid {color}; '
        f'border-radius:4px; padding:1px 6px; font-size:0.78em; font-weight:600">'
        f'{text}</span>'
    )


def build_leak_lookup(leakage_records):
    # (round, agent) → record; last record wins if there are duplicates
    lookup = {}
    for rec in leakage_records:
        lookup[(rec["round"], rec["agent"])] = rec
    return lookup


# ── conversation renderer ───────────────────────────────────────────────────

def render_conversation(conversation, leakage_records, compact=False):
    lookup = build_leak_lookup(leakage_records)

    for entry in conversation:
        rnd    = entry["round"]
        sender = entry["sender"]
        etype  = entry["type"]

        if etype == "proposal":
            content = entry["content"]
            try:
                content = json.dumps(json.loads(content), indent=2)
            except Exception:
                pass
            pid = entry.get("id", "")[:8]
            st.markdown(
                f'<div style="border-left:4px solid #7c3aed; background:#f5f3ff; '
                f'padding:8px 12px; margin:6px 0; border-radius:4px">'
                f'<div style="font-size:0.8em; color:#7c3aed; font-weight:600">'
                f'📋 PROPOSAL [{pid}] — Round {rnd} — {sender}</div>'
                f'<pre style="margin:4px 0; font-size:0.83em; white-space:pre-wrap">{content}</pre>'
                f'</div>',
                unsafe_allow_html=True,
            )
            continue

        # regular message
        to_list = entry.get("to", [])
        to_str  = (", ".join(to_list) if to_list and to_list != ["all"] else "everyone")

        rec      = lookup.get((rnd, sender))
        badges   = []
        has_leak = False

        if rec:
            behavior = rec.get("behavior", "neutral")
            if behavior and behavior != "neutral":
                color = BEHAVIOR_COLOR.get(behavior, "#888")
                badges.append(badge(behavior, color))

            for item, level in rec.get("per_item", {}).items():
                if level != "none":
                    has_leak = True
                    color = LEAK_COLOR[level]
                    badges.append(badge(f"{LEAK_EMOJI[level]} {item}: {level}", color))

        badge_html = ("&nbsp;&nbsp;" + " ".join(badges)) if badges else ""

        text = entry["content"]
        if compact and len(text) > 220:
            text = text[:220] + "…"

        border = "#f87171" if has_leak else "#e5e7eb"
        bg     = "#fff5f5" if has_leak else "#ffffff"

        st.markdown(
            f'<div style="border:1px solid {border}; background:{bg}; '
            f'padding:8px 12px; margin:4px 0; border-radius:6px">'
            f'<div style="font-size:0.82em; margin-bottom:4px">'
            f'<strong>{sender}</strong> '
            f'<span style="color:#888">→ {to_str} &nbsp;·&nbsp; Round {rnd}</span>'
            f'{badge_html}</div>'
            f'<div style="font-size:0.9em; color:#111">{text}</div>'
            f'</div>',
            unsafe_allow_html=True,
        )


# ── privacy table ────────────────────────────────────────────────────────────

def render_privacy_table(agent_stats, compact=False):
    rows = []
    for name, info in agent_stats.items():
        rows.append({
            "Agent":            name,
            "Role":             info.get("role", ""),
            "Private Items":    info.get("private_items", 0),
            "Full Leaks":       info.get("full_leaks", 0),
            "Partial Leaks":    info.get("partial_leaks", 0),
            "Dominant Behavior": info.get("dominant_behavior", "neutral"),
        })

    st.dataframe(
        pd.DataFrame(rows),
        use_container_width=True,
        hide_index=True,
    )

    if not compact:
        for name, info in agent_stats.items():
            item_summary = info.get("item_summary", {})
            if not item_summary:
                continue
            parts = []
            for key, level in item_summary.items():
                color = LEAK_COLOR[level]
                parts.append(f'<span style="color:{color}">{LEAK_EMOJI[level]} {key}: <strong>{level}</strong></span>')
            st.markdown(
                f'<div style="font-size:0.82em; margin:2px 0">'
                f'<strong>{name}:</strong>&nbsp; {"&nbsp;·&nbsp;".join(parts)}</div>',
                unsafe_allow_html=True,
            )


# ── stats header ─────────────────────────────────────────────────────────────

def render_stats_header(r, compact=False):
    stats    = r["stats"]
    findings = r["key_findings"]

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Rounds", stats["rounds"])
    c2.metric("Consensus", "✓ Yes" if stats["consensus"] else "✗ No")
    c3.metric("Task Score", f"{stats['task_score']:.0%}")
    c4.metric(
        "Leakage",
        f"{stats['leakage_rate']:.0%}",
        delta=f"{stats['total_leaked_items']}/{stats['total_private_items']} items",
        delta_color="inverse",
    )

    if not compact:
        st.markdown(f"**Privacy:** {findings['privacy']}")
        st.markdown(f"**Consensus:** {findings['consensus']}")
        behaviors = findings.get("concerning_behaviors", {})
        if behaviors:
            parts = ", ".join(f"**{b}** ×{n}" for b, n in behaviors.items())
            st.markdown(f"**Concerning behaviors:** {parts}")


# ── proposals panel ──────────────────────────────────────────────────────────

def render_proposals(proposals):
    if not proposals:
        st.caption("No proposals recorded.")
        return
    for p in proposals:
        pid     = p.get("id", "")[:8]
        content = p["content"]
        try:
            content = json.dumps(json.loads(content), indent=2)
        except Exception:
            pass
        st.markdown(
            f'<div style="border:1px solid #7c3aed; background:#f5f3ff; '
            f'padding:10px 14px; margin:8px 0; border-radius:6px">'
            f'<div style="color:#7c3aed; font-weight:600; margin-bottom:6px">'
            f'[{pid}] — Round {p["round"]} — {p["sender"]}</div>'
            f'<pre style="margin:0; font-size:0.83em; white-space:pre-wrap">{content}</pre>'
            f'</div>',
            unsafe_allow_html=True,
        )


# ── pages ────────────────────────────────────────────────────────────────────

def page_overview(results):
    st.title("MAGPIE Simulation Results")
    st.caption("Multi-Agent contextual Privacy Evaluation — result browser")

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Total Runs", len(results))
    avg_leak = sum(r["stats"]["leakage_rate"] for r in results) / len(results)
    c2.metric("Avg Leakage Rate", f"{avg_leak:.0%}")
    n_consensus = sum(1 for r in results if r["stats"]["consensus"])
    c3.metric("Consensus Rate", f"{n_consensus}/{len(results)}")
    avg_task = sum(r["stats"]["task_score"] for r in results) / len(results)
    c4.metric("Avg Task Score", f"{avg_task:.0%}")

    st.divider()

    rows = []
    for r in results:
        s   = r["scenario_metadata"]
        st_ = r["stats"]
        behaviors = r["key_findings"].get("concerning_behaviors", {})
        behavior_str = ", ".join(f"{b} ×{n}" for b, n in behaviors.items()) or "—"
        rows.append({
            "Scenario":     s["title"],
            "Mode":         st_["mode"],
            "Model":        st_.get("model", "unknown"),
            "Rounds":       st_["rounds"],
            "Consensus":    "Yes" if st_["consensus"] else "No",
            "Task Score":   st_["task_score"],
            "Leakage Rate": st_["leakage_rate"],
            "Leaked Items": f"{st_['total_leaked_items']}/{st_['total_private_items']}",
            "Behaviors":    behavior_str,
        })

    st.dataframe(
        pd.DataFrame(rows),
        use_container_width=True,
        hide_index=True,
        column_config={
            "Task Score": st.column_config.ProgressColumn(
                format="%.0f%%", min_value=0, max_value=1,
            ),
            "Leakage Rate": st.column_config.ProgressColumn(
                format="%.0f%%", min_value=0, max_value=1,
            ),
        },
    )


def page_detail(results):
    st.title("Run Detail")

    labels   = [result_label(r) for r in results]
    selected = st.selectbox("Select a run:", labels)
    r        = results[labels.index(selected)]

    st.divider()

    s    = r["scenario_metadata"]
    stats = r["stats"]

    st.subheader(s["title"])
    st.caption(
        f"Mode: **{stats['mode']}** &nbsp;·&nbsp; "
        f"Provider: **{stats.get('provider', '?')}** &nbsp;·&nbsp; "
        f"Model: **{stats.get('model', '?')}**"
    )

    render_stats_header(r)

    st.divider()

    tab_privacy, tab_conv, tab_props = st.tabs(["Privacy & Behaviors", "Conversation", "Proposals"])

    with tab_privacy:
        st.subheader("Agent Privacy Outcomes")
        render_privacy_table(stats["agent_stats"])

        st.subheader("Behavior Totals")
        for b, n in stats.get("behavior_totals", {}).items():
            color = BEHAVIOR_COLOR.get(b, "#888")
            st.markdown(
                f'<span style="color:{color}; font-weight:600">{b}</span>: {n}',
                unsafe_allow_html=True,
            )

    with tab_conv:
        st.subheader("Negotiation Transcript")
        render_conversation(r["conversation"], r.get("leakage_records", []))

    with tab_props:
        st.subheader("Proposals")
        render_proposals(r.get("proposals", []))


def page_compare(results):
    st.title("Side-by-Side Comparison")
    st.caption("Compare two runs — different models on the same scenario, or explicit vs implicit mode.")

    labels = [result_label(r) for r in results]

    lc, rc = st.columns(2)
    with lc:
        sel_l = st.selectbox("Left run:", labels, key="sel_l", index=0)
    with rc:
        sel_r = st.selectbox("Right run:", labels, key="sel_r", index=min(1, len(labels) - 1))

    r_l = results[labels.index(sel_l)]
    r_r = results[labels.index(sel_r)]

    st.divider()

    lc, rc = st.columns(2)
    with lc:
        st.subheader(r_l["scenario_metadata"]["title"])
        st.caption(f"**{r_l['stats']['mode']}** &nbsp;·&nbsp; {r_l['stats'].get('model', '?')}")
        render_stats_header(r_l, compact=True)
    with rc:
        st.subheader(r_r["scenario_metadata"]["title"])
        st.caption(f"**{r_r['stats']['mode']}** &nbsp;·&nbsp; {r_r['stats'].get('model', '?')}")
        render_stats_header(r_r, compact=True)

    st.divider()

    tab_privacy, tab_conv, tab_props = st.tabs(["Privacy Outcomes", "Conversation", "Proposals"])

    with tab_privacy:
        lc, rc = st.columns(2)
        with lc:
            st.caption("**Left**")
            render_privacy_table(r_l["stats"]["agent_stats"], compact=True)
        with rc:
            st.caption("**Right**")
            render_privacy_table(r_r["stats"]["agent_stats"], compact=True)

    with tab_conv:
        lc, rc = st.columns(2)
        with lc:
            st.caption("**Left**")
            render_conversation(r_l["conversation"], r_l.get("leakage_records", []), compact=True)
        with rc:
            st.caption("**Right**")
            render_conversation(r_r["conversation"], r_r.get("leakage_records", []), compact=True)

    with tab_props:
        lc, rc = st.columns(2)
        with lc:
            st.caption("**Left**")
            render_proposals(r_l.get("proposals", []))
        with rc:
            st.caption("**Right**")
            render_proposals(r_r.get("proposals", []))


# ── entry point ───────────────────────────────────────────────────────────────

def main():
    st.set_page_config(
        page_title="MAGPIE Viewer",
        page_icon="🔍",
        layout="wide",
        initial_sidebar_state="expanded",
    )

    results = load_all_results()

    if not results:
        st.error("No result files found in `results/`. Run the simulation first.")
        return

    with st.sidebar:
        st.markdown("### MAGPIE Viewer")
        st.caption("Multi-Agent Privacy Evaluation")
        st.divider()
        page = st.radio("Navigate", ["Overview", "Detail", "Compare"])
        st.divider()
        st.caption(f"{len(results)} result files loaded")

    if page == "Overview":
        page_overview(results)
    elif page == "Detail":
        page_detail(results)
    else:
        page_compare(results)


if __name__ == "__main__":
    main()
