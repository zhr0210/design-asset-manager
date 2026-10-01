from __future__ import annotations
import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.mock_policy import (
    is_mock_inference_allowed,
    is_strict_real_ai,
    MockInferenceBlockedError,
)
from models.ram_tagger import RAMTaggerModel
from models.florence2_tagger import Florence2TaggerModel
from models.clip_design_classifier import CLIPDesignClassifier
from models.wd_tagger import WDTaggerModel
from services.translation_service import TranslationService
from services.tag_localization_service import TagLocalizationService

class TestStrictRealAiFallbacks(unittest.TestCase):
    def setUp(self):
        self._orig_env = os.environ.get("DESIGN_ASSET_MANAGER_STRICT_REAL_AI")
        self._orig_allow_mock = os.environ.get("DESIGN_ASSET_MANAGER_ALLOW_MOCK_AI")

    def tearDown(self):
        if self._orig_env is None:
            os.environ.pop("DESIGN_ASSET_MANAGER_STRICT_REAL_AI", None)
        else:
            os.environ["DESIGN_ASSET_MANAGER_STRICT_REAL_AI"] = self._orig_env
        if self._orig_allow_mock is None:
            os.environ.pop("DESIGN_ASSET_MANAGER_ALLOW_MOCK_AI", None)
        else:
            os.environ["DESIGN_ASSET_MANAGER_ALLOW_MOCK_AI"] = self._orig_allow_mock

    def test_strict_real_ai_policy_resolution(self):
        os.environ["DESIGN_ASSET_MANAGER_STRICT_REAL_AI"] = "1"
        self.assertTrue(is_strict_real_ai())

        os.environ["DESIGN_ASSET_MANAGER_STRICT_REAL_AI"] = "0"
        self.assertFalse(is_strict_real_ai())

        os.environ.pop("DESIGN_ASSET_MANAGER_STRICT_REAL_AI", None)
        self.assertFalse(is_strict_real_ai())

    def test_mock_requires_explicit_opt_in_and_never_overrides_strict_mode(self):
        os.environ.pop("DESIGN_ASSET_MANAGER_STRICT_REAL_AI", None)
        os.environ.pop("DESIGN_ASSET_MANAGER_ALLOW_MOCK_AI", None)
        self.assertFalse(is_mock_inference_allowed())

        os.environ["DESIGN_ASSET_MANAGER_ALLOW_MOCK_AI"] = "1"
        self.assertTrue(is_mock_inference_allowed())

        os.environ["DESIGN_ASSET_MANAGER_STRICT_REAL_AI"] = "1"
        self.assertFalse(is_mock_inference_allowed())

    @patch("core.cooperative_model_registry.find_downloaded_model", return_value=None)
    def test_ram_mock_blocking_in_strict_mode(self, mock_find):
        os.environ["DESIGN_ASSET_MANAGER_STRICT_REAL_AI"] = "1"
        model = RAMTaggerModel()
        model.is_mock = True
        
        with self.assertRaises(MockInferenceBlockedError):
            model.load()

        model = RAMTaggerModel()
        model.is_mock = False
        # Since RAM is not loaded/available, load() will fail and mock fallback will be blocked
        with self.assertRaises(MockInferenceBlockedError):
            model.load()

    @patch("core.cooperative_model_registry.find_downloaded_model", return_value=None)
    def test_florence2_mock_blocking_in_strict_mode(self, mock_find):
        os.environ["DESIGN_ASSET_MANAGER_STRICT_REAL_AI"] = "1"
        model = Florence2TaggerModel()
        model.is_mock = True
        
        with self.assertRaises(MockInferenceBlockedError):
            model.load()

        model = Florence2TaggerModel()
        model.is_mock = False
        with self.assertRaises(MockInferenceBlockedError):
            model.load()

    @patch("core.cooperative_model_registry.find_downloaded_model", return_value=None)
    def test_clip_mock_blocking_in_strict_mode(self, mock_find):
        os.environ["DESIGN_ASSET_MANAGER_STRICT_REAL_AI"] = "1"
        model = CLIPDesignClassifier()
        model.is_mock = True
        
        with self.assertRaises(MockInferenceBlockedError):
            model.load()

        model = CLIPDesignClassifier()
        model.is_mock = False
        with self.assertRaises(MockInferenceBlockedError):
            model.load()

    @patch("core.cooperative_model_registry.find_downloaded_model", return_value=None)
    def test_wd_tagger_mock_blocking_in_strict_mode(self, mock_find):
        os.environ["DESIGN_ASSET_MANAGER_STRICT_REAL_AI"] = "1"
        model = WDTaggerModel()
        model.is_mock = True
        
        with self.assertRaises(MockInferenceBlockedError):
            model.load()

        model = WDTaggerModel()
        model.is_mock = False
        with self.assertRaises(MockInferenceBlockedError):
            model.load()

    def test_translation_service_mock_blocking_in_strict_mode(self):
        os.environ["DESIGN_ASSET_MANAGER_STRICT_REAL_AI"] = "1"
        service = TranslationService()
        service.is_mock = True
        
        with self.assertRaises(MockInferenceBlockedError):
            service.load()

        service = TranslationService()
        service.is_mock = False
        with self.assertRaises(MockInferenceBlockedError):
            service.load()

    def test_tag_localization_service_fallback_on_blocked_translation(self):
        os.environ["DESIGN_ASSET_MANAGER_STRICT_REAL_AI"] = "1"
        
        # TranslationService will throw MockInferenceBlockedError
        translation_service = TranslationService()
        translation_service.is_mock = True
        
        loc_service = TagLocalizationService(translation_service=translation_service)
        
        # Localize a tag not in DESIGN_TRANSLATION_MAP or SYNONYM_MAP
        result = loc_service.localize_tag("unseen brand or tag name")
        
        self.assertEqual(result["tag_name"], "Unseen Brand Or Tag Name")
        self.assertEqual(result["raw_value"], "unseen brand or tag name")
        self.assertEqual(result["localized_by"], "fallback")
        self.assertTrue(result["needs_review"])

        # Batch localization
        results = loc_service.localize_tags_batch(["unseen brand or tag name", "another unseen tag"])
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]["tag_name"], "Unseen Brand Or Tag Name")
        self.assertEqual(results[0]["localized_by"], "fallback")
        self.assertEqual(results[1]["tag_name"], "Another Unseen Tag")
        self.assertEqual(results[1]["localized_by"], "fallback")

if __name__ == '__main__':
    unittest.main()
