#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json

from core.ocr_real_evidence_probe import probe_ocr_real_evidence


def main() -> int:
    parser = argparse.ArgumentParser(description="Probe local OCR real-model evidence without downloading weights.")
    parser.add_argument("--provider", choices=("auto", "rapidocr", "easyocr"), default="auto")
    args = parser.parse_args()
    print(json.dumps(probe_ocr_real_evidence(args.provider), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
