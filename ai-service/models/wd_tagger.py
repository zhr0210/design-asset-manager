from __future__ import annotations
import os
import csv
import random
import time
from typing import List, Dict, Any, Optional
import numpy as np

from core.mock_policy import guard_mock_inference, is_strict_real_ai, MockInferenceBlockedError
from utils.image_preprocess import prepare_image_for_wd_tagger
from utils.tag_cleaner import clean_wd_tag, TRANSLATION_MAP

class TagPrediction:
    """
    Standard tag prediction structure returned by WD Tagger.
    """
    def __init__(
        self,
        name: str,
        score: float,
        category: str,
        source: str = "ai_wd_tagger",
        model_name: str = "",
        model_version: str = ""
    ):
        self.name = name
        self.score = score
        self.category = category
        self.source = source
        self.model_name = model_name
        self.model_version = model_version

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "score": self.score,
            "confidence": self.score,
            "category": self.category,
            "type": self.category,
            "source": self.source,
            "model_name": self.model_name,
            "model_version": self.model_version
        }

class WDTaggerResult:
    """
    Standard output structure returned by predict methods.
    """
    def __init__(
        self,
        asset_path: str,
        tags: List[TagPrediction],
        rating_tags: List[TagPrediction],
        character_tags: List[TagPrediction],
        general_tags: List[TagPrediction],
        raw_output: Dict[str, Any]
    ):
        self.asset_path = asset_path
        self.tags = tags
        self.rating_tags = rating_tags
        self.character_tags = character_tags
        self.general_tags = general_tags
        self.raw_output = raw_output

    def to_dict(self) -> Dict[str, Any]:
        return {
            "asset_path": self.asset_path,
            "tags": [t.to_dict() for t in self.tags],
            "rating_tags": [t.to_dict() for t in self.rating_tags],
            "character_tags": [t.to_dict() for t in self.character_tags],
            "general_tags": [t.to_dict() for t in self.general_tags],
            "raw_output": self.raw_output
        }

