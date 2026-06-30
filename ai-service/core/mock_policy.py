"""Central policy for blocking simulated AI output in product runs."""

from __future__ import annotations

import os


class MockInferenceBlockedError(RuntimeError):
    """Raised when a model would return simulated output in strict-real-AI mode."""


def is_strict_real_ai() -> bool:
    if os.environ.get("DESIGN_ASSET_MANAGER_STRICT_REAL_AI") == "1":
        return True
    if os.environ.get("NODE_ENV") == "production":
        return True
    if os.environ.get("PRODUCTION") == "1":
        return True

    import sys
    search_targets = []
    try:
        search_targets.append(__file__)
    except NameError:
        pass
    if sys.executable:
        search_targets.append(sys.executable)
    if sys.argv and len(sys.argv) > 0 and sys.argv[0]:
        search_targets.append(sys.argv[0])
    try:
        search_targets.append(os.getcwd())
    except Exception:
        pass

    for target in search_targets:
        if target and ("Contents/Resources" in target or "app.asar" in target):
            return True

    return False



def is_mock_inference_allowed() -> bool:
    return (
        not is_strict_real_ai()
        and os.environ.get("DESIGN_ASSET_MANAGER_ALLOW_MOCK_AI") == "1"
    )


def guard_mock_inference(model_name: str, reason: str) -> None:
    if is_mock_inference_allowed():
        return
    raise MockInferenceBlockedError(
        f"{model_name} mock inference is blocked in production mode. {reason}"
    )
