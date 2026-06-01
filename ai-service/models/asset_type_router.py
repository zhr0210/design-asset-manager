import os
from typing import Dict, Any

class AssetTypeRouter:
    """
    Unified entry point for asset routing, delegating directly to VisualRouter
    for advanced zero-shot image classification and metadata signal fusion.
    """
    
    @staticmethod
    async def route(file_path: str, source_site_name: str = None) -> Dict[str, Any]:
        """
        Asynchronously routes the image path by calling the visual router.
        Matches the new architecture specs perfectly.
        """
        from models.visual_router import VisualRouter
        router = VisualRouter()
        return await router.route(file_path, source_site_name)
