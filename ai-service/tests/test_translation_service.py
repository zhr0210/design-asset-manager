import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import unittest
import os
import sys

# Add ai-service to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.translation_service import TranslationService
from core.model_manager import ModelManager

class TestTranslationService(unittest.TestCase):
    def setUp(self):
        # Force mock mode by default for lightweight unit tests
        self.service = TranslationService()
        self.service.is_mock = True

    def test_initialization(self):
        self.assertEqual(self.service.model_id, "Helsinki-NLP/opus-mt-en-zh")
        self.assertFalse(self.service.is_loaded)

    def test_mock_load_unload(self):
        self.service.load()
        self.assertTrue(self.service.is_loaded)
        self.assertEqual(self.service.backend, "mock")
        
        self.service.unload()
        self.assertFalse(self.service.is_loaded)
        self.assertEqual(self.service.backend, "mock")

    def test_translate_text(self):
        self.service.load()
        # "food" should be mapped via DESIGN_TRANSLATION_MAP to "食品"
        res = self.service.translate_text("food")
        self.assertEqual(res, "食品")

    def test_translate_batch(self):
        self.service.load()
        texts = ["food", "milk tea", "blue purple gradient", "unknown brand name"]
        res = self.service.translate_batch(texts)
        self.assertEqual(len(res), 4)
        self.assertEqual(res[0], "食品")
        self.assertEqual(res[1], "奶茶")
        self.assertEqual(res[2], "蓝紫渐变")
        # unknown brand name falls back to word by word or mock pattern
        self.assertTrue(len(res[3]) > 0)

    def test_model_manager_integration(self):
        manager = ModelManager()
        # Test loading via ModelManager
        # Since we want to test model load, let's load "translation" in mock mode or similar.
        success = asyncio_run(manager.load_model("translation"))
        self.assertTrue(success)
        self.assertIn("translation", manager.loaded_models)
        
        info = manager.loaded_models["translation"]
        self.assertTrue(info["instance"].is_loaded)
        
        # Test eviction
        success_unload = asyncio_run(manager.unload_model("translation"))
        self.assertTrue(success_unload)
        self.assertNotIn("translation", manager.loaded_models)


def asyncio_run(coro):
    import asyncio
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)

if __name__ == '__main__':
    unittest.main()
