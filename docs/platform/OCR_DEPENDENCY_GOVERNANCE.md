# OCR Dependency Governance

Phase 12A audits OCR dependency risks and adds governance planning. It does not install OCR dependencies.

## Findings

| Risk | Level | Notes |
| --- | --- | --- |
| Debug log path | Low | OCR dependency debug logs now resolve through managed debug logs and redact local home path values. |
| Windows-only Python search | High | Existing OCR dependency resolution searches Windows Python install roots. |
| pip install IPC exposure | High | Existing OCR install methods can spawn `python -m pip install ...`; installer work remains deferred. |
| PaddleOCR dependency branch | Medium | PaddleOCR ONNX is now treated as a first-class local OCR capability and checked without auto-installing or changing IPC behavior. |

## Governance Plan

The new governance plan records:

- read-only OCR doctor check intent;
- OCR runtime profile hints;
- explicit `autoInstall: false`;
- deferred installer work;
- managed debug log routing;
- redacted evidence only.
- explicit `paddleocr` capability checks and runner dry-runs without package installation.

## Safety Boundaries

This phase does not:

- install EasyOCR, RapidOCR, compressed-tensors, Python, or any dependency;
- install PaddleOCR or change OCR auto-install behavior;
- start OCR workers;
- modify OCR IPC channels;
- change OCR provider behavior;
- expose real local user paths.

## Next Step

Phase 12B should audit and govern llama-runtime with macOS llama.app and Windows llama.cpp adaptation design while keeping external inference preferred and avoiding downloads.
