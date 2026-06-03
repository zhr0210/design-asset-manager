"""Central policy for blocking simulated AI output in product runs."""

from __future__ import annotations

import os


class MockInferenceBlockedError(RuntimeError):
    """Raised when a model would return simulated output in strict-real-AI mode."""


def is_strict_real_ai() -> bool:
    return os.environ.get("DESIGN_ASSET_MANAGER_STRICT_REAL_AI") == "1"


def is_mock_inference_allowed() -> bool:
    return os.environ.get("DESIGN_ASSET_MANAGER_ALLOW_MOCK_AI") == "1" or not is_strict_real_ai()


def guard_mock_inference(model_name: str, reason: str) -> None:
    if is_mock_inference_allowed():
        return
    raise MockInferenceBlockedError(
        f"{model_name} mock inference is blocked in production mode. {reason}"
    )
