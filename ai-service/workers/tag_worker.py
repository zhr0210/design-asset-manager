import asyncio
import os
import re
from core.task_queue import TaskQueue
from core.model_manager import ModelManager
from utils.image_preprocess import preprocess_image

# New multi-model cooperative imports
from models.asset_type_router import AssetTypeRouter
from utils.design_tag_dictionary import DESIGN_TAG_DICTIONARY
from utils.tag_fusion import fuse_and_clean_tags

class TagWorker:
    """
    Background worker that polls the TaskQueue for pending tagging tasks,
    routes images via AssetTypeRouter, coordinates cooperative multi-model inference,
    runs optional Qwen-VL fallbacks under low-confidence conditions,
    and fuses, deduplicates, and filters labels to produce professional design tags.
    """
    def __init__(self):
        self.queue = TaskQueue()
        self.model_manager = ModelManager()
        self.running = False
        self._loop_task = None
        
        # Batching configuration
        self.batch_size = 8

    def start(self):
        """Start the background worker loop."""
        if self.running:
            return
        self.running = True
        self._loop_task = asyncio.create_task(self._worker_loop())
        print("[TagWorker] Asynchronous batch tag processor worker started.")

    def stop(self):
        """Stop the background worker loop."""
        if not self.running:
            return
        self.running = False
        if self._loop_task:
            self._loop_task.cancel()
        print("[TagWorker] Background tag processor worker stopped.")

    async def _worker_loop(self):
        while self.running:
            try:
                # 1. Pop next batch of enqueued tasks
                tasks = self.queue.pop_next_tag_batch(self.batch_size)
                if not tasks:
                    # No jobs in queue, idle sleep
                    await asyncio.sleep(1.0)
                    continue

                print(f"[TagWorker] Retrieved batch of {len(tasks)} tagging jobs from queue.")

                # 2. Process each task in batch slice
                for task in tasks:
                    task_id = task["task_id"]
                    file_path = task["file_path"]
                    
                    # Image spec extraction
                    width = 448
                    height = 448
                    try:
                        img_specs = preprocess_image(file_path)
                        width = img_specs["width"]
                        height = img_specs["height"]
                    except Exception as e:
                        print(f"[TagWorker] Preprocessing failed for image '{file_path}': {e}")
                        self.queue.update_task_status(task_id, "failed", error_message=str(e))
                        continue

                    # Asset type routing
                    task_models_override = task.get("models_to_run")
                    route_result = await AssetTypeRouter.route(file_path)
                    
                    primary_type = route_result.get("primary_type") or "unknown"
                    secondary_types = route_result.get("secondary_types") or []
                    top1_score = route_result.get("top1_score") or 0.0
                    margin = route_result.get("margin") or 0.0
                    is_mixed = route_result.get("is_mixed") or False
                    is_uncertain = route_result.get("is_uncertain") or False
                    metadata_signals = route_result.get("signals", {}).get("metadata", {}) or {}
                    
                    filename_lower = os.path.basename(file_path).lower()
                    
                    # Florence Trigger Conditions
                    is_text_heavy_meta = any(kw in filename_lower for kw in [
                        "ppt", "presentation", "slide", "report", "course", "teaching", "education", "cover",
                        "notice", "sign", "instruction", "warning", "document", "form", "table", "menu", "label",
                        "温馨提示", "指示牌", "说明", "表格", "文档", "菜单", "告示", "提示", "注意事项", "过敏原", "价格",
                        "dashboard", "interface", "app", "mobile screen", "website", "button", "panel", "card", "navigation", "settings",
                        "界面", "控制台", "按钮", "卡片", "导航", "仪表盘", "设置", "页面", "移动端", "网页", "模块",
                        "finance", "etf", "fund", "investment", "subscription", "redemption", "risk", "asset management",
                        "金融", "基金", "理财", "投资", "募集期", "风险", "资管", "收益", "申购", "赎回"
                    ])
                    
                    aspect_ratio = metadata_signals.get("aspect_ratio_signal") or "square"
                    source_site = metadata_signals.get("source_site_signal") or ""
                    is_layout_ratio = aspect_ratio in ["tall", "wide"] or source_site in ["ui", "design"]
                    has_design_secondary = any(t in secondary_types for t in ["design", "ui", "document"])
                    
                    should_trigger_florence = (
                        primary_type in ["design", "ui", "document"] or
                        is_mixed or
                        is_uncertain or
                        top1_score < 0.60 or
                        margin < 0.08 or
                        has_design_secondary or
                        is_text_heavy_meta or
                        is_layout_ratio
                    )
                    
                    # Exclude criteria for high confidence anime/photo/product/illustration
                    is_high_conf = top1_score >= 0.75 and margin >= 0.15
                    if is_high_conf:
                        if primary_type == "anime":
                            should_trigger_florence = False
                        elif primary_type == "photo" and not is_text_heavy_meta:
                            should_trigger_florence = False
                        elif primary_type == "product" and not is_text_heavy_meta:
                            should_trigger_florence = False
                        elif primary_type == "illustration" and not is_text_heavy_meta:
                            should_trigger_florence = False
                            
                    if task_models_override and ("florence2" in task_models_override or "florence2_ocr" in task_models_override):
                        should_trigger_florence = True
                        
                    # Preheated/routed result holders
                    florence_caption_val = ""
                    florence_detailed_caption_val = ""
                    florence_ocr_text_val = ""
                    florence_semantic_tags = []
                    semantic_result = None
                    
                    asset_type = primary_type
                    models_to_run = task_models_override or route_result.get("recommended_pipeline") or ["ram", "clip"]
                    
                    if should_trigger_florence:
                        try:
                            await self.model_manager.load_model("florence2")
                            f2_info = self.model_manager.loaded_models.get("florence2")
                            f2_model = f2_info.get("instance") if f2_info else None
                            if f2_model:
                                print(f"[TagWorker] Preheating Florence-2 for semantic routing on task {task_id}...")
                                cap_res = f2_model.predict(file_path, "<CAPTION>")
                                florence_caption_val = cap_res.get("result", "") if cap_res.get("success") else ""
                                
                                det_cap_res = f2_model.predict(file_path, "<DETAILED_CAPTION>")
                                florence_detailed_caption_val = det_cap_res.get("result", "") if det_cap_res.get("success") else ""
                                
                                florence_ocr_text_val = ""
                                
                                # Run FlorenceSemanticRouter
                                from models.florence_semantic_router import FlorenceSemanticRouter
                                semantic_router = FlorenceSemanticRouter()
                                
                                router_input = {
                                    "asset_id": str(task_id),
                                    "image_path": file_path,
                                    "visual_router_result": route_result,
                                    "metadata_signals": metadata_signals,
                                    "florence_caption": florence_caption_val,
                                    "florence_detailed_caption": florence_detailed_caption_val,
                                    "florence_ocr_text": florence_ocr_text_val,
                                    "florence_objects": [],
                                    "florence_regions": []
                                }
                                
                                semantic_result = semantic_router.route(router_input)
                                asset_type = semantic_result["final_primary_type"]
                                florence_semantic_tags = semantic_result.get("semantic_tags", [])
                                
                                if not task_models_override:
                                    models_to_run = semantic_result["recommended_pipeline"]
                                    
                                print(f"[TagWorker] FlorenceSemanticRouter routed task {task_id} -> {asset_type} | Models: {models_to_run}")
                        except Exception as f2_route_err:
                            print(f"[TagWorker] Pre-routing Florence/Semantic routing failed: {f2_route_err}")
                            
                    if task_models_override:
                        print(f"[TagWorker] Custom override routing task {task_id} | Path: {repr(os.path.basename(file_path))} | Type: {asset_type} | Models: {models_to_run}")
                    else:
                        print(f"[TagWorker] Standard/Semantic routing task {task_id} | Path: {repr(os.path.basename(file_path))} | Type: {asset_type} | Models: {models_to_run}")
                    
                    all_extracted_tags = []
                    caption_text_to_save = ""
                    ocr_text_to_save = ""
                    
                    # 3. Cooperative Multi-model Inference Execution
                    # Model A: RAM++ General Tagger
                    if "ram" in models_to_run:
                        try:
                            await self.model_manager.load_model("ram")
                            ram_info = self.model_manager.loaded_models.get("ram")
                            ram_model = ram_info.get("instance") if ram_info else None
                            if ram_model:
                                ram_preds = ram_model.predict_batch([file_path])[0]
                                all_extracted_tags.extend(ram_preds)
                        except Exception as ram_err:
                            print(f"[TagWorker] RAM predictive path failed on {task_id}: {ram_err}")
                           # Model B: Florence-2 (Detailed Caption & Caption)
                    if "florence2" in models_to_run or "florence2_ocr" in models_to_run:
                        if should_trigger_florence and florence_caption_val:
                            caption_text_to_save = florence_detailed_caption_val or florence_caption_val
                            ocr_text_to_save = ""
                            try:
                                # Convert raw text outputs to high-precision design tags
                                from utils.text_to_design_tags import extract_tags_from_florence_outputs
                                f2_design_tags = extract_tags_from_florence_outputs(
                                    caption=florence_caption_val,
                                    detailed_caption=florence_detailed_caption_val,
                                    ocr_text=""
                                )
                                all_extracted_tags.extend(f2_design_tags)
                                print(f"[TagWorker] Reused preheated Florence-2 results for task {task_id}.")
                            except Exception as f2_parse_err:
                                print(f"[TagWorker] Florence-2 parsing failed: {f2_parse_err}")
                        else:
                            try:
                                await self.model_manager.load_model("florence2")
                                f2_info = self.model_manager.loaded_models.get("florence2")
                                f2_model = f2_info.get("instance") if f2_info else None
                                if f2_model:
                                    # 1. Predict Caption
                                    cap_res = f2_model.predict(file_path, "<CAPTION>")
                                    caption_val = cap_res.get("result", "") if cap_res.get("success") else ""
                                    
                                    # 2. Predict Detailed Caption
                                    det_cap_res = f2_model.predict(file_path, "<DETAILED_CAPTION>")
                                    detailed_caption_val = det_cap_res.get("result", "") if det_cap_res.get("success") else ""
                                    caption_text_to_save = detailed_caption_val or caption_val
                                    
                                    # 3. OCR is deprecated/disabled for Florence-2
                                    ocr_text_val = ""
                                    ocr_text_to_save = ""

                                    # 4. Convert raw text outputs to high-precision design tags
                                    from utils.text_to_design_tags import extract_tags_from_florence_outputs
                                    f2_design_tags = extract_tags_from_florence_outputs(
                                        caption=caption_val,
                                        detailed_caption=detailed_caption_val,
                                        ocr_text=""
                                    )
                                    all_extracted_tags.extend(f2_design_tags)
                            except Exception as f2_err:
                                print(f"[TagWorker] Florence-2 predictive path failed on {task_id}: {f2_err}")

                    # Model C: OpenCLIP / SigLIP Design Classification
                    if "clip" in models_to_run:
                        try:
                            await self.model_manager.load_model("clip")
                            clip_info = self.model_manager.loaded_models.get("clip")
                            clip_model = clip_info.get("instance") if clip_info else None
                            if clip_model:
                                # Get all candidate tags from design vocabulary dictionary
                                candidates = []
                                for section in DESIGN_TAG_DICTIONARY.values():
                                    candidates.extend(section.keys())
                                candidates = list(set(candidates))
                                
                                # Filter CLIP predictions with a dynamic threshold to prevent irrelevant noise style tags
                                is_design = asset_type in ["design", "ui"]
                                threshold = 0.20 if is_design else 0.30
                                
                                clip_preds = clip_model.classify(file_path, candidates, top_n=5)
                                for tag, score in clip_preds:
                                    if score >= threshold:
                                        all_extracted_tags.append({
                                            "name": tag,
                                            "confidence": score,
                                            "category": "custom",
                                            "source": "ai_clip_classifier"
                                        })
                        except Exception as clip_err:
                            print(f"[TagWorker] CLIP classification failed on {task_id}: {clip_err}")

                    # Model D: WD Tagger (Only run on anime / illustration assets)
                    if "wd_tagger" in models_to_run:
                        try:
                            await self.model_manager.load_model("wd_tagger")
                            wd_info = self.model_manager.loaded_models.get("wd_tagger")
                            wd_model = wd_info.get("instance") if wd_info else None
                            if wd_model:
                                wd_preds = wd_model.predict_batch([file_path], batch_size=1)[0]
                                if not wd_preds.raw_output.get("failed"):
                                    formatted = [t.to_dict() for t in wd_preds.tags]
                                    all_extracted_tags.extend(formatted)
                        except Exception as wd_err:
                            print(f"[TagWorker] WD Tagger predictive path failed on {task_id}: {wd_err}")

                    # Model E: DesignRuleTagger
                    if "design_rule" in models_to_run:
                        rules_tags = []
                        filename_lower = os.path.basename(file_path).lower()
                        
                        # Rule-based heuristics matching filename
                        if "ppt" in filename_lower or "slide" in filename_lower:
                            rules_tags.append("PPT封面")
                        if "ui" in filename_lower or "dashboard" in filename_lower:
                            rules_tags.append("UI设计图")
                        if "poster" in filename_lower or "海报" in filename_lower:
                            rules_tags.append("海报")
                            
                        for rt in rules_tags:
                            all_extracted_tags.append({
                                "name": rt,
                                "confidence": 0.85,
                                "category": "usage",
                                "source": "custom_rule"
                            })

                    # 4. Check Qwen-VL Fallback Triggers
                    run_qwen_fallback = False
                    qwen_reason = ""
                    
                    # Condition 1: visual router confidence < 0.45
                    visual_confidence = route_result.get("confidence", 1.0)
                    if visual_confidence < 0.45:
                        run_qwen_fallback = True
                        qwen_reason = f"Low visual router confidence ({visual_confidence:.4f})"
                    
                    # Condition 2: less than 3 tags extracted from primary models
                    primary_fused_tags = fuse_and_clean_tags(all_extracted_tags, max_tags=30)
                    if len(primary_fused_tags) < 3 and asset_type in ["ui", "unknown"]:
                        run_qwen_fallback = True
                        qwen_reason = f"Fewer than 3 tags extracted ({len(primary_fused_tags)})"
                        
                    # Condition 3: No competitive heavy model currently loaded (to prevent memory crash)
                    is_joycaption_loaded = "joycaption" in self.model_manager.loaded_models
                    
                    # Run Qwen-VL if conditions met and no competitor loaded
                    if run_qwen_fallback and not is_joycaption_loaded:
                        try:
                            print(f"[TagWorker] Qwen-VL Fallback Triggered! Reason: {qwen_reason}")
                            await self.model_manager.load_model("qwen_vl")
                            qwen_info = self.model_manager.loaded_models.get("qwen_vl")
                            qwen_model = qwen_info.get("instance") if qwen_info else None
                            if qwen_model:
                                qwen_res = qwen_model.analyze(file_path, qwen_reason)
                                # Map Qwen fallback tags to extraction list
                                for q_tag in qwen_res.get("tags", []):
                                    all_extracted_tags.append({
                                        "name": q_tag["name"],
                                        "confidence": q_tag["confidence"],
                                        "category": "custom",
                                        "source": "qwen_vl_fallback"
                                    })
                        except Exception as qwen_err:
                            print(f"[TagWorker] Qwen-VL fallback analysis path failed: {qwen_err}")

                    # 5. Tags Fusion Layer
                    final_tags = fuse_and_clean_tags(all_extracted_tags, florence_semantic_tags=florence_semantic_tags, max_tags=30)
                    
                    # 6. Translate Caption to Chinese
                    caption_en = caption_text_to_save
                    caption_zh = ""
                    caption_translated_by = "none"
                    if caption_en:
                        try:
                            # Load translation model via ModelManager
                            await self.model_manager.load_model("translation")
                            trans_info = self.model_manager.loaded_models.get("translation")
                            t_service = trans_info.get("instance") if trans_info else None
                            if t_service:
                                from utils.translation_cache import TranslationCache
                                t_cache = TranslationCache()
                                cached_val = t_cache.get(caption_en, source_lang="en", target_lang="zh", domain="caption")
                                if cached_val:
                                    caption_zh = cached_val
                                    caption_translated_by = "cache"
                                else:
                                    caption_zh = t_service.translate_caption(caption_en)
                                    if caption_zh:
                                        caption_zh = caption_zh.replace("【翻译】", "").replace("【翻译 :】", "").strip()
                                        caption_translated_by = getattr(t_service, "backend", "opus_mt_en_zh")
                                        t_cache.set(caption_en, caption_zh, source_lang="en", target_lang="zh", domain="caption", model_name=caption_translated_by)
                        except Exception as t_err:
                            print(f"[TagWorker] Failed to translate caption '{caption_en}': {t_err}")
                            caption_zh = caption_en
                            caption_translated_by = "fallback"

                    raw_payload_dict = {
                        "visual_router": route_result,
                        "florence": {
                            "caption": caption_zh or caption_en,
                            "caption_en": caption_en,
                            "caption_translated_by": caption_translated_by,
                            "ocr_text": florence_ocr_text_val or ocr_text_to_save,
                            "objects": [],
                            "regions": []
                        },
                        "florence_semantic_router": semantic_result or {},
                        "evidence": semantic_result.get("evidence", []) if semantic_result else []
                    }
                    
                    # Attach the raw_payload_dict to each tag in final_tags so it's serialized by Electron
                    for tag in final_tags:
                        tag["raw_payload"] = raw_payload_dict
                    
                    # 7. Serialization and Task queue update
                    result = {
                        "tags": final_tags,
                        "caption": caption_zh or caption_en,
                        "caption_en": caption_en,
                        "caption_translated_by": caption_translated_by,
                        "ocr_text": ocr_text_to_save,
                        "objects": {},
                        "width": width,
                        "height": height
                    }
                    
                    self.queue.update_task_status(task_id, "completed", result=result)
                    print(f"[TagWorker] Task {task_id} cooperative tagging completed successfully with {len(final_tags)} tags.")

                # Refresh keepAlive timer for loaded models to stay warm
                active_models = list(self.model_manager.loaded_models.keys())
                for name in active_models:
                    self.model_manager.touch_model(name)

            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[TagWorker] Error inside loop iteration: {e}")
                await asyncio.sleep(1.0)
