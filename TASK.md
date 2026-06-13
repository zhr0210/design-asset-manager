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

1. Implement Platform AI Action Plan as user-initiated routing to existing
   Models, Runtime, Services, and refresh operations.
2. Close OCR real-model evidence on Windows only when approved artifacts and a
   generated-image inference are available.

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
