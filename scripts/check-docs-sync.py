#!/usr/bin/env python
"""Remind when source changes may need docs updates.

Default mode is advisory and exits 0. Use --mode release or --mode phase-summary
to make missing docs updates fail.
"""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOC_PREFIXES = ("AGENTS.md", "TASK.md", ".codeindex/", "scripts/", "README.md")
SOURCE_PREFIXES = ("src/", "ai-service/")


def changed_paths() -> list[str]:
    result = subprocess.run(
        ["git", "status", "--porcelain", "-uall"],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    paths: list[str] = []
    for line in result.stdout.splitlines():
        if line:
            paths.append(line[3:].strip().replace("\\", "/"))
    return paths


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=["advisory", "release", "phase-summary"], default="advisory")
    args = parser.parse_args()

    paths = changed_paths()
    source_changed = [p for p in paths if p.startswith(SOURCE_PREFIXES)]
    docs_changed = [p for p in paths if p.startswith(DOC_PREFIXES) or "/README.md" in p]

    print("Docs sync check")
    if not source_changed:
        print("OK: no source changes detected.")
        return 0

    if docs_changed:
        print("OK: source and governance/index changes are both present.")
        return 0

    message = "Reminder: source files changed but no governance/index update was detected."
    if args.mode == "advisory":
        print(message)
        print("Advisory mode: not blocking.")
        return 0

    print(message)
    print(f"{args.mode} mode: docs sync is required.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
