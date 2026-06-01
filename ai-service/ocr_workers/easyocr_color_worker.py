#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import json
import time
import traceback
import warnings

# Suppress warnings to keep stderr clean for debug logs only
warnings.filterwarnings('ignore')

# Force stdin/stdout/stderr to use UTF-8 encoding safely on Windows
try:
    sys.stdin.reconfigure(encoding='utf-8', errors='ignore')
    sys.stdout.reconfigure(encoding='utf-8', errors='ignore')
    sys.stderr.reconfigure(encoding='utf-8', errors='ignore')
except Exception:
    pass

def write_debug(msg):
    sys.stderr.write(f"[DEBUG] {msg}\n")
    sys.stderr.flush()

def rgb_to_hex(rgb):
    return "#{:02X}{:02X}{:02X}".format(int(rgb[0]), int(rgb[1]), int(rgb[2]))

def get_relative_luminance(rgb):
    rgb_norm = [v / 255.0 for v in rgb]
    a = [v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4 for v in rgb_norm]
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722

def get_contrast_ratio(rgb1, rgb2):
    lum1 = get_relative_luminance(rgb1)
    lum2 = get_relative_luminance(rgb2)
    brightest = max(lum1, lum2)
    darkest = min(lum1, lum2)
    return (brightest + 0.05) / (darkest + 0.05)

def rgb_to_hsl(rgb):
    r, g, b = [v / 255.0 for v in rgb]
    mx = max(r, g, b)
    mn = min(r, g, b)
    l = (mx + mn) / 2.0
    h, s = 0.0, 0.0
    if mx != mn:
        d = mx - mn
        s = d / (2.0 - mx - mn) if l > 0.5 else d / (mx + mn)
        if mx == r:
            h = (g - b) / d + (6.0 if g < b else 0.0)
        elif mx == g:
            h = (b - r) / d + 2.0
        elif mx == b:
            h = (r - g) / d + 4.0
        h /= 6.0
    return [round(h * 360.0), round(s * 100.0), round(l * 100.0)]

def get_color_distance(hsl1, hsl2):
    dh = min(abs(hsl1[0] - hsl2[0]), 360.0 - abs(hsl1[0] - hsl2[0])) / 180.0
    ds = (hsl1[1] - hsl2[1]) / 100.0
    dl = (hsl1[2] - hsl2[2]) / 100.0
    import math
    return math.sqrt(dh * dh * 0.5 + ds * ds * 0.25 + dl * dl * 0.25)

