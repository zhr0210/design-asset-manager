#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import json
import os
import sys
import time
import traceback
import warnings

warnings.filterwarnings('ignore')

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


def safe_int(value, default=0):
    try:
        return int(round(float(value)))
    except Exception:
        return default


def normalize_polygon(item):
    if isinstance(item, dict):
        for key in ('polygon', 'points', 'box', 'bbox'):
            value = item.get(key)
            if value:
                return normalize_polygon(value)
        return None
    if not isinstance(item, (list, tuple)) or len(item) < 4:
        return None

    polygon = []
    for point in item:
        if not isinstance(point, (list, tuple)) or len(point) < 2:
            return None
        try:
            polygon.append([float(point[0]), float(point[1])])
        except (TypeError, ValueError):
            return None
    return polygon


def normalize_ocr_results(raw_result):
    if raw_result is None:
        return []
    if isinstance(raw_result, tuple):
        raw_result = raw_result[0] if raw_result else []
    if isinstance(raw_result, list) and len(raw_result) == 1 and isinstance(raw_result[0], list):
        first = raw_result[0]
        if first and isinstance(first[0], (list, tuple)) and len(first[0]) >= 2 and not isinstance(first[0][0], (list, tuple)):
            return first
    return raw_result if isinstance(raw_result, list) else []


def parse_entry(item):
    polygon = None
    text = ""
    score = 0.0

    if isinstance(item, dict):
        polygon = normalize_polygon(item)
        text = str(item.get('text') or item.get('transcription') or '')
        for key in ('score', 'confidence', 'prob'):
            try:
                score = float(item.get(key))
                break
            except Exception:
                continue
    elif isinstance(item, (list, tuple)):
        if item and isinstance(item[0], (list, tuple)):
            polygon = normalize_polygon(item[0])
        if len(item) >= 2:
            second = item[1]
            if isinstance(second, (list, tuple)) and second:
                text = str(second[0])
                try:
                    score = float(second[1])
                except Exception:
                    score = 0.0
            elif isinstance(second, dict):
                text = str(second.get('text') or second.get('transcription') or '')
                for key in ('score', 'confidence', 'prob'):
                    try:
                        score = float(second.get(key))
                        break
                    except Exception:
                        continue
            else:
                text = str(second)
                if len(item) >= 3:
                    try:
                        score = float(item[2])
                    except Exception:
                        score = 0.0

    return polygon, text, score


def parse_args():
    parser = argparse.ArgumentParser(description='PaddleOCR color worker')
    parser.add_argument('--image', required=False)
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--max-boxes', type=int, default=50)
    parser.add_argument('--min-confidence', type=float, default=0.3)
    parser.add_argument('--timeout-ms', type=int, default=3000)
    return parser.parse_args()


