from __future__ import annotations

import binascii
import importlib
import math
import struct
import tempfile
import time
import zlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable


ProbeRunner = Callable[[Path], dict[str, Any]]


def probe_ocr_real_evidence(
    provider: str = "auto",
    *,
    rapidocr_runner: ProbeRunner | None = None,
    easyocr_runner: ProbeRunner | None = None,
) -> dict[str, Any]:
    started_at = time.perf_counter()
    candidates = _provider_candidates(provider)
    attempts: list[dict[str, Any]] = []

    with tempfile.TemporaryDirectory(prefix="dam-ocr-evidence-") as temp_dir:
        fixture_path = Path(temp_dir) / "generated-ocr-fixture.png"
        try:
            _create_generated_fixture(fixture_path)
        except Exception:
            return _result(
                started_at,
                status="inference_failed",
                error_code="FIXTURE_GENERATION_FAILED",
                attempts=[],
            )

        runners = {
            "rapidocr": rapidocr_runner or _run_rapidocr,
            "easyocr": easyocr_runner or _run_easyocr,
        }
        for candidate in candidates:
            attempt = _sanitize_attempt(candidate, runners[candidate](fixture_path))
            attempts.append(attempt)
            if attempt["status"] == "loaded_real":
                return _result(
                    started_at,
                    status="loaded_real",
                    provider=candidate,
                    box_count=attempt["boxCount"],
                    result_finite=attempt["resultFinite"],
                    attempts=attempts,
                )

    statuses = {attempt["status"] for attempt in attempts}
    if "artifact_missing" in statuses:
        status = "artifact_missing"
        error_code = "OCR_MODEL_ARTIFACT_MISSING"
    elif statuses == {"dependency_missing"}:
        status = "dependency_missing"
        error_code = "OCR_DEPENDENCY_MISSING"
    else:
        status = "inference_failed"
        error_code = "OCR_INFERENCE_FAILED"

    return _result(
        started_at,
        status=status,
        error_code=error_code,
        attempts=attempts,
    )


def _provider_candidates(provider: str) -> list[str]:
    normalized = provider.strip().lower()
    if normalized == "auto":
        return ["rapidocr", "easyocr"]
    if normalized in {"rapidocr", "easyocr"}:
        return [normalized]
    raise ValueError(f"Unsupported OCR provider: {provider}")


def _create_generated_fixture(path: Path) -> None:
    glyphs = {
        "0": ("01110", "10001", "10011", "10101", "11001", "10001", "01110"),
        "2": ("01110", "10001", "00001", "00010", "00100", "01000", "11111"),
        "6": ("00110", "01000", "10000", "11110", "10001", "10001", "01110"),
        "A": ("01110", "10001", "10001", "11111", "10001", "10001", "10001"),
        "C": ("01111", "10000", "10000", "10000", "10000", "10000", "01111"),
        "D": ("11110", "10001", "10001", "10001", "10001", "10001", "11110"),
        "M": ("10001", "11011", "10101", "10101", "10001", "10001", "10001"),
        "O": ("01110", "10001", "10001", "10001", "10001", "10001", "01110"),
        "R": ("11110", "10001", "10001", "11110", "10100", "10010", "10001"),
        " ": ("00000",) * 7,
    }
    text = "DAM OCR 2026"
    scale = 12
    margin = 36
    glyph_width = 5
    glyph_height = 7
    spacing = scale
    width = margin * 2 + len(text) * glyph_width * scale + (len(text) - 1) * spacing
    height = margin * 2 + glyph_height * scale
    pixels = bytearray([255] * (width * height))

    x_origin = margin
    for character in text:
        glyph = glyphs[character]
        for row_index, row in enumerate(glyph):
            for column_index, enabled in enumerate(row):
                if enabled != "1":
                    continue
                for y_offset in range(scale):
                    row_start = (margin + row_index * scale + y_offset) * width
                    for x_offset in range(scale):
                        pixels[row_start + x_origin + column_index * scale + x_offset] = 0
        x_origin += glyph_width * scale + spacing

    scanlines = b"".join(
        b"\x00" + bytes(pixels[row * width:(row + 1) * width])
        for row in range(height)
    )
    png = (
        b"\x89PNG\r\n\x1a\n"
        + _png_chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 0, 0, 0, 0))
        + _png_chunk(b"IDAT", zlib.compress(scanlines, level=9))
        + _png_chunk(b"IEND", b"")
    )
    path.write_bytes(png)


def _png_chunk(chunk_type: bytes, payload: bytes) -> bytes:
    checksum = binascii.crc32(chunk_type + payload) & 0xFFFFFFFF
    return struct.pack(">I", len(payload)) + chunk_type + payload + struct.pack(">I", checksum)


