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

Remove the product mock-tag generation surface:

1. Removed `mock-ai:generate-suggestions` registration from production IPC.
2. Removed the production preload method and shared channel constant.
3. Kept mock implementations only in test-owned locations where still needed.
4. Preserved the real Asset Tagging Workflow, Queue Sync, tag confirmation, and
   existing public real-AI contracts.
5. Added focused source and contract tests proving packaged product code cannot
   register or invoke mock tag generation.

Do not change database schema, AI Worker HTTP APIs, Platform AI Branch Status
shape, or existing real-AI IPC channel semantics.

## Later Slices

1. Route or hide pure mock prompt-reverse and deep-analysis Worker endpoints.
2. Make remaining model-wrapper mock fallbacks fail closed in product mode
   while retaining explicit test fixtures.
3. Implement Platform AI Action Plan as user-initiated routing to existing
   Models, Runtime, Services, and refresh operations.
4. Close OCR real-model evidence on Windows only when approved artifacts and a
   generated-image inference are available.

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
