#!/usr/bin/env python
"""Warn when git changes touch forbidden generated, cache, model, or local data paths."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FORBIDDEN = ROOT / ".codeindex" / "forbidden-paths.json"


def git_changed_paths() -> list[str]:
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain", "-uall"],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
    except FileNotFoundError:
        return []
    paths: list[str] = []
    for line in result.stdout.splitlines():
        if not line:
            continue
        path = line[3:].strip()
        if " -> " in path:
            path = path.split(" -> ", 1)[1].strip()
        paths.append(path.replace("\\", "/"))
    return paths


def is_forbidden(path: str, config: dict) -> str | None:
    normalized = path.replace("\\", "/")
    for directory in config.get("forbidden_directories", []):
        if normalized == directory.rstrip("/") or normalized.startswith(directory):
            return directory
    suffixes = {
        ".onnx", ".safetensors", ".pt", ".pth", ".ckpt", ".bin", ".gguf",
        ".db", ".sqlite", ".sqlite-journal", ".sqlite-wal", ".sqlite-shm",
    }
    if any(normalized.lower().endswith(suffix) for suffix in suffixes):
        return "large model weight or local SQLite database"
    return None


def main() -> int:
    config = json.loads(FORBIDDEN.read_text(encoding="utf-8"))
    changed = git_changed_paths()
    violations = [(path, reason) for path in changed if (reason := is_forbidden(path, config))]

    print("Forbidden path check")
    print("Checked git changed/untracked paths. This script cannot detect reads; it prevents accidental modified artifacts.")
    if not violations:
        print("OK: no changed forbidden paths detected.")
        return 0

    print("WARNING: forbidden paths are changed or untracked:")
    for path, reason in violations:
        print(f"- {path} ({reason})")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())

