import random
from typing import Dict, Any

class QwenVL:
    def __init__(self):
        self.model_name = "Qwen2.5-VL"
        self.version = "2.5.0"

    def analyze_design(self, image_path: str) -> Dict[str, Any]:
        """Simulates Qwen2.5-VL deep design analysis with the required structured layout, OCR, and tags."""
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
