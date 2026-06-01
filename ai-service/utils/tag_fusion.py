import os
from typing import List, Dict, Any, Optional
from utils.tag_cleaner import clean_wd_tag, TRANSLATION_MAP
from utils.design_tag_dictionary import ENGLISH_TO_CHINESE_MAP
from utils.tag_source_normalizer import normalize_source, normalize_category

# List of sensitive or embarrassing words to block strictly from designer materials
SENSITIVE_BLOCK_WORDS = [
    "futanari", "yuri", "yaoi", "hentai", "nsfw", "naked", "breasts", 
    "nude", "underwear", "panties", "bra", "crotch", "pubic", "pussy", 
    "penis", "ass", "butt", "anal", "vagina", "sex", "erotic", "stimulate", 
    "masturbation", "bondage", "sadism", "masochism", "fetish", "lewd", 
    "loli", "shota", "waifu", "censored", "uncensored", "sexual", "bloody", 
    "violence", "gore", "kill", "suicide", "murder"
]

# Synonym group definitions for high-precision design vocabulary merging
SYNONYM_GROUPS = {
    "食品": ["food", "食物", "食品"],
    "饮品": ["drink", "beverage", "饮料", "饮品"],
    "建筑": ["building", "architecture", "建筑"],
    "城市": ["city", "cityscape", "城市"],
    "海报": ["poster", "海报"],
    "Banner": ["banner", "横幅", "banner"],
    "产品": ["product", "商品", "产品"]
}

# Flatten this to a mapping from input name (lowercase, stripped) to the group's canonical key
SYNONYM_MAP = {}
for canonical_key, synonyms in SYNONYM_GROUPS.items():
    for syn in synonyms:
        SYNONYM_MAP[syn.lower().strip()] = canonical_key

def get_source_priority(source: str) -> int:
    """Gets the priority score of a model source (higher is preferred)."""
    src = source.lower()
    if "ram" in src:
        return 5  # Highest priority
    elif "florence" in src:
        return 4
    elif "rule" in src or src in ["filename", "color_rule", "aspect_ratio_rule", "custom_rule", "metadata"]:
        return 3
    elif "clip" in src:
        return 2
    elif "wd" in src:
        return 1  # Lowest priority
    return 0

