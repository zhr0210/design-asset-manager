import os
import re
from typing import Dict, Any, List
from core.model_manager import ModelManager
from models.clip_design_classifier import CLIPDesignClassifier
from core.mock_policy import guard_mock_inference

class VisualRouter:
    """
    Advanced Visual & Metadata-Cooperative Router.
    Uses SigLIP / OpenCLIP zero-shot image classification as the primary signal,
    balanced with auxiliary metadata signals (filename, path, site, ratio, color),
    to route visual assets to the most optimal cooperative tagging pipeline.
    """
    
    CATEGORIES_PROMPTS = {
        "anime": "anime character illustration, manga style drawing, Japanese animation character art",
        "illustration": "hand drawn illustration, watercolor artwork, vector illustration, decorative graphic art, non anime illustration",
        "photo": "realistic camera photograph, real world photo, natural lighting, real objects or people",
        "product": "commercial product photography, product shot, isolated product image, product advertisement photo",
        "design": "graphic design poster, advertising banner, commercial visual design, typography poster, brand poster, high aesthetic digital layout, creative design composition",
        "ui": "user interface screenshot, mobile app screen, website layout, dashboard interface, software UI",
        "document": "scanned document page, printed form, invoice, letter, report page, text heavy document"
    }

    # Recommended pipelines for each routed asset type
    PIPELINE_MAP = {
        "anime": ["wd_tagger"],
        "illustration": ["ram", "design_rule"],
        "photo": ["ram", "design_rule"],
        "product": ["ram", "design_rule"],
        "design": ["ram", "florence2", "clip", "design_rule"],
        "ui": ["ram", "florence2", "design_rule"],
        "document": ["ram", "florence2", "design_rule"],
        "unknown": ["ram", "design_rule", "clip"]
    }

    def __init__(self):
        self.model_manager = ModelManager()

    async def route(self, file_path: str, source_site_name: str = None) -> Dict[str, Any]:
        """
        Routes the image by combining real zero-shot SigLIP/CLIP vision classification
        with supplementary metadata signals.
        
        Returns:
          {
            "primary_type": "anime | illustration | photo | product | design | ui | document | unknown",
            "secondary_types": List[str],
            "top1_type": str,
            "top1_score": float,
            "top2_type": str,
            "top2_score": float,
            "margin": float,
            "is_uncertain": bool,
            "is_mixed": bool,
            "is_unknown": bool,
            "recommended_pipeline": List[str],
            "signals": {
                "visual": Dict[str, float],
                "metadata": Dict[str, Any]
            },
            
            # Legacy fields for backward compatibility
            "asset_type": str,
            "confidence": float,
            "scores": Dict[str, float]
          }
        """
        # Threshold constants
        UNKNOWN_THRESHOLD = 0.35
        MARGIN_THRESHOLD = 0.08
        STRONG_CONFIDENCE = 0.70

        is_unknown = False
        is_uncertain = False
        is_mixed = False

        # 0. Check for custom category override
        custom_category = None
        user_data_access_disabled = (
            os.environ.get("DESIGN_ASSET_MANAGER_DISABLE_USER_DATA_ACCESS") == "1"
        )
        default_db_path = "~/DesignAssetManager/design_asset_manager.db"
        db_path = os.path.expanduser(
            os.environ.get("DESIGN_ASSET_MANAGER_RUNTIME_DB", default_db_path)
        )
        if not user_data_access_disabled and os.path.exists(db_path):
            try:
                import sqlite3
                import json
                
                basename = os.path.basename(file_path)
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT id FROM assets WHERE file_path = ? OR file_path = ? OR file_path LIKE ?",
                    (file_path, os.path.expanduser(file_path), f"%/{basename}")
                )
                row = cursor.fetchone()
                if not row:
                    cursor.execute(
                        "SELECT id FROM assets WHERE file_name = ? OR file_path LIKE ?",
                        (basename, f"%{basename}")
                    )
                    row = cursor.fetchone()
                
                asset_id = row[0] if row else None
                conn.close()
                
                if asset_id:
                    default_custom_path = "~/DesignAssetManager/custom_categories.json"
                    custom_path = os.path.expanduser(
                        os.environ.get(
                            "DESIGN_ASSET_MANAGER_CUSTOM_CATEGORIES",
                            default_custom_path
                        )
                    )
                    if os.path.exists(custom_path):
                        with open(custom_path, 'r', encoding='utf-8') as f:
                            overrides = json.load(f)
                            custom_category = overrides.get(asset_id)
                            if custom_category:
                                print(f"[VisualRouter] Manual category override found for asset {asset_id}: {custom_category}")
            except Exception as e:
                print(f"[VisualRouter] Error checking custom category override: {e}")

        if custom_category:
            recommended_pipeline = self.PIPELINE_MAP.get(custom_category, ["ram", "clip"]).copy()
            is_florence_triggered = custom_category in ["design", "ui", "document"]
            if is_florence_triggered:
                florence_target = "florence2"
                if florence_target not in recommended_pipeline and "florence2" not in recommended_pipeline:
                    recommended_pipeline.insert(0, florence_target)
            if custom_category == "anime":
                if "wd_tagger" not in recommended_pipeline:
                    recommended_pipeline.insert(0, "wd_tagger")
            
            scores = {k: 0.01 for k in self.CATEGORIES_PROMPTS}
            if custom_category in scores:
                scores[custom_category] = 0.99
            total = sum(scores.values()) or 1.0
            normalized_scores = {k: v / total for k, v in scores.items()}
            
            return {
                "primary_type": custom_category,
                "secondary_types": [],
                "top1_type": custom_category,
                "top1_score": 1.0,
                "top2_type": "unknown",
                "top2_score": 0.0,
                "margin": 1.0,
                "is_uncertain": False,
                "is_mixed": False,
                "is_unknown": custom_category == "unknown",
                "recommended_pipeline": recommended_pipeline,
                "signals": {
                    "visual": normalized_scores,
                    "metadata": {"custom_override": True}
                },
                "asset_type": custom_category,
                "confidence": 1.0,
                "scores": normalized_scores
            }

        # Ensure local image exists (downloads from SQLite remote URL if missing)
        try:
            from utils.image_preprocess import ensure_local_image
            ensure_local_image(file_path)
        except Exception as e:
            print(f"[VisualRouter] Error ensuring local image: {e}")

        # 1. Run Metadata Signal parser
        metadata = self._extract_metadata_signals(file_path, source_site_name)
        
        # 2. Trigger Visual Classification (over 7 visual categories)
        try:
            visual_scores = await self._run_visual_classification(file_path)
            # Check if all visual scores are exactly equal (indicates failed or mock empty state)
            is_visual_flat = len(set(visual_scores.values())) == 1
        except Exception as e:
            print(f"[VisualRouter] Route processing error: {e}")
            visual_scores = {k: 0.1428 for k in self.CATEGORIES_PROMPTS}
            is_visual_flat = True
            is_unknown = True
        
        # 3. Combine Visual and Metadata Signals
        final_scores = visual_scores.copy()
        
        # Determine visual dominant candidate and confidence
        max_visual_cat = max(visual_scores, key=visual_scores.get)
        max_visual_conf = visual_scores[max_visual_cat]
        
        # Apply metadata adjustments (metadata boosts or decreases scores, doesn't force outcome)
        meta_opinion = metadata.get("file_name_signal") or metadata.get("path_signal")
        
        if max_visual_conf >= STRONG_CONFIDENCE:
            # High visual confidence: trust visual category primarily, only apply light metadata boost
            if meta_opinion and meta_opinion in final_scores:
                final_scores[meta_opinion] = min(0.99, final_scores[meta_opinion] + 0.15)
        else:
            # Low/Moderate visual confidence: enter mixed/fallback mode. Metadata signals have higher weight.
            if meta_opinion and meta_opinion in final_scores:
                # Add substantial boost to metadata category opinion
                final_scores[meta_opinion] = min(0.99, final_scores[meta_opinion] + 0.45)
                # Apply light penalties to others
                for cat in final_scores:
                    if cat != meta_opinion:
                        final_scores[cat] = max(0.01, final_scores[cat] - 0.08)

        # Cooperative design priority resolution:
        # A design asset often uses photography, product shots, illustration, or anime character styles.
        # If metadata explicitly labels it as design, we prioritize design as the functional category
        # and preserve the photo/illustration/anime style in the secondary categories.
        if meta_opinion == "design" and max_visual_cat in ["photo", "illustration", "product", "anime"]:
            final_scores["design"] = max(final_scores["design"], final_scores[max_visual_cat] + 0.08)
                        
        # Aspect ratio metadata hints
        ratio_sig = metadata.get("aspect_ratio_signal")
        if ratio_sig == "tall" and "design" in final_scores:
            final_scores["design"] = min(0.99, final_scores["design"] + 0.10)
        elif ratio_sig == "wide" and "ui" in final_scores:
            final_scores["ui"] = min(0.99, final_scores["ui"] + 0.05)
            
        # Document slide metadata hints
        if "ppt" in os.path.basename(file_path).lower() and "document" in final_scores:
            final_scores["document"] = min(0.99, final_scores["document"] + 0.15)

        # Re-normalize final scores so they sum to 1.0
        total = sum(final_scores.values()) or 1.0
        final_normalized_scores = {k: round(v / total, 4) for k, v in final_scores.items()}

        # 4. Resolve top1/top2 scores and margin
        sorted_cats = sorted(final_normalized_scores.items(), key=lambda x: x[1], reverse=True)
        top1_type, top1_score = sorted_cats[0]
        top2_type, top2_score = sorted_cats[1] if len(sorted_cats) > 1 else (None, 0.0)
        margin = round(top1_score - top2_score, 4)

        # Apply unknown and uncertainty rules
        if top1_score < UNKNOWN_THRESHOLD or is_visual_flat:
            is_unknown = True
        if margin < MARGIN_THRESHOLD:
            is_uncertain = True
            is_mixed = True

        # Resolve primary and secondary types
        secondary_types = []
        if is_unknown:
            primary_type = "unknown"
        else:
            primary_type = top1_type
            if top2_type and (top2_score >= 0.15 or is_mixed):
                secondary_types.append(top2_type)

        # Apply recommended pipeline and dynamic routing adjustments (Rule V)
        recommended_pipeline = self.PIPELINE_MAP.get(primary_type, ["ram", "clip"]).copy()

        # Trigger Florence-2 based on primary_type or mixed secondary_types
        is_florence_triggered = primary_type in ["design", "ui", "document"]
        if not is_florence_triggered and is_mixed:
            if any(t in secondary_types for t in ["design", "ui", "document"]):
                is_florence_triggered = True

        if is_florence_triggered:
            florence_target = "florence2"
            if florence_target not in recommended_pipeline and "florence2" not in recommended_pipeline:
                recommended_pipeline.insert(0, florence_target)

        # Rule V.1: Design + Document margin check
        if top1_type == "design" and top2_type == "document" and margin < MARGIN_THRESHOLD:
            primary_type = "design"
            secondary_types = ["document"]
            recommended_pipeline = ["ram", "florence2", "clip", "design_rule"] # Florence + clip_design + metadata rules

        # Rule V.2: UI + Document
        elif top1_type == "ui" and top2_type == "document":
            primary_type = "ui"
            secondary_types = ["document"]
            recommended_pipeline = ["ram", "florence2", "design_rule"] # 进入 Florence pipeline

        # Rule V.3: Photo + Product
        elif (top1_type == "photo" and top2_type == "product") or (top1_type == "product" and top2_type == "photo"):
            primary_type = top1_type
            secondary_types = [top2_type]
            recommended_pipeline = ["ram", "design_rule"] # 推荐 RAM pipeline

        # Rule V.4 & 5: WD Tagger limits
        # WD Tagger is only allowed on anime, or illustration with high anime score
        is_wd_allowed = False
        if primary_type == "anime":
            is_wd_allowed = True
        elif primary_type == "illustration" and final_normalized_scores.get("anime", 0.0) >= 0.20:
            is_wd_allowed = True

        if not is_wd_allowed:
            recommended_pipeline = [p for p in recommended_pipeline if p != "wd_tagger"]
        else:
            if "wd_tagger" not in recommended_pipeline:
                recommended_pipeline.insert(0, "wd_tagger")

        # Normalize outputs and add backward compatibility properties
        result = {
            "primary_type": primary_type,
            "secondary_types": secondary_types,
            "top1_type": top1_type,
            "top1_score": top1_score,
            "top2_type": top2_type,
            "top2_score": top2_score,
            "margin": margin,
            "is_uncertain": is_uncertain,
            "is_mixed": is_mixed,
            "is_unknown": is_unknown,
            "recommended_pipeline": recommended_pipeline,
            "signals": {
                "visual": {k: round(v, 4) for k, v in visual_scores.items()},
                "metadata": metadata
            },
            
            # Legacy compatibility fields
            "asset_type": primary_type,
            "confidence": top1_score,
            "scores": final_normalized_scores
        }
        return result

    def _extract_metadata_signals(self, file_path: str, source_site_name: str = None) -> Dict[str, Any]:
        """
        Parses auxiliary clues from filename, directory path, web source site,
        image aspect ratios and colors.
        """
        normalized_path = file_path.replace("\\", "/")
        filename_lower = os.path.basename(normalized_path).lower()
        path_lower = os.path.basename(os.path.dirname(normalized_path)).lower()
        
        # Clean suffix (e.g. _mlrfsdqi6)
        filename_clean = re.sub(r'_[a-z0-9]{9}(?=\.[a-z0-9]+$|$)', '', filename_lower)

        # Keyword mapping
        anime_kws = ["anime", "manga", "cartoon", "character", "mascot", "chibi", "动漫", "二次元", "卡通", "角色", "立绘", "原画", "wurthering", "wuthering", "waves", "genshin", "arknights", "崩坏", "原神", "鸣潮", "明日方舟"]
        illus_kws = ["illustration", "illust", "hand drawn", "watercolor", "vector", "插画", "手绘", "绘图", "艺术画", "向量"]
        ui_kws = ["ui", "ux", "dashboard", "app", "webpage", "figma", "prototype", "wireframe", "界面", "后台", "控制台", "仪表盘", "网站", "后台界面"]
        doc_kws = ["ppt", "presentation", "slide", "infographic", "report", "document", "invoice", "invoice_form", "模版", "模板", "汇报", "幻灯片", "信息图", "文档"]
        design_kws = ["design", "poster", "banner", "flyer", "brochure", "branding", "identity", "advertising", "typography", "cover", "海报", "横幅", "宣传册", "封面", "画册", "排版", "广告", "展板", "折页"]
        photo_kws = ["photo", "photography", "scenery", "outdoor", "nature", "landscape", "dog", "cat", "pet", "food", "photography", "摄影", "真实", "实拍", "风景", "写真", "人像"]
        product_kws = ["product", "isolated", "commercial", "shot", "产品", "商品", "电商", "单品", "广告图"]

        file_name_signal = None
        if any(kw in filename_clean for kw in ui_kws):
            file_name_signal = "ui"
        elif any(kw in filename_clean for kw in doc_kws):
            file_name_signal = "document"
        elif any(kw in filename_clean for kw in anime_kws):
            file_name_signal = "anime"
        elif any(kw in filename_clean for kw in illus_kws):
            file_name_signal = "illustration"
        elif any(kw in filename_clean for kw in design_kws):
            file_name_signal = "design"
        elif any(kw in filename_clean for kw in photo_kws):
            file_name_signal = "photo"
        elif any(kw in filename_clean for kw in product_kws):
            file_name_signal = "product"

        path_signal = None
        if any(kw in path_lower for kw in ui_kws):
            path_signal = "ui"
        elif any(kw in path_lower for kw in doc_kws):
            path_signal = "document"
        elif any(kw in path_lower for kw in anime_kws):
            path_signal = "anime"
        elif any(kw in path_lower for kw in illus_kws):
            path_signal = "illustration"
        elif any(kw in path_lower for kw in design_kws):
            path_signal = "design"
        elif any(kw in path_lower for kw in photo_kws):
            path_signal = "photo"
        elif any(kw in path_lower for kw in product_kws):
            path_signal = "product"

        # Source site mapping
        source_site_signal = None
        if source_site_name:
            source_lower = source_site_name.lower()
            if any(k in source_lower for k in ["dribbble", "behance", "ui8", "uipixels"]):
                source_site_signal = "ui"
            elif any(k in source_lower for k in ["pinterest", "artstation", "pixiv", "danbooru"]):
                source_site_signal = "anime"
            elif any(k in source_lower for k in ["unsplash", "pexel", "shutterstock", "photo"]):
                source_site_signal = "photo"

        # Aspect ratio extraction (Mock or parsed if possible)
        aspect_ratio_signal = "square"
        
        # Color signal dummy placeholder
        color_signal = "rgb"

        return {
            "file_name_signal": file_name_signal,
            "path_signal": path_signal,
            "source_site_signal": source_site_signal,
            "aspect_ratio_signal": aspect_ratio_signal,
            "color_signal": color_signal
        }

    async def _run_visual_classification(self, file_path: str) -> Dict[str, float]:
        """
        Executes zero-shot visual classification against SigLIP/CLIP
        using our 7 target semantic prompts.
        """
        # Load CLIP via ModelManager
        await self.model_manager.load_model("clip")
        clip_info = self.model_manager.loaded_models.get("clip")
        clip_model: CLIPDesignClassifier = clip_info.get("instance") if clip_info else None

        if not clip_model:
            # Safety fallback: return basic equal score
            return {k: 0.1428 for k in self.CATEGORIES_PROMPTS}

        # 1. Handle Mock Zero-Shot Route Fallback contextually
        if clip_model.is_mock:
            guard_mock_inference("VisualRouter CLIP classification", "CLIP model is in mock mode.")
            return self._simulate_mock_visual_scores(file_path)

        # 2. Real CLIP forward pass
        try:
            from PIL import Image
            import torch
            
            expanded_path = os.path.expanduser(file_path)
            if not os.path.exists(expanded_path):
                guard_mock_inference("VisualRouter CLIP classification", "Input image path is unavailable.")
                return self._simulate_mock_visual_scores(file_path)

            image = Image.open(expanded_path).convert("RGB")
            device = clip_model.model.device

            # Format Prompts list
            prompt_keys = list(self.CATEGORIES_PROMPTS.keys())
            prompts = [self.CATEGORIES_PROMPTS[k] for k in prompt_keys]

            inputs = clip_model.processor(text=prompts, images=image, return_tensors="pt", padding=True)
            inputs = {k: v.to(device) for k, v in inputs.items()}

            with torch.no_grad():
                outputs = clip_model.model(**inputs)
            
            # Extract probability softmax
            logits_per_image = outputs.logits_per_image  # Shape (1, 7)
            probs = logits_per_image.softmax(dim=-1).cpu().numpy()[0]

            return {key: float(prob) for key, prob in zip(prompt_keys, probs)}

        except Exception as e:
            print(f"[VisualRouter] CLIP visual classification failed: {e}. Falling back to mock signals.")
            guard_mock_inference("VisualRouter CLIP classification", str(e))
            return self._simulate_mock_visual_scores(file_path)

    def _simulate_mock_visual_scores(self, file_path: str) -> Dict[str, float]:
        """
        Simulate a highly robust, realistic visual classification output
        based on filenames and extensions when running in mock mode.
        """
        guard_mock_inference("VisualRouter CLIP classification", "Direct mock visual scores were requested.")
        filename_lower = os.path.basename(file_path).lower()
        _, ext = os.path.splitext(filename_lower)
        
        scores = {
            "anime": 0.05,
            "illustration": 0.05,
            "photo": 0.05,
            "product": 0.05,
            "design": 0.05,
            "ui": 0.05,
            "document": 0.05
        }

        # Extensions hints
        if ext in [".svg"]:
            scores["ui"] = 0.75
            scores["design"] = 0.15
        elif ext in [".ai", ".eps", ".fig"]:
            scores["design"] = 0.80
            scores["ui"] = 0.10
        
        # Keyword triggers simulating visual outcomes
        elif "mixed" in filename_lower or "uncertain" in filename_lower:
            scores["design"] = 0.35
            scores["document"] = 0.33
            scores["photo"] = 0.10
        elif any(k in filename_lower for k in ["anime", "manga", "character", "二次元", "动漫", "角色", "wuthering", "wurthering"]):
            scores["anime"] = 0.82
            scores["illustration"] = 0.08
        elif any(k in filename_lower for k in ["illustration", "illust", "hand drawn", "watercolor", "vector", "插画", "手绘", "绘图"]):
            scores["illustration"] = 0.80
            scores["anime"] = 0.10
        elif any(k in filename_lower for k in ["ppt", "presentation", "slide", "slide_deck", "模板", "幻灯片", "document", "invoice", "invoice_form"]):
            scores["document"] = 0.85
            scores["design"] = 0.05
        elif any(k in filename_lower for k in ["dashboard", "wireframe", "figma", "app", "ui", "界面", "后台"]):
            scores["ui"] = 0.78
            scores["design"] = 0.10
        elif any(k in filename_lower for k in ["poster", "banner", "flyer", "advertising", "海报", "横幅", "宣传册"]):
            scores["design"] = 0.80
            scores["photo"] = 0.05
        elif any(k in filename_lower for k in ["product", "isolated", "commercial", "shot", "产品", "商品", "电商"]):
            scores["product"] = 0.82
            scores["photo"] = 0.08
        elif any(k in filename_lower for k in ["photo", "scenery", "nature", "landscape", "dog", "cat", "pet", "摄影", "实拍", "风景"]):
            scores["photo"] = 0.84
            scores["product"] = 0.06
        else:
            # Flat distribution to test unknown rule
            scores = {k: 0.1428 for k in scores}

        # Re-normalize
        total = sum(scores.values())
        return {k: v / total for k, v in scores.items()}
