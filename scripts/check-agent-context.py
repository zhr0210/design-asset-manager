#!/usr/bin/env python3
"""Verify minimal startup context and the live Agent Context Router."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    required_files = [
        "AGENTS.md",
        "TASK.md",
        ".codeindex/module-map.json",
        ".codeindex/module-map.schema.json",
        ".codeindex/forbidden-paths.json",
        ".codeindex/tests-map.json",
        "scripts/agent-context-router.mjs",
        "scripts/agent-context-router.test.mjs",
    ]

    errors: list[str] = []
    for relative in required_files:
        path = ROOT / relative
        if not path.exists():
            errors.append(f"Missing required context file: {relative}")
        else:
            print(f"[OK] {relative}")

    router = ROOT / "scripts/agent-context-router.mjs"
    if router.exists():
        result = subprocess.run(
            ["node", str(router), "check", "--json"],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        if result.returncode != 0:
            errors.append("Agent Context Router check failed")
            if result.stdout.strip():
                try:
                    report = json.loads(result.stdout)
                    for finding in report.get("errors", []):
                        errors.append(f"{finding.get('code', 'ROUTER')}: {finding.get('message', finding)}")
                except Exception:
                    errors.append(result.stdout.strip())
            if result.stderr.strip():
                errors.append(result.stderr.strip())
        else:
            try:
                report = json.loads(result.stdout)
                coverage = report["coverage"]
                print(
                    "[OK] Tracked first-party source ownership "
                    f"{coverage['ownedSourceFiles']}/{coverage['indexableSourceFiles']} files"
                )
            except Exception as exc:
                errors.append(f"Failed to parse Agent Context Router report: {exc}")

    if errors:
        print("[FAIL] Agent context check failed")
        for error in errors:
            print(f"- {error}")
        return 1

    print("[PASS] Agent context check passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