def fuse_and_clean_tags(model_outputs: List[Dict[str, Any]], florence_semantic_tags: Optional[List[Dict[str, Any]]] = None, max_tags: int = 30) -> List[Dict[str, Any]]:
    """
    Fuses multiple tag list inputs from different cooperative models with clean rules:
    1. Removes duplicate tags (normalizes tag name first).
    2. Maps synonymous terms across sources (e.g. food/食物/食品 -> 食品).
    3. Applies a strict sensitive word block list.
    4. Translates English tags to Chinese using ENGLISH_TO_CHINESE_MAP and TRANSLATION_MAP.
    5. Gathers multi-source evidence (every tag preserves a list of predicting models and confidences).
    6. Resolves and normalizes taxonomy category and model source labels.
    7. Sets best source based on model hierarchy (RAM++ > Florence-2 > DesignRule > CLIP > WD).
    """
    seen_normalized = {}
    fused_tags = []

    # Merge standard outputs with florence semantic tags if provided
    all_outputs = list(model_outputs)
    if florence_semantic_tags:
        for st in florence_semantic_tags:
            all_outputs.append({
                "name": st["name"],
                "confidence": st["confidence"],
                "category": st["type"],
                "source": st["source"],
                "evidence": st.get("evidence", [])
            })

    # 1. First Pass: Collect all tags and group by normalized name/synonym to build evidence and find max confidence
    for item in all_outputs:
        name = item.get("name", "").strip()
        if not name:
            continue
            
        normalized = name.lower().replace('_', ' ').replace('-', ' ').strip()
        
        # Strict Sensitive Words Filter
        if any(bw in normalized for bw in SENSITIVE_BLOCK_WORDS):
            continue

        raw_confidence = float(item.get("confidence", 0.5))
        
        # Low confidence threshold filter (e.g. discard tags with < 0.15)
        if raw_confidence < 0.15:
            continue

        raw_source = item.get("source", "ai")
        normalized_source = normalize_source(raw_source)

        # Strictly skip any tag originating from Florence OCR
        if normalized_source == "ai_florence_ocr" or raw_source == "ai_florence_ocr":
            continue

        # Map synonymous keys
        if normalized in SYNONYM_MAP:
            canonical_key = SYNONYM_MAP[normalized]
        else:
            canonical_key = normalized

        if canonical_key not in seen_normalized:
            seen_normalized[canonical_key] = {
                "original_name": name,
                "max_confidence": raw_confidence,
                "category": item.get("category", "custom"),
                "evidence": []
            }
        else:
            # Retain maximum confidence score
            seen_normalized[canonical_key]["max_confidence"] = max(
                seen_normalized[canonical_key]["max_confidence"], 
                raw_confidence
            )

        # Append source evidence
        item_evidence = item.get("evidence")
        if item_evidence and isinstance(item_evidence, list) and len(item_evidence) > 0:
            for ev in item_evidence:
                ev_copy = ev.copy() if isinstance(ev, dict) else {"source": str(ev)}
                ev_copy["source"] = normalize_source(ev_copy.get("source", normalized_source))
                if "confidence" not in ev_copy:
                    ev_copy["confidence"] = raw_confidence
                seen_normalized[canonical_key]["evidence"].append(ev_copy)
        else:
            seen_normalized[canonical_key]["evidence"].append({
                "source": normalized_source,
                "confidence": raw_confidence
            })

    # 2. Second Pass: Batch localize all original names using TagLocalizationService
    from services.tag_localization_service import TagLocalizationService
    localizer = TagLocalizationService()

    keys = list(seen_normalized.keys())
    original_names = [seen_normalized[k]["original_name"] for k in keys]
    
    try:
        localized_results = localizer.localize_tags_batch(original_names)
        localized_map = {keys[i]: localized_results[i] for i in range(len(keys))}
    except Exception as e:
        print(f"[TagFusion] Localization failed: {e}. Falling back to default names.")
        localized_map = {
            k: {
                "tag_name": seen_normalized[k]["original_name"].title(),
                "raw_value": seen_normalized[k]["original_name"],
                "localized_by": "fallback"
            }
            for k in keys
        }

    # 3. Third Pass: Construct clean display names, categories and localized translations
    for canonical_key, data in seen_normalized.items():
        # Deduplicate evidence list by source, keeping max confidence per source
        deduped_evidence = {}
        for ev in data["evidence"]:
            src = ev.get("source", "ai")
            conf = float(ev.get("confidence", 0.5))
            if src not in deduped_evidence or conf > deduped_evidence[src]:
                deduped_evidence[src] = conf
        
        deduped_evidence_list = [{"source": src, "confidence": conf} for src, conf in deduped_evidence.items()]

        # Determine the best main source based on priority rules
        best_source = "ai"
        if deduped_evidence_list:
            sorted_evidence = sorted(
                deduped_evidence_list,
                key=lambda ev: get_source_priority(ev.get("source", "")),
                reverse=True
            )
            best_source = sorted_evidence[0].get("source", "ai")

        # Retrieve localized results
        loc_res = localized_map.get(canonical_key) or {
            "tag_name": data["original_name"].title(),
            "raw_value": data["original_name"],
            "localized_by": "fallback"
        }
        display_name = loc_res["tag_name"]

        # Resolve category
        category = data["category"]
        tag_type = normalize_category(category)
        
        if tag_type == "custom":
            # Pass to clean_wd_tag standard category mapper (category=0 for General)
            cleaned = clean_wd_tag(data["original_name"], 0, data["max_confidence"], source="ai")
            tag_type = normalize_category(cleaned.tag_type)

        # Build final tag payload
        fused_tags.append({
            "name": display_name,
            "display_name": display_name,
            "normalized_name": canonical_key,
            "tag_type": tag_type,
            "type": tag_type,
            "category": tag_type,
            "source": best_source,
            "confidence": float(round(data["max_confidence"], 4)),
            "score": float(round(data["max_confidence"], 4)),
            "evidence": deduped_evidence_list,
            "raw_value": loc_res.get("raw_value", data["original_name"]),
            "localized_by": loc_res.get("localized_by", "fallback")
        })

    # Sort tags by confidence score descending
    fused_tags.sort(key=lambda x: x["confidence"], reverse=True)
    return fused_tags[:max_tags]
