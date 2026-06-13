# Current Task

## Goal

Close product-visible simulated AI paths before wiring Platform AI
`nextAction` suggestions to executable UI operations.

The architecture rule remains: Windows and macOS share product workflows,
contracts, main-process orchestration, and UI state. Branch only for real OS,
runtime, native dependency, path, or process differences.

## Accepted Baseline

- Platform AI Branch Status contracts and dedicated macOS/Windows IPC channels
  are stable.
- Windows CUDA, WD Tagger ONNX, CLIP ONNX, and Llama GGUF/mmproj evidence are
  validated.
- TF32 remains opt-in despite the bounded CLIP comparison.
- OCR remains accurately classified as `runtime_probe_ready`.
- Default Python dependencies are CPU-safe; NVIDIA Windows uses an explicit
  CUDA profile.

## Current Slice

Completion audit for Product AI Truthfulness Closure:

1. Stale prompt/deep-analysis Electron routes and product mock tagging are
   removed.
2. Model-wrapper simulation is explicit opt-in and blocked in product mode.
3. Mock OCR text boxes are removed from product settings; persisted historical
   values normalize to `none`.
4. Platform AI actions navigate to existing management surfaces without
   directly starting side effects.
5. Windows OCR evidence remains truthful at `runtime_probe_ready` until a
   separately approved local artifact can complete generated-image inference.

## Later Slices

1. Run the explicit Windows OCR evidence probe against local artifacts. Promote
   OCR only after a generated-image inference returns finite text boxes.

## Windows OCR Evidence Slice

- `probe_ocr_real_evidence.py` uses only a generated temporary image.
- It never enables model downloads and never emits model-cache or fixture paths.
- It prefers local RapidOCR and falls back to EasyOCR with
  `download_enabled=False`.
- The Windows full-validation script records the result, but the product status
  remains unchanged until real host evidence is reviewed and mapped.
- Windows host validation at commit `f266423` returned
  `OCR_MODEL_ARTIFACT_MISSING`: RapidOCR was not installed, while EasyOCR was
  installed without its required local model artifact. OCR therefore remains
  `runtime_probe_ready`; closing it requires separately approved dependency or
  model-weight acquisition.

## Platform AI Action Plan

- Evidence gaps map to Models, Runtime, Services, or manual evidence refresh.
- Status-card actions navigate to the existing management surface.
- The status card never starts downloads or installers directly.
- Downloads, dependency installation, runtime launch, and health checks remain
  explicit user actions in their existing management surfaces.
- macOS Electron verification at `1280x804` confirmed that evidence refresh
  produced no install/download progress and no document/body horizontal
  overflow. The current machine exposed only refresh actions; focused contract
  tests cover the Models, Runtime, and Services routing cases.

## Product Fail-Closed Policy

- Product Electron routes no longer expose the stale prompt/analysis Worker
  queue operations.
- Model-wrapper mock fallbacks are disabled by default.
- Tests and explicit development harnesses must opt in with
  `DESIGN_ASSET_MANAGER_ALLOW_MOCK_AI=1`.
- The mock opt-in flag never overrides strict product mode.

## Remote Evidence Audit

The Windows host pushed commits through `ccf7561`. Mac review found and fixed:

- CLIP comparison success no longer permits non-finite output.
- Evidence-tool failures return structured error types without exception
  messages, local paths, or traceback output.
- The ONNX probe now documents that importing PyTorch exposes bundled CUDA DLLs
  before ONNX Runtime provider initialization.

## Validation

```bash
python3 -m unittest discover ai-service/tests
npm run typecheck
npm run build
npm run ci:test-runtime-safety
python3 scripts/check-agent-context.py
python3 scripts/check-docs-sync.py
git diff --check
```

Completion audit result:

- `npm run ci:governance`, `npm run typecheck`, `npm run build`, and
  `scripts/verify-platform-mac.sh`: passed.
- Python unittest discovery: 141 tests passed.
- Electron/Playwright at `1280x804`: AI settings exposed only none, EasyOCR,
  RapidOCR, and PaddleOCR; no mock option or horizontal overflow was present.
- Doctor CI warnings were limited to the intentionally stopped AI Worker and a
  managed-path write-permission warning; they did not invalidate the tested
  product behavior.
