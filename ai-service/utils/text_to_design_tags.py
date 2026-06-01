# -*- coding: utf-8 -*-
import re
from typing import List, Dict, Any

STYLE_RULES = {
    "极简": [r"\bminimalist\b", r"\bminimalism\b", r"\bclean\b", r"\bsimple\b", r"极简", r"简约"],
    "科技感": [r"\btechnology\b", r"\bsci-fi\b", r"\bcyberpunk\b", r"\bneon\b", r"\bfuture\b", r"\bhigh tech\b", r"科技", r"未来", r"赛博朋克"],
    "商务风": [r"\bbusiness\b", r"\bcorporate\b", r"\bluxury\b", r"\boffice\b", r"\bprofessional\b", r"商务", r"企业", r"白领"],
    "金融商务": [r"\bfinancial\b", r"\beconomy\b", r"\bstock\b", r"\binvestment\b", r"\bbank\b", r"\bwealth\b", r"金融", r"经济", r"股票", r"投资", r"理财"],
    "水墨风": [r"\bink\b", r"\bink brush\b", r"\btraditional chinese\b", r"\bguofeng\b", r"水墨", r"国风", r"毛笔"],
    "水彩风": [r"\bwatercolor\b", r"\bpainting\b", r"\bwatercolor wash\b", r"水彩", r"手绘"],
    "玻璃拟态": [r"\bglassmorphism\b", r"\bglass panel\b", r"\btranslucent\b", r"\bfrosted glass\b", r"玻璃拟态", r"半透明玻璃"],
    "3D立体": [r"\b3d\b", r"\bdimensional\b", r"\brender\b", r"\bdepth\b", r"立体", r"三维"]
}

USAGE_RULES = {
    "海报": [r"\bposter\b", r"\bflyer\b", r"\bbrochure\b", r"海报", r"宣传单"],
    "Banner": [r"\bbanner\b", r"\bhorizontal promo\b", r"\bhorizontal banner\b", r"横幅", r"焦点图"],
    "PPT封面": [r"\bppt\b", r"\bpowerpoint\b", r"\bpresentation\b", r"\bslide deck\b", r"\bkeynote\b", r"封面", r"幻灯片"],
    "UI设计": [r"\bui\b", r"\buser interface\b", r"\bdashboard\b", r"\bwireframe\b", r"\bapp screen\b", r"\bmockup\b", r"界面", r"仪表盘", r"ui设计"],
    "指示牌": [r"\bsignage\b", r"\bsign board\b", r"\bdirection\b", r"\bwarning sign\b", r"指示牌", r"路标", r"温馨提示"],
    "菜单": [r"\bmenu\b", r"\bfood advertisement\b", r"\beatery dining\b", r"菜单", r"食谱"],
    "教学报告封面": [r"\bteaching\b", r"\beducational\b", r"\bschool report\b", r"\bclass presentation\b", r"教学", r"教育", r"报告"],
    "金融横图": [r"\bfinancial banner\b", r"\bhorizontal financial\b", r"\beconomic horizontal\b", r"金融横图", r"理财横轴"]
}

LAYOUT_RULES = {
    "标题居中": [r"\bcentered title\b", r"\bsymmetric title\b", r"\bcentered typography\b", r"居中", r"标题居中"],
    "左文右图": [r"\bleft text right image\b", r"\bsplit screen\b", r"\btext left\b", r"左文右图", r"左右排版"],
    "大面积留白": [r"\bwhitespace\b", r"\bbreathing room\b", r"\bnegative space\b", r"留白", r"留空"],
    "信息密集": [r"\bdense\b", r"\bgrid charts\b", r"\bhighly packed\b", r"\binformation dense\b", r"密集", r"紧凑"],
    "横版构图": [r"\bhorizontal\b", r"\blandscape\b", r"\bwide\b", r"横版", r"横构图"],
    "竖版构图": [r"\bvertical\b", r"\bportrait\b", r"\btall\b", r"竖版", r"竖构图"],
    "卡片布局": [r"\bcard layout\b", r"\bgrid cards\b", r"\bcards composition\b", r"卡片", r"卡片式"],
    "网格布局": [r"\bgrid layout\b", r"\bgrid system\b", r"网格", r"网格排版"]
}

COLOR_RULES = {
    "蓝紫渐变": [r"\bblue purple gradient\b", r"\bcolorful mesh\b", r"\bholographic\b", r"蓝紫", r"渐变", r"炫彩"],
    "黑金": [r"\bblack gold\b", r"\bgold foil\b", r"\bdark gold\b", r"\bpremium gold\b", r"黑金", r"金色 highlights"],
    "红橙色": [r"\bred orange\b", r"\bwarm palette\b", r"\bsunny warm\b", r"红橙", r"红色", r"橙色"],
    "深色背景": [r"\bdark background\b", r"\bdark mode\b", r"\bblack background\b", r"深色背景", r"暗色背景"],
    "浅色背景": [r"\blight background\b", r"\bwhite background\b", r"\blight gray\b", r"浅色背景", r"白色背景"],
    "低饱和绿色": [r"\blow saturation green\b", r"\bsage green\b", r"\bforest green\b", r"\bolive green\b", r"低饱和绿", r"浅绿", r"墨绿"],
    "暖色调": [r"\bwarm tone\b", r"\bcozy yellow\b", r"\bwarm lighting\b", r"暖色", r"暖调"],
    "冷色调": [r"\bcool tone\b", r"\bchilly blue\b", r"\bcold tone\b", r"冷色", r"冷调"]
}

