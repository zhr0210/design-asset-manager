import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# -*- coding: utf-8 -*-
import unittest
from models.florence_semantic_router import FlorenceSemanticRouter

class TestFlorenceSemanticRouter(unittest.TestCase):
    def setUp(self):
        self.router = FlorenceSemanticRouter()

    def test_beverage_poster(self):
        """
        1. Beverage Poster
           Input:
             caption = "A collage of milk tea product photos on a table."
             ocr = "MILK TEA SATTEA 小美茶山展"
           Expected:
             final_primary_type = design
             secondary_types contains product, document
             semantic_tags contains 饮品海报, 奶茶, 餐饮
        """
        router_input = {
            "asset_id": "test_bev",
            "image_path": "test_bev.jpg",
            "visual_router_result": {
                "primary_type": "product",
                "secondary_types": [],
                "top1_type": "product",
                "top1_score": 0.58,
                "top2_type": "design",
                "top2_score": 0.32,
                "margin": 0.26,
                "is_mixed": True,
                "is_uncertain": False
            },
            "metadata_signals": {},
            "florence_caption": "A collage of milk tea product photos on a table.",
            "florence_detailed_caption": "Four product images displaying various milk tea drinks on tables.",
            "florence_ocr_text": "MILK TEA SATTEA 小美茶山展",
            "florence_objects": [],
            "florence_regions": []
        }
        res = self.router.route(router_input)
        self.assertEqual(res["final_primary_type"], "design")
        self.assertIn("product", res["secondary_types"])
        self.assertIn("document", res["secondary_types"])
        
        tags = [t["name"] for t in res["semantic_tags"]]
        self.assertIn("饮品海报", tags)
        self.assertIn("奶茶", tags)
        self.assertIn("餐饮", tags)

    def test_ppt_report_cover(self):
        """
        2. PPT / Report Cover
           Input:
             caption = "A presentation cover with a mountain and drone."
             ocr = "课程名称 无人机导论 教学报告"
           Expected:
             design + document
             tags contains PPT封面, 教学报告封面
        """
        router_input = {
            "asset_id": "test_ppt",
            "image_path": "test_ppt.jpg",
            "visual_router_result": {
                "primary_type": "design",
                "secondary_types": [],
                "top1_type": "design",
                "top1_score": 0.55,
                "top2_type": "document",
                "top2_score": 0.40,
                "margin": 0.15,
                "is_mixed": False,
                "is_uncertain": False
            },
            "metadata_signals": {},
            "florence_caption": "A presentation cover with a mountain and drone.",
            "florence_detailed_caption": "A professional layout template for academic slides.",
            "florence_ocr_text": "课程名称 无人机导论 教学报告",
            "florence_objects": [],
            "florence_regions": []
        }
        res = self.router.route(router_input)
        self.assertEqual(res["final_primary_type"], "design")
        self.assertIn("document", res["secondary_types"])
        
        tags = [t["name"] for t in res["semantic_tags"]]
        self.assertIn("PPT封面", tags)
        self.assertIn("教学报告封面", tags)

    def test_ui_interface(self):
        """
        3. UI App Interface
           Input:
             caption = "A mobile app interface with cards and navigation."
             ocr = "Dashboard Settings Create"
           Expected:
             final_primary_type = ui
             tags contains UI设计, 卡片布局
        """
        router_input = {
            "asset_id": "test_ui",
            "image_path": "test_ui.png",
            "visual_router_result": {
                "primary_type": "design",
                "secondary_types": [],
                "top1_type": "design",
                "top1_score": 0.51,
                "top2_type": "ui",
                "top2_score": 0.46,
                "margin": 0.05,
                "is_mixed": True,
                "is_uncertain": True
            },
            "metadata_signals": {},
            "florence_caption": "A mobile app interface with cards and navigation.",
            "florence_detailed_caption": "A light blue UI design screen with widgets.",
            "florence_ocr_text": "Dashboard Settings Create",
            "florence_objects": [],
            "florence_regions": []
        }
        res = self.router.route(router_input)
        self.assertEqual(res["final_primary_type"], "ui")
        
        tags = [t["name"] for t in res["semantic_tags"]]
        self.assertIn("UI设计", tags)
        self.assertIn("卡片布局", tags)

    def test_notice_warning_sign(self):
        """
        4. Notice / Warning Sign
           Input:
             caption = "A restaurant notice sign with watercolor illustration."
             ocr = "温馨提示 过敏原 请使用指定餐具"
           Expected:
             design + document
             tags contains 指示牌, 温馨提示, 餐厅
        """
        router_input = {
            "asset_id": "test_sign",
            "image_path": "test_sign.jpg",
            "visual_router_result": {
                "primary_type": "illustration",
                "secondary_types": [],
                "top1_type": "illustration",
                "top1_score": 0.52,
                "top2_type": "document",
                "top2_score": 0.35,
                "margin": 0.17,
                "is_mixed": False,
                "is_uncertain": False
            },
            "metadata_signals": {},
            "florence_caption": "A restaurant notice sign with watercolor illustration.",
            "florence_detailed_caption": "An illustrated signboard on the wall warning about food allergy.",
            "florence_ocr_text": "温馨提示 过敏原 请使用指定餐具",
            "florence_objects": [],
            "florence_regions": []
        }
        res = self.router.route(router_input)
        self.assertEqual(res["final_primary_type"], "design")
        self.assertIn("document", res["secondary_types"])
        
        tags = [t["name"] for t in res["semantic_tags"]]
        self.assertIn("指示牌", tags)
        self.assertIn("温馨提示", tags)
        self.assertIn("餐厅", tags)

    def test_finance_poster(self):
        """
        5. Finance Poster
           Input:
             caption = "A blue business poster with city skyline."
             ocr = "ETF 基金 申购期 赎回期 投资有风险"
           Expected:
             design + document
             tags contains 金融海报, 金融商务, 蓝色
        """
        router_input = {
            "asset_id": "test_fin",
            "image_path": "test_fin.jpg",
            "visual_router_result": {
                "primary_type": "photo",
                "secondary_types": [],
                "top1_type": "photo",
                "top1_score": 0.50,
                "top2_type": "design",
                "top2_score": 0.40,
                "margin": 0.10,
                "is_mixed": True,
                "is_uncertain": False
            },
            "metadata_signals": {},
            "florence_caption": "A blue business poster with city skyline.",
            "florence_detailed_caption": "A corporate financial poster showing stock market growth charts.",
            "florence_ocr_text": "ETF 基金 申购期 赎回期 投资有风险",
            "florence_objects": [],
            "florence_regions": []
        }
        res = self.router.route(router_input)
        self.assertEqual(res["final_primary_type"], "design")
        self.assertIn("document", res["secondary_types"])
        
        tags = [t["name"] for t in res["semantic_tags"]]
        self.assertIn("金融海报", tags)
        self.assertIn("金融商务", tags)
        self.assertIn("蓝色", tags)

    def test_photo_guard(self):
        """
        6. High Confidence Photo Guard
           Input:
             VisualRouter:
               primary_type = photo
               top1_score = 0.85
               margin = 0.20
             caption = "A realistic landscape photo."
           Expected:
             final_primary_type remains photo
        """
        router_input = {
            "asset_id": "test_photo",
            "image_path": "test_photo.jpg",
            "visual_router_result": {
                "primary_type": "photo",
                "secondary_types": [],
                "top1_type": "photo",
                "top1_score": 0.85,
                "top2_type": "illustration",
                "top2_score": 0.10,
                "margin": 0.75,
                "is_mixed": False,
                "is_uncertain": False
            },
            "metadata_signals": {},
            "florence_caption": "A realistic landscape photo.",
            "florence_detailed_caption": "A professional wide angle lens shot of green mountains.",
            "florence_ocr_text": "",
            "florence_objects": [],
            "florence_regions": []
        }
        res = self.router.route(router_input)
        self.assertEqual(res["final_primary_type"], "photo")

    def test_low_confidence_correction(self):
        """
        7. Low Confidence Mixed Correction
           Input:
             VisualRouter:
               primary_type = document
               top1_score = 0.48
               margin = 0.03
             caption = "A promotional poster with drinks and text."
             ocr = "MILK TEA"
           Expected:
             final_primary_type = design
             secondary_types contains document, product
        """
        router_input = {
            "asset_id": "test_correction",
            "image_path": "test_correction.jpg",
            "visual_router_result": {
                "primary_type": "document",
                "secondary_types": [],
                "top1_type": "document",
                "top1_score": 0.48,
                "top2_type": "design",
                "top2_score": 0.45,
                "margin": 0.03,
                "is_mixed": True,
                "is_uncertain": True
            },
            "metadata_signals": {},
            "florence_caption": "A promotional poster with drinks and text.",
            "florence_detailed_caption": "A dynamic layout banner advertising delicious food.",
            "florence_ocr_text": "MILK TEA",
            "florence_objects": [],
            "florence_regions": []
        }
        res = self.router.route(router_input)
        self.assertEqual(res["final_primary_type"], "design")
        self.assertIn("document", res["secondary_types"])
        self.assertIn("product", res["secondary_types"])

    def test_anime_guard(self):
        """
        8. High Confidence Anime Guard
           Input:
             VisualRouter:
               primary_type = anime
               top1_score = 0.88
               margin = 0.22
             caption = "An anime character illustration."
           Expected:
             final_primary_type remains anime
        """
        router_input = {
            "asset_id": "test_anime",
            "image_path": "test_anime.png",
            "visual_router_result": {
                "primary_type": "anime",
                "secondary_types": [],
                "top1_type": "anime",
                "top1_score": 0.88,
                "top2_type": "illustration",
                "top2_score": 0.08,
                "margin": 0.80,
                "is_mixed": False,
                "is_uncertain": False
            },
            "metadata_signals": {},
            "florence_caption": "An anime character illustration.",
            "florence_detailed_caption": "A drawing of a cute anime girl with blue hair in school uniform.",
            "florence_ocr_text": "",
            "florence_objects": [],
            "florence_regions": []
        }
        res = self.router.route(router_input)
        self.assertEqual(res["final_primary_type"], "anime")

if __name__ == "__main__":
    unittest.main()
