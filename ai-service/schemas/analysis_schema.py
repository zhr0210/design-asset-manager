from pydantic import BaseModel
from typing import Optional

class AnalysisGenerateRequest(BaseModel):
    asset_id: str
    file_path: str
    model_name: Optional[str] = "Qwen2.5-VL"
