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

Close the approved explicit OCR evidence operation:

1. `aiRuntime:probeOcrRealEvidence` is shared by Windows and macOS.
2. The operation runs only after a user click and uses a generated temporary
   image.
3. Main process keeps the offline, timeout-bounded result for five minutes.
4. No user asset read, dependency install, model download, or external service
   launch is permitted.
5. The AI Runtime panel displays the result in Chinese and refreshes Platform
   AI Branch Status after the probe.
6. Only finite inference with at least one text box maps to `loaded_real`;
   dependency and artifact gaps stay structured and evidence-insufficient.

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

## Remaining Validation

None for this slice.

## macOS OCR Operation Result

- Electron/Playwright clicked `验证 OCR 真实推理` at `1280x804`.
- The generated PNG is encoded with the Python standard library, so fixture
  generation does not depend on Pillow or any OCR package.
- The current managed runtime reported both RapidOCR and EasyOCR dependencies
  missing. The workflow stayed `evidence_insufficient` and exposed structured
  `dependency_missing` evidence plus the `ocr-runtime` missing requirement.
- The operation did not read user assets, install packages, download weights,
  or launch an external service.
- Document and body horizontal overflow were both absent.

## Windows OCR Operation Result

- The Windows host fast-forwarded to the shared branch and passed typecheck,
  production build, runtime-safety contracts, and 142 Python tests.
- CUDA fixed-tensor execution, WD Tagger ONNX load, CLIP 512-dimensional
  embedding, and Llama text plus generated-image inference remained green.
- The OCR IPC preserved `generatedFixture=true` and `downloadsAllowed=false`.
  RapidOCR lacked its dependency and EasyOCR lacked a local model artifact, so
  OCR stayed `runtime_probe_ready` with structured `artifact_missing` evidence
  and an `ocr-model-artifact` missing requirement.
- The Electron branch-status screenshot was captured from the target element
  with software rendering at `1008x725`; all four workflows were visible and
  document/body horizontal overflow were absent.
- No OCR dependency or model weight was installed or downloaded.

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
