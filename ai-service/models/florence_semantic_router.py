# -*- coding: utf-8 -*-
import re
import os
from typing import Dict, Any, List, Optional

# English & Chinese keyword lists with exact word boundary anchors for English
BEVERAGE_FOOD_KEYWORDS = {
    "en": [r"\bmilk\s+tea\b", r"\btea\b", r"\bcoffee\b", r"\bdrink\b", r"\bbeverage\b", r"\bfood\b", r"\bdessert\b", r"\brestaurant\b", r"\bmenu\b", r"\bcafe\b", r"\bcup\b", r"\bbottle\b"],
    "zh": [r"奶茶", r"茶饮", r"咖啡", r"饮品", r"食品", r"甜品", r"餐厅", r"菜单", r"茶", r"杯", r"瓶", r"餐饮"]
}

POSTER_BANNER_KEYWORDS = {
    "en": [r"\bposter\b", r"\bbanner\b", r"\bflyer\b", r"\bpromotion\b", r"\bcampaign\b", r"\bsale\b", r"\badvertising\b", r"\bbrand\b", r"\bcommercial\b", r"\btypography\b"],
    "zh": [r"海报", r"横幅", r"宣传", r"促销", r"活动", r"优惠", r"品牌", r"商业", r"排版", r"主标题", r"副标题", r"广告", r"618"]
}

PPT_REPORT_KEYWORDS = {
    "en": [r"\bpresentation\b", r"\bslide\b", r"\breport\b", r"\bcourse\b", r"\bteaching\b", r"\beducation\b", r"\bcover\b"],
    "zh": [r"PPT", r"汇报", r"报告", r"课程", r"教学", r"封面", r"专业", r"代码", r"课题", r"培训"]
}

UI_INTERFACE_KEYWORDS = {
    "en": [r"\bdashboard\b", r"\binterface\b", r"\bapp\b", r"\bmobile\s+screen\b", r"\bwebsite\b", r"\bbutton\b", r"\bpanel\b", r"\bcard\b", r"\bnavigation\b", r"\bsettings\b"],
    "zh": [r"界面", r"控制台", r"按钮", r"卡片", r"导航", r"仪表盘", r"设置", r"页面", r"移动端", r"网页", r"模块"]
}

DOC_SIGN_KEYWORDS = {
    "en": [r"\bnotice\b", r"\bsign\b", r"\binstruction\b", r"\bwarning\b", r"\bdocument\b", r"\bform\b", r"\btable\b", r"\bmenu\b", r"\blabel\b"],
    "zh": [r"温馨提示", r"指示牌", r"说明", r"表格", r"文档", r"菜单", r"告示", r"提示", r"注意事项", r"过敏原", r"价格"]
}

FINANCE_BUSINESS_KEYWORDS = {
    "en": [r"\bfinance\b", r"\betf\b", r"\bfund\b", r"\binvestment\b", r"\bsubscription\b", r"\bredemption\b", r"\bcode\b", r"\basset\s+management\b", r"\brisk\b"],
    "zh": [r"金融", r"基金", r"ETF", r"申购", r"赎回", r"理财", r"投资", r"代码", r"募集期", r"风险", r"资管", r"收益"]
}

COLOR_KEYWORDS = {
    "blue": ([r"\bblue\b"], "蓝色"),
    "purple": ([r"\bpurple\b"], "紫色"),
    "blue purple gradient": ([r"\bblue\s+purple\s+gradient\b", r"\bcolorful\s+mesh\b", r"\bholographic\b"], "蓝紫渐变"),
    "black and gold": ([r"\bblack\s+and\s+gold\b", r"\bgold\s+foil\b", r"\bdark\s+gold\b", r"\bpremium\s+gold\b"], "黑金"),
    "red orange": ([r"\bred\s+orange\b", r"\bwarm\s+palette\b", r"\bsunny\s+warm\b"], "红橙色"),
    "green": ([r"\bgreen\b"], "绿色"),
    "dark background": ([r"\bdark\s+background\b", r"\bdark\s+mode\b", r"\bblack\s+background\b"], "深色背景"),
    "light background": ([r"\blight\s+background\b", r"\bwhite\s+background\b", r"\blight\s+gray\b"], "浅色背景"),
    "warm tone": ([r"\bwarm\s+tone\b", r"\bcozy\s+yellow\b", r"\bwarm\s+lighting\b"], "暖色调"),
    "cool tone": ([r"\bcool\s+tone\b", r"\bchilly\s+blue\b", r"\bcold\s+tone\b"], "冷色调")
}

