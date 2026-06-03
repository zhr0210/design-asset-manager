# Current Task

## Goal

Deeply develop the macOS AI branch and connect it into AI Console.

Target macOS AI architecture:

```text
macOS AI Worker
├── Python MPS Runtime
│   ├── RAM++ optional
│   ├── Florence-2 optional
│   ├── CLIP/SigLIP optional
│   └── CPU fallback
├── ONNX Runtime
│   ├── WD14 Tagger
│   ├── RapidOCR
│   ├── PaddleOCR ONNX
│   ├── CLIP/SigLIP ONNX
│   └── CoreML / CPU fallback
└── Llama
    ├── Qwen3-VL GGUF
    ├── Qwen3-VL MLX
    ├── Qwen2.5-VL Ollama fallback
    └── external HTTP fallback
```

## User-Approved High-Risk Scope

- The user approved downloading models from Hugging Face for this development task.
- The user approved starting/running tests after model download.
- The user approved using images from the Downloads folder for AI validation.
- The user approved UI simulation through Computer Use or Playwright.

## Boundaries

- Do not expose secrets, private asset data, full local user paths, full download paths, model cache paths, or base64/binary payloads in chat, docs, logs, or reports.
- Do not modify IPC channel names, database schema semantics, or AI Worker HTTP API shapes unless explicitly required and documented.
- Do not bulk move/delete user files, generated outputs, downloads, model caches, or model weights.
- Keep model downloads scoped to the smallest useful files for each phase; record what was downloaded and why.
- Prefer app-managed or task-specific model directories over ad hoc paths.

## Phased Development Plan

### Phase 1: macOS AI Branch Skeleton

- Add shared types/constants for macOS AI runtime lanes and capabilities.
- Add main-process platform capability detection for Python MPS, ONNX Runtime, Llama Metal, MLX, Ollama/external HTTP fallback, and CPU fallback.
- Connect macOS AI branch status and lane cards into AI Console without breaking existing Windows/CUDA flows.
- Add tests for platform capability mapping and AI Console rendering.

### Phase 2: Python MPS + ONNX Worker Integration

- Add Worker-side capability probes for PyTorch MPS and ONNX Runtime providers.
- Route optional RAM++, Florence-2, CLIP/SigLIP, WD14, RapidOCR, PaddleOCR ONNX capabilities into the macOS profile.
- Preserve CPU fallback where supported.
- Add focused Python unit tests and TypeScript contract tests.

### Phase 3: Llama / MLX / External Fallbacks

- Add Qwen3-VL GGUF, Qwen3-VL MLX, Qwen2.5-VL Ollama fallback, and external HTTP fallback route metadata.
- Connect Llama/MLX route status and model selection into AI Console.
- Download the smallest viable model artifact(s) needed for smoke testing through Hugging Face.

### Phase 4: Real Model And UI Validation

- Run model download and health checks.
- Use approved Downloads-folder images for controlled AI validation without exposing private filenames or full paths.
- Run Playwright/Computer Use UI tests through AI Console and prompt/tagging workflows.
- Record validation results and any skipped tests with reasons.

## Current Status

