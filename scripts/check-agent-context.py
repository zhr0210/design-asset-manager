#!/usr/bin/env python3
"""Verify the minimal agent context files."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    required_files = [
        "AGENTS.md",
        "TASK.md",
        ".codeindex/module-map.json",
        ".codeindex/forbidden-paths.json",
        ".codeindex/tests-map.json",
    ]

    errors: list[str] = []
    for relative in required_files:
        path = ROOT / relative
        if not path.exists():
            errors.append(f"Missing required context file: {relative}")
        else:
            print(f"[OK] {relative}")

    module_map_path = ROOT / ".codeindex/module-map.json"
    if module_map_path.exists():
        try:
            module_map = json.loads(module_map_path.read_text(encoding="utf-8"))
            if "current_context" not in module_map:
                errors.append("module-map.json must contain current_context")
            else:
                files_read = module_map["current_context"].get("files_read", [])
                if files_read != ["AGENTS.md", "TASK.md"]:
                    errors.append("current_context.files_read must stay limited to AGENTS.md and TASK.md")
        except Exception as exc:
            errors.append(f"Failed to parse module-map.json: {exc}")

    forbidden_path = ROOT / ".codeindex/forbidden-paths.json"
    if forbidden_path.exists():
        try:
            forbidden = json.loads(forbidden_path.read_text(encoding="utf-8"))
            dirs = forbidden.get("forbidden_directories", [])
            if "docs/" not in dirs:
                errors.append("forbidden-paths.json must keep docs/ forbidden")
        except Exception as exc:
            errors.append(f"Failed to parse forbidden-paths.json: {exc}")

    if errors:
        print("[FAIL] Agent context check failed")
        for error in errors:
            print(f"- {error}")
        return 1

    print("[PASS] Agent context check passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