STYLE_KEYWORDS = {
    "minimalist": ([r"\bminimalist\b", r"\bminimalism\b", r"\bclean\b", r"\bsimple\b"], "极简"),
    "luxury": ([r"\bluxury\b"], "轻奢"),
    "technology / futuristic": ([r"\btechnology\b", r"\bfuturistic\b", r"\bsci-fi\b", r"\bcyberpunk\b", r"\bneon\b", r"\bfuture\b", r"\bhigh\s+tech\b"], "科技感"),
    "business / corporate": ([r"\bbusiness\b", r"\bcorporate\b", r"\bluxury\b", r"\boffice\b", r"\bprofessional\b"], "商务风"),
    "ink painting": ([r"\bink\b", r"\bink\s+brush\b", r"\btraditional\s+chinese\b", r"\bguofeng\b"], "水墨风"),
    "watercolor": ([r"\bwatercolor\b", r"\bpainting\b", r"\bwatercolor\s+wash\b"], "水彩风"),
    "3D / rendered": ([r"\b3d\b", r"\bdimensional\b", r"\brender\b", r"\bdepth\b"], "3D立体"),
    "glassmorphism": ([r"\bglassmorphism\b", r"\bglass\s+panel\b", r"\btranslucent\b", r"\bfrosted\s+glass\b"], "玻璃拟态")
}

