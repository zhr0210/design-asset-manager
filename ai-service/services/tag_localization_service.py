import re
from typing import List, Dict, Any, Optional
from utils.design_translation_dictionary import DESIGN_TRANSLATION_MAP
from utils.translation_cache import TranslationCache
from services.translation_service import TranslationService

# Synonym groupings for high-precision design vocabulary merging
SYNONYM_GROUPS = {
    "食品": ["food", "食物", "食品"],
    "饮品": ["drink", "beverage", "饮料", "饮品"],
    "建筑": ["building", "architecture", "建筑"],
    "城市": ["city", "cityscape", "城市"],
    "海报": ["poster", "海报"],
    "Banner": ["banner", "横幅", "banner"],
    "产品": ["product", "商品", "产品"]
}

# Flattened synonym lookup map
SYNONYM_MAP = {}
for canonical_key, synonyms in SYNONYM_GROUPS.items():
    for syn in synonyms:
        SYNONYM_MAP[syn.lower().strip()] = canonical_key


class TagLocalizationService:
    """
    Main orchestrator for tag and description localization.
    Coordinates design translation dictionaries, synonym merging, translation cache,
    Helsinki-NLP model translation, and rigorous Chinese post-processing.
    """
    def __init__(self, translation_service: Optional[TranslationService] = None, cache: Optional[TranslationCache] = None):
        self.translation_service = translation_service
        self.cache = cache or TranslationCache()
        
    def _get_translation_service(self) -> TranslationService:
        if not self.translation_service:
            # Import ModelManager here to avoid circular imports
            from core.model_manager import ModelManager
            manager = ModelManager()
            # If ModelManager has translation registered, we can load it or retrieve instance
            info = manager.loaded_models.get("translation")
            if info and info.get("instance"):
                self.translation_service = info["instance"]
            else:
                self.translation_service = TranslationService()
        return self.translation_service

    def localize_tag(self, tag_name: str) -> Dict[str, Any]:
        """
        Translates and localizes a single English design tag.
        Returns a dictionary:
        {
            "tag_name": str (Chinese translated name or original English if brand/failed),
            "raw_value": str (Original English tag name),
            "localized_by": str ("dictionary" | "synonym" | "cache" | "opus_mt" | "fallback" | "needs_review"),
            "needs_review": bool
        }
        """
        if not tag_name or not tag_name.strip():
            return {
                "tag_name": "",
                "raw_value": "",
                "localized_by": "fallback",
                "needs_review": False
            }

        raw = tag_name.strip()
        normalized = raw.lower().replace('_', ' ').replace('-', ' ').strip()

        # Step 0: English brand words preservation
        # e.g., if the raw string is completely uppercase and not in dict (e.g. SATTEA)
        if raw.isupper() and len(raw) > 1 and normalized not in DESIGN_TRANSLATION_MAP and normalized not in SYNONYM_MAP:
            return {
                "tag_name": raw,
                "raw_value": raw,
                "localized_by": "dictionary",  # Retained brand word treated as dictionary success
                "needs_review": False
            }

        # Step 1: Check Design Translation Dictionary
        if normalized in DESIGN_TRANSLATION_MAP:
            return {
                "tag_name": DESIGN_TRANSLATION_MAP[normalized],
                "raw_value": raw,
                "localized_by": "dictionary",
                "needs_review": False
            }

        # Step 2: Check Synonym Map
        if normalized in SYNONYM_MAP:
            return {
                "tag_name": SYNONYM_MAP[normalized],
                "raw_value": raw,
                "localized_by": "synonym",
                "needs_review": False
            }

        # Step 3: Check Translation Cache (SQLite)
        cached_val = self.cache.get(normalized, source_lang="en", target_lang="zh", domain="tag")
        if cached_val:
            return {
                "tag_name": cached_val,
                "raw_value": raw,
                "localized_by": "cache",
                "needs_review": False
            }

        # Step 4: Invoke Translation Service (Lazy model load)
        t_service = self._get_translation_service()
        try:
            translated_text = t_service.translate_tag(normalized)
            if translated_text:
                # Step 5: Chinese Post-Processing
                processed_tag, localized_by, needs_review = self.post_process_chinese_tag(raw, translated_text)
                
                # Cache the translated result if successful
                if not needs_review and localized_by != "fallback":
                    self.cache.set(normalized, processed_tag, source_lang="en", target_lang="zh", domain="tag", model_name=getattr(t_service, "backend", "opus-mt"))
                
                return {
                    "tag_name": processed_tag,
                    "raw_value": raw,
                    "localized_by": localized_by,
                    "needs_review": needs_review
                }
        except Exception as e:
            print(f"[TagLocalizationService] Translation model invocation error: {e}")

        # Step 6: Fallback to Original English
        return {
            "tag_name": raw.title(),
            "raw_value": raw,
            "localized_by": "fallback",
            "needs_review": True
        }

    def localize_tags_batch(self, tag_names: List[str]) -> List[Dict[str, Any]]:
        """Translates and localizes a batch of English design tags in parallel."""
        if not tag_names:
            return []

        results = [None] * len(tag_names)
        to_translate_indices = []
        to_translate_texts = []

        # Step 1-3: Rapid dictionary, synonym, and cache checks
        for i, tag in enumerate(tag_names):
            if not tag or not tag.strip():
                results[i] = {
                    "tag_name": "",
                    "raw_value": "",
                    "localized_by": "fallback",
                    "needs_review": False
                }
                continue

            raw = tag.strip()
            normalized = raw.lower().replace('_', ' ').replace('-', ' ').strip()

            # Preserve brand words (e.g. SATTEA)
            if raw.isupper() and len(raw) > 1 and normalized not in DESIGN_TRANSLATION_MAP and normalized not in SYNONYM_MAP:
                results[i] = {
                    "tag_name": raw,
                    "raw_value": raw,
                    "localized_by": "dictionary",
                    "needs_review": False
                }
                continue

            # Dictionary lookup
            if normalized in DESIGN_TRANSLATION_MAP:
                results[i] = {
                    "tag_name": DESIGN_TRANSLATION_MAP[normalized],
                    "raw_value": raw,
                    "localized_by": "dictionary",
                    "needs_review": False
                }
                continue

            # Synonym lookup
            if normalized in SYNONYM_MAP:
                results[i] = {
                    "tag_name": SYNONYM_MAP[normalized],
                    "raw_value": raw,
                    "localized_by": "synonym",
                    "needs_review": False
                }
                continue

            # SQLite Cache lookup
            cached_val = self.cache.get(normalized, source_lang="en", target_lang="zh", domain="tag")
            if cached_val:
                results[i] = {
                    "tag_name": cached_val,
                    "raw_value": raw,
                    "localized_by": "cache",
                    "needs_review": False
                }
                continue

            # Queue for batch model translation
            to_translate_indices.append(i)
            to_translate_texts.append(normalized)

        # Step 4: Batch Translate using model
        if to_translate_texts:
            t_service = self._get_translation_service()
            try:
                translated_texts = t_service.translate_batch(to_translate_texts, source_lang="en", target_lang="zh")
                for text_idx, trans in enumerate(translated_texts):
                    orig_idx = to_translate_indices[text_idx]
                    orig_raw = tag_names[orig_idx]
                    orig_norm = to_translate_texts[text_idx]

                    processed_tag, localized_by, needs_review = self.post_process_chinese_tag(orig_raw, trans)
                    
                    if not needs_review and localized_by != "fallback":
                        self.cache.set(orig_norm, processed_tag, source_lang="en", target_lang="zh", domain="tag", model_name=getattr(t_service, "backend", "opus-mt"))

                    results[orig_idx] = {
                        "tag_name": processed_tag,
                        "raw_value": orig_raw,
                        "localized_by": localized_by,
                        "needs_review": needs_review
                    }
            except Exception as e:
                print(f"[TagLocalizationService] Batch model translation failure: {e}")
                # Mark remaining queued items as fallback
                for orig_idx in to_translate_indices:
                    orig_raw = tag_names[orig_idx]
                    results[orig_idx] = {
                        "tag_name": orig_raw.title(),
                        "raw_value": orig_raw,
                        "localized_by": "fallback",
                        "needs_review": True
                    }

        return results

    def post_process_chinese_tag(self, original_en: str, translated_zh: str) -> tuple:
        """
        Applies cleaning, length constraints, and quality checks on a translated Chinese tag.
        Returns: (processed_tag, localized_by, needs_review)
        """
        # 1. Clean machine translation prefixes and extra punctuation
        cleaned = translated_zh.replace("【翻译】", "").replace("【翻译 :】", "").strip()
        cleaned = re.sub(r'[.,!?;:，。！？；：、\s]', '', cleaned)

        # 2. Check length (should be 2 to 8 Chinese characters)
        chinese_char_count = len(re.findall(r'[\u4e00-\u9fff]', cleaned))
        
        # If translation contains no Chinese characters (failed translation), keep original English
        if chinese_char_count == 0:
            return (original_en.title(), "fallback", True)

        # If translation is too long (sentence-like tag > 8 Chinese characters), keep original English and mark review
        if chinese_char_count > 8:
            return (original_en.title(), "needs_review", True)

        # If it looks like a strange translation or contains invalid tokens
        if "翻译" in cleaned or "未知" in cleaned or not cleaned:
            return (original_en.title(), "needs_review", True)

        return (cleaned, "opus_mt", False)
