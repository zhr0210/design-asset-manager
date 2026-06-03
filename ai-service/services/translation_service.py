import os
from typing import List, Dict, Any, Union, Optional
from core.mock_policy import guard_mock_inference
from utils.design_translation_dictionary import DESIGN_TRANSLATION_MAP

class TranslationService:
    """
    Service wrapping HuggingFace transformers Helsinki-NLP/opus-mt-en-zh
    for high-performance English-to-Chinese translation with CPU/GPU handling,
    lazy-loading, keepAlive management, and a robust mock fallback.
    """
    def __init__(self, model_id: str = "Helsinki-NLP/opus-mt-en-zh"):
        self.model_id = model_id
        self.is_loaded = False
        self.is_mock = False
        self.backend = "mock"
        self.model = None
        self.tokenizer = None

    def load(self) -> None:
        """
        Loads Helsinki-NLP/opus-mt-en-zh model. Falls back to mock on failure.
        """
        if self.is_loaded:
            return
            
        if self.is_mock:
            guard_mock_inference("OPUS-MT translation", "The model was explicitly placed in mock mode before load.")
            self.backend = "mock"
            self.is_loaded = True
            return

        print(f"[TranslationService] Loading translation model '{self.model_id}'...")
        try:
            from transformers import MarianMTModel, MarianTokenizer
            import torch
            
            device = "cuda" if torch.cuda.is_available() else "cpu"
            print(f"[TranslationService] PyTorch device: {device}")
            
            self.tokenizer = MarianTokenizer.from_pretrained(self.model_id)
            self.model = MarianMTModel.from_pretrained(self.model_id)
            self.model.to(device)
            
            self.backend = f"OPUS-MT PyTorch ({device.upper()})"
            self.is_loaded = True
            print(f"[TranslationService] Model successfully loaded. Backend: {self.backend}")
        except Exception as e:
            print(f"[TranslationService] Failed loading real OPUS-MT model: {e}. Activating mock fallback.")
            guard_mock_inference("OPUS-MT translation", str(e))
            self.is_mock = True
            self.backend = "mock"
            self.is_loaded = True

    def unload(self) -> None:
        """Evicts model from memory."""
        print("[TranslationService] Unloading translation model from memory...")
        self.model = None
        self.tokenizer = None
        self.is_loaded = False
        self.backend = "mock"

    def translate_text(self, text: str, source_lang: str = "en", target_lang: str = "zh") -> str:
        """Translates a single block of text."""
        if not text or not text.strip():
            return ""
            
        res = self.translate_batch([text], source_lang, target_lang)
        return res[0] if res else ""

    def translate_batch(self, texts: List[str], source_lang: str = "en", target_lang: str = "zh") -> List[str]:
        """Translates a batch of texts simultaneously."""
        if not texts:
            return []

        cleaned_texts = [t.strip() if t else "" for t in texts]
        if all(not t for t in cleaned_texts):
            return cleaned_texts

        if not self.is_loaded:
            self.load()

        # Handle Mock translation fallback
        if self.is_mock or not self.model or not self.tokenizer:
            guard_mock_inference("OPUS-MT translation", "No real translation model and tokenizer are loaded.")
            return self._translate_batch_mock(cleaned_texts, source_lang, target_lang)

        # Real OPUS-MT translation pass
        try:
            import torch
            device = self.model.device
            
            # Prepare inputs
            # Helsinki OPUS MT expects normal English inputs (no prefix necessary for en-zh)
            inputs = self.tokenizer(cleaned_texts, return_tensors="pt", padding=True, truncation=True)
            inputs = {k: v.to(device) for k, v in inputs.items()}
            
            with torch.no_grad():
                translated = self.model.generate(**inputs)
                
            decoded = self.tokenizer.batch_decode(translated, skip_special_tokens=True)
            return [d.strip() if d else cleaned_texts[i] for i, d in enumerate(decoded)]
        except Exception as e:
            print(f"[TranslationService] Error during batch translation: {e}. Falling back to mock.")
            guard_mock_inference("OPUS-MT translation", str(e))
            return self._translate_batch_mock(cleaned_texts, source_lang, target_lang)

    def translate_caption(self, caption: str) -> str:
        """Helper to translate a caption."""
        return self.translate_text(caption, "en", "zh")

    def translate_tag(self, tag: str) -> str:
        """Helper to translate a single tag."""
        return self.translate_text(tag, "en", "zh")

    def _translate_batch_mock(self, texts: List[str], source_lang: str, target_lang: str) -> List[str]:
        """Fallbacks to local dictionary matching or mock translation rules."""
        guard_mock_inference("OPUS-MT translation", "Direct mock translation was requested.")
        results = []
        for text in texts:
            if not text:
                results.append("")
                continue
            
            # 1. Check exact dictionary match first
            normalized = text.lower().strip()
            if normalized in DESIGN_TRANSLATION_MAP:
                results.append(DESIGN_TRANSLATION_MAP[normalized])
                continue

            # 2. Heuristic sentence translator for Mock
            # If it's a tag-like word, title-case or direct mock
            if "minimalist" in normalized:
                results.append("极简风格的画面")
            elif "milk tea" in normalized:
                results.append("奶茶饮品")
            elif "blue purple gradient" in normalized:
                results.append("蓝紫渐变背景")
            elif "skyline" in normalized:
                results.append("城市天际线")
            elif "A professional UI" in text or "ui design" in normalized:
                results.append("一款专业的UI界面设计")
            elif "A modern logo" in text:
                results.append("一个现代风格的标志")
            elif len(text.split()) <= 3:
                # Try word-by-word substitution for mock tags
                words = normalized.split()
                translated_words = []
                for w in words:
                    if w in DESIGN_TRANSLATION_MAP:
                        translated_words.append(DESIGN_TRANSLATION_MAP[w])
                    else:
                        translated_words.append(w)
                results.append(" ".join(translated_words))
            else:
                # Fallback to appending a translated tag suffix to simulate
                results.append(f"【翻译】{text}")
        return results