def main():
    start_time = time.time()
    device_name = 'unknown'
    paddle_version = 'unknown'

    args = parse_args()

    if args.dry_run:
        if not args.image:
            duration_ms = int((time.time() - start_time) * 1000)
            print(json.dumps({
                'ok': False,
                'provider': 'ocr.paddle.color',
                'boxes': [],
                'error': 'Missing --image argument',
                'warnings': [],
                'metadata': {
                    'engine': 'paddleocr',
                    'version': 'unknown',
                    'elapsedMs': duration_ms,
                    'imagePath': ''
                }
            }, ensure_ascii=False))
            return 0

        if not os.path.exists(args.image):
            duration_ms = int((time.time() - start_time) * 1000)
            print(json.dumps({
                'ok': False,
                'provider': 'ocr.paddle.color',
                'boxes': [],
                'error': 'Image does not exist',
                'warnings': [],
                'metadata': {
                    'engine': 'paddleocr',
                    'version': 'unknown',
                    'elapsedMs': duration_ms,
                    'imagePath': args.image
                }
            }, ensure_ascii=False))
            return 0

    global cv2, np
    import cv2
    import numpy as np

    try:
        import paddleocr
        import paddle

        paddle_version = str(getattr(paddleocr, '__version__', getattr(paddle, '__version__', 'unknown')))
        device_name = 'cpu'
    except Exception as dep_err:
        duration_ms = int((time.time() - start_time) * 1000)
        print(json.dumps({
            'success': False,
            'provider': 'ocr.paddle.color',
            'device': device_name,
            'durationMs': duration_ms,
            'data': None,
            'error': {
                'code': 'DEPENDENCY_ERROR',
                'message': f'Failed to import PaddleOCR dependencies: {str(dep_err)}',
                'stderr': traceback.format_exc(),
                'exitCode': 1
            },
            'diagnostics': {
                'paddleVersion': None
            }
        }, ensure_ascii=False))
        sys.exit(1)

    try:
        input_data = None
        if not args.image:
            input_data = json.loads(sys.stdin.read())
        image_path = args.image or input_data.get('imagePath')
        options = (input_data or {}).get('options', {})
        extract_color = options.get('extractColor', True)
        min_confidence = float(args.min_confidence if args.min_confidence is not None else options.get('minConfidence', 0.3))
    except Exception as parse_err:
        duration_ms = int((time.time() - start_time) * 1000)
        print(json.dumps({
            'success': False,
            'provider': 'ocr.paddle.color',
            'device': device_name,
            'durationMs': duration_ms,
            'data': None,
            'error': {
                'code': 'INVALID_INPUT_JSON',
                'message': f'Failed to parse stdin JSON input parameters: {str(parse_err)}',
                'stderr': traceback.format_exc(),
                'exitCode': 1
            },
            'diagnostics': {
                'paddleVersion': paddle_version
            }
        }, ensure_ascii=False))
        sys.exit(1)

    if not image_path:
        duration_ms = int((time.time() - start_time) * 1000)
        print(json.dumps({
            'success': False,
            'provider': 'ocr.paddle.color',
            'device': device_name,
            'durationMs': duration_ms,
            'data': None,
            'error': {
                'code': 'MISSING_IMAGE_PATH',
                'message': "Parameter 'imagePath' is empty or missing.",
                'stderr': '',
                'exitCode': 1
            },
            'diagnostics': {
                'paddleVersion': paddle_version
            }
        }, ensure_ascii=False))
        sys.exit(1)

    if not os.path.exists(image_path):
        duration_ms = int((time.time() - start_time) * 1000)
        print(json.dumps({
            'success': False,
            'provider': 'ocr.paddle.color',
            'device': device_name,
            'durationMs': duration_ms,
            'data': None,
            'error': {
                'code': 'IMAGE_NOT_FOUND',
                'message': f"Image file not found on disk: '{image_path}'",
                'stderr': '',
                'exitCode': 1
            },
            'diagnostics': {
                'paddleVersion': paddle_version
            }
        }, ensure_ascii=False))
        sys.exit(1)

    try:
        img_array = np.fromfile(image_path, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError('cv2.imdecode returned None')
        img_h, img_w, _ = img.shape
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    except Exception as img_err:
        duration_ms = int((time.time() - start_time) * 1000)
        print(json.dumps({
            'success': False,
            'provider': 'ocr.paddle.color',
            'device': device_name,
            'durationMs': duration_ms,
            'data': None,
            'error': {
                'code': 'IMAGE_DECODE_FAILED',
                'message': f'Failed to read/decode target image: {str(img_err)}',
                'stderr': traceback.format_exc(),
                'exitCode': 1
            },
            'diagnostics': {
                'paddleVersion': paddle_version
            }
        }, ensure_ascii=False))
        sys.exit(1)

    try:
        from paddleocr import PaddleOCR

        write_debug('Initializing PaddleOCR text detection')
        engine = PaddleOCR(use_angle_cls=True, lang='ch')
        raw_result = engine.ocr(image_path, cls=True)
        ocr_results = normalize_ocr_results(raw_result)
    except Exception as ocr_err:
        duration_ms = int((time.time() - start_time) * 1000)
        print(json.dumps({
            'success': False,
            'provider': 'ocr.paddle.color',
            'device': device_name,
            'durationMs': duration_ms,
            'data': None,
            'error': {
                'code': 'INFERENCE_FAILED',
                'message': f'PaddleOCR model execution failed: {str(ocr_err)}',
                'stderr': traceback.format_exc(),
                'exitCode': 1
            },
            'diagnostics': {
                'paddleVersion': paddle_version
            }
        }, ensure_ascii=False))
        sys.exit(1)

    items = []
    for item in ocr_results:
        polygon, text, score = parse_entry(item)
        if polygon is None or score < min_confidence:
            continue

        xs = [pt[0] for pt in polygon]
        ys = [pt[1] for pt in polygon]
        xmin, xmax = min(xs), max(xs)
        ymin, ymax = min(ys), max(ys)
        w = max(1, xmax - xmin)
        h = max(1, ymax - ymin)
        bbox = [safe_int(xmin), safe_int(ymin), max(1, safe_int(w)), max(1, safe_int(h))]

        text_color_hex = None
        text_rgb_val = None
        bg_color_hex = None
        bg_rgb_val = None
        contrast_ratio = 1.0
        color_confidence = 0.0

        if extract_color:
            try:
                pad = 3
                crop_xmin = max(0, bbox[0] - pad)
                crop_ymin = max(0, bbox[1] - pad)
                crop_xmax = min(img_w, bbox[0] + bbox[2] + pad)
                crop_ymax = min(img_h, bbox[1] + bbox[3] + pad)

                crop_w = crop_xmax - crop_xmin
                crop_h = crop_ymax - crop_ymin

                if crop_w >= 4 and crop_h >= 4:
                    rel_poly = np.array([[pt[0] - crop_xmin, pt[1] - crop_ymin] for pt in polygon], dtype=np.int32)
                    mask = np.zeros((crop_h, crop_w), dtype=np.uint8)
                    cv2.fillPoly(mask, [rel_poly], 255)
                    patch_rgb = img_rgb[crop_ymin:crop_ymax, crop_xmin:crop_xmax]

                    border_pixels = []
                    for cy in range(crop_h):
                        for cx in range(crop_w):
                            if cy == 0 or cy == crop_h - 1 or cx == 0 or cx == crop_w - 1:
                                border_pixels.append(patch_rgb[cy, cx])

                    if border_pixels:
                        border_pixels = np.array(border_pixels)
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
                        bg_rgb_val = [int(v) for v in bg_groups[0]['rgb']] if bg_groups else [255, 255, 255]
                    else:
                        bg_rgb_val = [255, 255, 255]

                    bg_color_hex = rgb_to_hex(bg_rgb_val)
                    bg_hsl = rgb_to_hsl(bg_rgb_val)

                    fg_pixels = []
                    for cy in range(crop_h):
                        for cx in range(crop_w):
                            if mask[cy, cx] > 0:
                                rgb_val = [int(v) for v in patch_rgb[cy, cx]]
                                contrast = get_contrast_ratio(rgb_val, bg_rgb_val)
                                hsl_val = rgb_to_hsl(rgb_val)
                                distance = get_color_distance(hsl_val, bg_hsl)
                                if contrast >= 3.0 and distance >= 0.18:
                                    fg_pixels.append(rgb_val)

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
                        if fg_groups:
                            text_rgb_val = [int(v) for v in fg_groups[0]['rgb']]
                            text_color_hex = rgb_to_hex(text_rgb_val)
                            contrast_ratio = round(get_contrast_ratio(text_rgb_val, bg_rgb_val), 2)
                            color_confidence = round(min(0.95, 0.4 + (fg_groups[0]['count'] / len(fg_pixels)) * 0.55), 2)
            except Exception as extract_err:
                write_debug(f'Text box color extraction failed: {str(extract_err)}')

        items.append({
            'text': str(text),
            'score': round(float(score), 4),
            'polygon': [[safe_int(pt[0]), safe_int(pt[1])] for pt in polygon],
            'bbox': bbox,
            'textColor': text_color_hex,
            'textRgb': text_rgb_val,
            'backgroundColor': bg_color_hex,
            'backgroundRgb': bg_rgb_val,
            'contrast': contrast_ratio,
            'colorConfidence': color_confidence
        })

    duration_ms = int((time.time() - start_time) * 1000)
    print(json.dumps({
        'success': True,
        'provider': 'ocr.paddle.color',
        'device': device_name,
        'durationMs': duration_ms,
        'data': {
            'items': items,
            'rawCount': len(items)
        },
        'error': None,
        'diagnostics': {
            'paddleVersion': paddle_version
        }
    }, ensure_ascii=False))


if __name__ == '__main__':
    main()
