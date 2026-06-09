from __future__ import annotations
import os
import sys
import unittest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import app
from core.mock_policy import is_strict_real_ai, MockInferenceBlockedError
from services.translation_service import TranslationService
from services.tag_localization_service import TagLocalizationService

class TestChallengerStrictEndpoints(unittest.TestCase):
    def setUp(self):
        self._orig_env = os.environ.get("DESIGN_ASSET_MANAGER_STRICT_REAL_AI")
        os.environ["DESIGN_ASSET_MANAGER_STRICT_REAL_AI"] = "1"
        self.client = TestClient(app)

    def tearDown(self):
        if self._orig_env is None:
            os.environ.pop("DESIGN_ASSET_MANAGER_STRICT_REAL_AI", None)
        else:
            os.environ["DESIGN_ASSET_MANAGER_STRICT_REAL_AI"] = self._orig_env

    def test_strict_mode_active(self):
        self.assertTrue(is_strict_real_ai())
        
        # Verify /health endpoint returns strict_real_ai: True
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("strict_real_ai"), True)

    def test_prompt_generation_blocked_in_strict_mode(self):
        # Sending request to /ai/prompt/generate
        payload = {
            "asset_id": "test-asset-1",
            "file_path": "test.png",
            "model_name": "JoyCaption-v2"
        }
        response = self.client.post("/ai/prompt/generate", json=payload)
        self.assertEqual(response.status_code, 501)
        self.assertIn("Python PromptWorker mock path is disabled in production", response.json()["detail"])

    def test_analysis_generation_blocked_in_strict_mode(self):
        # Sending request to /ai/analysis/generate
        payload = {
            "asset_id": "test-asset-1",
            "file_path": "test.png",
            "model_name": "Qwen2.5-VL"
        }
        response = self.client.post("/ai/analysis/generate", json=payload)
        self.assertEqual(response.status_code, 501)
        self.assertIn("Python AnalysisWorker mock path is disabled in production", response.json()["detail"])

    def test_invalid_payload_tag_enqueue(self):
        # Sending request to /ai/tag/enqueue with missing asset_id and file_path
        payload = {
            "priority": 1
        }
        response = self.client.post("/ai/tag/enqueue", json=payload)
        # Should raise validation error (422)
        self.assertEqual(response.status_code, 422)

    def test_translation_fallback_in_strict_mode(self):
        # TranslationService loaded in mock mode will raise MockInferenceBlockedError
        translation_service = TranslationService()
        translation_service.is_mock = True
        
        loc_service = TagLocalizationService(translation_service=translation_service)
        
        # 1. Dictionary translation should pass without calling translation service (not is_mock block)
        res_dict = loc_service.localize_tag("food")
        self.assertEqual(res_dict["tag_name"], "食品")
        self.assertEqual(res_dict["localized_by"], "dictionary")
        self.assertFalse(res_dict["needs_review"])

        # 2. All-caps brand word should pass without calling translation service
        res_brand = loc_service.localize_tag("BRANDNAME")
        self.assertEqual(res_brand["tag_name"], "BRANDNAME")
        self.assertEqual(res_brand["localized_by"], "dictionary")
        self.assertFalse(res_brand["needs_review"])

        # 3. Unseen tag calls TranslationService which throws MockInferenceBlockedError
        # and TagLocalizationService should fall back to Capitalized English tag
        res_fallback = loc_service.localize_tag("completely unseen tag name")
        self.assertEqual(res_fallback["tag_name"], "Completely Unseen Tag Name")
        self.assertEqual(res_fallback["localized_by"], "fallback")
        self.assertTrue(res_fallback["needs_review"])

if __name__ == '__main__':
    unittest.main()
