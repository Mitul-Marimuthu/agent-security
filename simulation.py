"""
MAGPIE Simulation v2 — Multi-Agent Privacy Evaluation
======================================================
Replication of: "MAGPIE: A benchmark for Multi-AGent contextual PrIvacy Evaluation"
(Juneja et al., arXiv:2510.15186)

This is the entry point. It parses CLI arguments and delegates everything else
to the other modules:

    models.py    — dataclasses (Agent, Scenario, SimulationResult, etc.)
    scenarios.py — the 5 pre-built negotiation scenarios
    simulator.py — MAGPIESimulator: runs the round loop, calls the LLM
    analysis.py  — analyze(), print_report(), save_results()

Usage:
    # API key is loaded automatically from .env
    python simulation.py                              # scenario 0, explicit mode
    python simulation.py --scenario 2 --mode implicit
    python simulation.py --all --rounds 8
    python simulation.py --scenario 0 --save out.json --mode both
"""

import os
import argparse
from dotenv import load_dotenv

load_dotenv()

from simulator import MAGPIESimulator
from scenarios import SCENARIOS
from analysis import analyze, print_report, save_results
from models import SimulationResult


def main() -> None:
    """
    Parse CLI arguments and run one or more simulations.

    Supports three run modes via --mode:
        explicit — agents are told their private preferences are secrets and
                   given an explicit disclosure penalty
        implicit — agents receive the same private context as neutral background
                   information with no privacy warning
        both     — runs each selected scenario twice, once per mode, which is
                   the most useful setting for comparing leakage rates

    If --all is set, every scenario in scenarios.py is run. Otherwise --scenario
    selects a single one by index (0–4). Each (scenario, mode) pair produces an
    independent SimulationResult.

    When --save is specified, each result is written to a separate JSON file with
    the scenario id and mode appended to the filename, e.g. out_s0_explicit.json.
    This makes it straightforward to run a full batch and diff the outputs.
    """
    parser = argparse.ArgumentParser(description="MAGPIE Multi-Agent Privacy Simulation v2")
    parser.add_argument("--scenario", type=int, default=0, help="Scenario index 0–4 (default: 0)")
    parser.add_argument("--all", action="store_true", help="Run all 5 scenarios")
    parser.add_argument("--rounds", type=int, default=6, help="Max negotiation rounds (default: 6)")
    parser.add_argument("--mode", type=str, default="explicit",
                        choices=["explicit", "implicit", "both"],
                        help="Privacy instruction mode (default: explicit)")
    parser.add_argument("--provider", type=str, default="mistral",
                        choices=["mistral", "groq"],
                        help="LLM provider to use (default: mistral)")
    parser.add_argument("--model", type=str, default=None,
                        help="Model name (default: mistral-small-latest for mistral, llama-3.3-70b-versatile for groq)")
    parser.add_argument("--save", type=str, default="results/results.json", help="Save results to JSON file (default: results/results.json)")
    parser.add_argument("--quiet", action="store_true", help="Suppress per-turn output")
    args = parser.parse_args()

    key_var = "MISTRAL_API_KEY" if args.provider == "mistral" else "GROQ_API_KEY"
    if not os.environ.get(key_var):
        print(f"Error: {key_var} not found. Add it to your .env file.")
        return

    if args.scenario < 0 or args.scenario >= len(SCENARIOS):
        print(f"Invalid scenario index. Choose 0–{len(SCENARIOS)-1}.")
        return

    sim = MAGPIESimulator(provider=args.provider, model=args.model)
    modes = ["explicit", "implicit"] if args.mode == "both" else [args.mode]
    scenarios_to_run = SCENARIOS if args.all else [SCENARIOS[args.scenario]]

    all_results: list[SimulationResult] = []

    for scenario in scenarios_to_run:
        for mode in modes:
            result = sim.run(scenario, mode=mode, max_rounds=args.rounds, verbose=not args.quiet)
            print_report(result)
            all_results.append(result)
            if args.save:
                model_slug = result.model.replace("/", "-")
                tag = f"_s{scenario.id}_{mode}_{model_slug}"
                save_path = args.save.replace(".json", f"{tag}.json")
                save_results(result, save_path)

    if len(all_results) > 1:
        print(f"\n{'='*68}")
        print("CROSS-SCENARIO SUMMARY")
        print(f"{'='*68}")
        print(f"  {'Scenario':<30} {'Mode':<10} {'Leak%':>6}  {'Consensus':>9}  {'Task':>5}")
        print(f"  {'-'*30} {'-'*10} {'-'*6}  {'-'*9}  {'-'*5}")
        for r in all_results:
            s = analyze(r)
            print(
                f"  {r.scenario.tag:<30} {r.mode:<10} "
                f"{s['leakage_rate']:>5.0%}  "
                f"{'Yes':>9}  {s['task_score']:>4.0%}"
                if s["consensus"] else
                f"  {r.scenario.tag:<30} {r.mode:<10} "
                f"{s['leakage_rate']:>5.0%}  "
                f"{'No':>9}  {s['task_score']:>4.0%}"
            )
        print()


if __name__ == "__main__":
    main()