- Phase 2/3 overlap is now in motion: the macOS worker capability probe bridge is wired into AI Console, and the Python worker now reports family-level probe status for RAM++, Florence-2, CLIP/SigLIP, WD14, RapidOCR, and PaddleOCR alongside MPS, ONNX Runtime, MLX, and Llama readiness.
- Previous documentation work created `CONTEXT.md`, `docs/architecture-mindmap.md`, `docs/architecture-mindmap.html`, ADRs, and `docs/platform/AI_PLATFORM_BRANCH_REUSE_ASSESSMENT.md`.
- The smallest viable Hugging Face smoke artifact for the macOS Llama route has now been downloaded to completion and is available for local runtime discovery.
- The latest llama.cpp macOS runtime package has been installed locally, and the 2B GGUF route can start `llama-server` and answer a text-only smoke request.
- The companion mmproj for the 2B Qwen3-VL route has now been downloaded to completion, and the local llama-server multimodal path successfully answered a one-line image-description smoke request using an approved Downloads-folder image.
- The local model availability check treats in-progress `.aria2` downloads as incomplete, so AI Console will not report the smoke artifact as ready before the transfer finishes.
- The smoke GGUF transfer was resumed with aria2 and 2-way / 3-way splitting, then completed cleanly with the `.aria2` sidecar removed at the end.
- AI Console distinguishes the smoke GGUF as `下载中` only while the transfer is active instead of showing the vaguer `未下载` state.
- Current worktree already contains documentation changes from the previous task; do not revert them.
- The AI Console macOS overview now also renders a shared `MacOSAiCapabilityMatrix` component so lane-level probe output is visible both in Settings and in the AI Console route view.
- The Python macOS capability probe now carries model-family-level status for the optional RAM++, Florence-2, CLIP/SigLIP, WD14, RapidOCR, and PaddleOCR branches, not just top-level torch / onnxruntime / mlx presence.
- The Python MPS route now also has a dedicated compatibility checker, so AI Console can show whether PyTorch MPS and optional model-family wrappers are actually importable instead of inferring readiness from the larger worker probe alone.
- The macOS worker probe now also exposes `clipSiglipOnnx` as a first-class field, so CLIP/SigLIP ONNX availability is visible in the shared type contract and probe UI instead of being an implicit extra payload field.
- The CLIP/SigLIP ONNX route now also has a dedicated compatibility helper, CLI checker, and FastAPI status endpoint, so the macOS branch can distinguish environment readiness from placeholder metadata.
- The CLIP/SigLIP ONNX compatibility checker is now also surfaced through the shared AI Runtime IPC path and visible in the AI Runtime panel, so the embedding route shows up in product UI rather than only in backend probe output.
- The same CLIP/SigLIP ONNX compatibility signal is now also surfaced in the AI Console overview, so the route is visible in both the Settings runtime panel and the AI Console summary card.
- The Llama branch now surfaces Qwen2.5-VL Ollama fallback and external HTTP fallback status in the AI Console overview from configured AI backends and manual health/model-list results, without automatically probing external endpoints.
- The OCR dependency chain now includes a PaddleOCR ONNX path with a dedicated runner wrapper, dependency probe, UI selection option, and governance notes.
- The OCR text-detection healthcheck now dry-runs both RapidOCR and PaddleOCR wrappers, so the PaddleOCR branch is visible in the same safety path as the existing OCR providers.
- A fresh macOS arm64 app bundle was generated in `dist-packages/mac-arm64` using the local Electron runtime because network-restricted packaging could not download Electron from GitHub.
- Updating `/Applications/Design Asset Manager.app` still requires explicit overwrite approval after the sandbox escalation reviewer rejected the replacement command as high risk.

## Validation Plan

Use focused checks as implementation lands:

```bash
npm run typecheck
npm run build
node scripts/run-ts-test.mjs scripts/llama-runtime-local-models.test.ts
python -m unittest discover ai-service/tests
python3 scripts/check-docs-sync.py
```

Run additional focused tests if matching scripts exist or are added for macOS AI runtime lanes.

## Result

- Added typed macOS AI runtime lane metadata for Python MPS Runtime, ONNX Runtime, and Llama.
- Registered a read-only `macos-ai-branch-runtime` entry through the existing AI Runtime IPC list without changing IPC channel names.
- Connected macOS AI branch lane cards into the AI Console runtime panel.
- Extended macOS runtime profiles with Python MPS, ONNX Runtime, llama-metal, MLX, CoreML, CPU, Ollama, and external HTTP fallback capability metadata.
- Added focused TypeScript tests for macOS AI runtime lane coverage and updated existing AI runtime/profile/panel contract tests.
- Added a macOS AI Console route overview card with live probe-backed MPS / ONNX / MLX / Llama readiness and a matching contract test.
- Added a shared macOS capability matrix component to surface lane and capability rows from the live worker probe in both the Settings runtime panel and the AI Console overview.
- Added the `clipSiglipOnnx` field to the shared macOS worker probe contract and surfaced its status in the Settings runtime probe panel.
- Added a dedicated Python MPS compatibility checker and surfaced its status in the Settings runtime probe panel and AI Console overview.
- Added a dedicated CLIP/SigLIP ONNX compatibility helper, CLI checker, and AI worker status endpoint to make the ONNX embedding route verifiable instead of purely declarative.
- Added a shared AI Runtime IPC and Settings-panel surface for the CLIP/SigLIP ONNX compatibility checker so the status is visible in the product UI.
- Added an AI Console overview tile for the CLIP/SigLIP ONNX compatibility checker so the status is visible in both main AI surfaces.
- Added AI Console fallback summary tiles and backend type choices for Ollama, LM Studio, and Custom HTTP so the macOS large-vision fallback chain is configurable and visible beside the GGUF/MLX route.
- Added a PaddleOCR ONNX text-detection branch to the OCR dependency chain, including a dedicated runner wrapper, provider wiring, UI selection option, and governance/test coverage.
- Added PaddleOCR OCR healthcheck and runner dry-run coverage so the provider is visible in the dependency probe path without enabling auto-install or changing IPC behavior.
- Updated `CONTEXT.md`, `docs/architecture-mindmap.md`, `docs/architecture-mindmap.html`, and `docs/platform/AI_PLATFORM_BRANCH_REUSE_ASSESSMENT.md` to reflect the macOS worker probe bridge status.
- Updated OCR governance documentation and the domain glossary to include PaddleOCR ONNX as a first-class local OCR capability.
- Added a worker capability probe bridge so AI Console can read live macOS Python MPS / ONNX Runtime / MLX probe data from the Python AI Worker.
- Verified the macOS AI runtime path, AI Console route overview, and contract surface remain type-safe and buildable while the model artifact download was in progress.
- Hardened local GGUF discovery so an in-progress aria2 download does not mark the smoke model as installed.
- Exposed an explicit `下载中` local-model state in AI Console for in-progress GGUF and mmproj transfers.

