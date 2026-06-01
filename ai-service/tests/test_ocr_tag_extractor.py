import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# -*- coding: utf-8 -*-
import unittest
from utils.ocr_tag_extractor import OCRTagExtractor

class TestOCRTagExtractor(unittest.TestCase):
    def setUp(self):
        self.extractor = OCRTagExtractor()

    def test_brand_extraction(self):
        """
        1. MILK TEA / SATTEA ➜ brand or custom tags
        """
        inp = {
            "ocr_text": "MILK TEA SATTEA WAJASS COOLBRANDNAME",
            "caption": "A promotional picture.",
            "asset_type": "image",
            "source_site": "xhs"
        }
        tags = self.extractor.extract_tags(inp)
        tag_names = [t["name"] for t in tags]
        
        self.assertIn("MILK TEA", tag_names)
        self.assertIn("SATTEA", tag_names)
        self.assertIn("WAJASS", tag_names)
        # COOLBRANDNAME should also be extracted since it's uppercase and not blacklisted
        self.assertIn("COOLBRANDNAME", tag_names)
        
        # Blacklisted word shouldn't be here
        self.assertNotIn("NOTICE", tag_names)
        self.assertNotIn("DESIGN", tag_names)
        
        # Check that types are mapped correctly
        for t in tags:
            if t["name"] in ["MILK TEA", "SATTEA"]:
                self.assertEqual(t["type"], "custom")
                self.assertEqual(t["source"], "ai_florence_ocr")
                self.assertTrue(t["confidence"] > 0.7)

    def test_warning_notice_extraction(self):
        """
        2. 温馨提示 ➜ 温馨提示 or 指示牌 tags
        """
        inp = {
            "ocr_text": "注意：温馨提示，请保持安静！",
            "caption": "A warning notice sign in a quiet library.",
            "asset_type": "image",
            "source_site": "xhs"
        }
        tags = self.extractor.extract_tags(inp)
        tag_names = [t["name"] for t in tags]
        
        self.assertIn("温馨提示", tag_names)
        self.assertIn("指示牌", tag_names)
        
        # Check detail values
        for t in tags:
            if t["name"] == "温馨提示":
                self.assertEqual(t["type"], "usage")
                self.assertEqual(t["source"], "ai_florence_ocr")

    def test_finance_etf_extraction(self):
        """
        3. ETF / 基金 / 申购期 ➜ 金融海报 / 金融商务 tags
        """
        inp = {
            "ocr_text": "这是一个理财产品的宣传：ETF基金申购期与赎回期指南",
            "caption": "A financial poster details.",
            "asset_type": "image",
            "source_site": "xhs"
        }
        tags = self.extractor.extract_tags(inp)
        tag_names = [t["name"] for t in tags]
        
        self.assertIn("金融海报", tag_names)
        self.assertIn("基金", tag_names)
        self.assertIn("申购期", tag_names)
        self.assertIn("赎回期", tag_names)
        
        # Type and confidence check
        etf_tag = next(t for t in tags if t["name"] == "基金")
        self.assertEqual(etf_tag["type"], "subject")
        
        usage_tag = next(t for t in tags if t["name"] == "金融海报")
        self.assertEqual(usage_tag["type"], "usage")

    def test_promotion_sale_extraction(self):
        """
        4. 618 / 优惠 ➜ 促销 / 活动 tags
        """
        inp = {
            "ocr_text": "618年中大促，全场商品特惠，享受折上折优惠",
            "caption": "A retail promotional banner.",
            "asset_type": "image",
            "source_site": "xhs"
        }
        tags = self.extractor.extract_tags(inp)
        tag_names = [t["name"] for t in tags]
        
        self.assertIn("618", tag_names)
        self.assertIn("促销海报", tag_names)
        self.assertIn("优惠", tag_names)

    def test_long_ocr_sentence_guard(self):
        """
        5. Check that long OCR sentences are never directly added as standalone tags.
        """
        long_sentence = "这是一段非常非常非常非常非常非常非常非常非常非常非常长长长长长长长长长长长长长长的OCR文字，字数超过了30个字符！"
        inp = {
            "ocr_text": long_sentence,
            "caption": "A photo with long subtitle overlay.",
            "asset_type": "image",
            "source_site": "xhs"
        }
        tags = self.extractor.extract_tags(inp)
        tag_names = [t["name"] for t in tags]
        
        self.assertNotIn(long_sentence, tag_names)
        # Ensure only sub-tokens/mapped keywords are added, if any.
        for t in tags:
            self.assertTrue(len(t["name"]) < 30)

if __name__ == "__main__":
    unittest.main()
