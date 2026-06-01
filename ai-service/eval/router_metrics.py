from typing import List, Dict, Any

class RouterMetricsCalculator:
    """
    Performance Metrics Calculator for VisualRouter evaluation.
    Computes Accuracy, Precision, Recall, F1-Score, and Confusion Matrix.
    Excludes synthetic samples from accuracy calculations.
    """
    
    @staticmethod
    def compute_metrics(results: List[Dict[str, Any]], skipped_hf_datasets: List[str] = None, 
                        skipped_reasons: Dict[str, str] = None) -> Dict[str, Any]:
        """
        Computes comprehensive metrics from evaluation results on real samples only.
        """
        if skipped_hf_datasets is None:
            skipped_hf_datasets = []
        if skipped_reasons is None:
            skipped_reasons = {}

        total_all = len(results)
        
        # Split real vs synthetic
        real_results = [r for r in results if r.get("sample_type") == "real" or r.get("user_manual", False)]
        synthetic_results = [r for r in results if r.get("sample_type") == "synthetic_smoke"]
        
        real_count = len(real_results)
        synthetic_count = len(synthetic_results)
        
        categories = ["anime", "illustration", "photo", "product", "design", "ui", "document", "unknown"]
        
        # If there are no real samples, set default metrics and handle gracefully
        if real_count == 0:
            return {
                "overall_samples": total_all,
                "real_sample_count": 0,
                "synthetic_smoke_sample_count": synthetic_count,
                "overall_accuracy": 0.0,
                "macro_precision": 0.0,
                "macro_recall": 0.0,
                "macro_f1_score": 0.0,
                "class_metrics": {cat: {"true_positives": 0, "false_positives": 0, "false_negatives": 0, "precision": 0.0, "recall": 0.0, "f1_score": 0.0} for cat in categories},
                "pipeline_accuracy": {},
                "confusion_matrix": {cat: {c: 0 for c in categories} for cat in categories},
                "wd_fp_rate": 0.0,
                "unknown_fp_rate": 0.0,
                "margin_metrics": {"average_margin": 0.0, "buckets": {"< 0.08": 0, "0.08 - 0.20": 0, "> 0.20": 0}},
                "skipped_datasets_count": len(skipped_hf_datasets),
                "skipped_reasons": skipped_reasons
            }

        # 1. Accuracy
        correct_count = sum(1 for r in real_results if r["predicted_type"] == r["expected_type"])
        accuracy = correct_count / real_count

        # 2. Confusion Matrix and Class-level metrics on REAL samples ONLY
        class_metrics = {}
        confusion_matrix = {cat: {c: 0 for c in categories} for cat in categories}

        # Populate confusion matrix once for real results
        for r in real_results:
            expected = r["expected_type"]
            predicted = r["predicted_type"]
            if expected in categories and predicted in categories:
                confusion_matrix[expected][predicted] += 1

        for cat in categories:
            tp = 0
            fp = 0
            fn = 0
            tn = 0

            for r in real_results:
                expected = r["expected_type"]
                predicted = r["predicted_type"]

                if expected == cat and predicted == cat:
                    tp += 1
                elif expected != cat and predicted == cat:
                    fp += 1
                elif expected == cat and predicted != cat:
                    fn += 1
                else:
                    tn += 1

            precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

            class_metrics[cat] = {
                "true_positives": tp,
                "false_positives": fp,
                "false_negatives": fn,
                "true_negatives": tn,
                "precision": round(precision, 4),
                "recall": round(recall, 4),
                "f1_score": round(f1, 4)
            }

        # 3. Macro metrics on active classes
        active_p = [class_metrics[c]["precision"] for c in categories]
        active_r = [class_metrics[c]["recall"] for c in categories]
        active_f = [class_metrics[c]["f1_score"] for c in categories]

        macro_precision = sum(active_p) / len(categories)
        macro_recall = sum(active_r) / len(categories)
        macro_f1 = sum(active_f) / len(categories)

        # 4. Pipeline recommendation match rates on REAL samples
        wd_correct = sum(1 for r in real_results if r["predicted_wd_tagger"] == r["expected_wd_tagger"])
        ram_correct = sum(1 for r in real_results if r["predicted_ram"] == r["expected_ram"])
        florence_correct = sum(1 for r in real_results if r["predicted_florence"] == r["expected_florence"])
        clip_correct = sum(1 for r in real_results if r["predicted_clip"] == r["expected_clip"])

        pipeline_accuracy = {
            "wd_tagger_match_rate": round(wd_correct / real_count, 4),
            "ram_match_rate": round(ram_correct / real_count, 4),
            "florence_match_rate": round(florence_correct / real_count, 4),
            "clip_design_match_rate": round(clip_correct / real_count, 4)
        }

        # 5. WD False Positive Rate
        # FPR = FP / (FP + TN) where target condition is expected_wd_tagger = False
        wd_neg_results = [r for r in real_results if not r["expected_wd_tagger"]]
        wd_neg_count = len(wd_neg_results)
        wd_fp_count = sum(1 for r in wd_neg_results if r["predicted_wd_tagger"])
        wd_fp_rate = wd_fp_count / wd_neg_count if wd_neg_count > 0 else 0.0

        # 6. Unknown False Positive Rate
        # FPR = (Predicted UNKNOWN when expected is NOT UNKNOWN) / (Total expected NOT UNKNOWN)
        unknown_neg_results = [r for r in real_results if r["expected_type"] != "unknown"]
        unknown_neg_count = len(unknown_neg_results)
        unknown_fp_count = sum(1 for r in unknown_neg_results if r["predicted_type"] == "unknown")
        unknown_fp_rate = unknown_fp_count / unknown_neg_count if unknown_neg_count > 0 else 0.0

        # 7. Top1/Top2 margin distribution on REAL samples
        MARGIN_THRESHOLD = 0.08
        margins = [r.get("margin", 0.0) for r in real_results]
        avg_margin = sum(margins) / real_count if real_count > 0 else 0.0
        
        bucket_low = sum(1 for m in margins if m < MARGIN_THRESHOLD)
        bucket_mid = sum(1 for m in margins if MARGIN_THRESHOLD <= m <= 0.20)
        bucket_high = sum(1 for m in margins if m > 0.20)
        margin_metrics = {
            "average_margin": round(avg_margin, 4),
            "buckets": {
                "< 0.08": bucket_low,
                "0.08 - 0.20": bucket_mid,
                "> 0.20": bucket_high
            }
        }

        return {
            "overall_samples": total_all,
            "real_sample_count": real_count,
            "synthetic_smoke_sample_count": synthetic_count,
            "overall_accuracy": round(accuracy, 4),
            "macro_precision": round(macro_precision, 4),
            "macro_recall": round(macro_recall, 4),
            "macro_f1_score": round(macro_f1, 4),
            "class_metrics": class_metrics,
            "pipeline_accuracy": pipeline_accuracy,
            "confusion_matrix": confusion_matrix,
            "wd_fp_rate": round(wd_fp_rate, 4),
            "unknown_fp_rate": round(unknown_fp_rate, 4),
            "margin_metrics": margin_metrics,
            "skipped_datasets_count": len(skipped_hf_datasets),
            "skipped_reasons": skipped_reasons
        }
