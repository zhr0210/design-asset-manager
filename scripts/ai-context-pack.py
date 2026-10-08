#!/usr/bin/env python3
"""Deprecated compatibility entry for the Agent Context Router."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).absolute().parents[1]
ROUTER = ROOT / "scripts" / "agent-context-router.mjs"
VALUE_OPTIONS = {"--task", "--module", "--max-files", "--budget", "--max-routes", "--max-adrs", "--max-tests"}


def translate_legacy_args(argv: list[str]) -> list[str]:
    if "--task" in argv or "--module" in argv:
        return argv

    task_indexes: set[int] = set()
    option_value = False
    for index, argument in enumerate(argv):
        if option_value:
            option_value = False
        elif argument in VALUE_OPTIONS:
            option_value = True
        elif not argument.startswith("--"):
            task_indexes.add(index)
    if not task_indexes:
        return argv
    task = " ".join(argv[index] for index in sorted(task_indexes))
    options = [argument for index, argument in enumerate(argv) if index not in task_indexes]
    return ["--task", task, *options]


def main(argv: list[str] | None = None) -> int:
    print("Deprecated: use `npm run context:route -- ...`.", file=sys.stderr)
    forwarded = translate_legacy_args(list(sys.argv[1:] if argv is None else argv))
    try:
        result = subprocess.run(
            ["node", str(ROUTER), "route", *forwarded],
            cwd=ROOT,
            check=False,
        )
    except FileNotFoundError:
        print("Agent Context Router requires Node.js.", file=sys.stderr)
        return 127
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
