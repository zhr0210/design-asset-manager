import random
from typing import Dict, Any

class Florence2:
    def __init__(self):
        self.model_name = "Florence-2-Large"
        self.version = "1.0.0"

    def analyze(self, image_path: str) -> Dict[str, Any]:
        """Simulates Florence-2 analysis (Captioning, OCR, Region Description)."""
        mock_captions = [
            "A high-tech digital landing page showing minimalist vector illustrations of smart city skyline.",
            "A premium presentation cover design showing black gold mountain peak patterns.",
            "A clean website promotional banner showing double-exposure drone photography with blue gradients."
        ]

        mock_ocr = [
            "INNOVATION IN FLIGHT",
            "DESIGN SYSTEM PROTO",
            "CREATIVE FUTURE PLATFORM"
        ]

        mock_regions = [
            {"box": [100, 150, 400, 800], "label": "main vector hero graphic"},
            {"box": [50, 50, 120, 200], "label": "branding logotype header"},
            {"box": [600, 100, 800, 900], "label": "footer navigation panel"}
        ]

        return {
            "caption": random.choice(mock_captions),
            "ocr_text": random.choice(mock_ocr),
            "region_descriptions": mock_regions,
            "object_counts": {
                "text_blocks": len(mock_regions),
                "graphics_elements": random.randint(3, 8)
            },
            "model_name": self.model_name,
            "model_version": self.version
        }
