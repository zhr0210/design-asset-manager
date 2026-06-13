import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ["DESIGN_ASSET_MANAGER_ALLOW_MOCK_AI"] = "1"

# -*- coding: utf-8 -*-
import unittest
import os
import sys

# Append parent dir to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models.asset_type_router import AssetTypeRouter
from models.florence_semantic_router import FlorenceSemanticRouter
from utils.tag_fusion import fuse_and_clean_tags

class TestPipelineDefaults(unittest.IsolatedAsyncioTestCase):
    """
    Test suite verifying standard defaults, source normalization,
    and synonym merging for the new cooperative model tagging pipeline.
    """

    async def test_design_pipeline_defaults(self):
        # 1. design 默认 pipeline
        route_design = await AssetTypeRouter.route("C:\\design\\brand_poster_ad.jpg")
        self.assertEqual(route_design["primary_type"], "design")
        # RAM++ 基础标签层开启, Florence-2, CLIP, DesignRule
        self.assertIn("ram", route_design["recommended_pipeline"])
        self.assertIn("florence2", route_design["recommended_pipeline"])
        self.assertIn("clip", route_design["recommended_pipeline"])
        self.assertIn("design_rule", route_design["recommended_pipeline"])
        self.assertNotIn("wd_tagger", route_design["recommended_pipeline"])

    async def test_ui_pipeline_defaults(self):
        # 2. ui 默认 pipeline
        route_ui = await AssetTypeRouter.route("C:\\ui\\dashboard_main_page.svg")
        self.assertEqual(route_ui["primary_type"], "ui")
        self.assertIn("ram", route_ui["recommended_pipeline"])
        self.assertIn("florence2", route_ui["recommended_pipeline"])
        self.assertIn("design_rule", route_ui["recommended_pipeline"])
        self.assertNotIn("wd_tagger", route_ui["recommended_pipeline"])

    async def test_document_pipeline_defaults(self):
        # 3. document 默认 pipeline
        route_doc = await AssetTypeRouter.route("C:\\doc\\quarterly_report_slide.ppt.jpg")
        self.assertEqual(route_doc["primary_type"], "document")
        self.assertIn("ram", route_doc["recommended_pipeline"])
        self.assertIn("florence2", route_doc["recommended_pipeline"])
        self.assertIn("design_rule", route_doc["recommended_pipeline"])
        self.assertNotIn("wd_tagger", route_doc["recommended_pipeline"])

    async def test_photo_pipeline_defaults(self):
        # 4. photo 默认 pipeline
        route_photo = await AssetTypeRouter.route("C:\\photo\\mount_fuji_landscape.jpg")
        self.assertEqual(route_photo["primary_type"], "photo")
        self.assertIn("ram", route_photo["recommended_pipeline"])
        self.assertIn("design_rule", route_photo["recommended_pipeline"])
        self.assertNotIn("florence2", route_photo["recommended_pipeline"])
        self.assertNotIn("wd_tagger", route_photo["recommended_pipeline"])

    async def test_product_pipeline_defaults(self):
        # 5. product 默认 pipeline
        route_product = await AssetTypeRouter.route("C:\\product\\shampoo_bottle_product.jpg")
        self.assertEqual(route_product["primary_type"], "product")
        self.assertIn("ram", route_product["recommended_pipeline"])
        self.assertIn("design_rule", route_product["recommended_pipeline"])
        self.assertNotIn("florence2", route_product["recommended_pipeline"])
        self.assertNotIn("wd_tagger", route_product["recommended_pipeline"])

    async def test_anime_pipeline_defaults(self):
        # 6. anime 默认 pipeline
        route_anime = await AssetTypeRouter.route("C:\\anime\\cute_girl_manga.jpg")
        self.assertEqual(route_anime["primary_type"], "anime")
        self.assertIn("wd_tagger", route_anime["recommended_pipeline"])
        # RAM++ 默认关闭或仅辅助, 不默认抢主导
        self.assertNotIn("ram", route_anime["recommended_pipeline"])
        self.assertNotIn("florence2", route_anime["recommended_pipeline"])

    async def test_unknown_pipeline_defaults(self):
        # 7. unknown 默认 pipeline
        route_unknown = await AssetTypeRouter.route("C:\\unknown\\random_image_123.jpg")
        self.assertEqual(route_unknown["primary_type"], "unknown")
        self.assertIn("ram", route_unknown["recommended_pipeline"])
        self.assertIn("design_rule", route_unknown["recommended_pipeline"])
        self.assertIn("clip", route_unknown["recommended_pipeline"])
        self.assertNotIn("florence2", route_unknown["recommended_pipeline"])

    async def test_mixed_pipeline_defaults(self):
        # 8. mixed 默认 pipeline
        route_mixed = await AssetTypeRouter.route("C:\\mixed\\some_hybrid_mixed.jpg")
        # should be mixed, meaning we trigger florence and clip
        self.assertTrue(route_mixed["is_mixed"])
        self.assertIn("ram", route_mixed["recommended_pipeline"])
        self.assertIn("florence2", route_mixed["recommended_pipeline"])

    def test_synonym_merging_and_evidence(self):
        # 9. source 规范, pending 规范, 同义词合并
        raw_outputs = [
            {"name": "food", "confidence": 0.85, "category": "subject", "source": "ai_ram"},
            {"name": "食物", "confidence": 0.90, "category": "subject", "source": "ai_florence_semantic"},
            {"name": "食品", "confidence": 0.65, "category": "subject", "source": "design_rule"},
            {"name": "beverage", "confidence": 0.70, "category": "subject", "source": "ai_ram"},
            {"name": "饮料", "confidence": 0.88, "category": "subject", "source": "ai_florence"}
        ]
        
        fused = fuse_and_clean_tags(raw_outputs)
        
        # Check synonym merging
        names = [t["name"] for t in fused]
        self.assertIn("食品", names)
        self.assertIn("饮品", names)
        
        # Verify deduplication
        self.assertEqual(names.count("食品"), 1)
        self.assertEqual(names.count("饮品"), 1)
        
        # Verify highest confidence score retained
        food_tag = [t for t in fused if t["name"] == "食品"][0]
        self.assertEqual(food_tag["confidence"], 0.90) # max of 0.85, 0.90, 0.65
        
        # Verify source determination priority (ai_ram > ai_florence_semantic > design_rule)
        # So "食品" source should be normalized to "ai_ram"
        self.assertEqual(food_tag["source"], "ai_ram")
        
        # Verify evidence aggregation (should list all three sources)
        ev_sources = [ev["source"] for ev in food_tag["evidence"]]
        self.assertIn("ai_ram", ev_sources)
        self.assertIn("ai_florence_semantic", ev_sources)
        self.assertIn("design_rule", ev_sources)

if __name__ == "__main__":
    unittest.main()
