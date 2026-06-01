import os
import json
import asyncio
import sys
from typing import Dict, Any, List

# Append parent directories to allow local service imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.visual_router import VisualRouter
from eval.dataset_builder import EvaluationDatasetBuilder
from eval.router_metrics import RouterMetricsCalculator
from eval.router_report import RouterReportGenerator

class VisualRouterEvaluator:
    """
    Main VisualRouter evaluation execution engine.
    Orchestrates dataset loading, zero-shot visual pipeline predictions,
    metric computation and markdown report packaging.
    """
    def __init__(self):
        self.eval_dir = os.path.dirname(os.path.abspath(__file__))
        self.dataset_path = os.path.join(self.eval_dir, "router_eval_dataset.json")
        self.synthetic_dataset_path = os.path.join(self.eval_dir, "smoke", "synthetic_router_dataset.json")
        self.reports_dir = os.path.join(self.eval_dir, "reports")
        self.results_path = os.path.join(self.reports_dir, "router_eval_results.json")
        
        os.makedirs(self.reports_dir, exist_ok=True)

    async def execute_evaluation(self, force_rebuild_dataset: bool = False) -> Dict[str, Any]:
        """
        Runs the full evaluation benchmark suite synchronously/asynchronously.
        """
        # 1. Check or build dataset
        if not os.path.exists(self.dataset_path) or force_rebuild_dataset:
            print("[Evaluator] Target datasets not found or force_rebuild active. Re-building dataset...")
            builder = EvaluationDatasetBuilder(output_dir=self.eval_dir)
            builder.build_dataset()

        all_samples = []
        skipped_hf_datasets = []
        skipped_reasons = {}

        # Load Real Dataset if exists
        if os.path.exists(self.dataset_path):
            with open(self.dataset_path, "r", encoding="utf-8") as f:
                real_dataset = json.load(f)
            skipped_hf_datasets = real_dataset.get("skipped_huggingface_datasets", [])
            skipped_reasons = real_dataset.get("skipped_reasons", {})
            for s in real_dataset.get("samples", []):
                s["sample_type"] = "real"
                all_samples.append(s)

        # Load Synthetic Smoke Dataset if exists
        if os.path.exists(self.synthetic_dataset_path):
            with open(self.synthetic_dataset_path, "r", encoding="utf-8") as f:
                syn_dataset = json.load(f)
            for s in syn_dataset.get("samples", []):
                s["sample_type"] = "synthetic_smoke"
                all_samples.append(s)

        total_samples = len(all_samples)
        print(f"[Evaluator] Successfully loaded {total_samples} total samples ({len([s for s in all_samples if s['sample_type'] == 'real'])} real, {len([s for s in all_samples if s['sample_type'] == 'synthetic_smoke'])} synthetic smoke).")

        # 2. Spin up VisualRouter
        router = VisualRouter()
        
        # Touch environment clock
        os.environ["EVAL_TIME"] = datetime_str = str(os.environ.get("CURRENT_TIME", "2026-05-28"))

        print("\n[Evaluator] Commencing SigLIP/OpenCLIP visual routing predictions...")
        results = []
        
        count = 0
        for sample in all_samples:
            count += 1
            image_path = sample["image_path"]
            sample_id = sample["id"]
            sample_type = sample["sample_type"]
            user_manual = sample.get("user_manual", False)
            
            if count % 20 == 0 or count == total_samples:
                print(f"   - Processing visual routes: {count}/{total_samples} ({(count/total_samples)*100:.1f}%)")

            # Execute visual router pipeline
            try:
                # Absolute path checks
                if not os.path.isabs(image_path):
                    image_path = os.path.join(self.eval_dir, image_path)
                
                route = await router.route(image_path)
                predicted_type = route["primary_type"]
                pipeline = route["recommended_pipeline"]
                confidence = route["top1_score"]
                margin = route.get("margin", 0.0)

                # Extract model flags
                pred_wd = "wd_tagger" in pipeline
                pred_ram = "ram" in pipeline
                pred_flo = "florence2" in pipeline or "florence2_ocr" in pipeline
                pred_clip = "clip" in pipeline

                # DIAGNOSTICS NOTES: If prediction is wrong, note down why
                diag_notes = sample.get("notes", "")
                if predicted_type != sample["expected_primary_type"]:
                    diag_notes = f"Model chose {predicted_type.upper()} with confidence {confidence*100:.1f}% instead of {sample['expected_primary_type'].upper()}. {diag_notes}"

                results.append({
                    "id": sample_id,
                    "sample_type": sample_type,
                    "user_manual": user_manual,
                    "expected_type": sample["expected_primary_type"],
                    "predicted_type": predicted_type,
                    "confidence": float(confidence),
                    "margin": float(margin),
                    "expected_wd_tagger": bool(sample["should_use_wd_tagger"]),
                    "predicted_wd_tagger": pred_wd,
                    "expected_ram": bool(sample["should_use_ram"]),
                    "predicted_ram": pred_ram,
                    "expected_florence": bool(sample["should_use_florence"]),
                    "predicted_florence": pred_flo,
                    "expected_clip": bool(sample["should_use_clip_design"]),
                    "predicted_clip": pred_clip,
                    "notes": diag_notes
                })
            except Exception as e:
                print(f"[Evaluator] Critical prediction failure on sample {sample_id}: {e}")
                results.append({
                    "id": sample_id,
                    "sample_type": sample_type,
                    "user_manual": user_manual,
                    "expected_type": sample["expected_primary_type"],
                    "predicted_type": "unknown",
                    "confidence": 0.0,
                    "margin": 0.0,
                    "expected_wd_tagger": bool(sample["should_use_wd_tagger"]),
                    "predicted_wd_tagger": False,
                    "expected_ram": bool(sample["should_use_ram"]),
                    "predicted_ram": False,
                    "expected_florence": bool(sample["should_use_florence"]),
                    "predicted_florence": False,
                    "expected_clip": bool(sample["should_use_clip_design"]),
                    "predicted_clip": False,
                    "notes": f"Evaluation error: {e}"
                })

        # 3. Compute Metrics
        print("[Evaluator] Computing classification performance ledger metrics...")
        metrics = RouterMetricsCalculator.compute_metrics(results, skipped_hf_datasets, skipped_reasons)

        # 4. Generate Markdown Report
        print("[Evaluator] Generating premium benchmark reporting package...")
        report_path = RouterReportGenerator.generate_markdown_report(metrics, results, self.reports_dir)

        # 5. Save raw JSON results for persistence
        output_payload = {
            "evaluation_time": datetime_str,
            "overall_summary": {
                "total_samples": metrics.get("overall_samples", 0),
                "real_sample_count": metrics.get("real_sample_count", 0),
                "synthetic_smoke_sample_count": metrics.get("synthetic_smoke_sample_count", 0),
                "overall_accuracy": metrics.get("overall_accuracy", 0.0),
                "macro_f1_score": metrics.get("macro_f1_score", 0.0)
            },
            "metrics": metrics,
            "individual_predictions": results
        }
        
        with open(self.results_path, "w", encoding="utf-8") as f:
            json.dump(output_payload, f, indent=2, ensure_ascii=False)

        print(f"[Evaluator] Saved raw JSON results to {self.results_path}")
        print(f"[Evaluator] Evaluation fully completed!")
        return output_payload

if __name__ == "__main__":
    evaluator = VisualRouterEvaluator()
    asyncio.run(evaluator.execute_evaluation(force_rebuild_dataset=False))
