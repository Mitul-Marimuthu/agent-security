"""
Data models for the MAGPIE simulation.

Every meaningful object in the simulation is defined here as a plain dataclass.
Keeping them separate from simulation logic makes it easy to serialize, inspect,
or swap out components without touching the simulator itself.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ShareablePreference:
    """
    A negotiating position that an agent is allowed — even encouraged — to
    share openly with the other parties at the table.

    These are the things an agent would put in a term sheet, a formal proposal,
    or a public opening statement. They shape strategy and utility, but there is
    no privacy cost to disclosing them. The utility_value field runs from -2 to
    +2 and reflects how strongly the agent cares about this preference relative
    to their other goals: +2 means it's a near-dealbreaker, -2 would mean an
    outcome that actively hurts them (though in practice we only use positive
    values here, since these are desired outcomes).
    """
    description: str    # full text the agent may quote or paraphrase to others
    utility_impact: str # narrative explanation of why this preference matters strategically
    utility_value: int  # -2 to +2; higher = more important to the agent


@dataclass
class PrivatePreference:
    """
    Information the agent must protect at all costs during negotiation.

    This is the core of what the MAGPIE benchmark is testing: will an LLM-powered
    agent inadvertently leak sensitive context when it's under social pressure,
    trying to be helpful, or searching for a persuasive argument?

    The 'value' field holds the actual secret — a detailed account of the hidden
    constraint, conflict of interest, or vulnerability. The 'reason' field
    explains why disclosure would be damaging (used both for realism and to give
    the agent a socially-plausible cover story). The 'penalty' is always negative
    and is passed to the LLM as a concrete cost signal in explicit mode.
    """
    value: str          # the actual secret — full detail, as the agent knows it
    reason: str         # why this must stay private; the plausible cover story
    utility_impact: str # how this hidden constraint shapes the agent's real strategy
    penalty: int        # utility penalty incurred if this item is disclosed (always < 0)


@dataclass
class Agent:
    """
    A single negotiating party in a scenario.

    Each agent has a public face (role, description, shareable_preferences) and a
    private one (private_preferences). The simulator feeds both to the LLM, but
    only the public side is visible to other agents. The tension between what an
    agent wants to say and what it must not say is where privacy leakage happens.

    The preference dicts use string keys as stable identifiers — e.g.
    "runway_crisis" or "google_offer" — so the leakage evaluator can track
    per-item disclosure across the full simulation run.
    """
    name: str
    role: str
    description: str
    shareable_preferences: dict[str, ShareablePreference]
    private_preferences: dict[str, PrivatePreference]


@dataclass
class AgentState:
    """
    Mutable runtime state for one agent, accumulated across rounds.

    This is intentionally separate from the Agent dataclass, which is static
    scenario configuration. AgentState evolves as the simulation progresses:
    the agent builds up strategic notes in memory, forms positions on proposals,
    and tracks which proposals it has seen.

    The memory list works like a simple scratchpad — the agent appends a note
    each round if it has something worth remembering, and only the last 5 entries
    are fed back in subsequent rounds to keep the context window manageable.

    proposal_status tracks the agent's most recent accept/reject decision as a
    (proposal_id, "accepted"|"rejected") tuple. Only the latest decision is
    stored; if an agent changes their mind and accepts a different proposal, the
    old status is overwritten. Consensus detection uses the full UUID here even
    though agents communicate via short_id.
    """
    name: str
    memory: list[str] = field(default_factory=list)
    proposal_status: Optional[tuple[str, str]] = None       # (full_uuid, "accepted"|"rejected")
    received_proposal_ids: list[str] = field(default_factory=list)


@dataclass
class Message:
    """
    A single communication sent during a negotiation round.

    Messages can be targeted (recipients is a non-empty list of agent names) or
    broadcast to everyone (recipients is an empty list). The simulator enforces
    this visibility rule: an agent only sees messages where they are a named
    recipient, or where recipients is empty. This lets agents have side
    conversations that others aren't privy to.
    """
    sender: str
    recipients: list[str]   # empty list means broadcast to all agents
    content: str
    round_num: int


@dataclass
class Proposal:
    """
    A formal settlement offer that can be accepted or rejected by other agents.

    Proposals are distinct from messages because they trigger the consensus
    mechanism. Consensus is reached only when every agent has accepted the same
    proposal, identified by its full UUID. The short_id (first 8 characters) is
    what agents see and reference in their actions — it's unambiguous enough in
    practice since UUIDs are randomly generated.

    A proposal can also be targeted (non-empty recipients) or sent to everyone.
    Targeted proposals are visible only to the named recipients and the sender.
    """
    id: str         # full UUID — used internally for consensus matching
    short_id: str   # first 8 chars — what agents write in accept/reject actions
    sender: str
    recipients: list[str]   # empty = all agents can see and respond to it
    content: str
    round_num: int


@dataclass
class LeakageRecord:
    """
    The result of evaluating one agent action for privacy leakage.

    Every time an agent sends a message, makes a proposal, or gives a reason for
    accepting or rejecting, the simulator calls an LLM judge to assess whether
    any private information leaked. The judge evaluates each private item
    independently and assigns one of three levels:

        "none"    — no detectable disclosure of this item
        "partial" — hints, indirect references, or implications that could tip
                    off an attentive listener
        "full"    — explicit or near-verbatim disclosure

    The behavior field captures the dominant social strategy in that turn:
    manipulation, lying, sycophancy, threatening, shaming, power-seeking,
    compromise, or neutral. This comes directly from the paper's behavioral
    taxonomy and is used for the aggregate behavioral profile in the report.
    """
    round_num: int
    agent_name: str
    action_type: str                # "send_message", "send_proposal", etc.
    content: str                    # the text that was evaluated
    per_item: dict[str, str]        # pref_key -> "none" | "partial" | "full"
    behavior: str                   # dominant behavior label for this turn


@dataclass
class Scenario:
    """
    A complete negotiation scenario, including all agents and evaluation criteria.

    Scenarios are self-contained: they specify who is negotiating, what they're
    trying to agree on, what the final deliverable should look like, and how to
    judge whether the negotiation succeeded. The success_criteria dict feeds
    directly into the LLM task scorer at the end of a run.

    The 'tag' is a short snake_case identifier used for filenames and cross-
    scenario summary tables. The 'deliverable' field tells agents what format the
    final agreement should take — e.g. a JSON term sheet — which nudges them
    toward producing something machine-readable for evaluation.
    """
    id: int
    tag: str                            # e.g. "startup_funding", "climate_policy"
    title: str
    description: str
    task: str                           # one-paragraph brief given to every agent
    deliverable: str                    # expected output format (JSON schema hint)
    success_criteria: dict[str, str]    # criterion_name -> description, for LLM scoring
    agents: list[Agent]


@dataclass
class SimulationResult:
    """
    Everything that happened in a single scenario run, accumulated for analysis.

    This is the object that flows from the simulator into the analysis and
    reporting layer. It holds a complete record of the run: every message sent,
    every proposal made, every leakage evaluation, and the final outcome metrics.

    consensus_reached and consensus_proposal_id capture whether and how the
    agents reached agreement. task_score (0.0–1.0) is assigned by an LLM judge
    comparing the negotiation outcome to the scenario's success_criteria.
    consensus_summary is a one-sentence narrative explanation from that same
    judge, useful for quickly understanding what happened in a run.

    The mode field distinguishes between the two experimental conditions from
    the paper:
        "explicit" — the LLM is told directly that certain information is private
                     and carries a penalty if disclosed
        "implicit" — the same information is provided as background context with
                     no explicit privacy instruction; the LLM must infer on its own
                     that it shouldn't share it
    """
    scenario: Scenario
    mode: str                                   # "explicit" or "implicit"
    messages: list[Message] = field(default_factory=list)
    proposals: list[Proposal] = field(default_factory=list)
    leakage_records: list[LeakageRecord] = field(default_factory=list)
    consensus_reached: bool = False
    consensus_proposal_id: Optional[str] = None
    task_score: float = 0.0
    total_rounds: int = 0
    consensus_summary: str = ""
