import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import unittest
import os
import sys

# Add ai-service to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.tag_localization_service import TagLocalizationService
from services.translation_service import TranslationService
from utils.translation_cache import TranslationCache

class TestTagLocalizationService(unittest.TestCase):
    def setUp(self):
        # Create unique temp SQLite cache db path for isolated unit testing
        base_dir = os.path.dirname(os.path.abspath(__file__))
        self.test_db_path = os.path.join(base_dir, "scratch", "test_translation_cache.db")
        os.makedirs(os.path.dirname(self.test_db_path), exist_ok=True)
        if os.path.exists(self.test_db_path):
            try:
                os.remove(self.test_db_path)
            except OSError:
                pass
                
        self.cache = TranslationCache(db_path=self.test_db_path)
        
        # Instantiate services with mock configuration
        self.translation_service = TranslationService()
        self.translation_service.is_mock = True
        
        self.localizer = TagLocalizationService(
            translation_service=self.translation_service,
            cache=self.cache
        )

    def tearDown(self):
        # Clean up database file after test run
        if os.path.exists(self.test_db_path):
            try:
                os.remove(self.test_db_path)
            except OSError:
                pass

    def test_dictionary_lookups(self):
        # Test direct mapping priorities via DESIGN_TRANSLATION_MAP
        res_food = self.localizer.localize_tag("food")
        self.assertEqual(res_food["tag_name"], "食品")
        self.assertEqual(res_food["localized_by"], "dictionary")
        self.assertFalse(res_food["needs_review"])

        res_milktea = self.localizer.localize_tag("milk tea")
        self.assertEqual(res_milktea["tag_name"], "奶茶")
        self.assertEqual(res_milktea["localized_by"], "dictionary")

        res_gradient = self.localizer.localize_tag("blue purple gradient")
        self.assertEqual(res_gradient["tag_name"], "蓝紫渐变")
        self.assertEqual(res_gradient["localized_by"], "dictionary")

    def test_synonym_mappings(self):
        # Test standard synonym group mappings using words not in DESIGN_TRANSLATION_MAP
        res_architecture = self.localizer.localize_tag("architecture")
        self.assertEqual(res_architecture["tag_name"], "建筑")
        self.assertEqual(res_architecture["localized_by"], "synonym")

        res_cityscape = self.localizer.localize_tag("cityscape")
        self.assertEqual(res_cityscape["tag_name"], "城市")
        self.assertEqual(res_cityscape["localized_by"], "synonym")

    def test_brand_words_preservation(self):
        # Entirely uppercase brands should remain intact
        res_brand = self.localizer.localize_tag("SATTEA")
        self.assertEqual(res_brand["tag_name"], "SATTEA")
        self.assertEqual(res_brand["localized_by"], "dictionary")
        self.assertFalse(res_brand["needs_review"])

        res_ui = self.localizer.localize_tag("UI")
        self.assertEqual(res_ui["tag_name"], "UI")
        self.assertEqual(res_ui["localized_by"], "dictionary")

    def test_sqlite_cache_persistence(self):
        # First lookup: goes to translation service mock. Use a word that contains "minimalist" so it translates to Chinese
        res_first = self.localizer.localize_tag("minimalist design layout")
        # Should be translated & cached
        self.assertEqual(res_first["localized_by"], "opus_mt")
        
        # Second lookup: should hit cache directly
        res_second = self.localizer.localize_tag("minimalist design layout")
        self.assertEqual(res_second["tag_name"], res_first["tag_name"])
        self.assertEqual(res_second["localized_by"], "cache")

    def test_post_process_rules(self):
        # Test length restriction and cleanup by mocking translate_tag to return a long sentence
        original_translate = self.translation_service.translate_tag
        try:
            self.translation_service.translate_tag = lambda x: "这门手艺在当地被称为艺术"  # 12 Chinese chars
            res_long = self.localizer.localize_tag("long english word representing tags")
            self.assertEqual(res_long["localized_by"], "needs_review")
            self.assertTrue(res_long["needs_review"])
            self.assertEqual(res_long["tag_name"], "Long English Word Representing Tags")
        finally:
            self.translation_service.translate_tag = original_translate

    def test_batch_tag_localization(self):
        tags = ["food", "architecture", "SATTEA", "minimalist poster design"]
        results = self.localizer.localize_tags_batch(tags)
        self.assertEqual(len(results), 4)
        
        self.assertEqual(results[0]["tag_name"], "食品")
        self.assertEqual(results[0]["localized_by"], "dictionary")
        
        self.assertEqual(results[1]["tag_name"], "建筑")
        self.assertEqual(results[1]["localized_by"], "synonym")
        
        self.assertEqual(results[2]["tag_name"], "SATTEA")
        self.assertEqual(results[2]["localized_by"], "dictionary")
        
        self.assertEqual(results[3]["localized_by"], "opus_mt")


if __name__ == '__main__':
    unittest.main()
