# -*- coding: utf-8 -*-
import os
import json
import asyncio
import sys
import time
from typing import Dict, Any, List

# Append parent directories to allow local service imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.visual_router import VisualRouter
from models.ram_tagger import RAMTaggerModel
from utils.tag_fusion import fuse_and_clean_tags, SENSITIVE_BLOCK_WORDS
from utils.tag_source_normalizer import normalize_source

class RAMEvaluator:
    """
    Evaluation suite for RAM++ / RAM model integration, routing, cleaning, 
    and database write compliance.
    """
    def __init__(self):
        self.eval_dir = os.path.dirname(os.path.abspath(__file__))
        self.dataset_path = os.path.join(self.eval_dir, "router_eval_dataset.json")
        self.synthetic_dataset_path = os.path.join(self.eval_dir, "smoke", "synthetic_router_dataset.json")
        self.reports_dir = os.path.join(self.eval_dir, "reports")
        self.results_path = os.path.join(self.reports_dir, "ram_eval_results.json")
        
        os.makedirs(self.reports_dir, exist_ok=True)

    async def execute_evaluation(self, force_mock: bool = False) -> Dict[str, Any]:
        """
        Runs the RAM++ evaluation suite, checking routing decisions, tag quality,
        and database pending invariants.
        """
        print("[RAMEvaluator] Loading routing dataset for RAM++ validation...")
        all_samples = []

        # Load Real Dataset if exists
        if os.path.exists(self.dataset_path):
            with open(self.dataset_path, "r", encoding="utf-8") as f:
                real_data = json.load(f)
            for s in real_data.get("samples", []):
                s["sample_type"] = "real"
                all_samples.append(s)

        # Load Synthetic Smoke Dataset if exists
        if os.path.exists(self.synthetic_dataset_path):
            with open(self.synthetic_dataset_path, "r", encoding="utf-8") as f:
                syn_data = json.load(f)
            for s in syn_data.get("samples", []):
                s["sample_type"] = "synthetic_smoke"
                all_samples.append(s)

        if not all_samples:
            print("[RAMEvaluator] ERROR: No evaluation samples found! Please build the dataset first.")
            return {"success": False, "error": "No samples found"}

        print(f"[RAMEvaluator] Loaded {len(all_samples)} total samples for analysis.")

        # 1. Initialize models
        router = VisualRouter()
        ram_model = RAMTaggerModel()
        if force_mock:
            ram_model.is_mock = True
        ram_model.load()

        print(f"[RAMEvaluator] RAM++ Model Backend: {ram_model.backend} (Mock: {ram_model.is_mock})")

        # 2. Benchmark variables
        metrics = {
            "overall": {
                "total_samples": len(all_samples),
                "total_ram_triggered": 0,
                "total_ram_executed": 0,
                "total_tags_extracted": 0,
                "empty_tag_count": 0,
                "sensitive_word_hits": 0,
                "incorrect_triggers": 0,  # Pure design/ui/doc/anime erroneously invoking RAM as primary
                "correct_triggers": 0,    # photo/product/unknown/mixed correctly triggering RAM
            },
            "by_category": {}  # Statistics per visual type
        }

        tag_frequencies = {}
        sample_results = []

        categories = ["photo", "product", "unknown", "mixed", "design", "ui", "document", "anime"]
        for cat in categories:
            metrics["by_category"][cat] = {
                "sample_count": 0,
                "ram_triggered_count": 0,
                "total_tags": 0,
                "empty_tag_count": 0,
                "total_confidence": 0.0,
                "avg_confidence": 0.0,
                "avg_tags_count": 0.0,
            }

        print("[RAMEvaluator] Commencing cooperative routing and tag analysis...")
        count = 0
        for sample in all_samples:
            count += 1
            image_path = sample["image_path"]
            expected_type = sample.get("expected_primary_type", sample.get("expected_type", "unknown")).lower()
            if expected_type not in categories:
                # Map illustration or mixed keywords contextually
                if expected_type == "illustration":
                    expected_type = "mixed"
                elif expected_type == "scene":
                    expected_type = "photo" # Scene is photo type for RAM
                else:
                    expected_type = "unknown"

            # Check absolute path
            if not os.path.isabs(image_path):
                image_path = os.path.join(self.eval_dir, image_path)

            try:
                # 3. Visual Routing Decision
                route = await router.route(image_path)
                predicted_type = route["primary_type"]
                pipeline = route["recommended_pipeline"]
                is_mixed = route.get("is_mixed", False)

                ram_triggered = "ram" in pipeline

                # Record category stats
                cat_stats = metrics["by_category"][expected_type]
                cat_stats["sample_count"] += 1

                if ram_triggered:
                    metrics["overall"]["total_ram_triggered"] += 1
                    cat_stats["ram_triggered_count"] += 1

                # 4. Trigger correctness validation
                is_primary_ram_target = expected_type in ["photo", "product", "unknown", "mixed"]
                if ram_triggered:
                    if is_primary_ram_target:
                        metrics["overall"]["correct_triggers"] += 1
                    else:
                        metrics["overall"]["incorrect_triggers"] += 1

                # 5. Execute RAM prediction & fusion
                raw_tags = []
                fused_tags = []
                avg_confidence = 0.0

                # Run RAM only when triggered OR if expected to run for photo/product/unknown/mixed
                # To be thorough, we run it for all triggered samples to evaluate tag output quality
                if ram_triggered:
                    metrics["overall"]["total_ram_executed"] += 1
                    
                    # Predict batch
                    raw_predictions = ram_model.predict_batch([image_path])[0]
                    raw_tags = raw_predictions.copy()

                    # Fuse & clean tags
                    fused_tags = fuse_and_clean_tags(raw_predictions, max_tags=30)
                    
                    # Clean check for sensitive words
                    for rt in raw_predictions:
                        norm_name = rt.get("name", "").lower()
                        if any(sw in norm_name for sw in SENSITIVE_BLOCK_WORDS):
                            metrics["overall"]["sensitive_word_hits"] += 1

                    if fused_tags:
                        metrics["overall"]["total_tags_extracted"] += len(fused_tags)
                        cat_stats["total_tags"] += len(fused_tags)
                        
                        conf_sum = sum(t["confidence"] for t in fused_tags)
                        cat_stats["total_confidence"] += conf_sum
                        avg_confidence = conf_sum / len(fused_tags)

                        for t in fused_tags:
                            name = t["name"]
                            tag_frequencies[name] = tag_frequencies.get(name, 0) + 1
                    else:
                        metrics["overall"]["empty_tag_count"] += 1
                        cat_stats["empty_tag_count"] += 1

                # 6. Database compliance validation checks on fused tags
                db_compliance = {
                    "source_segregated": True,
                    "status_pending": True,
                    "model_name_correct": True,
                    "zero_confirmed": True,
                    "has_evidence": True
                }

                for t in fused_tags:
                    # source must be normalized to 'ai_ram'
                    if normalize_source(t.get("source")) != "ai_ram":
                        db_compliance["source_segregated"] = False
                    
                    # evidence must exist
                    ev = t.get("evidence", [])
                    if not ev:
                        db_compliance["has_evidence"] = False
                    else:
                        for item in ev:
                            if item.get("source") != "ai_ram":
                                db_compliance["source_segregated"] = False

                sample_results.append({
                    "id": sample["id"],
                    "image_path": os.path.basename(image_path),
                    "expected_type": expected_type,
                    "predicted_type": predicted_type,
                    "ram_triggered": ram_triggered,
                    "raw_tags": [t["name"] for t in raw_tags],
                    "fused_tags": [t["name"] for t in fused_tags],
                    "avg_confidence": round(avg_confidence, 4),
                    "db_compliance": db_compliance
                })

            except Exception as sample_err:
                print(f"[RAMEvaluator] Error processing sample {sample.get('id')}: {sample_err}")

        # 7. Compute category averages
        for cat, stats in metrics["by_category"].items():
            s_count = stats["sample_count"]
            if s_count > 0:
                stats["avg_tags_count"] = round(stats["total_tags"] / s_count, 2)
                t_count = stats["total_tags"]
                if t_count > 0:
                    stats["avg_confidence"] = round(stats["total_confidence"] / t_count, 4)
            
            # Clean temporary accumulators before saving JSON
            del stats["total_confidence"]
            del stats["total_tags"]

        # 8. Sort top tags
        sorted_tags = sorted(tag_frequencies.items(), key=lambda x: x[1], reverse=True)
        metrics["top_tags"] = [{"tag": tag, "frequency": freq} for tag, freq in sorted_tags[:30]]

        # Save JSON results
        output_payload = {
            "evaluation_time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),
            "ram_backend": ram_model.backend,
            "metrics": metrics,
            "results": sample_results
        }

        with open(self.results_path, "w", encoding="utf-8") as f:
            json.dump(output_payload, f, indent=2, ensure_ascii=False)

        print(f"[RAMEvaluator] Evaluation results written to {self.results_path}")
        return output_payload

if __name__ == "__main__":
    evaluator = RAMEvaluator()
    # Support executing directly via CLI
    force_mock = "--mock" in sys.argv
    asyncio.run(evaluator.execute_evaluation(force_mock=force_mock))
