import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ["DESIGN_ASSET_MANAGER_ALLOW_MOCK_AI"] = "1"

# -*- coding: utf-8 -*-
import os
import unittest
import tempfile
import shutil
from PIL import Image

from models.ram_tagger import RAMTaggerModel
from core.model_manager import ModelManager
from models.visual_router import VisualRouter
from utils.tag_fusion import fuse_and_clean_tags
from utils.tag_source_normalizer import normalize_source

class TestRAMTagger(unittest.IsolatedAsyncioTestCase):
    @classmethod
    def setUpClass(cls):
        # Create temp files for testing
        cls.test_dir = tempfile.mkdtemp()
        cls.valid_img_path = os.path.join(cls.test_dir, "nature_scene.jpg")
        img = Image.new("RGB", (384, 384), (0, 255, 0))
        img.save(cls.valid_img_path)
        
        cls.corrupt_img_path = os.path.join(cls.test_dir, "corrupt_image.jpg")
        with open(cls.corrupt_img_path, "w") as f:
            f.write("This is not a real image file.")

    @classmethod
    def tearDownClass(cls):
        # Clean up temporary test files
        shutil.rmtree(cls.test_dir)

    def test_mock_fallback_and_predictions(self):
        """1. Verify mock fallback activation and dictionary output format."""
        model = RAMTaggerModel()
        model.is_mock = True
        model.load()
        
        self.assertTrue(model.is_mock)
        self.assertEqual(model.backend, "mock")
        
        # Test batch prediction
        results = model.predict_batch([self.valid_img_path])
        self.assertEqual(len(results), 1)
        self.assertTrue(len(results[0]) > 0)
        
        first_tag = results[0][0]
        self.assertIn("name", first_tag)
        self.assertIn("confidence", first_tag)
        self.assertEqual(first_tag["source"], "ai_ram")
        self.assertEqual(first_tag["category"], "subject")

    def test_batch_inference_corrupt_isolation(self):
        """2. Verify that a corrupt image inside a batch does not crash the entire batch."""
        model = RAMTaggerModel()
        model.is_mock = True
        model.load()
        
        paths = [self.valid_img_path, self.corrupt_img_path]
        results = model.predict_batch(paths)
        
        self.assertEqual(len(results), 2)
        # Valid image should have tags
        self.assertTrue(len(results[0]) > 0)
        # Corrupted image should gracefully return empty list or mock list depending on fallback
        self.assertIsInstance(results[1], list)

    async def test_category_routing_triggers(self):
        """3. Verify VisualRouter recommended pipelines for different categories."""
        # Photo triggers RAM
        photo_route = await VisualRouter().route("C:\\design\\scenic_view_photo.jpg")
        self.assertEqual(photo_route["primary_type"], "photo")
        self.assertIn("ram", photo_route["recommended_pipeline"])
        
        # Product triggers RAM
        product_route = await VisualRouter().route("C:\\design\\iphone_shot.jpg")
        self.assertEqual(product_route["primary_type"], "product")
        self.assertIn("ram", product_route["recommended_pipeline"])
        
        # Design triggers RAM by default as base tagging layer
        design_route = await VisualRouter().route("C:\\design\\poster_layout.jpg")
        self.assertEqual(design_route["primary_type"], "design")
        self.assertIn("ram", design_route["recommended_pipeline"])
        
        # UI triggers RAM by default as base tagging layer
        ui_route = await VisualRouter().route("C:\\design\\website_ui.png")
        self.assertEqual(ui_route["primary_type"], "ui")
        self.assertIn("ram", ui_route["recommended_pipeline"])

    async def test_model_manager_lifecycle(self):
        """4. Verify model loading, touched refresh, and unloads inside ModelManager."""
        manager = ModelManager()
        
        # Load
        await manager.load_model("ram")
        self.assertIn("ram", manager.loaded_models)
        
        # Touch keep-alive timer
        manager.touch_model("ram")
        
        # VRAM occupancy metadata
        loaded_status = manager.get_loaded_models()
        self.assertIn("ram", loaded_status)
        
        # Evict / Unload
        unloaded = await manager.unload_model("ram")
        self.assertTrue(unloaded)
        self.assertNotIn("ram", manager.loaded_models)

    def test_tag_fusion_cleaning(self):
        """5. Verify TagFusion correctly gathers and normalizes RAM tag sources."""
        raw_outputs = [
            {"name": "nature", "confidence": 0.95, "category": "scene", "source": "ai_ram"},
            {"name": "mountain", "confidence": 0.82, "category": "scene", "source": "ram++"}
        ]
        
        fused = fuse_and_clean_tags(raw_outputs)
        self.assertTrue(len(fused) > 0)
        
        tag_names = [t["normalized_name"] for t in fused]
        # Fused display names mapped or capitalized
        self.assertTrue(any("nature" in name.lower() for name in tag_names))
        
        # Source normalized
        for t in fused:
            self.assertEqual(normalize_source(t["source"]), "ai_ram")

if __name__ == "__main__":
    unittest.main()