def _run_rapidocr(image_path: Path) -> dict[str, Any]:
    try:
        module = importlib.import_module("rapidocr_onnxruntime")
    except ModuleNotFoundError:
        return {"status": "dependency_missing", "errorCode": "RAPIDOCR_DEPENDENCY_MISSING"}
    except Exception as exc:
        return _failure("inference_failed", "RAPIDOCR_IMPORT_FAILED", exc)

    try:
        raw_result = module.RapidOCR()(str(image_path))
        candidates = raw_result[0] if isinstance(raw_result, tuple) else raw_result
        box_count, result_finite = _summarize_rapidocr_result(candidates)
        return _inference_result(box_count, result_finite)
    except Exception as exc:
        return _failure("inference_failed", "RAPIDOCR_INFERENCE_FAILED", exc)


def _run_easyocr(image_path: Path) -> dict[str, Any]:
    try:
        module = importlib.import_module("easyocr")
    except ModuleNotFoundError:
        return {"status": "dependency_missing", "errorCode": "EASYOCR_DEPENDENCY_MISSING"}
    except Exception as exc:
        return _failure("inference_failed", "EASYOCR_IMPORT_FAILED", exc)

    try:
        reader = module.Reader(["en"], gpu=False, download_enabled=False, verbose=False)
        raw_result = reader.readtext(str(image_path))
        box_count, result_finite = _summarize_easyocr_result(raw_result)
        return _inference_result(box_count, result_finite)
    except FileNotFoundError as exc:
        return _failure("artifact_missing", "EASYOCR_MODEL_ARTIFACT_MISSING", exc)
    except Exception as exc:
        message = str(exc).lower()
        if any(token in message for token in ("missing", "not found", "download")):
            return _failure("artifact_missing", "EASYOCR_MODEL_ARTIFACT_MISSING", exc)
        return _failure("inference_failed", "EASYOCR_INFERENCE_FAILED", exc)


def _summarize_rapidocr_result(candidates: Any) -> tuple[int, bool]:
    if not isinstance(candidates, (list, tuple)):
        return 0, False
    finite = True
    count = 0
    for item in candidates:
        if not isinstance(item, (list, tuple)) or len(item) < 3:
            continue
        polygon = item[0]
        confidence = item[2]
        if not isinstance(polygon, (list, tuple)):
            continue
        values = [coordinate for point in polygon for coordinate in point[:2]]
        finite = finite and _all_finite([*values, confidence])
        count += 1
    return count, finite


def _summarize_easyocr_result(candidates: Any) -> tuple[int, bool]:
    if not isinstance(candidates, (list, tuple)):
        return 0, False
    finite = True
    count = 0
    for item in candidates:
        if not isinstance(item, (list, tuple)) or len(item) < 3:
            continue
        polygon = item[0]
        confidence = item[2]
        if not isinstance(polygon, (list, tuple)):
            continue
        values = [coordinate for point in polygon for coordinate in point[:2]]
        finite = finite and _all_finite([*values, confidence])
        count += 1
    return count, finite


def _all_finite(values: list[Any]) -> bool:
    try:
        return all(math.isfinite(float(value)) for value in values)
    except (TypeError, ValueError):
        return False


def _inference_result(box_count: int, result_finite: bool) -> dict[str, Any]:
    if box_count > 0 and result_finite:
        return {
            "status": "loaded_real",
            "boxCount": box_count,
            "resultFinite": True,
        }
    return {
        "status": "inference_failed",
        "boxCount": box_count,
        "resultFinite": result_finite,
        "errorCode": "OCR_NO_FINITE_TEXT_BOXES",
    }


def _failure(status: str, error_code: str, exc: Exception) -> dict[str, Any]:
    return {
        "status": status,
        "boxCount": 0,
        "resultFinite": False,
        "errorCode": error_code,
        "detail": f"{type(exc).__name__}: {exc}",
    }


def _sanitize_attempt(provider: str, attempt: dict[str, Any]) -> dict[str, Any]:
    return {
        "provider": provider,
        "status": attempt.get("status", "inference_failed"),
        "boxCount": int(attempt.get("boxCount", 0)),
        "resultFinite": bool(attempt.get("resultFinite", False)),
        "errorCode": attempt.get("errorCode"),
    }


def _result(
    started_at: float,
    *,
    status: str,
    provider: str | None = None,
    box_count: int = 0,
    result_finite: bool = False,
    error_code: str | None = None,
    attempts: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "success": status == "loaded_real",
        "status": status,
        "provider": provider,
        "operation": "generated_image_text_detection",
        "generatedFixture": True,
        "downloadsAllowed": False,
        "boxCount": box_count,
        "resultFinite": result_finite,
        "errorCode": error_code,
        "attempts": attempts,
        "checkedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "durationMs": int((time.perf_counter() - started_at) * 1000),
    }
