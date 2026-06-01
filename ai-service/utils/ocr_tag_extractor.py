# -*- coding: utf-8 -*-
import re
import os
from typing import List, Dict, Any

# Blacklist of generic uppercase English words to prevent them from becoming brand tags
GENERIC_ENG_BLACKLIST = {
    "THE", "AND", "FOR", "WITH", "YOU", "ALL", "NEW", "BEST", "OUT", "NOW", 
    "OFF", "GET", "OUR", "THIS", "THAT", "FROM", "YOUR", "GOOD", "LOVE", "ONE",
    "DAY", "TODAY", "MORE", "FREE", "ONLY", "LIKE", "HERE", "SOME", "WHAT", "ABOUT",
    "BLUE", "GOLD", "RED", "GREEN", "WHITE", "BLACK", "GREY", "YELLOW", "PINK",
    "POSTER", "BANNER", "FLYER", "SLIDE", "IMAGE", "PHOTO", "PICTURE", "DESIGN",
    "CARD", "PAGE", "MENU", "NOTICE", "SIGN", "DASHBOARD", "SETTINGS", "CREATE",
    "ANIME", "MANGA", "REAL", "SHOT", "PRODUCT", "BRAND", "NOTICE", "WARNING"
}

# Vocabulary keyword maps for explicit extraction
BRAND_KEYWORDS = {
    "zh": ["东风美学", "东方叙茶", "小美茶山展", "白屋范", "粉白茉", "觅特", "威杰士", "wajass"],
    "en": ["SATTEA", "MILK TEA", "WAJASS", "JAEGER-LECOULTRE", "SUPERIO"]
}

USAGE_KEYWORDS = {
    "海报": ["海报", "poster", "flyer"],
    "Banner": ["banner", "横幅", "宣传横图"],
    "PPT封面": ["ppt", "presentation", "slide", "汇报", "报告", "封面", "幻灯片"],
    "菜单设计": ["菜单", "menu", "价格表", "饮品单"],
    "温馨提示": ["温馨提示", "告示", "提示", "注意事项", "警示", "notice", "warning", "温馨提示"],
    "指示牌": ["指示牌", "说明牌", "引导牌", "sign"],
    "UI设计": ["ui", "ux", "dashboard", "settings", "interface", "界面", "控制台", "卡片布局", "网格布局"],
    "促销海报": ["促销", "优惠", "活动", "折扣", "sale", "promotion", "campaign", "限时抢购"],
    "金融海报": ["金融", "基金", "理财", "投资", "募集期", "申购期", "赎回期", "etf", "证券", "理财产品"]
}

SCENE_KEYWORDS = {
    "餐饮": ["餐饮", "餐厅", "餐具", "茶研地", "美食", "cafe", "restaurant", "food", "kitchen"],
    "奶茶": ["奶茶", "茶饮", "水果茶", "轻乳茶", "波霸", "珍珠奶茶", "milk tea"],
    "咖啡": ["咖啡", "拿铁", "美式", "卡布奇诺", "coffee", "lathe", "espresso"],
    "金融": ["金融", "资管", "资产管理", "证券", "理财", "商务", "finance", "business"],
    "教育": ["教育", "教学", "课件", "培训", "课程", "education", "course", "school"],
    "酒店": ["酒店", "客房", "民宿", "住宿", "hotel", "resort"],
    "旅游": ["旅游", "景区", "旅行", "观光", "travel", "tourism", "vacation"]
}

PRODUCT_KEYWORDS = {
    "饮品": ["饮品", "饮料", "瓶装", "杯装", "drink", "beverage"],
    "食品": ["食品", "甜品", "蛋糕", "面包", "零食", "dessert", "snack"],
    "杯子": ["杯子", "杯装", "cup", "mug", "bottle"],
    "珠宝": ["珠宝", "戒指", "钻石", "首饰", "jewelry", "ring", "diamond", "gold"],
    "基金": ["基金", "etf", "理财", "fund", "etf", "理财产品"]
}

EVENT_KEYWORDS = {
    "618": ["618", "6.18", "年中大促"],
    "双11": ["双11", "双十一", "11.11", "狂欢节"],
    "母亲节": ["母亲节", "mother's day"],
    "申购期": ["申购期", "募集期", "认购期", "subscription"],
    "赎回期": ["赎回期", "redemption"],
    "优惠": ["优惠", "折扣", "免费", "免运", "免运费", "送礼"]
}