SCENE_RULES = {
    "城市天际线": [r"\bcity skyline\b", r"\bcityscape\b", r"\bskyscrapers\b", r"城市", r"天际线", r"高楼"],
    "餐厅": [r"\brestaurant\b", r"\beatery\b", r"\bdining table\b", r"\bcafe\b", r"餐厅", r"咖啡馆", r"饭店"],
    "酒店": [r"\bhotel\b", r"\bresort\b", r"\blobby\b", r"酒店", r"宾馆", r"旅店"],
    "办公场景": [r"\boffice\b", r"\bboardroom\b", r"\bmeeting room\b", r"\bdesk\b", r"办公", r"会议室", r"工作台"],
    "山峰": [r"\bmountain\b", r"\bvalley\b", r"\bpeaks\b", r"山峰", r"大山", r"山川"],
    "室内": [r"\bindoor\b", r"\binterior\b", r"\binside\b", r"室内", r"屋里"],
    "户外": [r"\boutdoor\b", r"\bnature\b", r"\blandscape\b", r"\boutside\b", r"户外", r"室外", r"自然"],
    "抽象背景": [r"\babstract background\b", r"\bmesh background\b", r"\bvector background\b", r"抽象", r"背景纹理"]
}

OCR_KEYWORDS_MAP = {
    "金融": ["financial", "finance", "金融"],
    "课程": ["course", "class", "课程"],
    "报告": ["report", "paper", "报告"],
    "酒店": ["hotel", "酒店"],
    "餐厅": ["restaurant", "dining", "food", "餐厅"],
    "618": ["618"],
    "优惠": ["discount", "promo", "off", "优惠", "促销"],
    "温馨提示": ["tips", "notice", "attention", "温馨提示", "提示"],
    "申购期": ["subscription", "申购期"],
    "赎回期": ["redemption", "赎回期"],
    "教学": ["teaching", "education", "教学"],
    "PPT": ["ppt"],
    "UI": ["ui"]
}

def extract_tags_from_text(text: str) -> List[Dict[str, Any]]:
    """
    Analyzes visual text description and maps matching design style vocabulary.
    """
    if not text:
        return []
        
    text_lower = text.lower()
    extracted = {}
    
    # helper rule processor
    def process_rules(rules: Dict[str, List[str]], category: str, default_confidence: float = 0.85):
        for tag_name, patterns in rules.items():
            for pat in patterns:
                if re.search(pat, text_lower):
                    # Save with key to prevent duplicates
                    extracted[tag_name] = {
                        "name": tag_name,
                        "confidence": default_confidence,
                        "category": category,
                        "source": "ai_florence"
                    }
                    break

    process_rules(STYLE_RULES, "style", 0.85)
    process_rules(USAGE_RULES, "usage", 0.88)
    process_rules(LAYOUT_RULES, "layout", 0.82)
    process_rules(COLOR_RULES, "color", 0.80)
    process_rules(SCENE_RULES, "scene", 0.81)
    
    return list(extracted.values())

def extract_whitelist_ocr_tags(ocr_text: str) -> List[Dict[str, Any]]:
    """
    Scans the raw OCR output for targeted high-value business/UI whitelisted keywords.
    Never returns direct long sentences to prevent pollution.
    """
    if not ocr_text:
        return []
        
    extracted = []
    seen = set()
    ocr_lower = ocr_text.lower()
    
    for tag_name, patterns in OCR_KEYWORDS_MAP.items():
        for pat in patterns:
            if pat in ocr_lower:
                if tag_name.lower() not in seen:
                    seen.add(tag_name.lower())
                    extracted.append({
                        "name": tag_name,
                        "confidence": 0.88,
                        "category": "custom",
                        "source": "ai_florence"
                    })
                    break
                    
    return extracted

def extract_tags_from_florence_outputs(caption: str = "", detailed_caption: str = "", ocr_text: str = "") -> List[Dict[str, Any]]:
    """
    Fuses outputs from Florence-2 multi-tasks (Captions and OCR whitelists).
    Filters duplicates gracefully.
    """
    all_tags = []
    seen_names = set()
    
    # 1. Parse Captions
    for txt in [caption, detailed_caption]:
        if txt:
            tags = extract_tags_from_text(txt)
            for t in tags:
                name_key = t["name"].lower()
                if name_key not in seen_names:
                    seen_names.add(name_key)
                    all_tags.append(t)
                    
    # 2. Parse OCR Whitelist Keywords
    if ocr_text:
        ocr_tags = extract_whitelist_ocr_tags(ocr_text)
        for t in ocr_tags:
            name_key = t["name"].lower()
            if name_key not in seen_names:
                seen_names.add(name_key)
                all_tags.append(t)
                
    return all_tags
