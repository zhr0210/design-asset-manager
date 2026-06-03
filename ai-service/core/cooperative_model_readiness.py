from __future__ import annotations

"""Lightweight readiness checks for cooperative AI Worker models.

These checks intentionally avoid importing or loading heavy model libraries.
They only verify whether required Python packages are importable and whether
the downloaded model directory has the minimum file shape expected by each
wrapper.
"""

from importlib.util import find_spec
from pathlib import Path
from typing import Any, Dict, Iterable, List

from core.cooperative_model_registry import COOPERATIVE_MODELS, find_downloaded_model


DEPENDENCIES: dict[str, list[str]] = {
    "ram": ["torch", "torchvision", "PIL", "ram"],
    "florence2": ["torch", "transformers", "PIL"],
    "clip": ["torch", "transformers", "PIL"],
    "wd_tagger": ["onnxruntime", "numpy", "PIL"],
}

FILE_PATTERNS: dict[str, list[str]] = {
    "ram": ["*.pth"],
    "florence2": ["config.json", "*.safetensors|*.bin|pytorch_model*.bin"],
    "clip": ["config.json", "*.safetensors|*.bin|pytorch_model*.bin"],
    "wd_tagger": ["model.onnx", "selected_tags.csv"],
}


def _missing_packages(packages: Iterable[str]) -> list[str]:
    missing: list[str] = []
    for package in packages:
        if find_spec(package) is None:
            missing.append(package)
    return missing


def _pattern_exists(root: Path, pattern_group: str) -> bool:
    for pattern in pattern_group.split("|"):
        if any(root.rglob(pattern)):
            return True
    return False


def _missing_file_patterns(root: Path | None, patterns: Iterable[str]) -> list[str]:
    if root is None:
        return list(patterns)
    missing: list[str] = []
    for pattern in patterns:
        if not _pattern_exists(root, pattern):
            missing.append(pattern)
    return missing


def get_cooperative_model_readiness(loaded_models: Dict[str, Dict[str, Any]] | None = None) -> Dict[str, dict]:
    """Return real-load readiness for RAM++, Florence-2, CLIP/SigLIP, and WD Tagger."""
    loaded_models = loaded_models or {}
    status: Dict[str, dict] = {}

    for entry in COOPERATIVE_MODELS:
        family = entry["model_family"]
        local_path = find_downloaded_model(family)
        loaded_info = loaded_models.get(family)
        instance = loaded_info.get("instance") if loaded_info else None
        loaded = loaded_info is not None
        is_mock = bool(getattr(instance, "is_mock", False)) if instance else False
        backend = getattr(instance, "backend", None) if instance else None

        missing_dependencies = _missing_packages(DEPENDENCIES.get(family, []))
        missing_files = _missing_file_patterns(local_path, FILE_PATTERNS.get(family, []))

        if loaded and not is_mock:
            state = "loaded_real"
            label = "已真实加载"
        elif loaded and is_mock:
            state = "loaded_mock_blocked"
            label = "mock 已阻断"
        elif local_path is None:
            state = "not_downloaded"
            label = "未下载"
        elif missing_dependencies:
            state = "missing_dependencies"
            label = "依赖缺失"
        elif missing_files:
            state = "missing_files"
            label = "权重缺失"
        else:
            state = "ready_to_load"
            label = "可加载"

        status[family] = {
            "state": state,
            "label": label,
            "downloaded": local_path is not None,
            "dependency_ready": not missing_dependencies,
            "files_ready": not missing_files,
            "missing_dependencies": missing_dependencies,
            "missing_files": missing_files,
            "backend": backend,
            "is_mock": is_mock if loaded else None,
        }

    return status
