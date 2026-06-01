import os
import csv
import random
import time
from typing import List, Dict, Any, Optional
import numpy as np

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
            "confidence": self.score, # Backwards compatibility
            "category": self.category,
            "type": self.category,      # Backwards compatibility
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
        max_tags: int = 30
    ):
        self.model_id = model_id
        self.backend_preference = backend
        self.device = device
        self.threshold_general = threshold_general
        self.threshold_character = threshold_character
        self.threshold_rating = threshold_rating
        self.max_tags = max_tags
        
        self.model_version = "3.0.0" if "v3" in model_id else "2.0.0"
        
        # Determine local cache directories
        safe_dir = model_id.replace("/", "_")
        self.cache_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "models_cache", "wd_tagger", safe_dir)
        )
        
        # State tracking
        self.is_loaded = False
        self.is_mock = False
        self.backend = "mock"
        self.session = None
        self.tags_map = {} # Index -> (tag_name, category)
        self.inference_time_history = []
        self.last_error = None

    def load(self) -> None:
        """
        Loads the model weights and selected tags metadata.
        Attempts CUDA GPU, falls back to CPU, timm, and finally mock mode.
        """
        if self.is_loaded:
            return
            
        if self.is_mock:
            print(f"[WDTaggerModel] Bypassing real ONNX load as is_mock=True is set.")
            self.backend = "mock"
            self._load_mock_metadata()
            self.is_loaded = True
            return
            
        print(f"[WDTaggerModel] Preparing to load model '{self.model_id}'...")
        os.makedirs(self.cache_dir, exist_ok=True)
        
        onnx_path = os.path.join(self.cache_dir, "model.onnx")
        csv_path = os.path.join(self.cache_dir, "selected_tags.csv")
        
        # 1. Hugging Face files download check (if not present locally)
        if not os.path.exists(onnx_path) or not os.path.exists(csv_path):
            print(f"[WDTaggerModel] Model files missing in cache. Attempting to download from Hugging Face hub...")
            try:
                from huggingface_hub import hf_hub_download
                
                # Fetch model.onnx
                hf_hub_download(
                    repo_id=self.model_id,
                    filename="model.onnx",
                    local_dir=self.cache_dir,
                    local_dir_use_symlinks=False
                )
                
                # Fetch selected_tags.csv
                hf_hub_download(
                    repo_id=self.model_id,
                    filename="selected_tags.csv",
                    local_dir=self.cache_dir,
                    local_dir_use_symlinks=False
                )
                print(f"[WDTaggerModel] Model weights successfully cached locally at {self.cache_dir}.")
            except Exception as e:
                print(f"[WDTaggerModel] Hugging Face download failed or offline: {e}. Activating mock fallback.")
                self.is_mock = True
                self.backend = "mock"
                self._load_mock_metadata()
                self.is_loaded = True
                return

        # 2. Parse selected_tags.csv
        try:
            self._load_tags_csv(csv_path)
        except Exception as e:
            print(f"[WDTaggerModel] Failed to parse selected_tags.csv: {e}. Activating mock fallback.")
            self.is_mock = True
            self.backend = "mock"
            self._load_mock_metadata()
            self.is_loaded = True
            return

        # 3. Initialize ONNX Inference session
        try:
            import onnxruntime as ort
            
            # Windows DLL preloading (onnxruntime-gpu safety check)
            if hasattr(ort, "preload_dlls"):
                try:
                    ort.preload_dlls()
                except Exception as dll_err:
                    print(f"[WDTaggerModel] DLL preloading warning: {dll_err}")
            
            providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
            if self.backend_preference == "cpu":
                providers = ["CPUExecutionProvider"]
                
            print(f"[WDTaggerModel] Loading ONNX Session with providers: {providers}...")
            
            # First attempt loading with primary providers list
            try:
                self.session = ort.InferenceSession(onnx_path, providers=providers)
            except Exception as gpu_err:
                if "CUDAExecutionProvider" in providers:
                    print(f"[WDTaggerModel] CUDA initialization failed: {gpu_err}. Falling back strictly to CPUExecutionProvider.")
                    self.session = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
                else:
                    raise gpu_err
            
            # Confirm loaded provider
            active_providers = self.session.get_providers()
            if "CUDAExecutionProvider" in self.session.get_provider_options():
                self.backend = "ONNX GPU"
            else:
                self.backend = "ONNX CPU"
                
            print(f"[WDTaggerModel] ONNX Session successfully started. Active Backend: {self.backend}.")
            self.is_loaded = True
            
        except Exception as e:
            print(f"[WDTaggerModel] ONNX Runtime session initialization failed: {e}.")
            # Try timm fallback or go straight to mock
            print("[WDTaggerModel] Fallback to Mock predictions activated.")
            self.is_mock = True
            self.backend = "mock"
            self.is_loaded = True

    def unload(self) -> None:
        """
        Evicts model from memory, clears ONNX Session references, and triggers garbage collection.
        """
        if not self.is_loaded:
            return
        print(f"[WDTaggerModel] Evicting session and clearing local tags maps for {self.model_id}...")
        self.session = None
        self.tags_map.clear()
        self.is_loaded = False
        print(f"[WDTaggerModel] Unloaded successfully.")

    def predict_one(self, image_path: str) -> WDTaggerResult:
        """
        Infers predictions for a single image.
        """
        results = self.predict_batch([image_path], batch_size=1)
        if not results:
            raise ValueError(f"Failed to infer tags for file: {image_path}")
        return results[0]

    def predict_batch(self, image_paths: List[str], batch_size: int = 8) -> List[WDTaggerResult]:
        """
        Processes list of image paths in batch forward passes.
        Gracefully handles corrupted image files by marking them as failed
        without aborting the remaining images in the batch.
        """
        if not self.is_loaded:
            self.load()
            
        results = []
        
        # 1. Handle Mock Fallback predictions
        if self.is_mock:
            for path in image_paths:
                results.append(self._simulate_mock_prediction(path))
            return results

        # 2. Real Model batch processing loop
        idx = 0
        while idx < len(image_paths):
            current_batch_paths = image_paths[idx : idx + batch_size]
            idx += batch_size
            
            valid_paths = []
            preprocessed_arrays = []
            
            # Open and preprocess each image in the current batch slice
            for path in current_batch_paths:
                try:
                    preprocessed_arr = prepare_image_for_wd_tagger(path)
                    preprocessed_arrays.append(preprocessed_arr)
                    valid_paths.append(path)
                except Exception as e:
                    print(f"[WDTaggerModel] Skipping corrupt/invalid image '{path}': {e}")
                    self.last_error = f"Corrupt image {os.path.basename(path)}: {e}"
                    # Return a failing blank result for this specific file path
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
                
            # Compile batch tensor
            # Stack HWC arrays -> (B, H, W, C)
            batch_np = np.stack(preprocessed_arrays, axis=0)
            
            # Check model input shape dynamically to swap dimensions to NCHW if needed
            input_spec = self.session.get_inputs()[0]
            input_shape = input_spec.shape # e.g. ['batch', 3, 448, 448] or [1, 448, 448, 3]
            
            # Determine NCHW vs NHWC based on dimensions
            is_nchw = False
            if len(input_shape) >= 4:
                # If dimension index 1 is 3, or if shape specifies NCHW format
                if input_shape[1] == 3 or str(input_shape[1]).lower() == "channels":
                    is_nchw = True
            
            if is_nchw:
                # Convert (B, H, W, C) to (B, C, H, W)
                batch_np = np.transpose(batch_np, (0, 3, 1, 2))
                
            # Perform inference
            t_start = time.time()
            try:
                input_name = input_spec.name
                output_name = self.session.get_outputs()[0].name
                
                # Execute ONNX Runtime Forward Pass
                raw_preds = self.session.run([output_name], {input_name: batch_np})[0]
                
                t_end = time.time()
                elapsed = (t_end - t_start) / len(valid_paths)
                self.inference_time_history.append(elapsed)
                if len(self.inference_time_history) > 100:
                    self.inference_time_history.pop(0)
                    
            except Exception as inf_err:
                print(f"[WDTaggerModel] ONNX inference session run failed: {inf_err}")
                self.last_error = f"Inference failed: {inf_err}"
                # Set all valid images in this failed forward pass slice as failed
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
                
            # Parse outputs for each image in current batch
            for i, path in enumerate(valid_paths):
                probs = raw_preds[i]
                
                tags = []
                rating_tags = []
                character_tags = []
                general_tags = []
                
                # Iterate over the tag probabilities mapped to selected tags
                for class_idx, prob in enumerate(probs):
                    if class_idx not in self.tags_map:
                        continue
                        
                    tag_name, category = self.tags_map[class_idx]
                    tag_lower = tag_name.lower().replace('_', ' ').strip()
                    
                    # 1. Block list for embarrassing anime words
                    block_words = [
                        "futanari", "yuri", "yaoi", "hentai", "nsfw", "naked", "breasts", 
                        "nude", "underwear", "panties", "bra", "crotch", "pubic", "pussy", 
                        "penis", "ass", "butt", "anal", "vagina", "sex", "erotic", "stimulate", 
                        "masturbation", "bondage", "sadism", "masochism", "fetish", "lewd", 
                        "loli", "shota", "waifu", "censored", "uncensored", "sexual"
                    ]
                    if any(bw in tag_lower for bw in block_words):
                        continue
                        
                    # Determine threshold dynamically
                    target_threshold = self.threshold_general
                    if category == 0: # General tags
                        if tag_lower in TRANSLATION_MAP:
                            target_threshold = 0.12 # Lower threshold for useful design tags
                        else:
                            target_threshold = 0.45 # Block raw anime clutter
                    elif category == 1: # Character tags
                        if tag_lower in TRANSLATION_MAP:
                            target_threshold = 0.12
                        else:
                            target_threshold = 0.45
                    elif category == 2: # Rating tags
                        target_threshold = self.threshold_rating
                        
                    if prob < target_threshold:
                        continue
                        
                    # Clean and categorize prediction
                    cleaned = clean_wd_tag(tag_name, category, prob, source="ai_wd_tagger")
                    pred = TagPrediction(
                        name=cleaned.display_name,
                        score=cleaned.confidence,
                        category=cleaned.tag_type,
                        source=cleaned.source,
                        model_name=self.model_id,
                        model_version=self.model_version
                    )
                    
                    # Sort predictions into lists
                    if category == 2:
                        rating_tags.append(pred)
                    elif category == 1:
                        character_tags.append(pred)
                        tags.append(pred)
                    else:
                        general_tags.append(pred)
                        tags.append(pred)

                # Sort by confidence descending
                tags.sort(key=lambda x: x.score, reverse=True)
                character_tags.sort(key=lambda x: x.score, reverse=True)
                general_tags.sort(key=lambda x: x.score, reverse=True)
                
                # Slice to max_tags configuration limit
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
        """Helper to parse CSV selected tags list."""
        self.tags_map.clear()
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            header = next(reader) # Skip header
            
            # Map index columns: [tag_id, name, category, count]
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
        """Registers a small internal tag vocabulary for simulated offline runs."""
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
        """Simulates an offline predicted tag dictionary for robust fallbacks."""
        # Detect corrupted/missing image path
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
        
        # Style tags selection
        for tag_name, conf in styles:
            if conf >= self.threshold_general:
                cleaned = clean_wd_tag(tag_name, 0, conf, source="ai_wd_tagger")
                pred = TagPrediction(cleaned.display_name, cleaned.confidence, cleaned.tag_type, "ai_wd_tagger", self.model_id, self.model_version)
                general.append(pred)
                tags.append(pred)
            
        # Subject selection
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
            
        # Color selection
        for tag_name, conf in colors:
            if conf >= self.threshold_general:
                cleaned = clean_wd_tag(tag_name, 0, conf, source="ai_wd_tagger")
                pred = TagPrediction(cleaned.display_name, cleaned.confidence, cleaned.tag_type, "ai_wd_tagger", self.model_id, self.model_version)
                general.append(pred)
                tags.append(pred)

        # Filter rating tags
        rating = []
        if 0.99 >= self.threshold_rating:
            rating.append(TagPrediction("General", 0.99, "rating", "ai_wd_tagger", self.model_id, self.model_version))
            
        # Sort all by confidence descending
        tags.sort(key=lambda x: x.score, reverse=True)
        general.sort(key=lambda x: x.score, reverse=True)
        character.sort(key=lambda x: x.score, reverse=True)
        
        # Slice by max_tags
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
