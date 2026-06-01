#!/usr/bin/env python3
"""Print the minimal agent context pack."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTEXT_FILES = [
    "AGENTS.md",
    "TASK.md",
]


def main() -> int:
    print("Recommended Agent Context File Pack")
    print("===================================")
    for relative in CONTEXT_FILES:
        path = ROOT / relative
        status = "EXISTS" if path.exists() else "MISSING"
        print(f"- [{status}] {relative}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
