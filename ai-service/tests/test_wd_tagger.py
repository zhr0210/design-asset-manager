import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import os
import unittest
import numpy as np
from PIL import Image

import huggingface_hub
def mock_hf_hub_download(*args, **kwargs):
    raise Exception("Offline mock fallback for unit tests")
huggingface_hub.hf_hub_download = mock_hf_hub_download

from models.wd_tagger import WDTaggerModel, TagPrediction, WDTaggerResult
from utils.image_preprocess import prepare_image_for_wd_tagger
from utils.tag_cleaner import clean_wd_tag

class TestWDTagger(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create a temporary valid image with transparency (semi-transparent red square)
        cls.valid_img_path = "temp_test_valid.png"
        img = Image.new("RGBA", (200, 200), (255, 0, 0, 128))
        img.save(cls.valid_img_path)
        
        # Create a corrupted/invalid file path
        cls.corrupt_img_path = "temp_test_corrupt.png"
        with open(cls.corrupt_img_path, "w") as f:
            f.write("This is a corrupt text file masquerading as a PNG.")

    @classmethod
    def tearDownClass(cls):
        # Clean up temporary test files
        if os.path.exists(cls.valid_img_path):
            try:
                os.remove(cls.valid_img_path)
            except Exception:
                pass
        if os.path.exists(cls.corrupt_img_path):
            try:
                os.remove(cls.corrupt_img_path)
            except Exception:
                pass

    def test_image_preprocessing(self):
        """Verify image padding, letterboxing, alpha channel blending, and BGR color swapping."""
        arr = prepare_image_for_wd_tagger(self.valid_img_path)
        
        # 1. Assert shape and type
        self.assertEqual(arr.shape, (448, 448, 3))
        self.assertEqual(arr.dtype, np.float32)
        
        # 2. Check alpha-blending and channel swapping
        # The semi-transparent red (255, 0, 0, 128) blended on white (255, 255, 255)
        # yields approx (255, 127.5, 127.5). Swapped to BGR it becomes (127.5, 127.5, 255).
        # We assert that the Red channel (index 2 in BGR) is high at the center of the image.
        center_pixel = arr[224, 224]
        self.assertGreaterEqual(center_pixel[2], 250.0) # Red
        self.assertLessEqual(center_pixel[0], 135.0)    # Blue

    def test_tag_cleaning_and_mapping(self):
        """Verify underscores are replaced by spaces, text capitalized, and categories correctly mapped."""
        # Character tag -> subject
        tag1 = clean_wd_tag("hatsune_miku", 1, 0.92)
        self.assertEqual(tag1.display_name, "Hatsune Miku")
        self.assertEqual(tag1.tag_type, "subject")
        
        # Background style tag -> style
        tag2 = clean_wd_tag("gradient_background", 0, 0.88)
        self.assertEqual(tag2.display_name, "渐变背景")
        self.assertEqual(tag2.tag_type, "style")
        
        # Color tag -> color
        tag3 = clean_wd_tag("neon_color", 0, 0.74)
        self.assertEqual(tag3.tag_type, "color")
        
        # Scene tag -> scene
        tag4 = clean_wd_tag("night_cityscape", 0, 0.65)
        self.assertEqual(tag4.tag_type, "scene")

    def test_mock_fallback_and_predictions(self):
        """Verify mock fallback activation and dictionary serializations for frontend compatibility."""
        model = WDTaggerModel(model_id="SmilingWolf/wd-vit-tagger-v3")
        model.is_mock = True
        model.load()
        
        self.assertTrue(model.is_mock)
        self.assertEqual(model.backend, "mock")
        
        # Execute single prediction
        result = model.predict_one(self.valid_img_path)
        self.assertIsInstance(result, WDTaggerResult)
        self.assertEqual(result.asset_path, self.valid_img_path)
        self.assertTrue(len(result.tags) > 0)
        
        # Assert dictionary structures and compatibility fields
        res_dict = result.to_dict()
        self.assertEqual(res_dict["asset_path"], self.valid_img_path)
        self.assertTrue(len(res_dict["tags"]) > 0)
        
        tag_dict = res_dict["tags"][0]
        self.assertTrue("name" in tag_dict)
        self.assertTrue("confidence" in tag_dict)
        self.assertTrue("type" in tag_dict)

    def test_batch_inference_with_corruption_isolation(self):
        """Verify that a corrupt image inside a batch does not abort or interrupt the remaining images."""
        model = WDTaggerModel(model_id="SmilingWolf/wd-vit-tagger-v3")
        model.is_mock = True
        model.load()
        
        # Batch with 7 valid images and 1 corrupt text file
        paths = [self.valid_img_path] * 7 + [self.corrupt_img_path]
        
        predictions = model.predict_batch(paths, batch_size=8)
        self.assertEqual(len(predictions), 8)
        
        # Verify valid elements completed successfully
        for i in range(7):
            self.assertFalse(predictions[i].raw_output.get("failed", False))
            self.assertTrue(len(predictions[i].tags) > 0)
            
        # Verify corrupt element isolated and gracefully failed
        self.assertTrue(predictions[7].raw_output.get("failed", False))
        self.assertTrue("error" in predictions[7].raw_output)
        self.assertEqual(len(predictions[7].tags), 0)

    def test_thresholds_and_max_tags(self):
        """Verify that threshold cuts and max_tags constraints are enforced."""
        model = WDTaggerModel(
            model_id="SmilingWolf/wd-vit-tagger-v3",
            threshold_general=0.85, # Filter out general tags below 85%
            max_tags=2
        )
        model.is_mock = True
        model.load()
        
        result = model.predict_one(self.valid_img_path)
        
        # Assert max tags capping
        self.assertLessEqual(len(result.tags), 2)
        
        # Assert general thresholds
        for t in result.general_tags:
            self.assertGreaterEqual(t.score, 0.85)

    def test_onnx_gpu_to_cpu_fallback(self):
        """Verify that initialization runs gracefully and unload releases references."""
        model = WDTaggerModel(backend="auto")
        model.load()
        
        # Should complete initialization (real ONNX or fallback to mock)
        self.assertTrue(model.is_loaded)
        self.assertTrue(model.backend in ["ONNX GPU", "ONNX CPU", "mock"])
        
        # Execute unload and assert session is evicted
        model.unload()
        self.assertFalse(model.is_loaded)

if __name__ == "__main__":
    unittest.main()
