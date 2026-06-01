#!/usr/bin/env python
"""Print the recommended context pack for a task type."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE_MAP = ROOT / ".codeindex" / "module-map.json"


def load_map() -> dict:
    return json.loads(MODULE_MAP.read_text(encoding="utf-8"))


def print_section(title: str, values: list[str] | str | None) -> None:
    if not values:
        return
    print(f"\n{title}:")
    if isinstance(values, str):
        print(f"- {values}")
    else:
        for value in values:
            print(f"- {value}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("task_type", nargs="?", help="Task type, for example visual_router")
    parser.add_argument("--list", action="store_true", help="List supported task types")
    args = parser.parse_args()

    module_map = load_map()
    if args.list:
        for task in sorted(module_map):
            print(task)
        return 0

    if not args.task_type:
        parser.error("task_type is required unless --list is used")

    task = args.task_type.strip()
    if task not in module_map:
        print(f"Unknown task type: {task}")
        print("Supported task types:")
        for key in sorted(module_map):
            print(f"- {key}")
        return 2

    pack = module_map[task]
    print(f"Context pack: {task}")
    print_section("Docs", pack.get("docs"))
    print_section("Playbook", pack.get("playbook"))
    print_section("Source files", pack.get("files_read") or pack.get("files"))
    print_section("Editable files", pack.get("files_edit"))
    print_section("Locked files", pack.get("files_locked_readonly"))
    print_section("Tests", pack.get("tests"))
    print_section("Avoid", pack.get("avoid"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