def main():
    start_time = time.time()
    device_name = "unknown"
    easyocr_version = "unknown"
    torch_version = "unknown"
    cuda_available = False

    try:
        # Load core AI dependencies dynamically to measure import duration
        import torch
        import cv2
        import numpy as np
        import easyocr

        torch_version = str(torch.__version__)
        easyocr_version = str(easyocr.__version__)
        cuda_available = bool(torch.cuda.is_available())
        device_name = "cuda" if cuda_available else "cpu"
    except Exception as dep_err:
        # Fail early if core dependencies are missing
        duration_ms = int((time.time() - start_time) * 1000)
        err_payload = {
            "success": False,
            "provider": "ocr.easyocr.color",
            "device": device_name,
            "durationMs": duration_ms,
            "data": None,
            "error": {
                "code": "DEPENDENCY_ERROR",
                "message": f"Failed to import core dependencies: {str(dep_err)}",
                "stderr": traceback.format_exc(),
                "exitCode": 1
            },
            "diagnostics": {
                "easyocrVersion": None,
                "torchVersion": None,
                "cudaAvailable": False
            }
        }
        print(json.dumps(err_payload, ensure_ascii=False))
        sys.exit(1)

    # 1. Parse JSON parameters from stdin
    try:
        input_data = json.loads(sys.stdin.read())
        image_path = input_data.get("imagePath")
        languages = input_data.get("languages", ["ch_sim", "en"])
        use_gpu = input_data.get("gpu", True)
        
        options = input_data.get("options", {})
        extract_color = options.get("extractColor", True)
        min_confidence = options.get("minConfidence", 0.3)
    except Exception as parse_err:
        duration_ms = int((time.time() - start_time) * 1000)
        err_payload = {
            "success": False,
            "provider": "ocr.easyocr.color",
            "device": device_name,
            "durationMs": duration_ms,
            "data": None,
            "error": {
                "code": "INVALID_INPUT_JSON",
                "message": f"Failed to parse stdin JSON input parameters: {str(parse_err)}",
                "stderr": traceback.format_exc(),
                "exitCode": 1
            },
            "diagnostics": {
                "easyocrVersion": easyocr_version,
                "torchVersion": torch_version,
                "cudaAvailable": cuda_available
            }
        }
        print(json.dumps(err_payload, ensure_ascii=False))
        sys.exit(1)

    # 2. Basic validations
    if not image_path:
        duration_ms = int((time.time() - start_time) * 1000)
        err_payload = {
            "success": False,
            "provider": "ocr.easyocr.color",
            "device": device_name,
            "durationMs": duration_ms,
            "data": None,
            "error": {
                "code": "MISSING_IMAGE_PATH",
                "message": "Parameter 'imagePath' is empty or missing.",
                "stderr": "",
                "exitCode": 1
            },
            "diagnostics": {
                "easyocrVersion": easyocr_version,
                "torchVersion": torch_version,
                "cudaAvailable": cuda_available
            }
        }
        print(json.dumps(err_payload, ensure_ascii=False))
        sys.exit(1)

    if not os.path.exists(image_path):
        duration_ms = int((time.time() - start_time) * 1000)
        err_payload = {
            "success": False,
            "provider": "ocr.easyocr.color",
            "device": device_name,
            "durationMs": duration_ms,
            "data": None,
            "error": {
                "code": "IMAGE_NOT_FOUND",
                "message": f"Image file not found on disk: '{image_path}'",
                "stderr": "",
                "exitCode": 1
            },
            "diagnostics": {
                "easyocrVersion": easyocr_version,
                "torchVersion": torch_version,
                "cudaAvailable": cuda_available
            }
        }
        print(json.dumps(err_payload, ensure_ascii=False))
        sys.exit(1)

    # 3. Read image using OpenCV and normalize BGR to RGB
    try:
        # read safely with unicode paths using numpy to be robust under Windows
        img_array = np.fromfile(image_path, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("cv2.imdecode returned None")
        
        img_h, img_w, _ = img.shape
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    except Exception as img_err:
        duration_ms = int((time.time() - start_time) * 1000)
        err_payload = {
            "success": False,
            "provider": "ocr.easyocr.color",
            "device": device_name,
            "durationMs": duration_ms,
            "data": None,
            "error": {
                "code": "IMAGE_DECODE_FAILED",
                "message": f"Failed to read/decode target image: {str(img_err)}",
                "stderr": traceback.format_exc(),
                "exitCode": 1
            },
            "diagnostics": {
                "easyocrVersion": easyocr_version,
                "torchVersion": torch_version,
                "cudaAvailable": cuda_available
            }
        }
        print(json.dumps(err_payload, ensure_ascii=False))
        sys.exit(1)

    # 4. Initialize EasyOCR Reader and execute inference
    try:
        # Determine actual GPU active flag
        gpu_active = cuda_available and use_gpu
        device_name = "cuda" if gpu_active else "cpu"
        
        write_debug(f"Initializing EasyOCR with langs={languages}, gpu={gpu_active}")
        reader = easyocr.Reader(languages, gpu=gpu_active)
        
        write_debug(f"Executing EasyOCR text detection on preloaded BGR numpy array")
        # readtext returns: [([[x,y], [x,y], [x,y], [x,y]], "text", confidence_score), ...]
        ocr_results = reader.readtext(img)
    except Exception as ocr_err:
        duration_ms = int((time.time() - start_time) * 1000)
        err_payload = {
            "success": False,
            "provider": "ocr.easyocr.color",
            "device": device_name,
            "durationMs": duration_ms,
            "data": None,
            "error": {
                "code": "INFERENCE_FAILED",
                "message": f"EasyOCR model execution failed: {str(ocr_err)}",
                "stderr": traceback.format_exc(),
                "exitCode": 1
            },
            "diagnostics": {
                "easyocrVersion": easyocr_version,
                "torchVersion": torch_version,
                "cudaAvailable": cuda_available
            }
        }
        print(json.dumps(err_payload, ensure_ascii=False))
        sys.exit(1)

    # 5. Extract colors for each valid text bounding region
    items = []
    
    for poly_raw, text, score in ocr_results:
        score_val = float(score)
        if score_val < min_confidence:
            continue

        # Format polygon: [[x, y], [x, y], [x, y], [x, y]] safely converted to Python ints
        polygon = [[int(pt[0]), int(pt[1])] for pt in poly_raw]
        
        xs = [pt[0] for pt in polygon]
        ys = [pt[1] for pt in polygon]
        xmin, xmax = min(xs), max(xs)
        ymin, ymax = min(ys), max(ys)
        
        w = max(1, xmax - xmin)
        h = max(1, ymax - ymin)
        bbox = [int(xmin), int(ymin), int(w), int(h)]

        # Default color swatches fallback values
        text_color_hex = None
        text_rgb_val = None
        bg_color_hex = None
        bg_rgb_val = None
        contrast_ratio = 1.0
        color_confidence = 0.0

        # Execute high-fidelity color extraction algorithm
        if extract_color:
            try:
                # Add 3px padding
                pad = 3
                crop_xmin = max(0, xmin - pad)
                crop_ymin = max(0, ymin - pad)
                crop_xmax = min(img_w, xmax + pad)
                crop_ymax = min(img_h, ymax + pad)
                
                crop_w = crop_xmax - crop_xmin
                crop_h = crop_ymax - crop_ymin

                if crop_w >= 4 and crop_h >= 4:
                    # Relativize polygon points on cropped coordinate system
                    rel_poly = np.array([[pt[0] - crop_xmin, pt[1] - crop_ymin] for pt in polygon], dtype=np.int32)
                    
                    # Create binary polygon mask
                    mask = np.zeros((crop_h, crop_w), dtype=np.uint8)
                    cv2.fillPoly(mask, [rel_poly], 255)
                    
                    # Crop image region patch
                    patch_rgb = img_rgb[crop_ymin:crop_ymax, crop_xmin:crop_xmax]

                    # 1. Estimate background color by border pixels
                    border_pixels = []
                    for cy in range(crop_h):
                        for cx in range(crop_w):
                            if cy == 0 or cy == crop_h - 1 or cx == 0 or cx == crop_w - 1:
                                border_pixels.append(patch_rgb[cy, cx])
                    
                    if len(border_pixels) > 0:
                        border_pixels = np.array(border_pixels)
                        # Group boundary pixels to find local dominant background color
                        bg_groups = []
                        for px in border_pixels:
                            found = False
                            px_list = [int(v) for v in px]
                            for g in bg_groups:
                                dist = np.linalg.norm(np.array(g['rgb']) - px)
                                if dist < 15.0:
                                    g['rgb'] = [(g['rgb'][0] * g['count'] + px_list[0]) / (g['count'] + 1),
                                                (g['rgb'][1] * g['count'] + px_list[1]) / (g['count'] + 1),
                                                (g['rgb'][2] * g['count'] + px_list[2]) / (g['count'] + 1)]
                                    g['count'] += 1
                                    found = True
                                    break
                            if not found:
                                bg_groups.append({'rgb': [float(v) for v in px_list], 'count': 1})
                        
                        bg_groups.sort(key=lambda x: x['count'], reverse=True)
                        bg_rgb_val = [int(v) for v in bg_groups[0]['rgb']] if len(bg_groups) > 0 else [255, 255, 255]
                    else:
                        bg_rgb_val = [255, 255, 255]

                    bg_color_hex = rgb_to_hex(bg_rgb_val)
                    bg_hsl = rgb_to_hsl(bg_rgb_val)

                    # 2. Isolate foreground text pixels based on contrast and color distance
                    fg_pixels = []
                    for cy in range(crop_h):
                        for cx in range(crop_w):
                            if mask[cy, cx] > 0:
                                rgb_val = [int(v) for v in patch_rgb[cy, cx]]
                                contrast = get_contrast_ratio(rgb_val, bg_rgb_val)
                                hsl_val = rgb_to_hsl(rgb_val)
                                distance = get_color_distance(hsl_val, bg_hsl)

                                # Contrast >= 3.0 and color distance >= 0.18
                                if contrast >= 3.0 and distance >= 0.18:
                                    fg_pixels.append(rgb_val)

                    # 3. Cluster foreground pixels to determine the dominant text stroke color
                    if len(fg_pixels) >= 15:
                        fg_groups = []
                        for px in fg_pixels:
                            found = False
                            hsl_val = rgb_to_hsl(px)
                            for g in fg_groups:
                                g_hsl = rgb_to_hsl(g['rgb'])
                                if get_color_distance(hsl_val, g_hsl) < 0.15:
                                    g['rgb'] = [(g['rgb'][0] * g['count'] + px[0]) / (g['count'] + 1),
                                                (g['rgb'][1] * g['count'] + px[1]) / (g['count'] + 1),
                                                (g['rgb'][2] * g['count'] + px[2]) / (g['count'] + 1)]
                                    g['count'] += 1
                                    found = True
                                    break
                            if not found:
                                fg_groups.append({'rgb': [float(v) for v in px], 'count': 1})
                        
                        fg_groups.sort(key=lambda x: x['count'], reverse=True)
                        if len(fg_groups) > 0:
                            text_rgb_val = [int(v) for v in fg_groups[0]['rgb']]
                            text_color_hex = rgb_to_hex(text_rgb_val)
                            contrast_ratio = round(get_contrast_ratio(text_rgb_val, bg_rgb_val), 2)
                            color_confidence = round(min(0.95, 0.4 + (fg_groups[0]['count'] / len(fg_pixels)) * 0.55), 2)
            except Exception as extract_err:
                write_debug(f"Text box color extraction failed: {str(extract_err)}")

        items.append({
            "text": str(text),
            "score": round(score_val, 4),
            "polygon": polygon,
            "bbox": bbox,
            "textColor": text_color_hex,
            "textRgb": text_rgb_val,
            "backgroundColor": bg_color_hex,
            "backgroundRgb": bg_rgb_val,
            "contrast": contrast_ratio,
            "colorConfidence": color_confidence
        })

    duration_ms = int((time.time() - start_time) * 1000)
    
    # 6. Format successful JSON payload
    success_payload = {
        "success": True,
        "provider": "ocr.easyocr.color",
        "device": device_name,
        "durationMs": duration_ms,
        "data": {
            "items": items,
            "rawCount": len(items)
        },
        "error": None,
        "diagnostics": {
            "easyocrVersion": easyocr_version,
            "torchVersion": torch_version,
            "cudaAvailable": cuda_available
        }
    }
    print(json.dumps(success_payload, ensure_ascii=False))

if __name__ == "__main__":
    main()
