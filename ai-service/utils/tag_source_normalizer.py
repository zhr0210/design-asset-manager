def normalize_source(source: str) -> str:
    """Normalizes model source names into standard labels."""
    source_lower = source.lower().strip()
    if source_lower in ["visual_router", "ai_visual_router", "router"]:
        return "ai_visual_router"
    elif source_lower in ["florence", "florence2", "ai_florence"]:
        return "ai_florence"
    elif source_lower in ["florence_ocr", "florence2_ocr", "ai_florence_ocr"]:
        return "ai_florence_ocr"
    elif source_lower in ["florence_semantic", "ai_florence_semantic", "semantic_router"]:
        return "ai_florence_semantic"
    elif source_lower in ["clip", "ai_clip_classifier", "openclip", "siglip", "ai_clip_design", "clip_design", "clip_classifier"]:
        return "ai_clip_design"
    elif source_lower in ["wd_tagger", "ai_wd_tagger"]:
        return "ai_wd_tagger"
    elif source_lower in ["custom_rule", "rule_判定", "rule", "design_rule"]:
        return "design_rule"
    elif source_lower in ["metadata", "meta"]:
        return "metadata"
    elif source_lower in ["filename"]:
        return "filename"
    elif source_lower in ["color_rule"]:
        return "color_rule"
    elif source_lower in ["aspect_ratio_rule"]:
        return "aspect_ratio_rule"
    elif source_lower in ["ram", "ai_ram", "ram++"]:
        return "ai_ram"
    elif source_lower in ["ram_plus", "ai_ram_plus"]:
        return "ai_ram_plus"
    elif source_lower in ["qwen_vl", "ai_qwen_vl"]:
        return "ai_qwen_vl"
    return source_lower

def normalize_category(category: str) -> str:
    """Normalizes category keys to ensure consistency in the design taxonomy."""
    category_lower = category.lower().strip()
    if category_lower in ["style", "风格"]:
        return "style"
    elif category_lower in ["usage", "用途", "功能"]:
        return "usage"
    elif category_lower in ["layout", "排版", "版式"]:
        return "layout"
    elif category_lower in ["color", "色彩", "颜色"]:
        return "color"
    elif category_lower in ["scene", "场景"]:
        return "scene"
    elif category_lower in ["subject", "主体"]:
        return "subject"
    return "custom"
