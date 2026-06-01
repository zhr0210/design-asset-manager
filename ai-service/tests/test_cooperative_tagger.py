import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# -*- coding: utf-8 -*-
import unittest
import os
import sys

# Append parent dir to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models.asset_type_router import AssetTypeRouter
from utils.design_tag_dictionary import DESIGN_TAG_DICTIONARY
from utils.tag_fusion import fuse_and_clean_tags, SENSITIVE_BLOCK_WORDS
from models.clip_design_classifier import CLIPDesignClassifier
from models.ram_tagger import RAMTaggerModel
from models.florence2_tagger import Florence2TaggerModel

class TestCooperativeTagger(unittest.IsolatedAsyncioTestCase):
    """
    Comprehensive regression test suite verifying the multi-model cooperative routing architecture,
    fusion/translation layers, and mock fallback robustness using IsolatedAsyncioTestCase.
    """
    async def test_asset_type_router(self):
        """
        Verify that images are accurately routed to the correct models according to semantic clues.
        """
        # Scenario 1: UI / PPT design templates
        route_ppt = await AssetTypeRouter.route("C:\\Users\\kilian\\DesignAssetManager\\library\\financial_report_slide_deck.ppt.jpg")
        self.assertEqual(route_ppt["asset_type"], "document")
        self.assertIn("florence2", route_ppt["recommended_pipeline"])
        
        # Scenario 2: Anime illustration
        route_anime = await AssetTypeRouter.route("C:\\images\\futanari_illustration_anime.png")
        self.assertEqual(route_anime["asset_type"], "anime")
        self.assertIn("wd_tagger", route_anime["recommended_pipeline"])
        
        # Scenario 3: Real world photo
        route_photo = await AssetTypeRouter.route("D:\\scenery\\mount_fuji_outdoor_nature_photo.jpg")
        self.assertEqual(route_photo["asset_type"], "photo")
        self.assertIn("ram", route_photo["recommended_pipeline"])

    async def test_router_poster_scenario(self):
        """Verify poster/banner filenames are routed to design models."""
        route = await AssetTypeRouter.route("C:\\design\\summer_poster_2024.jpg")
        self.assertEqual(route["asset_type"], "design")
        self.assertIn("florence2", route["recommended_pipeline"])
        self.assertIn("clip", route["recommended_pipeline"])
        
    async def test_router_svg_as_ui(self):
        """SVG files should be recognized as UI/template assets."""
        route = await AssetTypeRouter.route("C:\\icons\\app_icon.svg")
        self.assertEqual(route["asset_type"], "ui")
        
    async def test_router_unknown_fallback_includes_ram(self):
        """Unknown assets should include RAM as general tagger."""
        route = await AssetTypeRouter.route("C:\\misc\\random_file_12345.png")
        self.assertEqual(route["asset_type"], "unknown")
        self.assertIn("ram", route["recommended_pipeline"])
        self.assertIn("clip", route["recommended_pipeline"])

    def test_sensitive_words_fusion_filter(self):
        """
        Verify that duplicates are resolved, Chinese translation mapped,
        and all sensitive anime words completely blocked.
        """
        raw_outputs = [
            {"name": "minimalist design", "confidence": 0.85, "category": "style", "source": "ai_clip_classifier"},
            {"name": "blue purple gradient", "confidence": 0.92, "category": "style", "source": "ai_wd_tagger"},
            {"name": "futanari", "confidence": 0.99, "category": "custom", "source": "ai_wd_tagger"}, # EMBARRASSING ANIME WORD
            {"name": "breasts", "confidence": 0.95, "category": "custom", "source": "ai_wd_tagger"}, # EMBARRASSING ANIME WORD
            {"name": "blue purple gradient", "confidence": 0.70, "category": "style", "source": "ai_clip_classifier"}, # DUPLICATE
        ]
        
        fused = fuse_and_clean_tags(raw_outputs)
        
        # 1. Verification of sensitive word block
        names = [t["name"] for t in fused]
        self.assertNotIn("futanari", names)
        self.assertNotIn("breasts", names)
        self.assertNotIn("Futanari", names)
        
        # 2. Verification of deduplication (blue purple gradient should appear once)
        normalized_names = [t["normalized_name"] for t in fused]
        gradient_count = normalized_names.count("blue purple gradient")
        self.assertEqual(gradient_count, 1)
        
        # 3. Highest confidence retained for dedup (0.92 > 0.70)
        gradient_tag = [t for t in fused if t["normalized_name"] == "blue purple gradient"][0]
        self.assertEqual(gradient_tag["confidence"], 0.92)

    def test_fusion_max_tags_limit(self):
        """Verify that tag fusion respects the max_tags limit."""
        raw_outputs = [
            {"name": f"tag_{i}", "confidence": 0.5 + i * 0.01, "category": "custom", "source": "ai_test"}
            for i in range(50)
        ]
        fused = fuse_and_clean_tags(raw_outputs, max_tags=10)
        self.assertEqual(len(fused), 10)
        # Should be sorted by confidence descending
        self.assertGreaterEqual(fused[0]["confidence"], fused[-1]["confidence"])

    def test_fusion_empty_input(self):
        """Verify fusion handles empty input gracefully."""
        fused = fuse_and_clean_tags([])
        self.assertEqual(len(fused), 0)

    def test_mock_classification_and_predictions(self):
        """
        Verify that all models fallback gracefully and contextually produce mock tags
        without crashes when weights are not present.
        """
        # Test CLIP Design Classifier
        clip = CLIPDesignClassifier()
        clip.is_mock = True
        clip.load()
        self.assertTrue(clip.is_mock)
        self.assertEqual(clip.backend, "mock")
        
        candidates = list(DESIGN_TAG_DICTIONARY.get("style", {}).keys())
        self.assertTrue(len(candidates) > 0)
        clip_preds = clip.classify("C:\\path\\financial_report.jpg", candidates)
        self.assertTrue(len(clip_preds) > 0)
        # Each prediction should be a (tag, score) tuple
        self.assertEqual(len(clip_preds[0]), 2)
        self.assertIsInstance(clip_preds[0][1], float)
        
        # Test RAM General Tagger
        ram = RAMTaggerModel()
        ram.is_mock = True
        ram.load()
        ram_preds = ram.predict_batch(["C:\\path\\outdoor_scenery_photo.jpg"])[0]
        self.assertTrue(len(ram_preds) > 0)
        # RAM predictions should have name, confidence, category, source
        for pred in ram_preds:
            self.assertIn("name", pred)
            self.assertIn("confidence", pred)
            self.assertIn("source", pred)
            self.assertEqual(pred["source"], "ai_ram")
        
        # Test Florence-2 OCR and Caption Tagger
        f2 = Florence2TaggerModel()
        f2.is_mock = True
        f2.load()
        ocr_res = f2.predict("C:\\path\\wajass_shampoo.jpg", "<OCR>")
        self.assertTrue(ocr_res["success"])
        self.assertIn("wajass", ocr_res["result"].lower())
        
        # Test Florence-2 detailed caption
        caption_res = f2.predict("C:\\path\\scenery_mountain.jpg", "<DETAILED_CAPTION>")
        self.assertTrue(caption_res["success"])
        self.assertTrue(len(caption_res["result"]) > 10)
        
        # Test Florence-2 object detection
        od_res = f2.predict("C:\\path\\poster_banner.jpg", "<OD>")
        self.assertTrue(od_res["success"])
        self.assertIn("bboxes", od_res["result"])

    def test_clip_empty_candidates(self):
        """CLIP classifier should handle empty candidate list gracefully."""
        clip = CLIPDesignClassifier()
        clip.is_mock = True
        clip.load()
        result = clip.classify("C:\\path\\test.jpg", [])
        self.assertEqual(len(result), 0)

    def test_ram_batch_multiple_images(self):
        """RAM should handle batch of multiple images."""
        ram = RAMTaggerModel()
        ram.is_mock = True
        ram.load()
        results = ram.predict_batch([
            "C:\\path\\nature_landscape.jpg",
            "C:\\path\\indoor_room.jpg",
            "C:\\path\\city_street.jpg"
        ])
        self.assertEqual(len(results), 3)
        for batch_result in results:
            self.assertTrue(len(batch_result) > 0)

    def test_design_tag_dictionary_completeness(self):
        """Verify dictionary has all required sections and populated entries."""
        required_sections = ["style", "usage", "layout", "color", "scene"]
        for section in required_sections:
            self.assertIn(section, DESIGN_TAG_DICTIONARY)
            self.assertTrue(len(DESIGN_TAG_DICTIONARY[section]) > 0)
            # Each entry should have at least one English prompt
            for tag_name, prompts in DESIGN_TAG_DICTIONARY[section].items():
                self.assertIsInstance(prompts, list)
                self.assertTrue(len(prompts) > 0)
                for p in prompts:
                    self.assertIsInstance(p, str)
                    self.assertTrue(len(p) > 5)

    def test_model_manager_cooperative_status(self):
        """Verify ModelManager returns cooperative status for all 4 models."""
        from core.model_manager import ModelManager
        mm = ModelManager()
        status = mm.get_cooperative_status()
        expected_models = ["ram", "florence2", "clip", "wd_tagger"]
        for name in expected_models:
            self.assertIn(name, status)
            self.assertIn("model_id", status[name])
            self.assertIn("role", status[name])
            self.assertIn("loaded", status[name])
            self.assertIn("backend", status[name])

if __name__ == "__main__":
    unittest.main()
