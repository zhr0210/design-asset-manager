#!/usr/bin/env python3
"""Compatibility wrapper for the PaddleOCR color worker."""

from __future__ import annotations

import runpy
from pathlib import Path


WORKER_PATH = Path(__file__).resolve().parents[2] / 'ai-service' / 'ocr_workers' / 'paddleocr_color_worker.py'

if __name__ == '__main__':
    runpy.run_path(str(WORKER_PATH), run_name='__main__')