## Validation Result

Passed:

```bash
npm run test-ai-console-macos-branch
npm run test-ai-runtime-panel
npm run test-ai-runtime-ipc
npm run test-macos-ai-runtime
npm run typecheck
npm run build
python3 scripts/check-docs-sync.py
python3 -m unittest ai-service/tests/test_macos_ai_capabilities.py
```

Additional passed checks in this pass:

```bash
npm run typecheck
npm run build
python3 scripts/check-docs-sync.py
python3 -m unittest ai-service.tests.test_macos_ai_capabilities
node scripts/run-ts-test.mjs scripts/ocr-dependency-governance.test.ts
python3 scripts/check-text-ocr-providers.py
npm run test-ai-console-macos-branch
npm run test-ai-runtime-panel
```

Additional checks:

```bash
npm run test-ai-runtime
npm run test-runtime-profile
```

Additional checks for the Llama fallback visibility pass:

```bash
node scripts/run-ts-test.mjs scripts/ai-console-macos-branch.test.ts
node scripts/run-ts-test.mjs scripts/macos-ai-runtime.test.ts
node scripts/run-ts-test.mjs scripts/external-http-runtime.test.ts
node scripts/run-ts-test.mjs scripts/external-http-manual-health-check.test.ts
npm run typecheck
npm run build
python3 scripts/check-docs-sync.py
```

Additional package/install checks:

- `npm run pack:mac` rebuilt source bundles but electron-builder could not download Electron because network access is restricted.
- `npx electron-builder --mac --dir --config.mac.identity=null --config.electronDist=node_modules/electron/dist --config.electronVersion=30.5.1` passed and regenerated the macOS arm64 app bundle.
- The packaged app bundle contains the new AI Console fallback UI, Python MPS status IPC, CLIP/SigLIP ONNX status IPC, and packaged Python Worker compatibility checker files.
- The packaged app bundle still unpacks the `sharp` native module and libvips under `app.asar.unpacked`.
- `/Applications/Design Asset Manager.app` was not replaced in this pass because the overwrite command requires explicit approval after escalation review.

Additional checks:

- Privacy scan over updated task, docs, shared types/constants, runtime profiles, AI Runtime IPC, AI Runtime Panel, and macOS AI runtime tests found no secret-like strings, full local user paths, model cache paths, runtime database filenames, or base64 payload markers.
- `npm run build` passed with existing Vite dynamic-import chunk warnings.
- Full `python3 -m unittest discover ai-service/tests` was not rerun in this pass; previous unrelated failures in `test_florence2_tagger.TestFlorence2Tagger.test_mock_fallback_available` and `test_ram_tagger.TestRAMTagger.test_category_routing_triggers` still need separate triage if that suite becomes a release gate.
- The Hugging Face GGUF download completed successfully; the final local artifact is present without the `.aria2` sidecar.
- The latest llama.cpp macOS runtime package was downloaded and extracted locally, and `llama-server` successfully loaded the 2B Q4_K_M model.
- The 2B Qwen3-VL multimodal path was also validated end-to-end with the downloaded mmproj companion and a local Downloads-folder image, producing a concise description response.
- The new `scripts/llama-runtime-local-models.test.ts` coverage verifies that a `.aria2` sidecar keeps the smoke model marked incomplete until the transfer closes cleanly, and the live artifact now returns `downloaded` / `true`.
- The live qwen3-vl smoke path now returns `downloaded` from the local-model state helper after the transfer completes.
- The resumed aria2 transfer produced live progress and completed cleanly from the current partial state.
- The `test-ai-console-macos-branch` source check covers the `下载中` rendering path as part of the route overview, while the completed file now shows as ready.
