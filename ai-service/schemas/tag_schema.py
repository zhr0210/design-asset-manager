from pydantic import BaseModel
from typing import Optional, List

class TagEnqueueRequest(BaseModel):
    asset_id: str
    file_path: str
    priority: int = 0
    model_name: Optional[str] = "WD-Tagger-v3"
    models_to_run: Optional[List[str]] = None
    threshold_general: Optional[float] = 0.35
    threshold_character: Optional[float] = 0.35
    threshold_rating: Optional[float] = 0.5
    max_tags: Optional[int] = 30
