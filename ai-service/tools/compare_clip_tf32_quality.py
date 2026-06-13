"""Compare exact and TF32 CLIP outputs with generated in-memory fixtures."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw


AI_SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(AI_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_ROOT))

from core.cooperative_model_registry import find_downloaded_model
from core.torch_inference_runtime import configure_torch_inference_runtime


PROMPTS = [
    "a red and blue split design",
    "a green geometric checkerboard",
    "a grayscale horizontal gradient",
    "a minimal white poster with black lines",
    "a colorful circular composition",
    "a dark interface with bright accents",
]


def _failure(status: str, error: Exception | None = None) -> dict[str, Any]:
    return {
        "success": False,
        "status": status,
        "errorType": error.__class__.__name__ if error is not None else None,
    }


def _comparison_outcome(all_finite: bool) -> tuple[bool, str]:
    return (
        all_finite,
        "compared_real_model" if all_finite else "output_invalid",
    )


def _generated_images() -> list[Image.Image]:
    images: list[Image.Image] = []

    split = Image.new("RGB", (224, 224), (220, 45, 45))
    ImageDraw.Draw(split).rectangle((112, 0, 223, 223), fill=(35, 45, 210))
    images.append(split)

    checker = Image.new("RGB", (224, 224), (30, 180, 90))
    draw = ImageDraw.Draw(checker)
    for y in range(0, 224, 32):
        for x in range(0, 224, 32):
            if (x // 32 + y // 32) % 2:
                draw.rectangle((x, y, x + 31, y + 31), fill=(240, 240, 240))
    images.append(checker)

    gradient = Image.new("RGB", (224, 224))
    pixels = gradient.load()
    for y in range(224):
        for x in range(224):
            value = round(255 * x / 223)
            pixels[x, y] = (value, value, value)
    images.append(gradient)

    poster = Image.new("RGB", (224, 224), (248, 248, 248))
    draw = ImageDraw.Draw(poster)
    draw.rectangle((28, 30, 196, 38), fill=(20, 20, 20))
    draw.rectangle((28, 58, 164, 66), fill=(20, 20, 20))
    draw.ellipse((72, 92, 152, 172), outline=(45, 70, 220), width=10)
    images.append(poster)

    return images


def _run_forward(
    torch_module: Any,
    model: Any,
    processor: Any,
    images: list[Image.Image],
    *,
    tf32: bool,
) -> tuple[dict[str, Any], Any]:
    policy = configure_torch_inference_runtime(
        torch_module,
        env={"DAM_CUDA_TF32": "1"} if tf32 else {},
    )
    inputs = processor(
        text=PROMPTS,
        images=images,
        return_tensors="pt",
        padding=True,
    )
    inputs = {name: value.to(model.device) for name, value in inputs.items()}
    with torch_module.inference_mode():
        logits = model(**inputs).logits_per_image.float().cpu()
    torch_module.cuda.synchronize()
    return policy, logits


def compare_clip_tf32_quality() -> dict[str, Any]:
    try:
        import torch
        from transformers import CLIPModel, CLIPProcessor
    except Exception as exc:
        return _failure("dependency_missing", exc)

    if not torch.cuda.is_available():
        return _failure("cuda_unavailable")

    model_root = find_downloaded_model("clip")
    if model_root is None:
        return _failure("artifact_missing")

    try:
        model = CLIPModel.from_pretrained(str(model_root), local_files_only=True)
        processor = CLIPProcessor.from_pretrained(
            str(model_root),
            local_files_only=True,
        )
        model.to("cuda")
        model.eval()
    except Exception as exc:
        return _failure("model_load_failed", exc)

    try:
        images = _generated_images()
        exact_policy, exact_logits = _run_forward(
            torch,
            model,
            processor,
            images,
            tf32=False,
        )
        tf32_policy, tf32_logits = _run_forward(
            torch,
            model,
            processor,
            images,
            tf32=True,
        )

        difference = (exact_logits - tf32_logits).abs()
        exact_top1 = exact_logits.argmax(dim=-1)
        tf32_top1 = tf32_logits.argmax(dim=-1)
        top1_agreement = float((exact_top1 == tf32_top1).float().mean().item())
        cosine_similarity = float(
            torch.nn.functional.cosine_similarity(
                exact_logits.flatten().unsqueeze(0),
                tf32_logits.flatten().unsqueeze(0),
            ).item()
        )
        all_finite = bool(
            torch.isfinite(exact_logits).all().item()
            and torch.isfinite(tf32_logits).all().item()
        )
        success, status = _comparison_outcome(all_finite)

        return {
            "success": success,
            "status": status,
            "modelFamily": "clip",
            "fixtureType": "generated_in_memory",
            "imageCount": len(images),
            "promptCount": len(PROMPTS),
            "exactPolicy": exact_policy,
            "tf32Policy": tf32_policy,
            "top1Agreement": round(top1_agreement, 6),
            "logitCosineSimilarity": round(cosine_similarity, 9),
            "maxAbsLogitDiff": round(float(difference.max().item()), 6),
            "meanAbsLogitDiff": round(float(difference.mean().item()), 6),
            "allFinite": all_finite,
        }
    except Exception as exc:
        return _failure("inference_failed", exc)
    finally:
        del model, processor
        torch.cuda.empty_cache()


def main() -> int:
    result = compare_clip_tf32_quality()
    print(json.dumps(result, ensure_ascii=True))
    return 0 if result.get("success") else 1


if __name__ == "__main__":
    raise SystemExit(main())
