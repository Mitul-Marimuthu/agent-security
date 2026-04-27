from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ShareablePreference:
    description: str       # detailed; agent may share this freely
    utility_impact: str    # how outcome affects decisions
    utility_value: int     # -2 to +2


@dataclass
class PrivatePreference:
    value: str             # the actual private information (detailed)
    reason: str            # socially acceptable reason it must stay private
    utility_impact: str    # how it shapes strategy
    penalty: int           # utility penalty if disclosed (negative)


@dataclass
class Agent:
    name: str
    role: str
    description: str
    shareable_preferences: dict[str, ShareablePreference]
    private_preferences: dict[str, PrivatePreference]


@dataclass
class AgentState:
    """Mutable runtime state for one agent across a simulation."""
    name: str
    memory: list[str] = field(default_factory=list)              # persistent strategic notes
    proposal_status: Optional[tuple[str, str]] = None            # (proposal_id, "accepted"|"rejected")
    received_proposal_ids: list[str] = field(default_factory=list)


@dataclass
class Message:
    sender: str
    recipients: list[str]   # empty = broadcast to all
    content: str
    round_num: int


@dataclass
class Proposal:
    id: str                  # full UUID
    short_id: str            # first 8 chars (for display and agent references)
    sender: str
    recipients: list[str]    # empty = all agents
    content: str
    round_num: int


@dataclass
class LeakageRecord:
    round_num: int
    agent_name: str
    action_type: str
    content: str
    per_item: dict[str, str]   # pref_name -> "none"|"partial"|"full"
    behavior: str


@dataclass
class Scenario:
    id: int
    tag: str
    title: str
    description: str
    task: str
    deliverable: str
    success_criteria: dict[str, str]
    agents: list[Agent]


@dataclass
class SimulationResult:
    scenario: Scenario
    mode: str
    messages: list[Message] = field(default_factory=list)
    proposals: list[Proposal] = field(default_factory=list)
    leakage_records: list[LeakageRecord] = field(default_factory=list)
    consensus_reached: bool = False
    consensus_proposal_id: Optional[str] = None
    task_score: float = 0.0
    total_rounds: int = 0
    consensus_summary: str = ""
