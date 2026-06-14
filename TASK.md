# Current Task

## Goal

Complete Real AI Evidence Closure Phase 2 without changing the shared Platform
AI Branch Status response shape.

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

Build the shared OCR evidence core before exposing a user trigger:

1. The generated-image Python probe returns a timestamped, path-free response.
2. Main process owns a timeout-bounded, offline probe service.
3. OCR evidence expires after five minutes.
4. Only finite inference with at least one text box maps to `loaded_real`.
5. Dependency and artifact gaps remain structured missing requirements.
6. No new IPC handler is registered in this slice.
7. Existing user-triggered MPS/CUDA execution probes now retain five-minute
   runtime evidence. Fixed-tensor success can reach only `runtime_probe_ready`,
   never `real_model_path`.

## macOS Evidence Result

- Electron/Playwright clicked the existing MPS, WD Tagger ONNX, and CLIP ONNX
  validation controls at `1280x804`.
- MPS fixed-tensor execution produced `worker_probe` evidence and remained
  `runtime_probe_ready`.
- WD Tagger loaded a real ONNX Session through CoreML/CPU providers, promoting
  only `ai_tag_task` to `real_model_path`.
- CLIP completed a finite 512-dimensional image/text embedding through the CPU
  provider, promoting only `search_embedding` to `real_model_path`.
- `ocr_text_box` remained `runtime_probe_ready`; adjacent ONNX evidence did not
  promote it.
- No document/body horizontal overflow was present.

## Later Slices

1. Add one explicit user-triggered OCR evidence operation after its additive
   IPC contract is approved.
2. Verify the shared operation on macOS and Windows without installing packages
   or downloading weights.

## Windows OCR Evidence Slice

- `probe_ocr_real_evidence.py` uses only a generated temporary image.
- It never enables model downloads and never emits model-cache or fixture paths.
- It prefers local RapidOCR and falls back to EasyOCR with
  `download_enabled=False`.
- The Windows full-validation script records the result, but the product status
  remains unchanged until real host evidence is reviewed and mapped.
- Windows host validation through commit `a3c6250` passed type checking,
  production build, runtime-safety contracts, 141 Python tests, direct probes,
  and Electron/Playwright verification.
- The Electron flow wrote finite CUDA execution evidence into the main-process
  cache through the existing IPC and verified `worker_probe` projection.
- WD Tagger and CLIP ONNX retained `real_model_path`; a successful generated
  image Llama multimodal probe promoted only the prompt workflow.
- The generated-image OCR probe returned
  `OCR_MODEL_ARTIFACT_MISSING`: RapidOCR was not installed, while EasyOCR was
  installed without its required local model artifact. OCR therefore remains
  `runtime_probe_ready`; closing it requires separately approved dependency or
  model-weight acquisition.
- The Windows branch-status screenshot showed all four workflows at
  `1008x725`, with no document/body horizontal overflow.

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
