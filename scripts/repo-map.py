#!/usr/bin/env python
"""Print a compact repository map while skipping generated and large-data paths."""

from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {
    ".git",
    "node_modules",
    "dist",
    "out",
    "build",
    ".vite",
    "__pycache__",
    ".pytest_cache",
    "models_cache",
    "raw",
    "sampled",
}
SKIP_PREFIXES = {
    Path("src/main/extensions/photoshow"),
    Path("ai-service/eval/datasets/raw"),
    Path("ai-service/eval/datasets/sampled"),
}


def should_skip(path: Path) -> bool:
    rel = path.relative_to(ROOT)
    if any(rel == prefix or prefix in rel.parents for prefix in SKIP_PREFIXES):
        return True
    return any(part in SKIP_DIRS for part in rel.parts)


def main() -> int:
    print(f"Repository map: {ROOT.name}")
    for current, dirs, files in os.walk(ROOT):
        current_path = Path(current)
        if should_skip(current_path):
            dirs[:] = []
            continue
        dirs[:] = [d for d in sorted(dirs) if not should_skip(current_path / d)]
        rel = current_path.relative_to(ROOT)
        depth = 0 if str(rel) == "." else len(rel.parts)
        if depth > 3:
            dirs[:] = []
            continue
        indent = "  " * depth
        label = "." if str(rel) == "." else rel.as_posix()
        visible_files = [
            f for f in sorted(files)
            if not f.endswith((".pyc", ".db", ".sqlite", ".onnx"))
        ]
        print(f"{indent}{label}/ ({len(visible_files)} files)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