class WDTaggerModel:
    """
    Production-grade WD Tagger Model class supporting ONNX Runtime (GPU & CPU Execution Providers),
    robust Hugging Face downloads, and seamless local mock fallback mechanisms.
    """
    def __init__(
        self,
        model_id: str = "SmilingWolf/wd-vit-tagger-v3",
        backend: str = "auto",
        device: str = "auto",
        threshold_general: float = 0.35,
        threshold_character: float = 0.35,
        threshold_rating: float = 0.5,
        max_tags: int = 30,
        local_path: str | None = None
    ):
        self.model_id = model_id
        self.backend_preference = backend
        self.device = device
        self.threshold_general = threshold_general
        self.threshold_character = threshold_character
        self.threshold_rating = threshold_rating
        self.max_tags = max_tags
        
        self.model_version = "3.0.0" if "v3" in model_id else "2.0.0"
        self.local_path = local_path
        self.family_name = "wd_tagger"
        self.required_packages = ["onnxruntime", "numpy", "PIL"]
        
        safe_dir = model_id.replace("/", "_")
        self.cache_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "models_cache", "wd_tagger", safe_dir)
        )
        
        self.is_loaded = False
        self.is_mock = False
        self.backend = "mock"
        self.session = None
        self.tags_map = {}
        self.inference_time_history = []
        self.last_error = None
        self.state = "not_downloaded"
        self.update_state()

    def update_state(self) -> str:
        from core.cooperative_model_registry import find_downloaded_model
        local_path = self.local_path or find_downloaded_model(self.family_name)
        if not local_path:
            self.state = "not_downloaded"
            return self.state
            
        from importlib.util import find_spec
        missing_dep = False
        for pkg in self.required_packages:
            if find_spec(pkg) is None:
                missing_dep = True
                break
        if missing_dep:
            self.state = "dependency_missing"
            return self.state
            
        if not self.is_loaded:
            self.state = "downloaded"
        return self.state

    def load(self) -> None:
        """
        Loads the model weights and selected tags metadata.
        """
        if self.is_loaded:
            return
            
        self.update_state()
            
        if self.is_mock:
            if is_strict_real_ai():
                raise MockInferenceBlockedError("Mock WD Tagger inference is blocked in strict mode.")
            print(f"[WDTaggerModel] Bypassing real ONNX load as is_mock=True is set.")
            guard_mock_inference("WD Tagger", "The model was explicitly placed in mock mode before load.")
            self.backend = "mock"
            self._load_mock_metadata()
            self.is_loaded = True
            return
            
        print(f"[WDTaggerModel] Preparing to load model '{self.model_id}'...")
        
        if self.local_path and os.path.isdir(self.local_path):
            self.cache_dir = self.local_path
            print(f"[WDTaggerModel] Using local model path: {self.local_path}")
        
        os.makedirs(self.cache_dir, exist_ok=True)
        
        onnx_path = os.path.join(self.cache_dir, "model.onnx")
        csv_path = os.path.join(self.cache_dir, "selected_tags.csv")
        
        if not os.path.exists(onnx_path) or not os.path.exists(csv_path):
            print(f"[WDTaggerModel] Model files missing in cache. Attempting to download from Hugging Face hub...")
            try:
                if self.state == "not_downloaded":
                    raise FileNotFoundError("Missing weights for WD Tagger")
                from huggingface_hub import hf_hub_download
                
                hf_hub_download(
                    repo_id=self.model_id,
                    filename="model.onnx",
                    local_dir=self.cache_dir,
                    local_dir_use_symlinks=False
                )
                
                hf_hub_download(
                    repo_id=self.model_id,
                    filename="selected_tags.csv",
                    local_dir=self.cache_dir,
                    local_dir_use_symlinks=False
                )
                print(f"[WDTaggerModel] Model weights successfully cached locally at {self.cache_dir}.")
            except Exception as e:
                self.state = "load_failed"
                if is_strict_real_ai():
                    raise MockInferenceBlockedError(f"Failed to download/load real WD Tagger model: {e}")
                print(f"[WDTaggerModel] Hugging Face download failed or offline: {e}. Activating mock fallback.")
                guard_mock_inference("WD Tagger", str(e))
                self.is_mock = True
                self.backend = "mock"
                self._load_mock_metadata()
                self.is_loaded = True
                return

        try:
            self._load_tags_csv(csv_path)
        except Exception as e:
            self.state = "load_failed"
            if is_strict_real_ai():
                raise MockInferenceBlockedError(f"Failed to parse selected_tags.csv: {e}")
            print(f"[WDTaggerModel] Failed to parse selected_tags.csv: {e}. Activating mock fallback.")
            guard_mock_inference("WD Tagger", str(e))
            self.is_mock = True
            self.backend = "mock"
            self._load_mock_metadata()
            self.is_loaded = True
            return

        try:
            if self.state == "dependency_missing":
                raise ImportError("Missing required packages for WD Tagger")

            import onnxruntime as ort
            
            if hasattr(ort, "preload_dlls"):
                try:
                    ort.preload_dlls()
                except Exception as dll_err:
                    print(f"[WDTaggerModel] DLL preloading warning: {dll_err}")
            
            available = ort.get_available_providers()
            if self.backend_preference == "cpu":
                providers = ["CPUExecutionProvider"]
            elif "CoreMLExecutionProvider" in available:
                providers = ["CoreMLExecutionProvider", "CPUExecutionProvider"]
            elif "CUDAExecutionProvider" in available:
                providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
            else:
                providers = ["CPUExecutionProvider"]

            print(f"[WDTaggerModel] Loading ONNX Session with providers: {providers}...")
            self.session = ort.InferenceSession(onnx_path, providers=providers)

            active_providers = self.session.get_providers()
            provider_opts = self.session.get_provider_options()
            if "CUDAExecutionProvider" in provider_opts:
                self.backend = "ONNX GPU"
            elif "CoreMLExecutionProvider" in provider_opts:
                self.backend = "ONNX CoreML"
            else:
                self.backend = "ONNX CPU"
                
            print(f"[WDTaggerModel] ONNX Session successfully started. Active Backend: {self.backend}.")
            self.is_loaded = True
            self.state = "loaded_real"
            
        except Exception as e:
            self.state = "load_failed"
            if is_strict_real_ai():
                raise MockInferenceBlockedError(f"Failed starting ONNX session for WD Tagger, and mock is blocked: {e}")
            print(f"[WDTaggerModel] ONNX Runtime session initialization failed: {e}.")
            print("[WDTaggerModel] Fallback to Mock predictions activated.")
            guard_mock_inference("WD Tagger", str(e))
            self.is_mock = True
            self.backend = "mock"
            self.is_loaded = True

    def unload(self) -> None:
        if not self.is_loaded:
            return
        print(f"[WDTaggerModel] Evicting session and clearing local tags maps for {self.model_id}...")
        self.session = None
        self.tags_map.clear()
        self.is_loaded = False
        print(f"[WDTaggerModel] Unloaded successfully.")

    def predict_one(self, image_path: str) -> WDTaggerResult:
        results = self.predict_batch([image_path], batch_size=1)
        if not results:
            raise ValueError(f"Failed to infer tags for file: {image_path}")
        return results[0]

    def predict_batch(self, image_paths: List[str], batch_size: int = 8) -> List[WDTaggerResult]:
        if not self.is_loaded:
            self.load()
            
        results = []
        
        if self.is_mock or self.state != "loaded_real":
            if is_strict_real_ai():
                raise MockInferenceBlockedError("Mock WD Tagger inference is blocked in strict mode.")
            guard_mock_inference("WD Tagger", "No real ONNX session is loaded.")
            for path in image_paths:
                results.append(self._simulate_mock_prediction(path))
            return results

        idx = 0
        while idx < len(image_paths):
            current_batch_paths = image_paths[idx : idx + batch_size]
            idx += batch_size
            
            valid_paths = []
            preprocessed_arrays = []
            
            for path in current_batch_paths:
                try:
                    preprocessed_arr = prepare_image_for_wd_tagger(path)
                    preprocessed_arrays.append(preprocessed_arr)
                    valid_paths.append(path)
                except Exception as e:
                    print(f"[WDTaggerModel] Skipping corrupt/invalid image '{path}': {e}")
                    self.last_error = f"Corrupt image {os.path.basename(path)}: {e}"
                    results.append(
                        WDTaggerResult(
                            asset_path=path,
                            tags=[],
                            rating_tags=[],
                            character_tags=[],
                            general_tags=[],
                            raw_output={"error": str(e), "failed": True}
                        )
                    )
            
            if not preprocessed_arrays:
                continue
                
            batch_np = np.stack(preprocessed_arrays, axis=0)
            
            input_spec = self.session.get_inputs()[0]
            input_shape = input_spec.shape
            
            is_nchw = False
            if len(input_shape) >= 4:
                if input_shape[1] == 3 or str(input_shape[1]).lower() == "channels":
                    is_nchw = True
            
            if is_nchw:
                batch_np = np.transpose(batch_np, (0, 3, 1, 2))
                
            t_start = time.time()
            try:
                input_name = input_spec.name
                output_name = self.session.get_outputs()[0].name
                
                raw_preds = self.session.run([output_name], {input_name: batch_np})[0]
                
                t_end = time.time()
                elapsed = (t_end - t_start) / len(valid_paths)
                self.inference_time_history.append(elapsed)
                if len(self.inference_time_history) > 100:
                    self.inference_time_history.pop(0)
                    
            except Exception as inf_err:
                print(f"[WDTaggerModel] ONNX inference session run failed: {inf_err}")
                self.last_error = f"Inference failed: {inf_err}"
                for path in valid_paths:
                    results.append(
                        WDTaggerResult(
                            asset_path=path,
                            tags=[],
                            rating_tags=[],
                            character_tags=[],
                            general_tags=[],
                            raw_output={"error": str(inf_err), "failed": True}
                        )
                    )
                continue
                
            for i, path in enumerate(valid_paths):
                probs = raw_preds[i]
                
                tags = []
                rating_tags = []
                character_tags = []
                general_tags = []
                
                for class_idx, prob in enumerate(probs):
                    if class_idx not in self.tags_map:
                        continue
                        
                    tag_name, category = self.tags_map[class_idx]
                    tag_lower = tag_name.lower().replace('_', ' ').strip()
                    
                    block_words = [
                        "futanari", "yuri", "yaoi", "hentai", "nsfw", "naked", "breasts", 
                        "nude", "underwear", "panties", "bra", "crotch", "pubic", "pussy", 
                        "penis", "ass", "butt", "anal", "vagina", "sex", "erotic", "stimulate", 
                        "masturbation", "bondage", "sadism", "masochism", "fetish", "lewd", 
                        "loli", "shota", "waifu", "censored", "uncensored", "sexual"
                    ]
                    if any(bw in tag_lower for bw in block_words):
                        continue
                        
                    target_threshold = self.threshold_general
                    if category == 0:
                        if tag_lower in TRANSLATION_MAP:
                            target_threshold = 0.12
                        else:
                            target_threshold = 0.45
                    elif category == 1:
                        if tag_lower in TRANSLATION_MAP:
                            target_threshold = 0.12
                        else:
                            target_threshold = 0.45
                    elif category == 2:
                        target_threshold = self.threshold_rating
                        
                    if prob < target_threshold:
                        continue
                        
                    cleaned = clean_wd_tag(tag_name, category, prob, source="ai_wd_tagger")
                    pred = TagPrediction(
                        name=cleaned.display_name,
                        score=cleaned.confidence,
                        category=cleaned.tag_type,
                        source=cleaned.source,
                        model_name=self.model_id,
                        model_version=self.model_version
                    )
                    
                    if category == 2:
                        rating_tags.append(pred)
                    elif category == 1:
                        character_tags.append(pred)
                        tags.append(pred)
                    else:
                        general_tags.append(pred)
                        tags.append(pred)

                tags.sort(key=lambda x: x.score, reverse=True)
                character_tags.sort(key=lambda x: x.score, reverse=True)
                general_tags.sort(key=lambda x: x.score, reverse=True)
                
                sliced_tags = tags[:self.max_tags]
                sliced_general = general_tags[:self.max_tags]
                
                results.append(
                    WDTaggerResult(
                        asset_path=path,
                        tags=sliced_tags,
                        rating_tags=rating_tags,
                        character_tags=character_tags,
                        general_tags=sliced_general,
                        raw_output={
                            "model_id": self.model_id,
                            "general_count": len(general_tags),
                            "character_count": len(character_tags),
                            "rating_count": len(rating_tags)
                        }
                    )
                )

        return results

    def _load_tags_csv(self, csv_path: str) -> None:
        self.tags_map.clear()
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            header = next(reader)
            
            for row in reader:
                if len(row) >= 3:
                    try:
                        tag_id = int(row[0])
                        tag_name = row[1]
                        category = int(row[2])
                        self.tags_map[tag_id] = (tag_name, category)
                    except ValueError:
                        continue

    def _load_mock_metadata(self) -> None:
        self.tags_map = {
            100: ("minimalist_design", 0),
            101: ("gradient_background", 0),
            102: ("tech_concept", 0),
            103: ("flat_illustration", 0),
            104: ("blue_color_scheme", 0),
            105: ("vector_graphic", 0),
            106: ("clean_layout", 0),
            107: ("ui_card", 0),
            108: ("cyberpunk_style", 0),
            200: ("character_mascot", 1),
            300: ("general", 2)
        }

    def _simulate_mock_prediction(self, path: str) -> WDTaggerResult:
        if is_strict_real_ai():
            raise MockInferenceBlockedError("Mock WD Tagger inference is blocked in strict mode.")
        guard_mock_inference("WD Tagger", "Direct mock prediction was requested.")
        if "corrupt" in path or not os.path.exists(path):
            return WDTaggerResult(
                asset_path=path,
                tags=[],
                rating_tags=[],
                character_tags=[],
                general_tags=[],
                raw_output={"error": "Corrupt mock image", "failed": True}
            )

        styles = [
            ("minimalist_design", 0.91),
            ("gradient_background", 0.85),
            ("tech_concept", 0.78),
            ("flat_illustration", 0.73),
            ("cyberpunk_style", 0.68)
        ]
        subjects = [
            ("character_mascot", 0.89),
            ("drone_item", 0.76),
            ("vector_graphic", 0.82)
        ]
        colors = [
            ("blue_color_scheme", 0.84),
            ("monochrome_palette", 0.77)
        ]
        
        tags = []
        general = []
        character = []
        
        for tag_name, conf in styles:
            if conf >= self.threshold_general:
                cleaned = clean_wd_tag(tag_name, 0, conf, source="ai_wd_tagger")
                pred = TagPrediction(cleaned.display_name, cleaned.confidence, cleaned.tag_type, "ai_wd_tagger", self.model_id, self.model_version)
                general.append(pred)
                tags.append(pred)
            
        for tag_name, conf in subjects:
            is_char = tag_name == "character_mascot"
            thresh = self.threshold_character if is_char else self.threshold_general
            if conf >= thresh:
                cleaned = clean_wd_tag(tag_name, 1 if is_char else 0, conf, source="ai_wd_tagger")
                pred = TagPrediction(cleaned.display_name, cleaned.confidence, cleaned.tag_type, "ai_wd_tagger", self.model_id, self.model_version)
                if is_char:
                    character.append(pred)
                else:
                    general.append(pred)
                tags.append(pred)
            
        for tag_name, conf in colors:
            if conf >= self.threshold_general:
                cleaned = clean_wd_tag(tag_name, 0, conf, source="ai_wd_tagger")
                pred = TagPrediction(cleaned.display_name, cleaned.confidence, cleaned.tag_type, "ai_wd_tagger", self.model_id, self.model_version)
                general.append(pred)
                tags.append(pred)

        rating = []
        if 0.99 >= self.threshold_rating:
            rating.append(TagPrediction("General", 0.99, "rating", "ai_wd_tagger", self.model_id, self.model_version))
            
        tags.sort(key=lambda x: x.score, reverse=True)
        general.sort(key=lambda x: x.score, reverse=True)
        character.sort(key=lambda x: x.score, reverse=True)
        
        sliced_tags = tags[:self.max_tags]
        sliced_general = general[:self.max_tags]
        
        return WDTaggerResult(
            asset_path=path,
            tags=sliced_tags,
            rating_tags=rating,
            character_tags=character,
            general_tags=sliced_general,
            raw_output={"mock_fallback": True}
        )
