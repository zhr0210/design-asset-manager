# OCR Dependency Governance

Phase 12A audits OCR dependency risks and adds governance planning. It does not install OCR dependencies.

## Findings

| Risk | Level | Notes |
| --- | --- | --- |
| Debug log path | Low | AI Python Environment diagnostics resolve through managed debug logs and redact local home path values. |
| Windows Python search | Medium | Windows `where python` and known install roots are isolated behind the shared AI Python Environment IO adapter. |
| pip install IPC exposure | High | Existing OCR install methods can spawn `python -m pip install ...`; installer work remains deferred. |
| PaddleOCR dependency branch | Medium | PaddleOCR ONNX is now treated as a first-class local OCR capability and checked without auto-installing or changing IPC behavior. |
| Managed venv executable path | Low | Managed runtime `Scripts/python.exe` and `bin/python` selection is descriptor-driven by the AI Python Environment Module. |
| Base Python discovery | Low | Windows PATH/install-root search, macOS Homebrew fallback, environment overrides, and managed-runtime preference share one Interface. |
| Caller drift | Low | AI Worker, runtime bootstrap, OCR providers, OCR healthcheck, GPU/Memory Guard, and model operations use the same resolver. |

## Governance Plan

The new governance plan records:

- read-only OCR doctor check intent;
- OCR runtime profile hints;
- explicit `autoInstall: false`;
- deferred installer work;
- managed debug log routing;
- redacted evidence only.
- explicit `paddleocr` capability checks and runner dry-runs without package installation.
- one shared AI Python Environment Interface for managed runtime and base Python discovery;
- deterministic Windows/macOS path adapters with an in-memory test seam;
- compatibility with the existing `macos-ai-python` managed directory while callers use platform-neutral names.
- table-driven provider policy and risk evidence projection, so mock/local OCR differences are data-owned and remain read-only.

## Safety Boundaries

This phase does not:

- install EasyOCR, RapidOCR, compressed-tensors, Python, or any dependency;
- install PaddleOCR or change OCR auto-install behavior;
- start OCR workers;
- modify OCR IPC channels;
- change OCR provider behavior;
- expose real local user paths.

## Next Step

Dependency installation remains a separately approved user action. Future work
may rename the legacy managed directory only with an explicit migration plan.
