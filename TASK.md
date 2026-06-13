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

Remove stale Electron product routes that bypass the real prompt-reverse
provider:

1. The unused `ai:prompt-generate` Electron IPC route is removed.
2. The unrendered `generateDeepAnalysis` path and `ai:analysis-generate`
   Electron IPC route are removed.
3. The AI Worker HTTP endpoints remain unchanged for compatibility.
4. Prompt reverse continues through `AiWorkerManager`, native Qwen3-VL, or the
   configured Llama/OpenAI-compatible backend.
5. Historical prompt and analysis task polling remains available for existing
   database rows.

Do not change database schema, AI Worker HTTP APIs, Platform AI Branch Status
shape, or existing real-AI IPC channel semantics.

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

Renderer behavior did not change in the evidence-tool correction. The mock-tag
removal slice requires focused Electron/renderer contract validation and a UI
smoke check only if a visible control or state changes.