class FlorenceSemanticRouter:
    """
    Second-stage Semantic Router leveraging Florence-2's rich descriptive captions and OCR texts
    to refine VisualRouter零样本 classification results, correct low-confidence visual routing,
    and generate highly tailored semantic design tags for designer workflows.
    """
    
    # Recommended pipelines for each routed asset type
    PIPELINE_MAP = {
        "anime": ["wd_tagger"],
        "illustration": ["ram", "design_rule"],
        "photo": ["ram", "design_rule"],
        "product": ["ram", "design_rule"],
        "design": ["ram", "florence2", "clip", "design_rule"],
        "ui": ["ram", "florence2", "design_rule"],
        "document": ["ram", "florence2", "design_rule"],
        "unknown": ["ram", "design_rule", "clip"]
    }

    @staticmethod
    def _matches_any(text: str, regex_list: List[str]) -> bool:
        if not text:
            return False
        text_lower = text.lower()
        for pattern in regex_list:
            if re.search(pattern, text_lower):
                return True
        return False

    @staticmethod
    def _extract_evidence(text: str, regex_list: List[str]) -> List[str]:
        if not text:
            return []
        text_lower = text.lower()
        matched_words = []
        for pattern in regex_list:
            match = re.search(pattern, text_lower)
            if match:
                matched_words.append(match.group(0))
        return matched_words

    def route(self, router_input: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processes VisualRouter zero-shot scores combined with Florence captions and OCR texts,
        performing secondary semantic evaluations and producing high-fidelity design tags.
        """
        visual_res = router_input.get("visual_router_result") or {}
        metadata = router_input.get("metadata_signals") or {}
        
        caption = router_input.get("florence_caption") or ""
        detailed_caption = router_input.get("florence_detailed_caption") or ""
        ocr_text = router_input.get("florence_ocr_text") or ""
        
        combined_text = f"{caption} {detailed_caption} {ocr_text}"
        
        # 1. First Pass: Category Detection Rules
        is_beverage_food = (
            self._matches_any(combined_text, BEVERAGE_FOOD_KEYWORDS["en"]) or 
            self._matches_any(combined_text, BEVERAGE_FOOD_KEYWORDS["zh"])
        )
        is_poster_banner = (
            self._matches_any(combined_text, POSTER_BANNER_KEYWORDS["en"]) or 
            self._matches_any(combined_text, POSTER_BANNER_KEYWORDS["zh"])
        )
        is_ppt_report = (
            self._matches_any(combined_text, PPT_REPORT_KEYWORDS["en"]) or 
            self._matches_any(combined_text, PPT_REPORT_KEYWORDS["zh"])
        )
        is_ui_interface = (
            self._matches_any(combined_text, UI_INTERFACE_KEYWORDS["en"]) or 
            self._matches_any(combined_text, UI_INTERFACE_KEYWORDS["zh"])
        )
        is_doc_sign = (
            self._matches_any(combined_text, DOC_SIGN_KEYWORDS["en"]) or 
            self._matches_any(combined_text, DOC_SIGN_KEYWORDS["zh"])
        )
        is_finance_business = (
            self._matches_any(combined_text, FINANCE_BUSINESS_KEYWORDS["en"]) or 
            self._matches_any(combined_text, FINANCE_BUSINESS_KEYWORDS["zh"])
        )

        # 2. Category classification resolution
        orig_primary = visual_res.get("primary_type") or "unknown"
        top1_score = visual_res.get("top1_score") or 0.0
        margin = visual_res.get("margin") or 0.0
        is_mixed = visual_res.get("is_mixed") or False
        is_uncertain = visual_res.get("is_uncertain") or False

        # Start with original primary type
        final_primary_type = orig_primary
        secondary_types = list(visual_res.get("secondary_types") or [])
        reasons = []
        evidence = []

        # High confidence boundary checks (Conflict Resolution Rule 1)
        is_high_confidence = top1_score >= 0.75 and margin >= 0.15
        is_low_confidence = top1_score < 0.60 or margin < 0.08 or is_mixed or is_uncertain

        # Extract matches for evidence
        for source_name, text in [("florence_caption", caption), ("florence_detailed_caption", detailed_caption), ("florence_ocr", ocr_text)]:
            if not text:
                continue
            
            # Beverags
            matched_bev = self._extract_evidence(text, BEVERAGE_FOOD_KEYWORDS["en"]) + self._extract_evidence(text, BEVERAGE_FOOD_KEYWORDS["zh"])
            if matched_bev:
                evidence.append({"source": source_name, "text": f"Beverage/Food matches: {matched_bev}"})
            
            # Banners
            matched_ban = self._extract_evidence(text, POSTER_BANNER_KEYWORDS["en"]) + self._extract_evidence(text, POSTER_BANNER_KEYWORDS["zh"])
            if matched_ban:
                evidence.append({"source": source_name, "text": f"Poster/Banner matches: {matched_ban}"})
                
            # PPT
            matched_ppt = self._extract_evidence(text, PPT_REPORT_KEYWORDS["en"]) + self._extract_evidence(text, PPT_REPORT_KEYWORDS["zh"])
            if matched_ppt:
                evidence.append({"source": source_name, "text": f"PPT/Report matches: {matched_ppt}"})
                
            # UI
            matched_ui = self._extract_evidence(text, UI_INTERFACE_KEYWORDS["en"]) + self._extract_evidence(text, UI_INTERFACE_KEYWORDS["zh"])
            if matched_ui:
                evidence.append({"source": source_name, "text": f"UI/App matches: {matched_ui}"})
                
            # Docs
            matched_doc = self._extract_evidence(text, DOC_SIGN_KEYWORDS["en"]) + self._extract_evidence(text, DOC_SIGN_KEYWORDS["zh"])
            if matched_doc:
                evidence.append({"source": source_name, "text": f"Doc/Sign matches: {matched_doc}"})
                
            # Finance
            matched_fin = self._extract_evidence(text, FINANCE_BUSINESS_KEYWORDS["en"]) + self._extract_evidence(text, FINANCE_BUSINESS_KEYWORDS["zh"])
            if matched_fin:
                evidence.append({"source": source_name, "text": f"Finance matches: {matched_fin}"})

        # Apply classification logic
        # Rule 5: Forbidden dangerous overrides
        if orig_primary == "anime" and is_high_confidence:
            reasons.append("Retaining high confidence Anime visual route.")
        elif orig_primary == "photo" and is_high_confidence and not (is_poster_banner or is_beverage_food or is_ppt_report or is_ui_interface or is_doc_sign or is_finance_business):
            reasons.append("Retaining high confidence Photo visual route.")
        else:
            # Low confidence or layout indicators met, allow correction
            if is_low_confidence or (not is_high_confidence):
                if is_beverage_food:
                    # Beverage/Food Rule:
                    # If OCR has promo, brand or menu words -> design
                    has_promo_brand_or_menu = (
                        is_poster_banner or is_doc_sign or 
                        self._matches_any(ocr_text, POSTER_BANNER_KEYWORDS["zh"]) or
                        self._matches_any(ocr_text, DOC_SIGN_KEYWORDS["zh"])
                    )
                    if has_promo_brand_or_menu:
                        final_primary_type = "design"
                        reasons.append("Classified as Design due to strong Beverage food branding/promo text.")
                    else:
                        final_primary_type = "product"
                        reasons.append("Classified as Product due to Beverage/Food scene keywords.")
                    
                    if "product" not in secondary_types and final_primary_type != "product":
                        secondary_types.append("product")
                    if "document" not in secondary_types and final_primary_type != "document":
                        secondary_types.append("document")
                        
                elif is_ui_interface:
                    final_primary_type = "ui"
                    reasons.append("Classified as UI due to strong UI/app interface keywords.")
                    if "design" not in secondary_types:
                        secondary_types.append("design")
                        
                elif is_ppt_report:
                    final_primary_type = "design"
                    reasons.append("Classified as Design (PPT Cover) due to presentation/slide keywords.")
                    if "document" not in secondary_types:
                        secondary_types.append("document")
                        
                elif is_finance_business:
                    final_primary_type = "design"
                    reasons.append("Classified as Design due to finance/business promotion keywords.")
                    if "document" not in secondary_types:
                        secondary_types.append("document")
                        
                elif is_doc_sign:
                    # Check if illustration layout signals exist
                    is_layout_illus = is_poster_banner or orig_primary == "illustration"
                    if is_layout_illus:
                        final_primary_type = "design"
                        reasons.append("Classified as Design (Illustrated Sign/Notice) due to layout text indicators.")
                        if "document" not in secondary_types:
                            secondary_types.append("document")
                    else:
                        final_primary_type = "document"
                        reasons.append("Classified as Document due to text-heavy sign/warning page.")
                        
                elif is_poster_banner:
                    final_primary_type = "design"
                    reasons.append("Classified as Design due to poster/banner keywords.")
                    if "document" not in secondary_types:
                        secondary_types.append("document")

        # 3. Tag generation layer (semantic tags)
        semantic_tags = []
        
        def add_tag(name: str, tag_type: str, confidence: float = 0.85):
            # Check if tag already added
            if not any(t["name"] == name for t in semantic_tags):
                semantic_tags.append({
                    "name": name,
                    "type": tag_type,
                    "category": tag_type,
                    "source": "ai_florence_semantic",
                    "confidence": confidence,
                    "evidence": [ev for ev in evidence]
                })

        # Beverage
        if is_beverage_food:
            add_tag("饮品海报", "usage", 0.88)
            add_tag("菜单设计", "usage", 0.85)
            add_tag("餐饮宣传图", "usage", 0.86)
            add_tag("品牌宣传图", "usage", 0.87)
            add_tag("饮品", "subject", 0.89)
            add_tag("奶茶", "subject", 0.88)
            add_tag("食品", "subject", 0.85)
            add_tag("杯子", "subject", 0.82)
            add_tag("餐饮", "scene", 0.88)
            add_tag("桌面静物", "scene", 0.84)
            if is_mixed or len(ocr_text) > 10:
                add_tag("拼贴排版", "layout", 0.82)

        # Poster/Banner
        if is_poster_banner:
            add_tag("海报", "usage", 0.88)
            add_tag("Banner", "usage", 0.88)
            add_tag("宣传图", "usage", 0.86)
            add_tag("商业视觉", "usage", 0.87)
            add_tag("促销海报", "usage", 0.89)
            add_tag("标题排版", "layout", 0.85)
            add_tag("信息排版", "layout", 0.82)

        # PPT
        if is_ppt_report:
            add_tag("PPT封面", "usage", 0.89)
            add_tag("教学报告封面", "usage", 0.88)
            add_tag("汇报封面", "usage", 0.87)
            add_tag("培训封面", "usage", 0.85)

        # UI
        if is_ui_interface:
            add_tag("UI设计", "usage", 0.89)
            add_tag("数据看板", "usage", 0.87)
            add_tag("App界面", "usage", 0.88)
            add_tag("网页界面", "usage", 0.88)
            add_tag("卡片布局", "layout", 0.85)
            add_tag("网格布局", "layout", 0.84)
            add_tag("导航布局", "layout", 0.82)

        # Doc/Sign
        if is_doc_sign:
            add_tag("指示牌", "usage", 0.88)
            add_tag("说明牌", "usage", 0.86)
            add_tag("菜单设计", "usage", 0.85)
            add_tag("温馨提示", "usage", 0.89)
            add_tag("文档页", "usage", 0.82)
            if "餐厅" in combined_text or "restaurant" in combined_text.lower() or "cafe" in combined_text.lower():
                add_tag("餐厅", "scene", 0.85)

        # Finance
        if is_finance_business:
            add_tag("金融海报", "usage", 0.89)
            add_tag("金融横图", "usage", 0.87)
            add_tag("基金宣传图", "usage", 0.88)
            add_tag("PPT封面", "usage", 0.82)
            add_tag("金融商务", "style", 0.88)
            add_tag("科技感", "style", 0.82)
            add_tag("商务风", "style", 0.85)

        # Colors extraction
        for color_key, (regex_list, cn_name) in COLOR_KEYWORDS.items():
            if self._matches_any(combined_text, regex_list):
                add_tag(cn_name, "color", 0.80)

        # Styles extraction
        for style_key, (regex_list, cn_name) in STYLE_KEYWORDS.items():
            if self._matches_any(combined_text, regex_list):
                add_tag(cn_name, "style", 0.85)

        # Clean duplicates in secondary types
        secondary_types = list(set([st for st in secondary_types if st != final_primary_type]))

        # Recommended pipeline resolution
        recommended_pipeline = self.PIPELINE_MAP.get(final_primary_type, ["ram", "clip"]).copy()
        
        # If document, UI, or design, ensure florence2 is loaded
        is_florence_req = final_primary_type in ["ui", "document", "design"] or any(t in secondary_types for t in ["ui", "document", "design"])
        if is_florence_req:
            if "florence2" not in recommended_pipeline:
                recommended_pipeline.insert(0, "florence2")

        # WD Tagger triggers only on anime or illustration with anime secondary
        should_use_wd = final_primary_type == "anime" or (final_primary_type == "illustration" and "anime" in secondary_types)
        if should_use_wd:
            if "wd_tagger" not in recommended_pipeline:
                recommended_pipeline.insert(0, "wd_tagger")
        else:
            recommended_pipeline = [p for p in recommended_pipeline if p != "wd_tagger"]

        # Final construct
        result = {
            "final_primary_type": final_primary_type,
            "secondary_types": secondary_types,
            "confidence": 1.0 if is_high_confidence else 0.80,
            "recommended_pipeline": recommended_pipeline,
            "semantic_tags": semantic_tags,
            "semantic_usage_tags": [t for t in semantic_tags if t["type"] == "usage"],
            "semantic_subject_tags": [t for t in semantic_tags if t["type"] == "subject"],
            "semantic_scene_tags": [t for t in semantic_tags if t["type"] == "scene"],
            "semantic_layout_tags": [t for t in semantic_tags if t["type"] == "layout"],
            "semantic_style_tags": [t for t in semantic_tags if t["type"] == "style"],
            "semantic_color_tags": [t for t in semantic_tags if t["type"] == "color"],
            "evidence": evidence,
            "reason": "; ".join(reasons) if reasons else "Retained visual classification.",
            "should_use_florence": True,
            "should_use_wd_tagger": should_use_wd,
            "should_use_qwen_vl": False
        }
        
        return result
