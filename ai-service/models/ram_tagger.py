from __future__ import annotations
import os
import random
from pathlib import Path
from typing import List, Dict, Any
from core.mock_policy import guard_mock_inference, is_strict_real_ai, MockInferenceBlockedError

class RAMTaggerModel:
    """
    RAM / RAM++ (Recognize Anything Model) wrapper class
    supporting robust model weights loading and premium mock fallbacks.
    """
    def __init__(self, model_id: str = "xinyu1205/recognize-anything-plus-model", local_path: str | None = None):
        self.model_id = model_id
        self.local_path = local_path
        self.family_name = "ram"
        self.required_packages = ["torch", "torchvision", "PIL", "ram"]
        self.is_loaded = False
        self.is_mock = False
        self.backend = "mock"
        self.model = None
        self.transform = None
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
        Loads the RAM++ weights. Falls back to mock if offline or dependencies missing.
        """
        if self.is_loaded:
            return
            
        self.update_state()
            
        if self.is_mock:
            if is_strict_real_ai():
                raise MockInferenceBlockedError("Mock RAM++ inference is blocked in strict mode.")
            guard_mock_inference("RAM++", "The model was explicitly placed in mock mode before load.")
            self.backend = "mock"
            self.is_loaded = True
            return

        print(f"[RAMTaggerModel] Loading recognize-anything model '{self.model_id}'...")
        try:
            if self.state == "dependency_missing":
                raise ImportError("Missing required packages for RAM++")
            elif self.state == "not_downloaded":
                raise FileNotFoundError("Missing weights for RAM++")

            # Check for PIL, Torch and torchvision (essential dependencies)
            import torch
            from torchvision import transforms
            from ram.models import ram_plus
            from ram import inference_ram as inference
            
            device = torch.device('mps' if torch.backends.mps.is_available() else ('cuda' if torch.cuda.is_available() else 'cpu'))
            
            # Resolve model path
            from core.cooperative_model_registry import find_downloaded_model
            local_dir = self.local_path or find_downloaded_model("ram")
            if local_dir and os.path.isdir(local_dir):
                pth_files = list(Path(local_dir).glob("*.pth"))
                if pth_files:
                    model_path = str(pth_files[0])
                else:
                    model_path = str(local_dir)
            else:
                model_path = os.path.expanduser("~/DesignAssetManager/models/ram_plus_swin_large_14m.pth")
            
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"RAM weights not found at: {model_path}")
                
            self.model = ram_plus(pretrained=model_path, image_size=384, vit='swin_l')
            self.model.eval()
            self.model.to(device)
            
            self.transform = transforms.Compose([
                transforms.Resize((384, 384)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])
            
            self.backend = f"RAM++ PyTorch ({str(device).upper()})"
            self.is_loaded = True
            self.state = "loaded_real"
            print(f"[RAMTaggerModel] RAM++ loaded successfully! Backend: {self.backend}")
        except Exception as e:
            self.state = "load_failed"
            if is_strict_real_ai():
                raise MockInferenceBlockedError(f"Failed loading real RAM++ model, and mock is blocked: {e}")
            print(f"[RAMTaggerModel] RAM loading failed: {e}. Fallback to mock active.")
            guard_mock_inference("RAM++", str(e))
            self.is_mock = True
            self.backend = "mock"
            self.is_loaded = True

    def predict_batch(self, image_paths: List[str]) -> List[List[Dict[str, Any]]]:
        """
        Runs batch prediction on a list of image paths.
        Returns a list of tags for each image: [ [ {"name": "tag", "confidence": 0.85}, ... ], ... ]
        """
        if not self.is_loaded:
            self.load()

        results = []
        
        # 1. Handle Mock Prediction Fallback
        if self.is_mock or not self.model or self.state != "loaded_real":
            if is_strict_real_ai():
                raise MockInferenceBlockedError("Mock RAM++ inference is blocked in strict mode.")
            guard_mock_inference("RAM++", "No real RAM++ model instance is loaded.")
            for path in image_paths:
                results.append(self._simulate_mock_prediction(path))
            return results

        # 2. Real RAM++ batch execution
        try:
            from PIL import Image
            import torch
            from ram import inference_ram as inference
            
            device = next(self.model.parameters()).device
            
            for path in image_paths:
                expanded = os.path.expanduser(path)
                if not os.path.exists(expanded):
                    results.append([])
                    continue
                    
                try:
                    image = Image.open(expanded).convert("RGB")
                    input_tensor = self.transform(image).unsqueeze(0).to(device)
                    
                    with torch.no_grad():
                        res_tags = inference(input_tensor, self.model)
                        predicted_str = res_tags[0] if isinstance(res_tags, tuple) else res_tags
                        
                    raw_list = [t.strip() for t in predicted_str.split("|") if t.strip()]
                    formatted = []
                    for t in raw_list:
                        formatted.append({
                            "name": t.lower(),
                            "confidence": 0.88,
                            "category": "subject",
                            "source": "ai_ram"
                        })
                    results.append(formatted)
                except Exception as img_err:
                    print(f"[RAMTaggerModel] Error processing image '{path}': {img_err}")
                    results.append([])
                    
            return results
        except Exception as e:
            if is_strict_real_ai():
                raise MockInferenceBlockedError(f"RAM++ inference failed, and mock is blocked: {e}")
            print(f"[RAMTaggerModel] Batch inference error: {e}. Falling back to mock predictions.")
            guard_mock_inference("RAM++", str(e))
            return [self._simulate_mock_prediction(path) for path in image_paths]

    def _simulate_mock_prediction(self, path: str) -> List[Dict[str, Any]]:
        """
        Contextual mock tagger simulating RAM++ general image tag prediction.
        """
        if is_strict_real_ai():
            raise MockInferenceBlockedError("Mock RAM++ inference is blocked in strict mode.")
        guard_mock_inference("RAM++", "Direct mock prediction was requested.")
        filename_lower = os.path.basename(path).lower()
        
        scenarios = {
            "nature": (["nature", "mountain", "sky", "cloud", "tree", "plant", "landscape"], ["sky", "tree", "plant", "nature"]),
            "indoor": (["indoor", "room", "furniture", "chair", "table", "office", "desk"], ["indoor", "office", "table"]),
            "city": (["city", "street", "building", "architecture", "urban", "road"], ["building", "architecture", "urban"]),
            "portrait": (["person", "people", "man", "woman", "girl", "boy", "face", "hair"], ["person", "people", "face"]),
            "animal": (["animal", "dog", "cat", "bird", "pet"], ["animal", "pet"])
        }
        
        chosen_tags = ["photo", "outdoors"]
        confidence_base = 0.88
        
        matched = False
        for scen, (keywords, tags) in scenarios.items():
            if any(kw in filename_lower for kw in keywords):
                chosen_tags.extend(tags)
                matched = True
                break
                
        if not matched:
            chosen_tags.extend(["scenery", "scenic", "lighting"])
            
        random_pool = ["color", "shadow", "view", "object", "item"]
        chosen_tags.extend(random.sample(random_pool, random.randint(1, 2)))
        
        chosen_tags = list(set(chosen_tags))
        
        formatted = []
        for t in chosen_tags:
            formatted.append({
                "name": t.lower(),
                "confidence": round(confidence_base - random.random() * 0.15, 3),
                "category": "subject",
                "source": "ai_ram"
            })
        return formatted
