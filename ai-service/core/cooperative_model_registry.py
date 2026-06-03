from __future__ import annotations
"""Cooperative model registry (Python side).

Mirrors the TypeScript cooperative-model-registry.ts so the AI Worker
can discover downloaded model weights and route them to the right wrappers.
"""

import os
from pathlib import Path
from typing import Dict, Optional


COOPERATIVE_MODELS: list[dict] = [
    {
        "id": "ram-plus",
        "provider": "xinyu1205",
        "repo_id": "xinyu1205/recognize-anything-plus-model",
        "model_family": "ram",
        "category": "pth",
        "display_name": "RAM++",
    },
    {
        "id": "florence-2-large",
        "provider": "microsoft",
        "repo_id": "microsoft/Florence-2-large",
        "model_family": "florence2",
        "category": "transformers",
        "display_name": "Florence-2 Large",
    },
    {
        "id": "clip-vit-b-32",
        "provider": "laion",
        "repo_id": "laion/CLIP-ViT-B-32-laion2B-s34B-b79K",
        "model_family": "clip",
        "category": "transformers",
        "display_name": "CLIP ViT-B/32",
    },
    {
        "id": "wd-vit-tagger-v3",
        "provider": "SmilingWolf",
        "repo_id": "SmilingWolf/wd-vit-tagger-v3",
        "model_family": "wd_tagger",
        "category": "onnx-csv",
        "display_name": "WD Tagger v3",
    },
]


def _cooperative_root() -> Path:
    """Resolve the cooperative model download root, matching the TS logic."""
    env_root = os.environ.get("DESIGN_ASSET_MANAGER_MODEL_ROOT")
    if env_root:
        return Path(env_root) / "cooperative"

    configured = os.environ.get("DESIGN_ASSET_MANAGER_MODEL_ROOT_DIR")
    if configured:
        return Path(configured) / "cooperative"

    # Default: userData/AIModels/cooperative
    home = Path.home()
    return home / "Library" / "Application Support" / "design-asset-manager" / "AIModels" / "cooperative"


def get_cooperative_model_path(entry: dict) -> Optional[Path]:
    """Return the local download directory for this model if it exists and is non-empty."""
    local_dir = _cooperative_root() / entry["provider"] / entry["id"]
    if not local_dir.is_dir():
        return None
    try:
        entries = list(local_dir.iterdir())
        if not entries:
            return None
    except OSError:
        return None
    return local_dir


def find_downloaded_model(model_family: str) -> Optional[Path]:
    """Find the local path for a cooperative model by family name (ram, florence2, clip, wd_tagger)."""
    for entry in COOPERATIVE_MODELS:
        if entry["model_family"] == model_family:
            return get_cooperative_model_path(entry)
    return None


def get_downloaded_models_status() -> Dict[str, dict]:
    """Return a status dict of which models are downloaded and where."""
    status: Dict[str, dict] = {}
    for entry in COOPERATIVE_MODELS:
        local_path = get_cooperative_model_path(entry)
        status[entry["model_family"]] = {
            "downloaded": local_path is not None,
            "local_path": str(local_path) if local_path else None,
            "repo_id": entry["repo_id"],
            "category": entry["category"],
        }
    return status
