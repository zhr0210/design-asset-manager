#!/usr/bin/env python3
"""One bounded controlled-preview request on stdin; no files, paths, or diagnostics in results."""
from __future__ import annotations
import contextlib
import hashlib
import importlib.metadata
import io
import json
import math
import os
from pathlib import Path
import socket
import sys
import time

sys.dont_write_bytecode = True
MODEL_NAMES = {
    "det": "ch_PP-OCRv4_det_infer.onnx",
    "cls": "ch_ppocr_mobile_v2.0_cls_infer.onnx",
    "rec": "ch_PP-OCRv4_rec_infer.onnx",
}

def normalize_blocks(rows, width, height, threshold=0.5):
    if rows is None:
        return []
    if not isinstance(rows, (list, tuple)) or len(rows) > 500:
        raise ValueError("OCR_RESULT_INVALID")
    blocks, total = [], 0
    for row in rows:
        if not isinstance(row, (list, tuple)) or len(row) != 3:
            raise ValueError("OCR_RESULT_INVALID")
        polygon, text, score = row
        if not isinstance(text, str) or not text.strip() or len(text) > 2000:
            raise ValueError("OCR_RESULT_INVALID")
        score = float(score)
        if not math.isfinite(score) or not 0 <= score <= 1 or len(polygon) != 4:
            raise ValueError("OCR_RESULT_INVALID")
        points = []
        for point in polygon:
            if len(point) != 2 or not all(math.isfinite(float(v)) for v in point):
                raise ValueError("OCR_RESULT_INVALID")
            # Bounding corners can extend just outside a decoded image after rotation.
            x, y = float(point[0]), float(point[1])
            if not -2 <= x <= width + 2 or not -2 <= y <= height + 2:
                raise ValueError("OCR_RESULT_INVALID")
            points.append([min(1, max(0, x / width)), min(1, max(0, y / height))])
        if score < threshold:
            continue
        total += len(text)
        if total > 16000:
            raise ValueError("OCR_RESULT_INVALID")
        blocks.append({"text": text, "confidence": score, "polygon": points})
    return blocks

def recognize(payload, expected_models=None):
    if not payload or len(payload) > 16 * 1024 * 1024:
        raise ValueError("OCR_INPUT_INVALID")
    if importlib.metadata.version("rapidocr-onnxruntime") != "1.4.4":
        raise ValueError("OCR_RUNTIME_VERSION_UNSUPPORTED")
    import rapidocr_onnxruntime as module
    from PIL import Image
    import numpy as np
    with Image.open(io.BytesIO(payload)) as image:
        width, height = image.size
        if not 1 <= width <= 1600 or not 1 <= height <= 1600:
            raise ValueError("OCR_INPUT_INVALID")
        pixels = np.asarray(image.convert("RGB"))[:, :, ::-1].copy()
    model_dir = Path(module.__file__).resolve().parent / "models"
    paths = {role: model_dir / name for role, name in MODEL_NAMES.items()}
    if any(not path.is_file() for path in paths.values()):
        raise ValueError("OCR_MODEL_MISSING")
    hashes = {role: hashlib.sha256(path.read_bytes()).hexdigest() for role, path in paths.items()}
    if expected_models is not None and hashes != expected_models:
        raise ValueError("OCR_MODEL_CHANGED")
    started = time.perf_counter()
    engine = module.RapidOCR(det_model_path=str(paths["det"]), cls_model_path=str(paths["cls"]), rec_model_path=str(paths["rec"]),
                             intra_op_num_threads=2, inter_op_num_threads=1, text_score=0.5)
    result, _times = engine(pixels, use_det=True, use_cls=True, use_rec=True)
    return {"engine": "rapidocr-onnxruntime", "version": "1.4.4", "recipe": "rapidocr-preview-v1",
            "modelSha256": hashes, "width": width, "height": height,
            "elapsedMs": round((time.perf_counter() - started) * 1000), "threshold": 0.5,
            "blocks": normalize_blocks(result, width, height)}

def main():
    # Defense in depth for this known offline adapter, not a sandbox for untrusted Python packages.
    def no_network(*_args, **_kwargs):
        raise RuntimeError("OCR_NETWORK_DISABLED")
    socket.socket.connect = no_network
    socket.socket.connect_ex = no_network
    socket.create_connection = no_network
    os.environ.update({"HF_HUB_OFFLINE": "1", "TRANSFORMERS_OFFLINE": "1", "OMP_NUM_THREADS": "2"})
    try:
        payload = sys.stdin.buffer.read(16 * 1024 * 1024 + 1)
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            expected = json.loads(sys.argv[2]) if len(sys.argv) == 3 and sys.argv[1] == "--expected-models" else None
            value = recognize(payload, expected)
        import psutil
        memory = psutil.Process().memory_info()
        peak = getattr(memory, "peak_wset", memory.rss)
        sys.stdout.buffer.write(json.dumps({"ok": True, "value": value, "peakRamBytes": peak}, ensure_ascii=False, allow_nan=False).encode("utf-8"))
        return 0
    except Exception as error:
        code = "OCR_DEPENDENCY_MISSING" if isinstance(error, (ModuleNotFoundError, importlib.metadata.PackageNotFoundError)) else str(error) if str(error) in {"OCR_INPUT_INVALID", "OCR_RUNTIME_VERSION_UNSUPPORTED", "OCR_RESULT_INVALID", "OCR_MODEL_MISSING", "OCR_MODEL_CHANGED", "OCR_NETWORK_DISABLED"} else "OCR_EXECUTION_FAILED"
        sys.stdout.buffer.write(json.dumps({"ok": False, "error": code}).encode("utf-8"))
        return 1

if __name__ == "__main__":
    raise SystemExit(main())