class OCRTagExtractor:
    """
    Utility parser that extracts high-value design, branding, layout and product
    tags from Florence-2 OCR raw texts, ensuring clean tokenization, duplicate resolution,
    and structured pending tag mapping.
    """
    
    @staticmethod
    def clean_text(text: str) -> str:
        if not text:
            return ""
        # Remove weird Control Characters or double spaces, normalize quotes/dashes
        text = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    def extract_tags(self, extractor_input: Dict[str, Any]) -> List[Dict[str, Any]]:
        ocr_text = extractor_input.get("ocr_text") or ""
        caption = extractor_input.get("caption") or ""
        asset_type = extractor_input.get("asset_type") or ""
        
        ocr_cleaned = self.clean_text(ocr_text)
        caption_cleaned = self.clean_text(caption)
        combined_text = f"{ocr_cleaned} {caption_cleaned}"
        combined_lower = combined_text.lower()

        extracted = {}

        def add_tag(name: str, tag_type: str, confidence: float, raw_val: str, matched_kw: str):
            normalized = name.strip()
            if not normalized:
                return
            if normalized not in extracted:
                extracted[normalized] = {
                    "name": normalized,
                    "type": tag_type,
                    "category": tag_type,
                    "source": "ai_florence_ocr",
                    "confidence": confidence,
                    "raw_value": raw_val,
                    "evidence": [{
                        "source": "ai_florence_ocr",
                        "text": f"Matched OCR keyword '{matched_kw}' in raw string: '{raw_val}'"
                    }]
                }
            else:
                # Retain maximum confidence and merge evidence
                extracted[normalized]["confidence"] = max(extracted[normalized]["confidence"], confidence)
                extracted[normalized]["evidence"].append({
                    "source": "ai_florence_ocr",
                    "text": f"Additional match of '{matched_kw}' in text"
                })

        # 1. Split OCR into separate clean tokens for English uppercase brand words
        # Extract English uppercase letters of length 3-20 (words like SATTEA, MILK, etc.)
        eng_tokens = re.findall(r'\b[A-Z]{3,20}\b', ocr_cleaned)
        for token in eng_tokens:
            if token in GENERIC_ENG_BLACKLIST:
                continue
            
            # Additional check: If token is a brand word in our lists
            is_explicit_brand = any(token == kw for kw in BRAND_KEYWORDS["en"])
            confidence = 0.88 if is_explicit_brand else 0.80
            
            # Map brand/text tags
            # Since standard tags are custom/usage/subject, we map text/brand to 'brand' or 'custom'
            add_tag(token, "custom", confidence, token, token)

        # 2. Check explicit Brand keywords in English (including multi-word ones)
        for kw in BRAND_KEYWORDS["en"]:
            # Use word boundary search case-insensitively
            pattern = r'\b' + re.escape(kw.lower()) + r'\b'
            if re.search(pattern, combined_lower):
                add_tag(kw, "custom", 0.88, kw, kw)

        # 3. Check explicit Brand keywords in Chinese
        for kw in BRAND_KEYWORDS["zh"]:
            if kw in combined_text:
                add_tag(kw, "custom", 0.88, kw, kw)

        # 3. Check Usage keywords
        for tag_name, keywords in USAGE_KEYWORDS.items():
            for kw in keywords:
                # Use word boundaries for English keywords
                pattern = r'\b' + re.escape(kw) + r'\b' if kw.isalnum() and kw.isascii() else re.escape(kw)
                if re.search(pattern, combined_lower):
                    add_tag(tag_name, "usage", 0.86, kw, kw)

        # 4. Check Scene keywords
        for tag_name, keywords in SCENE_KEYWORDS.items():
            for kw in keywords:
                pattern = r'\b' + re.escape(kw) + r'\b' if kw.isalnum() and kw.isascii() else re.escape(kw)
                if re.search(pattern, combined_lower):
                    add_tag(tag_name, "scene", 0.85, kw, kw)

        # 5. Check Product keywords
        for tag_name, keywords in PRODUCT_KEYWORDS.items():
            for kw in keywords:
                pattern = r'\b' + re.escape(kw) + r'\b' if kw.isalnum() and kw.isascii() else re.escape(kw)
                if re.search(pattern, combined_lower):
                    add_tag(tag_name, "subject", 0.86, kw, kw)

        # 6. Check Event keywords
        for tag_name, keywords in EVENT_KEYWORDS.items():
            for kw in keywords:
                pattern = r'\b' + re.escape(kw) + r'\b' if kw.isalnum() and kw.isascii() else re.escape(kw)
                if re.search(pattern, combined_lower):
                    add_tag(tag_name, "usage", 0.86, kw, kw)

        # 7. Safety filter: Make sure the whole OCR text was not directly added as a tag
        final_list = []
        for name, item in extracted.items():
            # If the tag is exactly the long OCR string, skip it
            if len(name) > 30 and name == ocr_cleaned:
                continue
            final_list.append(item)

        # Sort descending by confidence
        final_list.sort(key=lambda x: x["confidence"], reverse=True)
        return final_list

