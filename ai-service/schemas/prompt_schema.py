from pydantic import BaseModel
from typing import Optional

class PromptGenerateRequest(BaseModel):
    asset_id: str
    file_path: str
    model_name: Optional[str] = "JoyCaption-v2"
