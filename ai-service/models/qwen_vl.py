from __future__ import annotations
import random
import os
import json
import base64
import urllib.request
import urllib.error
from typing import Dict, Any
from core.mock_policy import guard_mock_inference, is_strict_real_ai, MockInferenceBlockedError
from models.joycaption import get_openai_backend, extract_json_from_text

class QwenVL:
    def __init__(self):
        self.model_name = "Qwen2.5-VL"
        self.version = "2.5.0"

    def analyze_design(self, image_path: str) -> Dict[str, Any]:
        """Simulates Qwen2.5-VL deep design analysis or runs real local/external OpenAI-compatible backend."""
        backend = get_openai_backend()
        
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
            # If real inference failed, check if we must block mock inference
            if is_strict_real_ai() or not backend.get("enabled", False):
                raise MockInferenceBlockedError(f"Real Qwen-VL inference failed and mock fallback is blocked: {e}")
                
            # Otherwise, fall back to mock
            guard_mock_inference("Qwen-VL deep analysis", "The current QwenVL worker is running in fallback mock mode.")
            layouts = [
                {
                    "ocr_text": "面包烘焙 焦糖坚果 Fresh Bread Caramel & Nuts",
                    "text_blocks": [
                        {"text": "面包烘焙", "box": [100, 100, 200, 300]},
                        {"text": "Fresh Bread", "box": [300, 100, 350, 400]}
                    ],
                    "layout_analysis": "居中排版，字体及段落排版均衡，留白充足。",
                    "design_type": "commercial_poster",
                    "visual_hierarchy": ["粗体品牌标题 (Bold Brand Title)", "产品实拍图 (Product Photograph)", "营养配料说明 (Nutritional Footnotes)"],
                    "text_tags": [
                        {"name": "面包", "confidence": 0.95},
                        {"name": "坚果", "confidence": 0.90}
                    ],
                    "design_tags": [
                        {"name": "海报/Banner", "confidence": 0.88},
                        {"name": "居中对齐", "confidence": 0.82}
                    ],
                    "evidence": ["High density of textual overlays", "Centered visual symmetry"]
                },
                {
                    "ocr_text": "极简美学 空间感知 Minimalist Space Studio Design",
                    "text_blocks": [
                        {"text": "极简美学", "box": [50, 50, 120, 250]},
                        {"text": "Space Studio", "box": [150, 50, 200, 350]}
                    ],
                    "layout_analysis": "非对称排版，大面积艺术留白，高冷质感。",
                    "design_type": "ui_landing_page",
                    "visual_hierarchy": ["品牌标识 (Branding Logo)", "抽象几何图形 (Abstract Geometric Element)", "极小字号联系方式 (Small Contact Details)"],
                    "text_tags": [
                        {"name": "极简", "confidence": 0.93},
                        {"name": "空间", "confidence": 0.89}
                    ],
                    "design_tags": [
                        {"name": "UI设计图", "confidence": 0.87},
                        {"name": "大留白", "confidence": 0.85}
                    ],
                    "evidence": ["Asymmetrical layout", "Low density of elements"]
                },
                {
                    "ocr_text": "激情盛夏 运动无界 Power Running Speed Training",
                    "text_blocks": [
                        {"text": "激情盛夏", "box": [200, 100, 280, 400]},
                        {"text": "Power Running", "box": [300, 100, 360, 450]}
                    ],
                    "layout_analysis": "斜切对角构图，高饱和度动态排版，极强视觉冲击力。",
                    "design_type": "sports_banner",
                    "visual_hierarchy": ["高动态主体角色 (Action Hero Image)", "斜体大字字块 (Slanted Headline Text)", "行动点按钮 (Call To Action Button)"],
                    "text_tags": [
                        {"name": "运动", "confidence": 0.96},
                        {"name": "盛夏", "confidence": 0.91}
                    ],
                    "design_tags": [
                        {"name": "海报", "confidence": 0.89},
                        {"name": "对角构图", "confidence": 0.84}
                    ],
                    "evidence": ["Slanted grids", "High contrast neon palette"]
                }
            ]

            selected = random.choice(layouts)
            return {
                "ocr_text": selected["ocr_text"],
                "text_blocks": selected["text_blocks"],
                "layout_analysis": selected["layout_analysis"],
                "design_type": selected["design_type"],
                "visual_hierarchy": selected["visual_hierarchy"],
                "text_tags": selected["text_tags"],
                "design_tags": selected["design_tags"],
                "evidence": selected["evidence"],
                "model_name": self.model_name,
                "model_version": self.version
            }
