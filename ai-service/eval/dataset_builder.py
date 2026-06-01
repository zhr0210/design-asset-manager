import os
import json
import datetime
import random
from typing import Dict, Any, List

class EvaluationDatasetBuilder:
    """
    Evaluation dataset builder for VisualRouter.
    Streams and samples public datasets from Hugging Face (Tiny ImageNet, Places365, RVL-CDIP, UI Screenshots)
    and merges them with manual local anime/illustration folders, generating local image copies under 
    eval/datasets/sampled/ and outputting router_eval_dataset.json.
    
    Provides highly functional PIL fallback image generator in case of network timeouts or HF downtime,
    but isolates synthetic images strictly inside eval/smoke/synthetic_router_dataset.json so they
    never contaminate official accuracy benchmark metrics.
    """
    
    DEFAULT_CONFIG = {
        "photo": 50,
        "scene": 50,
        "document": 50,
        "ui": 50,
        "design": 50,
        "anime": 30,
        "illustration": 30,
        "unknown": 20
    }

    def __init__(self, output_dir: str = None):
        if output_dir is None:
            self.eval_dir = os.path.dirname(os.path.abspath(__file__))
        else:
            self.eval_dir = output_dir

        self.datasets_dir = os.path.join(self.eval_dir, "datasets")
        self.sampled_dir = os.path.join(self.datasets_dir, "sampled")
        self.raw_dir = os.path.join(self.datasets_dir, "raw")
        self.manual_anime_dir = os.path.join(self.datasets_dir, "manual", "anime")
        self.manual_illustration_dir = os.path.join(self.datasets_dir, "manual", "illustration")
        self.manual_design_dir = os.path.join(self.datasets_dir, "manual", "design")
        
        # Create directories
        for d in [self.eval_dir, self.datasets_dir, self.sampled_dir, self.raw_dir,
                  self.manual_anime_dir, self.manual_illustration_dir, self.manual_design_dir]:
            os.makedirs(d, exist_ok=True)

    def build_dataset(self, config: Dict[str, int] = None) -> Dict[str, Any]:
        """
        Main execution flow to build the evaluation datasets.
        Splits samples into real (router_eval_dataset.json) and synthetic smoke (eval/smoke/synthetic_router_dataset.json)
        """
        if config is None:
            config = self.DEFAULT_CONFIG

        print(f"[DatasetBuilder] Initializing router evaluation dataset builder in {self.eval_dir}...")
        
        real_samples = []
        synthetic_samples = []
        skipped_datasets = []
        skipped_reasons = {}

        # Category 1: Photo (Tiny ImageNet)
        photo_real, photo_syn, skipped, reason = self._build_hf_category(
            category="photo",
            target_count=config["photo"],
            dataset_name="zh-plus/tiny-imagenet",
            expected_primary="photo",
            pipeline=["ram", "design_rule"],
            expected_secondary=["photo", "subject"]
        )
        real_samples.extend(photo_real)
        synthetic_samples.extend(photo_syn)
        if skipped:
            skipped_datasets.append("zh-plus/tiny-imagenet")
            skipped_reasons["zh-plus/tiny-imagenet"] = reason

        # Category 2: Scene / Photo (Places365 Val)
        scene_real, scene_syn, skipped, reason = self._build_hf_category(
            category="scene",
            target_count=config["scene"],
            dataset_name="dpdl-benchmark/Places365-Validation",
            expected_primary="photo",
            pipeline=["ram", "design_rule"],
            expected_secondary=["photo", "scene"]
        )
        real_samples.extend(scene_real)
        synthetic_samples.extend(scene_syn)
        if skipped:
            skipped_datasets.append("dpdl-benchmark/Places365-Validation")
            skipped_reasons["dpdl-benchmark/Places365-Validation"] = reason

        # Category 3: Document (RVL-CDIP small)
        doc_real, doc_syn, skipped, reason = self._build_hf_category(
            category="document",
            target_count=config["document"],
            dataset_name="jordyvl/rvl_cdip_100_examples_per_class",
            expected_primary="document",
            pipeline=["florence2_ocr", "design_rule"],
            expected_secondary=["document", "text"]
        )
        real_samples.extend(doc_real)
        synthetic_samples.extend(doc_syn)
        if skipped:
            skipped_datasets.append("jordyvl/rvl_cdip_100_examples_per_class")
            skipped_reasons["jordyvl/rvl_cdip_100_examples_per_class"] = reason

        # Category 4: UI (UI Screenshots / Web UI)
        ui_real, ui_syn, skipped, reason = self._build_hf_category(
            category="ui",
            target_count=config["ui"],
            dataset_name="lmoroney/uiscreenshots",
            expected_primary="ui",
            pipeline=["florence2_ocr", "clip"],
            expected_secondary=["ui", "layout"]
        )
        real_samples.extend(ui_real)
        synthetic_samples.extend(ui_syn)
        if skipped:
            skipped_datasets.append("lmoroney/uiscreenshots")
            skipped_reasons["lmoroney/uiscreenshots"] = reason

        # Category 5: Design (LAION improved aesthetics)
        design_real, design_syn, skipped, reason = self._build_hf_category(
            category="design",
            target_count=config["design"],
            dataset_name="bhargavsdesai/laion_improved_aesthetics_6.5plus_with_images",
            expected_primary="design",
            pipeline=["florence2", "clip", "design_rule"],
            expected_secondary=["design", "aesthetic"],
            notes="LAION high aesthetics subset, representing creative illustrations/posters."
        )
        real_samples.extend(design_real)
        synthetic_samples.extend(design_syn)
        if skipped:
            skipped_datasets.append("bhargavsdesai/laion_improved_aesthetics_6.5plus_with_images")
            skipped_reasons["bhargavsdesai/laion_improved_aesthetics_6.5plus_with_images"] = reason

        # Category 6 & 7: Manual Anime & Illustration scanning
        anime_real, anime_syn = self._scan_manual_category(
            category="anime",
            directory=self.manual_anime_dir,
            target_count=config["anime"],
            pipeline=["wd_tagger", "ram"],
            expected_secondary=["anime", "character"]
        )
        real_samples.extend(anime_real)
        synthetic_samples.extend(anime_syn)

        illus_real, illus_syn = self._scan_manual_category(
            category="illustration",
            directory=self.manual_illustration_dir,
            target_count=config["illustration"],
            pipeline=["wd_tagger", "ram"],
            expected_secondary=["illustration", "art"]
        )
        real_samples.extend(illus_real)
        synthetic_samples.extend(illus_syn)

        # Category 8: Unknown / Mixed
        unknown_syn = self._generate_mixed_category(
            target_count=config["unknown"]
        )
        synthetic_samples.extend(unknown_syn)

        # Write REAL dataset to router_eval_dataset.json
        payload_real = {
            "dataset_name": "VisualRouter Real Evaluation Dataset",
            "created_at": datetime.datetime.utcnow().isoformat() + "Z",
            "config": {
                "samples_per_class": config
            },
            "skipped_huggingface_datasets": skipped_datasets,
            "skipped_reasons": skipped_reasons,
            "samples": real_samples
        }
        json_path_real = os.path.join(self.eval_dir, "router_eval_dataset.json")
        with open(json_path_real, "w", encoding="utf-8") as f:
            json.dump(payload_real, f, indent=2, ensure_ascii=False)

        # Write SYNTHETIC dataset to eval/smoke/synthetic_router_dataset.json
        smoke_dir = os.path.join(self.eval_dir, "smoke")
        os.makedirs(smoke_dir, exist_ok=True)
        payload_syn = {
            "dataset_name": "VisualRouter Synthetic Smoke Test Dataset",
            "created_at": datetime.datetime.utcnow().isoformat() + "Z",
            "config": {
                "samples_per_class": config
            },
            "samples": synthetic_samples
        }
        json_path_syn = os.path.join(smoke_dir, "synthetic_router_dataset.json")
        with open(json_path_syn, "w", encoding="utf-8") as f:
            json.dump(payload_syn, f, indent=2, ensure_ascii=False)

        print(f"\n[DatasetBuilder] Successfully generated datasets:")
        print(f"   - REAL EVALUATION DATASET: {json_path_real} ({len(real_samples)} real samples)")
        print(f"   - SYNTHETIC SMOKE DATASET: {json_path_syn} ({len(synthetic_samples)} synthetic samples)")
        
        if skipped_datasets:
            print(f"[DatasetBuilder] WARNING: {len(skipped_datasets)} datasets were skipped during real download:")
            for sd in skipped_datasets:
                print(f"   - {sd} skipped. Reason: {skipped_reasons[sd]}")

        return payload_real

    def _build_hf_category(self, category: str, target_count: int, dataset_name: str, 
                           expected_primary: str, pipeline: List[str], expected_secondary: List[str],
                           notes: str = "") -> tuple:
        """
        Tries to load HF dataset with streaming=True.
        Stores real downloads in real_samples and fallbacks in synthetic_samples.
        """
        real_samples = []
        synthetic_samples = []
        skipped = False
        skipped_reason = ""

        print(f"[Category Builder] Gathering {target_count} samples for '{category}' using '{dataset_name}'...")
        
        try:
            # Check HF datasets library
            from datasets import load_dataset
            from PIL import Image
            
            # Stream dataset to avoid huge downloads
            ds = load_dataset(dataset_name, split="train", streaming=True, trust_remote_code=True)
            iterator = iter(ds)
            
            count = 0
            for _ in range(target_count * 3): # try up to 3x count due to empty/corrupted rows
                if count >= target_count:
                    break
                try:
                    item = next(iterator)
                    img = None
                    
                    # Resolve image column (varies in datasets)
                    for col in ["image", "img", "image_path", "file"]:
                        if col in item:
                            val = item[col]
                            if isinstance(val, Image.Image):
                                img = val
                                break
                            elif isinstance(val, str) and os.path.exists(val):
                                img = Image.open(val)
                                break
                            elif isinstance(val, dict) and "bytes" in val and val["bytes"] is not None:
                                import io
                                img = Image.open(io.BytesIO(val["bytes"]))
                                break
                    
                    if img is None:
                        continue

                    # Save local copy
                    img_filename = f"sampled_{category}_{count + 1:03d}.jpg"
                    img_local_path = os.path.join(self.sampled_dir, img_filename)
                    img.convert("RGB").save(img_local_path, "JPEG")

                    real_samples.append({
                        "id": f"sample-{category}-{count + 1:03d}",
                        "image_path": img_local_path,
                        "source_dataset": dataset_name,
                        "expected_primary_type": expected_primary,
                        "expected_secondary_types": expected_secondary,
                        "should_use_wd_tagger": "wd_tagger" in pipeline,
                        "should_use_ram": "ram" in pipeline,
                        "should_use_florence": "florence2" in pipeline or "florence2_ocr" in pipeline,
                        "should_use_clip_design": "clip" in pipeline,
                        "notes": notes or f"Streamed from public {dataset_name}.",
                        "sample_type": "real",
                        "user_manual": False
                    })
                    count += 1
                except StopIteration:
                    break
                except Exception as row_err:
                    # Skip corrupt rows silently
                    continue

            if count < target_count:
                print(f"[Category Builder] HF dataset '{dataset_name}' streamed only {count}/{target_count}.")
                # Generate synthetic fallbacks for the rest, but strictly mark them as synthetic_smoke!
                for i in range(count, target_count):
                    path = self._generate_pil_fallback(category, i + 1)
                    synthetic_samples.append({
                        "id": f"sample-{category}-{i + 1:03d}",
                        "image_path": path,
                        "source_dataset": "PIL Fallback Generator",
                        "expected_primary_type": expected_primary,
                        "expected_secondary_types": expected_secondary,
                        "should_use_wd_tagger": "wd_tagger" in pipeline,
                        "should_use_ram": "ram" in pipeline,
                        "should_use_florence": "florence2" in pipeline or "florence2_ocr" in pipeline,
                        "should_use_clip_design": "clip" in pipeline,
                        "notes": f"Synthesized fallback image for failed/partial public {dataset_name}.",
                        "sample_type": "synthetic_smoke",
                        "user_manual": False
                    })
        
        except Exception as e:
            print(f"[Category Builder] HF loading failed for '{dataset_name}': {e}.")
            skipped = True
            skipped_reason = str(e)
            # Create ONLY synthetic_smoke samples
            for i in range(target_count):
                path = self._generate_pil_fallback(category, i + 1)
                synthetic_samples.append({
                    "id": f"sample-{category}-{i + 1:03d}",
                    "image_path": path,
                    "source_dataset": "PIL Fallback Generator",
                    "expected_primary_type": expected_primary,
                    "expected_secondary_types": expected_secondary,
                    "should_use_wd_tagger": "wd_tagger" in pipeline,
                    "should_use_ram": "ram" in pipeline,
                    "should_use_florence": "florence2" in pipeline or "florence2_ocr" in pipeline,
                    "should_use_clip_design": "clip" in pipeline,
                    "notes": f"Synthesized fallback image for failed public {dataset_name}.",
                    "sample_type": "synthetic_smoke",
                    "user_manual": False
                })

        return real_samples, synthetic_samples, skipped, skipped_reason

    def _scan_manual_category(self, category: str, directory: str, target_count: int,
                              pipeline: List[str], expected_secondary: List[str]) -> tuple:
        """
        Scans manual directory for user images. Real ones go to real_samples, mock fallbacks to synthetic_samples.
        """
        real_samples = []
        synthetic_samples = []
        valid_exts = (".png", ".jpg", ".jpeg", ".webp", ".bmp", ".svg")
        
        files = []
        if os.path.exists(directory):
            files = [os.path.join(directory, f) for f in os.listdir(directory) if f.lower().endswith(valid_exts)]
            
        print(f"[Manual Builder] Scanned '{directory}'. Found {len(files)} files. Target: {target_count}.")
        
        # Use found manual files as REAL samples
        count = 0
        for f in files[:target_count]:
            real_samples.append({
                "id": f"sample-{category}-{count + 1:03d}",
                "image_path": f,
                "source_dataset": "manual",
                "expected_primary_type": "anime" if category in ["anime", "illustration"] else "design",
                "expected_secondary_types": expected_secondary,
                "should_use_wd_tagger": "wd_tagger" in pipeline,
                "should_use_ram": "ram" in pipeline,
                "should_use_florence": "florence2" in pipeline or "florence2_ocr" in pipeline,
                "should_use_clip_design": "clip" in pipeline,
                "notes": f"User imported manual asset from {category} folder.",
                "sample_type": "real",
                "user_manual": True
            })
            count += 1
            
        # If not enough files, generate synthetic smoke fallbacks and place ONLY in synthetic_samples
        for i in range(count, target_count):
            path = self._generate_pil_fallback(category, i + 1)
            synthetic_samples.append({
                "id": f"sample-{category}-{i + 1:03d}",
                "image_path": path,
                "source_dataset": "PIL Mock Generator",
                "expected_primary_type": "anime" if category in ["anime", "illustration"] else "design",
                "expected_secondary_types": expected_secondary,
                "should_use_wd_tagger": "wd_tagger" in pipeline,
                "should_use_ram": "ram" in pipeline,
                "should_use_florence": "florence2" in pipeline or "florence2_ocr" in pipeline,
                "should_use_clip_design": "clip" in pipeline,
                "notes": f"Synthesized fallback image for manual {category} evaluating.",
                "sample_type": "synthetic_smoke",
                "user_manual": False
            })
            
        return real_samples, synthetic_samples

    def _generate_mixed_category(self, target_count: int) -> List[Dict[str, Any]]:
        """Generates mixed/unknown abstract placeholder samples. These are synthetic smoke test samples."""
        samples = []
        print(f"[Mixed Builder] Synthesizing {target_count} mixed/unknown placeholder assets...")
        for i in range(target_count):
            path = self._generate_pil_fallback("unknown", i + 1)
            samples.append({
                "id": f"sample-unknown-{i + 1:03d}",
                "image_path": path,
                "source_dataset": "PIL Synthesis Generator",
                "expected_primary_type": "unknown",
                "expected_secondary_types": ["mixed", "abstract"],
                "should_use_wd_tagger": False,
                "should_use_ram": True,
                "should_use_florence": False,
                "should_use_clip_design": True,
                "notes": "Abstract shape contrast asset evaluating visual router flat-tie default outcomes.",
                "sample_type": "synthetic_smoke",
                "user_manual": False
            })
        return samples

    def _generate_pil_fallback(self, category: str, idx: int) -> str:
        """
        Creates a high-fidelity synthesized PIL image on disk with specific colors and visual patterns
        that simulate the target category so the zero-shot router has physical images to evaluate.
        """
        from PIL import Image, ImageDraw, ImageFont
        
        # Dimensions
        w, h = 384, 384
        img = Image.new("RGB", (w, h), color=(240, 240, 240))
        draw = ImageDraw.Draw(img)

        # Style drawing matching category characteristics
        if category == "anime":
            draw.rectangle([0, 0, w, h], fill=(255, 230, 240)) # Soft pink
            draw.chord([50, 40, 330, 380], 180, 360, fill=(230, 100, 180)) # Hot pink hair
            draw.ellipse([90, 100, 290, 280], fill=(255, 220, 200)) # Skin tone
            draw.ellipse([120, 160, 170, 210], fill=(80, 150, 240)) # Left eye
            draw.ellipse([210, 160, 260, 210], fill=(80, 150, 240)) # Right eye
            draw.ellipse([140, 175, 165, 200], fill=(10, 10, 20)) # Pupils
            draw.ellipse([230, 175, 255, 200], fill=(10, 10, 20))
            draw.arc([160, 200, 220, 250], 0, 180, fill=(200, 50, 50), width=3)
            
        elif category == "illustration":
            draw.rectangle([0, 0, w, h], fill=(220, 240, 220)) # Light green
            draw.ellipse([20, 20, 180, 180], fill=(240, 180, 60))
            draw.polygon([(200, 50), (100, 350), (300, 350)], fill=(60, 120, 240))
            draw.ellipse([250, 20, 350, 120], fill=(240, 80, 80))
            
        elif category == "ui":
            draw.rectangle([0, 0, w, h], fill=(245, 247, 250)) # Gray-blue background
            draw.rectangle([0, 0, w, 50], fill=(255, 255, 255))
            draw.ellipse([15, 15, 35, 35], fill=(79, 70, 229)) # App logo
            draw.rectangle([60, 20, 150, 30], fill=(226, 232, 240)) # Top title
            draw.rectangle([0, 50, 60, h], fill=(255, 255, 255))
            for y in range(80, 300, 40):
                draw.rectangle([15, y, 45, y+15], fill=(241, 245, 249))
            draw.rectangle([80, 70, 360, 200], fill=(255, 255, 255)) # Card
            draw.rectangle([100, 90, 200, 120], fill=(79, 70, 229), outline=(79, 70, 229)) # Mock CTA Button
            draw.rectangle([220, 90, 340, 105], fill=(226, 232, 240))
            draw.rectangle([220, 115, 300, 125], fill=(241, 245, 249))
            
        elif category == "document":
            draw.rectangle([0, 0, w, h], fill=(255, 255, 255))
            draw.rectangle([20, 30, w-20, 70], fill=(15, 23, 42))
            for y in range(100, 340, 25):
                draw.rectangle([30, y, w-30, y+10], fill=(226, 232, 240))
            draw.rectangle([40, 130, 55, 140], fill=(99, 102, 241))
            draw.rectangle([40, 205, 55, 215], fill=(99, 102, 241))

        elif category == "design":
            for i in range(h):
                r = int(15 + (i / h) * 80)
                g = int(23 + (i / h) * 40)
                b = int(42 + (i / h) * 120)
                draw.line([(0, i), (w, i)], fill=(r, g, b))
            draw.ellipse([80, 80, 300, 300], fill=(99, 102, 241, 100)) # Transparent glow
            draw.polygon([(192, 60), (320, 280), (64, 280)], fill=(244, 63, 94))
            
        elif category == "photo" or category == "scene":
            for i in range(180):
                r = int(135 + (i / 180) * 100)
                g = int(206 + (i / 180) * 40)
                b = 250
                draw.line([(0, i), (w, i)], fill=(r, g, b))
            draw.ellipse([280, 40, 340, 100], fill=(254, 240, 138))
            draw.polygon([(0, 280), (120, 140), (240, 280)], fill=(71, 85, 105)) # mountain 1
            draw.polygon([(140, 280), (280, 110), (384, 280)], fill=(51, 65, 85)) # mountain 2
            draw.rectangle([0, 260, w, h], fill=(34, 197, 94))

        else: # Unknown abstract
            for x in range(0, w, 20):
                for y in range(0, h, 20):
                    val = random.randint(50, 200)
                    draw.rectangle([x, y, x+20, y+20], fill=(val, val, val))

        # Save to disk
        filename = f"eval_{category}_{idx:03d}.jpg"
        local_path = os.path.join(self.sampled_dir, filename)
        img.save(local_path, "JPEG")
        return local_path

if __name__ == "__main__":
    builder = EvaluationDatasetBuilder()
    builder.build_dataset()
