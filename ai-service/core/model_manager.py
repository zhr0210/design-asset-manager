import asyncio
import time
import gc
from typing import Dict, Any, Optional

# Estimated actual GPU VRAM weights of loaded models (in MB)
MODEL_VRAM_OCCUPANCY = {
    "ram": 3584,        # 3.5 GB
    "florence2": 3072,   # 3.0 GB
    "clip": 1228,        # 1.2 GB
    "wd_tagger": 819,    # 0.8 GB
    "joycaption": 6656,  # 6.5 GB
    "qwen_vl": 7680,     # 7.5 GB
    "translation": 1024, # 1.0 GB
}

class ModelManager:
    _instance: Optional['ModelManager'] = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(ModelManager, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    def __init__(self):
        # Prevent re-initialization
        if hasattr(self, '_initialized'):
            return
        self._initialized = True
        
        # Dict mapping model name -> { "loaded_at": float, "keep_alive": int, "timer": Task }
        self.loaded_models: Dict[str, Dict[str, Any]] = {}
        
        # Lock to ensure JoyCaption and Qwen2.5-VL never load/infer concurrently
        self.manual_model_lock = asyncio.Lock()

    def get_loaded_models(self) -> Dict[str, Any]:
        """Returns loaded models name list with uptime metadata."""
        status = {}
        now = time.time()
        for name, info in self.loaded_models.items():
            uptime = int(now - info["loaded_at"])
            remaining = int(info["keep_alive"] - uptime)
            
            # Fetch VRAM weight
            instance = info.get("instance")
            is_mock = getattr(instance, "is_mock", True) if instance else True
            vram_occupancy = 0 if is_mock else MODEL_VRAM_OCCUPANCY.get(name, 0)
            
            status[name] = {
                "status": "loaded",
                "uptime_seconds": uptime,
                "keep_alive_remaining_seconds": max(0, remaining),
                "vram_occupancy_mb": vram_occupancy
            }
        return status

    async def load_model(self, name: str) -> bool:
        """
        Loads model into memory.
        Manages concurrency lock and keep-alive timers.
        """
        name = name.lower().strip()
        
        # Batch taggers keepAlive 60s; JoyCaption / Qwen VL keepAlive 90s; Florence-2, RAM & Translation keepAlive 300s (5 minutes)
        if name in ["florence2", "ram", "translation"]:
            keep_alive = 300
        else:
            keep_alive = 60 if name in ["wd_tagger", "clip"] else 90

        # Avoid manual models memory clash (unload competitor)
        if name in ["joycaption", "qwen_vl"]:
            competitor = "qwen_vl" if name == "joycaption" else "joycaption"
            if competitor in self.loaded_models:
                print(f"[ModelManager] Heavy model '{name}' requested while '{competitor}' is loaded. Evicting '{competitor}' from VRAM...")
                await self.unload_model(competitor)
            
            # Also evict lighter taggers to maximize VRAM for heavy model!
            for tagger in ["wd_tagger", "florence2"]:
                if tagger in self.loaded_models:
                    print(f"[ModelManager] Heavy model '{name}' requested. Evicting light tagger '{tagger}' to free VRAM...")
                    await self.unload_model(tagger)
        
        elif name in ["wd_tagger", "florence2", "ram", "clip"]:
            # Lighter taggers cannot run alongside heavy models
            for heavy in ["joycaption", "qwen_vl"]:
                if heavy in self.loaded_models:
                    print(f"[ModelManager] Tagger '{name}' requested. Evicting heavy model '{heavy}' to free VRAM...")
                    await self.unload_model(heavy)

        if name in self.loaded_models:
            # Refresh KeepAlive timer
            self.touch_model(name)
            return True

        print(f"[ModelManager] Loading model '{name}' into memory (KeepAlive: {keep_alive}s)...")
        
        # Instantiate and load the real model based on name
        instance = None
        if name == "wd_tagger":
            try:
                from models.wd_tagger import WDTaggerModel
                instance = WDTaggerModel()
                instance.load()
            except Exception as e:
                print(f"[ModelManager] Failed loading real WDTaggerModel: {e}. Falling back to mock session.")
                from models.wd_tagger import WDTaggerModel
                instance = WDTaggerModel()
                instance.is_mock = True
                instance.load()
        elif name == "ram":
            try:
                from models.ram_tagger import RAMTaggerModel
                instance = RAMTaggerModel()
                instance.load()
            except Exception as e:
                print(f"[ModelManager] Failed loading real RAMTaggerModel: {e}. Falling back to mock session.")
                from models.ram_tagger import RAMTaggerModel
                instance = RAMTaggerModel()
                instance.is_mock = True
                instance.load()
        elif name == "florence2":
            try:
                from models.florence2_tagger import Florence2TaggerModel
                instance = Florence2TaggerModel()
                instance.load()
            except Exception as e:
                print(f"[ModelManager] Failed loading real Florence2TaggerModel: {e}. Falling back to mock session.")
                from models.florence2_tagger import Florence2TaggerModel
                instance = Florence2TaggerModel()
                instance.is_mock = True
                instance.load()
        elif name == "clip":
            try:
                from models.clip_design_classifier import CLIPDesignClassifier
                instance = CLIPDesignClassifier()
                instance.load()
            except Exception as e:
                print(f"[ModelManager] Failed loading real CLIPDesignClassifier: {e}. Falling back to mock session.")
                from models.clip_design_classifier import CLIPDesignClassifier
                instance = CLIPDesignClassifier()
                instance.is_mock = True
                instance.load()
        elif name == "translation":
            try:
                from services.translation_service import TranslationService
                instance = TranslationService()
                instance.load()
            except Exception as e:
                print(f"[ModelManager] Failed loading real TranslationService: {e}. Falling back to mock session.")
                from services.translation_service import TranslationService
                instance = TranslationService()
                instance.is_mock = True
                instance.load()
        elif name == "qwen_vl":
            try:
                from models.qwen_vl_fallback_analyzer import QwenVLFallbackAnalyzer
                instance = QwenVLFallbackAnalyzer()
                instance.load()
            except Exception as e:
                print(f"[ModelManager] Failed loading real QwenVLFallbackAnalyzer: {e}. Falling back to mock session.")
                from models.qwen_vl_fallback_analyzer import QwenVLFallbackAnalyzer
                instance = QwenVLFallbackAnalyzer()
                instance.is_mock = True
                instance.load()
        else:
            # Simulate mock loading latency for others
            await asyncio.sleep(0.5)

        # Register loaded model
        self.loaded_models[name] = {
            "loaded_at": time.time(),
            "keep_alive": keep_alive,
            "timer": None,
            "instance": instance
        }

        # Start KeepAlive timeout timer task
        self.loaded_models[name]["timer"] = asyncio.create_task(self._eviction_timer(name, keep_alive))
        
        return True

    async def unload_model(self, name: str) -> bool:
        """Evicts model from memory and releases GPU/CPU resource caches, unless tasks are running."""
        name = name.lower().strip()
        if name not in self.loaded_models:
            return False

        # Short model name to task model name mapping
        def map_short_to_task_model(short_name: str) -> list:
            mapping = {
                "joycaption": ["joycaption", "joycaption-v2"],
                "qwen_vl": ["qwen_vl", "qwen2.5-vl", "qwen2.5-vl-7b"],
                "wd_tagger": ["wd_tagger", "wd-tagger-v3"],
                "florence2": ["florence2", "florence-2-large"]
            }
            return mapping.get(short_name.lower().strip(), [short_name.lower().strip()])

        # Check if there are active running tasks
        from core.task_queue import TaskQueue
        queue = TaskQueue()
        with queue.lock:
            running_tasks = [
                t for t in queue.tasks.values()
                if t["status"] == "running" and any(m in t["model_name"].lower() for m in map_short_to_task_model(name))
            ]

        if running_tasks:
            print(f"[ModelManager] Model '{name}' has active running tasks in TaskQueue. Aborting unload to prevent interruption.")
            return False

        print(f"[ModelManager] Evicting model '{name}' from GPU memory...")
        
        # Cancel active KeepAlive task
        info = self.loaded_models[name]
        if info["timer"]:
            info["timer"].cancel()

        # Call instance unload if exists to release session and clear maps
        instance = info.get("instance")
        if instance and hasattr(instance, "unload"):
            try:
                instance.unload()
            except Exception as e:
                print(f"[ModelManager] Instance unload error on '{name}': {e}")

        # Delete model reference
        del self.loaded_models[name]

        # Explicitly break local references to allow immediate garbage collection
        if instance:
            if hasattr(instance, "model"):
                instance.model = None
            if hasattr(instance, "processor"):
                instance.processor = None
            if hasattr(instance, "transform"):
                instance.transform = None
        instance = None
        info = None

        # Trigger garbage collection
        gc.collect()
        try:
            import torch
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                print("[ModelManager] PyTorch CUDA cache successfully cleared.")
        except ImportError:
            pass

        return True

    def touch_model(self, name: str) -> None:
        """Resets the eviction KeepAlive timer for a loaded model."""
        name = name.lower().strip()
        if name not in self.loaded_models:
            return

        info = self.loaded_models[name]
        info["loaded_at"] = time.time()
        
        # Restart eviction timer task
        if info["timer"]:
            info["timer"].cancel()
        
        info["timer"] = asyncio.create_task(self._eviction_timer(name, info["keep_alive"]))
        print(f"[ModelManager] KeepAlive timer for '{name}' refreshed.")

    async def _eviction_timer(self, name: str, timeout: int):
        """Asynchronous task running in background to unload model upon idle timeout."""
        try:
            await asyncio.sleep(timeout)
            print(f"[ModelManager] Model '{name}' has been idle for {timeout}s. Evicting automatically...")
            await self.unload_model(name)
        except asyncio.CancelledError:
            # Timer was refreshed or manual unload triggered
            pass
        except Exception as e:
            print(f"[ModelManager] Eviction timer error on '{name}': {e}")

    def get_cooperative_status(self) -> dict:
        """Returns comprehensive status for all cooperative models (RAM, Florence-2, CLIP, WD Tagger)."""
        status = {}
        cooperative_models = {
            "ram": {
                "model_id": "xinyu1205/recognize-anything-plus-model",
                "role": "通用图片打标主力 (General Image Tagger)"
            },
            "florence2": {
                "model_id": "microsoft/Florence-2-large",
                "role": "设计图/海报/OCR (Design/Poster/OCR)"
            },
            "clip": {
                "model_id": "laion/CLIP-ViT-B-32-laion2B-s34B-b79K",
                "role": "设计标签词表分类 (Design Tag Classification)"
            },
            "wd_tagger": {
                "model_id": "SmilingWolf/wd-vit-tagger-v3",
                "role": "动漫/插画/角色 (Anime/Illustration Only)"
            }
        }
        for name, meta in cooperative_models.items():
            info = self.loaded_models.get(name)
            is_loaded = info is not None
            backend = "not loaded"
            is_mock = getattr(info.get("instance"), "is_mock", True) if info else None
            
            vram_occupancy = 0
            if is_loaded and not is_mock:
                vram_occupancy = MODEL_VRAM_OCCUPANCY.get(name, 0)
                
            if is_loaded and info.get("instance"):
                backend = getattr(info["instance"], "backend", "unknown")
            elif is_loaded:
                backend = "mock"
            status[name] = {
                "model_id": meta["model_id"],
                "role": meta["role"],
                "loaded": is_loaded,
                "backend": backend,
                "is_mock": is_mock,
                "vram_occupancy_mb": vram_occupancy
            }
        return status
