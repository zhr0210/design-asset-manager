from __future__ import annotations
import random
import os
import json
import base64
import urllib.request
import urllib.error
from typing import Dict, Any, Optional
from core.mock_policy import guard_mock_inference, is_strict_real_ai, MockInferenceBlockedError

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

class JoyCaption:
    def __init__(self):
        self.model_name = "JoyCaption-v2"
        self.version = "2.0.0"

    def generate_prompt(self, image_path: str) -> Dict[str, Any]:
        """Simulates JoyCaption prompt reversal or calls a real OpenAI-compatible backend."""
        backend = get_openai_backend()
        
        # Try real inference if enabled or if in strict mode (which requires real)
        try:
            # Let's read image and encode to base64
            with open(os.path.expanduser(image_path), "rb") as f:
                img_data = f.read()
            encoded_image = base64.b64encode(img_data).decode("utf-8")
            image_data_url = f"data:image/png;base64,{encoded_image}"
            
            # Resolve model ID
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
                "its style, subject, composition, colors, and usage. Format your response ONLY as a JSON object with: "
                "'result_prompt' (the English prompt), 'result_caption' (a short Chinese description), and "
                "'style_tags' (a list of 5 key style tags)."
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
            # If real inference failed, check if we must block mock inference
            if is_strict_real_ai() or not backend.get("enabled", False):
                raise MockInferenceBlockedError(f"Real JoyCaption inference failed and mock fallback is blocked: {e}")
                
            # Otherwise, fall back to mock
            guard_mock_inference("JoyCaption", "The current JoyCaption worker is running in fallback mock mode.")
            prompts = [
                {
                    "prompt": "A beautiful flat design illustration showing a modern tech environment with minimalist icons and dynamic grids, glowing neon colors, highly detailed, style of premium digital UI art",
                    "caption": "一个精美的现代科技平画插图，带有极简图标 and 动态网格。",
                    "style_tags": ["flat design", "vector", "minimalist", "neon colors", "digital UI art"]
                },
                {
                    "prompt": "A premium elegant presentation slide cover showing minimalist gold lines on a clean matte black background, luxurious design patterns, smooth gradients, 4k resolution, figma style mockup",
                    "caption": "一个奢华而优雅的黑金配色PPT幻灯片封面设计。",
                    "style_tags": ["gold lines", "matte black", "luxurious", "figma style", "4k resolution"]
                },
                {
                    "prompt": "An artistic Chinese ink wash painting rendering majestic mountain peaks surrounded by ethereal misty clouds, serene water reflection, double exposure aesthetics, highly detailed",
                    "caption": "一幅大气磅礴的水墨山水画，云雾缭绕，充满新中式意境。",
                    "style_tags": ["Chinese ink wash", "mountain peaks", "misty clouds", "serene water", "new Chinese style"]
                }
            ]
            selected = random.choice(prompts)
            return {
                "result_prompt": selected["prompt"],
                "result_caption": selected["caption"],
                "style_tags": selected["style_tags"],
                "model_name": self.model_name,
                "model_version": self.version
            }
