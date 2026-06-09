# -*- coding: utf-8 -*-
from __future__ import annotations
import os
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.mock_policy import is_strict_real_ai, MockInferenceBlockedError
from core.cooperative_model_readiness import get_cooperative_model_readiness
from services.translation_service import TranslationService
from services.tag_localization_service import TagLocalizationService
from models.ram_tagger import RAMTaggerModel
from models.florence2_tagger import Florence2TaggerModel
from models.clip_design_classifier import CLIPDesignClassifier
from models.wd_tagger import WDTaggerModel

def test_strict_real_ai():
    print("=== Test 1: Verify DESIGN_ASSET_MANAGER_STRICT_REAL_AI=1 ===")
    
    # 1. Check strict policy resolution
    os.environ["DESIGN_ASSET_MANAGER_STRICT_REAL_AI"] = "1"
    assert is_strict_real_ai() is True, "is_strict_real_ai() must return True when env var is '1'"
    print("[PASS] Strict Real AI env var detection is correct.")
    
    # 2. Check mock inference blocking on RAM Tagger
    ram = RAMTaggerModel()
    ram.is_mock = True
    try:
        ram.load()
        assert False, "RAMTagger load() must fail in strict mode when is_mock is True"
    except MockInferenceBlockedError as e:
        print(f"[PASS] RAMTagger mock inference blocked: {e}")

    # 3. Check mock inference blocking on Florence2 Tagger
    florence = Florence2TaggerModel()
    florence.is_mock = True
    try:
        florence.load()
        assert False, "Florence2Tagger load() must fail in strict mode when is_mock is True"
    except MockInferenceBlockedError as e:
        print(f"[PASS] Florence2Tagger mock inference blocked: {e}")

    # 4. Check mock inference blocking on CLIP classifier
    clip = CLIPDesignClassifier()
    clip.is_mock = True
    try:
        clip.load()
        assert False, "CLIPDesignClassifier load() must fail in strict mode when is_mock is True"
    except MockInferenceBlockedError as e:
        print(f"[PASS] CLIPDesignClassifier mock inference blocked: {e}")

    # 5. Check mock inference blocking on WD Tagger
    wd = WDTaggerModel()
    wd.is_mock = True
    try:
        wd.load()
        assert False, "WDTagger load() must fail in strict mode when is_mock is True"
    except MockInferenceBlockedError as e:
        print(f"[PASS] WDTagger mock inference blocked: {e}")

    # 6. Check mock translation blocking on TranslationService
    trans = TranslationService()
    trans.is_mock = True
    try:
        trans.load()
        assert False, "TranslationService load() must fail in strict mode when is_mock is True"
    except MockInferenceBlockedError as e:
        print(f"[PASS] TranslationService mock inference blocked: {e}")
        
    print("[PASS] All model mocks are successfully blocked under strict real AI mode.\n")


def test_cooperative_state_machine():
    print("=== Test 2: Verify Cooperative 5-State Machine ===")

    # State 1: not_downloaded (find_downloaded_model returns None)
    with patch("core.cooperative_model_readiness.find_downloaded_model", return_value=None):
        status = get_cooperative_model_readiness()
        for model_family in ["ram", "florence2", "clip", "wd_tagger"]:
            state = status[model_family]["state"]
            assert state == "not_downloaded", f"{model_family} expected 'not_downloaded', got '{state}'"
    print("[PASS] State 1 (not_downloaded) verified successfully.")

    # State 2: missing_dependencies (find_downloaded_model returns path, but _missing_packages returns list)
    with patch("core.cooperative_model_readiness.find_downloaded_model", return_value=Path("/tmp/mock-model-dir")):
        with patch("core.cooperative_model_readiness._missing_packages", return_value=["some_dependency"]):
            status = get_cooperative_model_readiness()
            for model_family in ["ram", "florence2", "clip", "wd_tagger"]:
                state = status[model_family]["state"]
                assert state == "missing_dependencies", f"{model_family} expected 'missing_dependencies', got '{state}'"
    print("[PASS] State 2 (missing_dependencies) verified successfully.")

    # State 3: missing_files (find_downloaded_model returns path, _missing_packages is empty, but _pattern_exists returns False)
    with patch("core.cooperative_model_readiness.find_downloaded_model", return_value=Path("/tmp/mock-model-dir")):
        with patch("core.cooperative_model_readiness._missing_packages", return_value=[]):
            with patch("core.cooperative_model_readiness._pattern_exists", return_value=False):
                status = get_cooperative_model_readiness()
                for model_family in ["ram", "florence2", "clip", "wd_tagger"]:
                    state = status[model_family]["state"]
                    assert state == "missing_files", f"{model_family} expected 'missing_files', got '{state}'"
    print("[PASS] State 3 (missing_files) verified successfully.")

    # State 4: ready_to_load (find_downloaded_model returns path, _missing_packages is empty, and _pattern_exists returns True)
    with patch("core.cooperative_model_readiness.find_downloaded_model", return_value=Path("/tmp/mock-model-dir")):
        with patch("core.cooperative_model_readiness._missing_packages", return_value=[]):
            with patch("core.cooperative_model_readiness._pattern_exists", return_value=True):
                status = get_cooperative_model_readiness()
                for model_family in ["ram", "florence2", "clip", "wd_tagger"]:
                    state = status[model_family]["state"]
                    assert state == "ready_to_load", f"{model_family} expected 'ready_to_load', got '{state}'"
    print("[PASS] State 4 (ready_to_load) verified successfully.")

    # State 5: loaded_real (passed loaded_models dictionary with active real instance)
    mock_instance = MagicMock()
    mock_instance.is_mock = False
    mock_instance.backend = "real-backend"
    
    loaded_models = {
        "ram": {"instance": mock_instance},
        "florence2": {"instance": mock_instance},
        "clip": {"instance": mock_instance},
        "wd_tagger": {"instance": mock_instance}
    }
    status = get_cooperative_model_readiness(loaded_models=loaded_models)
    for model_family in ["ram", "florence2", "clip", "wd_tagger"]:
        state = status[model_family]["state"]
        assert state == "loaded_real", f"{model_family} expected 'loaded_real', got '{state}'"
    print("[PASS] State 5 (loaded_real) verified successfully.")

    # State 6: loaded_mock_blocked (passed loaded_models dictionary with mock instance when strict mode is active)
    mock_mock_instance = MagicMock()
    mock_mock_instance.is_mock = True
    mock_mock_instance.backend = "mock"
    
    loaded_models_mock = {
        "ram": {"instance": mock_mock_instance},
        "florence2": {"instance": mock_mock_instance},
        "clip": {"instance": mock_mock_instance},
        "wd_tagger": {"instance": mock_mock_instance}
    }
    status = get_cooperative_model_readiness(loaded_models=loaded_models_mock)
    for model_family in ["ram", "florence2", "clip", "wd_tagger"]:
        state = status[model_family]["state"]
        assert state == "loaded_mock_blocked", f"{model_family} expected 'loaded_mock_blocked', got '{state}'"
    print("[PASS] State 6 (loaded_mock_blocked) verified successfully.\n")


