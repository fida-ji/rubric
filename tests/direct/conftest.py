"""Shared fixtures and mock helpers for Rubric direct-mode tests.

Direct mode runs the leader function only (validator agreement is exercised by
integration tests), so these helpers mock the panel's grading prompt. Every test
verifies the deterministic settlement that runs after a verdict is reached.
"""

import json

CONTRACT = "contracts/rubric.py"
FEE_RECIPIENT = "0x" + "ab" * 20
FEE_BPS = 100  # 1%

GEN = 10**18  # 1 GEN in wei

# Distinct phrase from the adjudication prompt (re.search semantics).
PANEL_PROMPT = r".*juror on an impartial panel.*"


def addr_hex(a) -> str:
    """Normalize a direct-mode address fixture (bytes or Address) to 0x-hex."""
    if isinstance(a, str):
        return a
    if hasattr(a, "as_hex"):
        return a.as_hex
    return "0x" + bytes(a).hex()


def mock_verdict(direct_vm, verdict, reasoning="graded in test"):
    """Mock the panel's grading response with a bounded verdict."""
    direct_vm.mock_llm(PANEL_PROMPT, json.dumps({"verdict": verdict, "reasoning": reasoning}))
