#!/usr/bin/env python
"""Warn when git changes touch monitored generated, cache, model, or local data paths."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Literal

ROOT = Path(__file__).resolve().parents[1]
FORBIDDEN = ROOT / ".codeindex" / "forbidden-paths.json"
ADVISORY_DIRECTORIES = {"docs/"}
REQUIRED_FORBIDDEN_DIRECTORIES = {
    "docs/", "ai-service/models_cache/", "dist-packages/", "dist-temp/", "runtime-data/",
}
REQUIRED_CONTEXT_PROTECTED_DIRECTORIES = {
    "ai-service/models_cache/", "dist-packages/", "dist-temp/", "runtime-data/",
    "src/main/extensions/photoshow/unpacked/",
}
REQUIRED_BLOCKING_SUFFIXES = {
    ".onnx", ".safetensors", ".pt", ".pth", ".ckpt", ".bin", ".gguf",
    ".db", ".sqlite", ".sqlite-journal", ".sqlite-wal", ".sqlite-shm",
}

ViolationSeverity = Literal["advisory", "blocking"]


class PathFinding(tuple):
    __slots__ = ()

    def __new__(cls, path: str, reason: str, severity: ViolationSeverity):
        return tuple.__new__(cls, (path, reason, severity))

    @property
    def path(self) -> str:
        return self[0]

    @property
    def reason(self) -> str:
        return self[1]

    @property
    def severity(self) -> ViolationSeverity:
        return self[2]


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


def classify_path(path: str, config: dict) -> tuple[str, ViolationSeverity] | None:
    normalized = path.replace("\\", "/")
    for directory in config.get("forbidden_directories", []):
        if normalized == directory.rstrip("/") or normalized.startswith(directory):
            severity: ViolationSeverity = "advisory" if directory in ADVISORY_DIRECTORIES else "blocking"
            return directory, severity
    blocking_suffixes = config.get("blocking_suffixes", REQUIRED_BLOCKING_SUFFIXES)
    if any(normalized.lower().endswith(suffix.lower()) for suffix in blocking_suffixes):
        return "large model weight or local SQLite database", "blocking"
    return None


def collect_findings(paths: list[str], config: dict) -> list[PathFinding]:
    findings: list[PathFinding] = []
    for path in paths:
        classified = classify_path(path, config)
        if classified is None:
            continue
        reason, severity = classified
        findings.append(PathFinding(path, reason, severity))
    return findings


def main() -> int:
    config = json.loads(FORBIDDEN.read_text(encoding="utf-8"))
    for key in ("forbidden_directories", "context_protected_directories", "blocking_suffixes"):
        values = config.get(key)
        if not isinstance(values, list) or not values or not all(isinstance(value, str) and value for value in values):
            print(f"ERROR: forbidden-paths.json {key} must be a non-empty string list.")
            return 1
    required_values = {
        "forbidden_directories": REQUIRED_FORBIDDEN_DIRECTORIES,
        "context_protected_directories": REQUIRED_CONTEXT_PROTECTED_DIRECTORIES,
        "blocking_suffixes": REQUIRED_BLOCKING_SUFFIXES,
    }
    for key, required in required_values.items():
        missing = required.difference(config[key])
        if missing:
            print(f"ERROR: forbidden-paths.json {key} is missing required protections: {', '.join(sorted(missing))}")
            return 1
    changed = git_changed_paths()
    findings = collect_findings(changed, config)
    blocking = [finding for finding in findings if finding.severity == "blocking"]
    advisory = [finding for finding in findings if finding.severity == "advisory"]

    print("Forbidden path check")
    print("Checked git changed/untracked paths. This script cannot detect reads; it prevents accidental modified artifacts.")
    if not findings:
        print("OK: no changed forbidden paths detected.")
        return 0

    if advisory:
        print("ADVISORY: monitored documentation paths are changed or untracked:")
        for finding in advisory:
            print(f"- {finding.path} ({finding.reason})")

    if blocking:
        print("WARNING: blocking forbidden paths are changed or untracked:")
        for finding in blocking:
            print(f"- {finding.path} ({finding.reason})")
        return 1

    print("OK: only advisory monitored documentation paths changed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
