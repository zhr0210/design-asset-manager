from __future__ import annotations
import os
import random
from typing import List, Dict, Any, Tuple
from core.mock_policy import guard_mock_inference, MockInferenceBlockedError

class CLIPDesignClassifier:
    """
    CLIP / SigLIP zero-shot design classifier supporting ONNX, 
    transformers load strategies, and a premium robust mock fallback mechanism.
    """
    def __init__(self, model_id: str = "laion/CLIP-ViT-B-32-laion2B-s34B-b79K", local_path: str | None = None):
        self.model_id = model_id
        self.local_path = local_path
        self.is_loaded = False
        self.is_mock = False
        self.backend = "mock"
        self.model = None
        self.processor = None

    def load(self) -> None:
        """
        Attempts to load CLIP model.
        In local environment, if offline or weights missing, smoothly fallback to mock.
        """
        if self.is_loaded:
            return
            
        if self.is_mock:
            guard_mock_inference("CLIP/SigLIP", "The model was explicitly placed in mock mode before load.")
            self.backend = "mock"
            self.is_loaded = True
            return

        print(f"[CLIPDesignClassifier] Loading model '{self.model_id}'...")
        try:
            # Try importing transformers (optional dependency check)
            from transformers import CLIPProcessor, CLIPModel
            import torch
            
            device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
            print(f"[CLIPDesignClassifier] PyTorch device: {device}")
            
            # Use local_path if provided, otherwise HF repo id
            load_source = self.local_path if self.local_path else self.model_id
            if self.local_path:
                print(f"[CLIPDesignClassifier] Using local model path: {self.local_path}")
            
            self.model = CLIPModel.from_pretrained(load_source, local_files_only=bool(self.local_path))
            self.processor = CLIPProcessor.from_pretrained(load_source)
            self.model.to(device)
            
            self.backend = f"CLIP PyTorch ({device.upper()})"
            self.is_loaded = True
            print(f"[CLIPDesignClassifier] Model successfully loaded. Backend: {self.backend}")
        except Exception as e:
            if isinstance(e, MockInferenceBlockedError): raise
            print(f"[CLIPDesignClassifier] Failed loading real CLIP model: {e}. Activating mock fallback.")
            guard_mock_inference("CLIP/SigLIP", str(e))
            self.is_mock = True
            self.backend = "mock"
            self.is_loaded = True

    def classify(self, image_path: str, candidate_tags: List[str], top_n: int = 5) -> List[Tuple[str, float]]:
        """
        Computes Zero-shot Image-Text similarity for provided design tags.
        Returns a sorted list of (tag_name, similarity_score).
        """
        if not self.is_loaded:
            self.load()

        if not candidate_tags:
            return []

        # 1. Handle Mock Classifier Fallback
        if self.is_mock or not self.model or not self.processor:
            guard_mock_inference("CLIP/SigLIP", "No real CLIP/SigLIP model and processor are loaded.")
            return self._simulate_mock_classification(image_path, candidate_tags, top_n)

        # 2. Real CLIP forward pass
        try:
            from PIL import Image
            import torch
            
            image_path = os.path.expanduser(image_path)
            if not os.path.exists(image_path):
                return []
                
            image = Image.open(image_path).convert("RGB")
            
            # Map candidate tags to prompt dictionary or direct prompt representations
            # (We take the first prompt in the design dictionary for each candidate if needed, 
            # or treat candidate tags directly as prompt text)
            from utils.design_tag_dictionary import DESIGN_TAG_DICTIONARY
            
            prompt_list = []
            tag_mapping = [] # Index -> Tag Display Name
            
            for tag in candidate_tags:
                # Find matching prompts in any dictionary section
                prompts = None
                for section in DESIGN_TAG_DICTIONARY.values():
                    if tag in section:
                        prompts = section[tag]
                        break
                
                if prompts:
                    # Append all prompts mapping to the same tag to increase voting accuracy
                    for p in prompts:
                        prompt_list.append(p)
                        tag_mapping.append(tag)
                else:
                    # Fallback direct prompt
                    prompt_list.append(f"a design material of {tag.lower()}")
                    tag_mapping.append(tag)

            device = self.model.device
            inputs = self.processor(text=prompt_list, images=image, return_tensors="pt", padding=True)
            inputs = {k: v.to(device) for k, v in inputs.items()}
            
            with torch.no_grad():
                outputs = self.model(**inputs)
                
            # Logits per image is the similarity scores
            logits_per_image = outputs.logits_per_image # Shape (1, Num_Prompts)
            probs = logits_per_image.softmax(dim=-1).cpu().numpy()[0]
            
            # Aggregate probabilities if multiple prompts mapped to the same tag
            tag_probs = {}
            for prob, tag_name in zip(probs, tag_mapping):
                if tag_name not in tag_probs:
                    tag_probs[tag_name] = 0.0
                tag_probs[tag_name] = max(tag_probs[tag_name], float(prob))
                
            # Sort tag probabilities
            sorted_tags = sorted(tag_probs.items(), key=lambda x: x[1], reverse=True)
            return sorted_tags[:top_n]
            
        except Exception as e:
            if isinstance(e, MockInferenceBlockedError): raise
            print(f"[CLIPDesignClassifier] Inference error: {e}. Falling back to mock calculation.")
            guard_mock_inference("CLIP/SigLIP", str(e))
            return self._simulate_mock_classification(image_path, candidate_tags, top_n)

    def _simulate_mock_classification(self, image_path: str, candidate_tags: List[str], top_n: int) -> List[Tuple[str, float]]:
        """
        Simulate a highly relevant zero-shot similarity matching using filename semantic heuristics.
        """
        guard_mock_inference("CLIP/SigLIP", "Direct mock classification was requested.")
        filename_lower = os.path.basename(image_path).lower()
        results = []
        
        # Soft matching rules to ensure mock output is highly contextual to the actual image filename
        semantic_rules = {
            "极简": ["minimal", "clean", "simple", "极简"],
            "渐变背景": ["gradient", "渐变"],
            "科技概念": ["tech", "cyber", "internet", "科技"],
            "新中式": ["chinese", "guofeng", "国风", "中国", "古风"],
            "扁平插画": ["flat", "illustrat", "插画"],
            "3D立体": ["3d", "render", "立体"],
            "海报": ["poster", "海报"],
            "UI设计图": ["ui", "ux", "dashboard", "界面"],
            "PPT封面": ["ppt", "presentation", "slide"],
            "蓝紫渐变": ["blue", "purple", "蓝", "紫"],
            "玻璃拟态": ["glass", "玻璃"],
            "金融理财": ["finance", "bank", "stock", "金融"],
            "美妆时尚": ["beauty", "fashion", "cosmetic", "美妆", "时尚"],
            "珠宝": ["jewelry", "ring", "diamond", "珠宝", "戒指", "钻石"]
        }

        for tag in candidate_tags:
            score = 0.05 + random.random() * 0.08 # Baseline probability
            
            # Check if this tag has semantic soft-matching rules
            matched = False
            for rule_tag, keywords in semantic_rules.items():
                if rule_tag == tag or tag in rule_tag:
                    if any(kw in filename_lower for kw in keywords):
                        score = 0.78 + random.random() * 0.15 # Strong similarity match
                        matched = True
                        break
            
            # Slight boost based on character matching overlap
            if not matched:
                overlap = sum(1 for char in tag if char in filename_lower)
                if overlap > 0:
                    score += min(0.35, overlap * 0.10)
                    
            results.append((tag, min(0.99, score)))
            
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_n]
