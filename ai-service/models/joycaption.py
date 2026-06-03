import random
from typing import Dict, Any
from core.mock_policy import guard_mock_inference

class JoyCaption:
    def __init__(self):
        self.model_name = "JoyCaption-v2"
        self.version = "2.0.0"

    def generate_prompt(self, image_path: str) -> Dict[str, Any]:
        """Simulates JoyCaption prompt reversal."""
        guard_mock_inference("JoyCaption", "The current JoyCaption worker is a template-based mock implementation.")
        prompts = [
            {
                "prompt": "A beautiful flat design illustration showing a modern tech environment with minimalist icons and dynamic grids, glowing neon colors, highly detailed, style of premium digital UI art",
                "caption": "一个精美的现代科技平画插图，带有极简图标和动态网格。",
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
