from __future__ import annotations
import os
import json
import base64
import urllib.request
import urllib.error
from typing import Dict, Any
from core.mock_policy import is_strict_real_ai, MockInferenceBlockedError

def get_openai_backend() -> dict:
    base_url = "http://127.0.0.1:8080/v1"
    api_key = "local"
    model = "local-model"
    enabled = False
    
    try:
        path = os.path.expanduser('~/DesignAssetManager/settings.json')
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                settings = json.load(f)
            pr_settings = settings.get("promptReverseSettings", {})
            backend_id = pr_settings.get("selectedExternalBackendId", "llama-local-openai")
            
            backends = settings.get("aiBackends", [])
            selected_backend = None
            for b in backends:
                if b.get("id") == backend_id:
                    selected_backend = b
                    break
            if not selected_backend and backends:
                selected_backend = backends[0]
                
            if selected_backend:
                base_url = selected_backend.get("baseUrl", base_url)
                api_key = selected_backend.get("apiKey", api_key)
                model = selected_backend.get("defaultModel", model)
                enabled = selected_backend.get("enabled", False)
    except Exception as e:
        print(f"[OpenAI Client] Error loading settings.json: {e}")
        
    return {
        "baseUrl": base_url.rstrip("/"),
        "apiKey": api_key,
        "defaultModel": model,
        "enabled": enabled
    }

def extract_json_from_text(text: str) -> dict | None:
    trimmed = text.strip()
    if not trimmed:
        return None
    try:
        return json.loads(trimmed)
    except Exception:
        pass
    
    # Try markdown json block
    import re
    match = re.search(r'```(?:json)?\s*([\s\S]*?)```', trimmed, re.IGNORECASE)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except Exception:
            pass
            
    # Try finding first { and last }
    first = trimmed.find('{')
    last = trimmed.rfind('}')
    if first >= 0 and last > first:
        try:
            return json.loads(trimmed[first:last+1])
        except Exception:
            pass
            
    return None

