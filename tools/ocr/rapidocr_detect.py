#!/usr/bin/env python3
import argparse
import importlib
import importlib.metadata
import json
import time
from pathlib import Path


PROVIDER = "rapidocr_detection"
ENGINE = "rapidocr_onnxruntime"
MISSING_DEPENDENCY_WARNING = "Install RapidOCR dependencies to enable real text boxes."


def emit(payload):
    print(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
    return 0


def build_metadata(started_at, image_path="", version="unknown"):
    return {
        "engine": ENGINE,
        "version": version or "unknown",
        "elapsedMs": int((time.perf_counter() - started_at) * 1000),
        "imagePath": str(image_path) if image_path else "",
    }


def failure(started_at, error, warnings=None, image_path="", version="unknown"):
    return {
        "ok": False,
        "provider": PROVIDER,
        "boxes": [],
        "error": error,
        "warnings": warnings or [],
        "metadata": build_metadata(started_at, image_path, version),
    }


def package_version(module):
    version = getattr(module, "__version__", None)
    if version:
        return str(version)
    try:
        return importlib.metadata.version("rapidocr-onnxruntime")
    except Exception:
        return "unknown"


def coerce_point(point):
    if not isinstance(point, (list, tuple)) or len(point) < 2:
        return None
    try:
        return [float(point[0]), float(point[1])]
    except (TypeError, ValueError):
        return None


def coerce_polygon(value):
    if not isinstance(value, (list, tuple)):
        return None
    polygon = [coerce_point(point) for point in value]
    if len(polygon) < 4 or any(point is None for point in polygon):
        return None
    return polygon


def polygon_from_item(item):
    if isinstance(item, dict):
        for key in ("polygon", "points", "box", "bbox"):
            polygon = coerce_polygon(item.get(key))
            if polygon:
                return polygon
    elif isinstance(item, (list, tuple)) and item:
        return coerce_polygon(item[0])
    return None


def confidence_from_item(item):
    candidates = []
    if isinstance(item, dict):
        candidates.extend([item.get("confidence"), item.get("score"), item.get("prob")])
    elif isinstance(item, (list, tuple)):
        candidates.extend(item[2:4])

    for candidate in candidates:
        try:
            return float(candidate)
        except (TypeError, ValueError):
            continue
    return None


def box_from_polygon(polygon, confidence):
    xs = [point[0] for point in polygon]
    ys = [point[1] for point in polygon]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    return {
        "x": min_x,
        "y": min_y,
        "width": max_x - min_x,
        "height": max_y - min_y,
        "polygon": polygon,
        "confidence": confidence,
    }


def normalize_result(raw_result, max_boxes, min_confidence):
    candidates = raw_result[0] if isinstance(raw_result, tuple) else raw_result
    if not candidates:
        return []
    if not isinstance(candidates, (list, tuple)):
        raise ValueError("RapidOCR returned an unsupported result shape")

    boxes = []
    for item in candidates:
        polygon = polygon_from_item(item)
        confidence = confidence_from_item(item)
        if polygon is None or confidence is None:
            continue
        if confidence < min_confidence:
            continue
        boxes.append(box_from_polygon(polygon, confidence))
        if len(boxes) >= max_boxes:
            break
    return boxes


def parse_args():
    parser = argparse.ArgumentParser(description="RapidOCR detection-only box runner")
    parser.add_argument("--image", required=False)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--max-boxes", type=int, default=50)
    parser.add_argument("--min-confidence", type=float, default=0.5)
    parser.add_argument("--timeout-ms", type=int, default=3000)
    return parser.parse_args()


def main():
    started_at = time.perf_counter()
    try:
        args = parse_args()
        
        # 1. Check if --image argument is missing
        if not args.image:
            return emit(
                failure(
                    started_at,
                    "Missing --image argument",
                    [],
                )
            )

        image_path = Path(args.image)

        # 2. Check if dry-run flag is active
        if args.dry_run:
            if not image_path.is_file():
                return emit(
                    failure(
                        started_at,
                        "Image does not exist",
                        [],
                        image_path,
                    )
                )

            try:
                module = importlib.import_module(ENGINE)
            except ModuleNotFoundError:
                return emit(
                    failure(
                        started_at,
                        "rapidocr_onnxruntime is not installed",
                        [MISSING_DEPENDENCY_WARNING],
                        image_path,
                    )
                )
            except Exception as exc:
                return emit(failure(started_at, f"{type(exc).__name__}: {exc}", [], image_path))

            version = package_version(module)
            return emit(
                {
                    "ok": True,
                    "provider": PROVIDER,
                    "boxes": [],
                    "warnings": [],
                    "metadata": build_metadata(started_at, image_path, version),
                    "msg": "Dry run passed",
                }
            )

        # Standard execution path
        if not image_path.is_file():
            return emit(
                failure(
                    started_at,
                    "Image does not exist",
                    ["Provide an existing normalized image path."],
                    image_path,
                )
            )

        try:
            module = importlib.import_module(ENGINE)
        except ModuleNotFoundError:
            return emit(
                failure(
                    started_at,
                    "rapidocr_onnxruntime is not installed",
                    [MISSING_DEPENDENCY_WARNING],
                    image_path,
                )
            )
        except Exception as exc:
            return emit(failure(started_at, f"{type(exc).__name__}: {exc}", [], image_path))

        version = package_version(module)
        try:
            engine = module.RapidOCR()
            raw_result = engine(str(image_path))
            boxes = normalize_result(raw_result, max(0, args.max_boxes), args.min_confidence)
            return emit(
                {
                    "ok": True,
                    "provider": PROVIDER,
                    "boxes": boxes,
                    "warnings": [],
                    "metadata": build_metadata(started_at, image_path, version),
                }
            )
        except Exception as exc:
            return emit(
                failure(
                    started_at,
                    f"{type(exc).__name__}: {exc}",
                    ["RapidOCR returned no usable text boxes."],
                    image_path,
                    version,
                )
            )
    except SystemExit as exc:
        raise exc
    except Exception as exc:
        return emit(failure(started_at, f"{type(exc).__name__}: {exc}"))


if __name__ == "__main__":
    raise SystemExit(main())