def test_translation_fallback():
    print("=== Test 3: Verify Translation Fallback cleanly to English ===")
    
    # Enable strict mode to block mock translation
    os.environ["DESIGN_ASSET_MANAGER_STRICT_REAL_AI"] = "1"
    
    translation_service = TranslationService()
    translation_service.is_mock = True  # Force it to mock so it triggers blocking error on translate
    
    loc_service = TagLocalizationService(translation_service=translation_service)
    
    # 1. Single tag fallback
    result = loc_service.localize_tag("completely unseen tag name")
    print(f"Single tag result: {result}")
    
    # Expect clean English title-cased fallback
    assert result["tag_name"] == "Completely Unseen Tag Name"
    assert result["raw_value"] == "completely unseen tag name"
    assert result["localized_by"] == "fallback"
    assert result["needs_review"] is True
    print("[PASS] Single tag localization fallbacks cleanly to English Title Case and needs review.")
    
    # 2. Batch tag fallback
    results = loc_service.localize_tags_batch(["tag one", "tag two", "tag three"])
    print(f"Batch tag results: {results}")
    
    assert len(results) == 3
    assert results[0]["tag_name"] == "Tag One"
    assert results[0]["localized_by"] == "fallback"
    assert results[1]["tag_name"] == "Tag Two"
    assert results[1]["localized_by"] == "fallback"
    assert results[2]["tag_name"] == "Tag Three"
    assert results[2]["localized_by"] == "fallback"
    print("[PASS] Batch tag localization fallbacks cleanly to English Title Case and needs review.")
    
    # 3. Simulate translation service failure returning non-Chinese output (or empty output)
    # Patch translate_tag to return non-Chinese character text, forcing post_process fallback
    with patch.object(translation_service, "translate_tag", return_value="Some English Translation"):
        result = loc_service.localize_tag("failure text")
        print(f"Translation failure output result: {result}")
        assert result["tag_name"] == "Failure Text"
        assert result["localized_by"] == "fallback"
        assert result["needs_review"] is True
    print("[PASS] Non-Chinese translation post-process fallback to English verified.")

    # 4. Simulate sentence-like long translation (> 8 Chinese characters)
    with patch.object(translation_service, "translate_tag", return_value="这是一个非常长超过八个汉字的设计标签描述"):
        result = loc_service.localize_tag("long description tag")
        print(f"Translation too long result: {result}")
        assert result["tag_name"] == "Long Description Tag"
        assert result["localized_by"] == "needs_review"
        assert result["needs_review"] is True
    print("[PASS] Long translation fallback to English verified.\n")


if __name__ == "__main__":
    orig_env = os.environ.get("DESIGN_ASSET_MANAGER_STRICT_REAL_AI")
    try:
        test_strict_real_ai()
        test_cooperative_state_machine()
        test_translation_fallback()
        print("==========================================")
        print("ALL VERIFICATION HARNESS TESTS PASSED SUCCESSFULLY!")
        print("==========================================")
    finally:
        if orig_env is None:
            os.environ.pop("DESIGN_ASSET_MANAGER_STRICT_REAL_AI", None)
        else:
            os.environ["DESIGN_ASSET_MANAGER_STRICT_REAL_AI"] = orig_env