class QwenVL:
    def __init__(self):
        self.model_name = "Qwen3-VL"
        self.version = "3.0.0"
        self.is_mock = False
        self.backend = "Qwen3-VL GGUF/Llama"
        self.is_loaded = False

    def load(self) -> None:
        self.is_loaded = True

    def unload(self) -> None:
        self.is_loaded = False

    def analyze(self, image_path: str, reason: str = "") -> Dict[str, Any]:
        """Unified fallback analysis interface routing to real analyze_design."""
        res = self.analyze_design(image_path)
        # Fuse text_tags and design_tags
        tags = []
        tags.extend(res.get("text_tags", []))
        tags.extend(res.get("design_tags", []))
        return {
            "tags": tags,
            "asset_type": res.get("design_type", "unknown"),
            "caption": res.get("layout_analysis", ""),
            "reason": reason,
            "confidence": 0.85
        }

    def analyze_design(self, image_path: str) -> Dict[str, Any]:
        """Runs real local/external OpenAI-compatible Qwen3-VL design analysis."""
        backend = get_openai_backend()
        
        try:
            with open(os.path.expanduser(image_path), "rb") as f:
                img_data = f.read()
            encoded_image = base64.b64encode(img_data).decode("utf-8")
            image_data_url = f"data:image/png;base64,{encoded_image}"
            
            model_name = backend["defaultModel"]
            if not model_name:
                try:
                    req = urllib.request.Request(
                        f"{backend['baseUrl']}/models",
                        headers={"Authorization": f"Bearer {backend['apiKey']}"}
                    )
                    with urllib.request.urlopen(req, timeout=5) as response:
                        models_data = json.loads(response.read().decode("utf-8"))
                        candidates = models_data.get("data", [])
                        if candidates and isinstance(candidates, list):
                            model_name = candidates[0].get("id", "local-model")
                        else:
                            model_name = "local-model"
                except Exception:
                    model_name = "local-model"
            
            system_prompt = "You are a professional design asset analysis system."
            user_prompt = (
                "Analyze the attached design image and respond ONLY with a valid JSON object matching this schema:\n"
                "{\n"
                "  \"ocr_text\": \"All visible text in the image\",\n"
                "  \"text_blocks\": [{\"text\": \"piece of text\", \"box\": [ymin, xmin, ymax, xmax]}],\n"
                "  \"layout_analysis\": \"Short description of layout, margins, and symmetry\",\n"
                "  \"design_type\": \"One of commercial_poster, ui_landing_page, sports_banner, photography, artwork, presentation_slide\",\n"
                "  \"visual_hierarchy\": [\"List of elements in order of visual prominence\"],\n"
                "  \"text_tags\": [{\"name\": \"tag name\", \"confidence\": float}],\n"
                "  \"design_tags\": [{\"name\": \"tag name\", \"confidence\": float}],\n"
                "  \"evidence\": [\"visual cues supporting your analysis\"]\n"
                "}\n"
                "Remember to return ONLY the JSON block."
            )
            
            payload = {
                "model": model_name,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": user_prompt},
                            {"type": "image_url", "image_url": {"url": image_data_url}}
                        ]
                    }
                ],
                "temperature": 0.2,
                "max_tokens": 1500
            }
            
            url = f"{backend['baseUrl']}/chat/completions"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {backend['apiKey']}"
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            
            with urllib.request.urlopen(req, timeout=120) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                content = res_data["choices"][0]["message"]["content"]
                
            parsed = extract_json_from_text(content)
            if parsed:
                return {
                    "ocr_text": parsed.get("ocr_text", ""),
                    "text_blocks": parsed.get("text_blocks", []),
                    "layout_analysis": parsed.get("layout_analysis", ""),
                    "design_type": parsed.get("design_type", ""),
                    "visual_hierarchy": parsed.get("visual_hierarchy", []),
                    "text_tags": parsed.get("text_tags", []),
                    "design_tags": parsed.get("design_tags", []),
                    "evidence": parsed.get("evidence", []),
                    "model_name": self.model_name,
                    "model_version": self.version
                }
            else:
                raise ValueError("Failed to parse visual response into expected JSON format.")
        except Exception as e:
            raise MockInferenceBlockedError(f"Real Qwen-VL design analysis failed: {e}")

    def generate_prompt(self, image_path: str) -> Dict[str, Any]:
        """Generates detailed English prompt, Chinese caption, and style tags using Qwen3-VL unified OpenAI-compatible endpoint."""
        backend = get_openai_backend()
        
        try:
            with open(os.path.expanduser(image_path), "rb") as f:
                img_data = f.read()
            encoded_image = base64.b64encode(img_data).decode("utf-8")
            image_data_url = f"data:image/png;base64,{encoded_image}"
            
            model_name = backend["defaultModel"]
            if not model_name:
                try:
                    req = urllib.request.Request(
                        f"{backend['baseUrl']}/models",
                        headers={"Authorization": f"Bearer {backend['apiKey']}"}
                    )
                    with urllib.request.urlopen(req, timeout=5) as response:
                        models_data = json.loads(response.read().decode("utf-8"))
                        candidates = models_data.get("data", [])
                        if candidates and isinstance(candidates, list):
                            model_name = candidates[0].get("id", "local-model")
                        else:
                            model_name = "local-model"
                except Exception:
                    model_name = "local-model"
            
            system_prompt = "You are a professional AI image prompt engineer and senior visual designer."
            user_prompt = (
                "Analyze this image and generate a highly detailed prompt suitable for Text-to-Image models describing "
                "its style, subject, composition, colors, and usage. Respond ONLY with a valid JSON object matching this schema:\n"
                "{\n"
                "  \"result_prompt\": \"the detailed English prompt description\",\n"
                "  \"result_caption\": \"a short Chinese description of the image\",\n"
                "  \"style_tags\": [\"list\", \"of\", \"5\", \"key\", \"style\", \"tags\"]\n"
                "}\n"
                "Remember to return ONLY the JSON block."
            )
            
            payload = {
                "model": model_name,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": user_prompt},
                            {"type": "image_url", "image_url": {"url": image_data_url}}
                        ]
                    }
                ],
                "temperature": 0.6,
                "max_tokens": 1024
            }
            
            url = f"{backend['baseUrl']}/chat/completions"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {backend['apiKey']}"
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            
            with urllib.request.urlopen(req, timeout=120) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                content = res_data["choices"][0]["message"]["content"]
                
            parsed = extract_json_from_text(content)
            if parsed:
                return {
                    "result_prompt": parsed.get("result_prompt", ""),
                    "result_caption": parsed.get("result_caption", ""),
                    "style_tags": parsed.get("style_tags", []),
                    "model_name": self.model_name,
                    "model_version": self.version
                }
            else:
                return {
                    "result_prompt": content,
                    "result_caption": "",
                    "style_tags": [],
                    "model_name": self.model_name,
                    "model_version": self.version
                }
        except Exception as e:
            raise MockInferenceBlockedError(f"Real Qwen-VL prompt generation failed: {e}")
