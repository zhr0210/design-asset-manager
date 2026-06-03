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

- Current audit pass is separating product-visible mock AI paths, silent mock fallbacks, and planned/probe-only AI capabilities before further download fixes.
- Current implementation pass removes product-visible mock AI Runtime providers and blocks strict-mode Python mock inference output.
- Current Llama status pass makes AI Console consume main-process Llama health status instead of inferring service readiness only from the installer process PID.
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
- `/Applications/Design Asset Manager.app` was replaced after user approval, then replaced again with a follow-up package that fixes packaged `ai-service` script path resolution.
- A packaged native Qwen3-VL prompt reverse failure was traced to main-process code resolving worker scripts from the launch cwd, which produced a non-existent `/ai-service/prompt_workers/qwen3vl_prompt_worker.py` path when the installed App launched outside the repo.
- RAM++, Florence-2, WD14, RapidOCR, PaddleOCR, and CLIP/SigLIP status checks now show a clearer split: wrapper modules may be present in `ai-service`, but the current Python environment still needs the actual runtime dependencies and/or weights (`torch`, `onnxruntime`, provider packages, model files) before those model families can be loaded as real backends.
- The intended Qwen3-VL prompt-reverse route is now clarified as GGUF/mmproj through the Llama OpenAI-compatible interface, not the native Python Transformers worker.
- The asset smart-tagging UI was confirmed to be using mock fallback data when Python AI Worker tagging was unavailable; the random tag jumps came from local mock generation, not real RAM++ / Florence-2 / WD Tagger inference.

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
- Added a shared packaged/development `ai-service` path resolver for Electron main-process Python script entry points.
- Updated Qwen3-VL prompt reverse, Qwen model compatibility verification, model download, GPU probe, GPU clear, OCR environment check, and EasyOCR worker launch paths to resolve packaged resources from Electron `Resources/ai-service` instead of relying on the launch cwd.
- Added a focused source/path regression test so packaged `Resources/ai-service` wins over `/ai-service` when cwd is root.
- Changed new/default prompt reverse settings to `llama-openai`, updated AI Console labels to present Qwen3-VL as a GGUF/Llama route, and made the asset prompt panel auto-switch old native settings to a downloaded GGUF model when available.
- GGUF model selection now enables the local llama backend, marks vision support, and writes the selected GGUF filename before running prompt reverse, so the backend provider does not reject the run as disabled.
- Disabled product-path mock AI tag fallback: the asset tagging trigger now fails with a real Worker/model error instead of writing random mock tags, and the mock IPC is blocked unless an explicit development environment variable enables it.
- Updated the smart-tagging panel progress copy so it no longer pretends that selected model families have actually loaded when only a task submission is happening.

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
- The packaged Qwen3-VL worker script now exists under the installed app resources, and the installed `app.asar` contains the new `resolveAiServiceRoot` / `process.resourcesPath` path logic.
- Playwright launched the installed `/Applications` app, captured the AI Console, and confirmed Qwen3-VL, Llama, Python MPS, and ONNX Runtime sections render.
- Current local Python probe summary: wrapper modules for RAM++, Florence-2, CLIP, and WD14 are importable from the repo, while `torch`, `onnxruntime`, `mlx`, RapidOCR, and PaddleOCR are not available in the probed Python environment; these model families therefore remain unavailable or unmounted until the runtime dependencies and weights are installed/configured.
- Focused route/default tests now verify the missing prompt-reverse mode defaults to `llama-openai` while the explicit native route remains available as an experimental Python path.
- Added a source guard test for real-worker tagging so future changes cannot silently reintroduce `mockAiGenerateSuggestions` fallback into the product smart-tag flow.
- Fixed the cooperative model download flow so renderer row IDs (`ram`, `florence2`, `clip`, `wd_tagger`) map to backend registry IDs (`ram-plus`, `florence-2-large`, `clip-vit-b-32`, `wd-vit-tagger-v3`) before invoking IPC or subscribing to progress events.
- Fixed cooperative model download script compatibility with Python 3.9 and added an automatic `huggingface_hub` bootstrap path with explicit failure details.
- Hardened macOS AI dependency installation so failed pip installs return a non-zero result with stderr details instead of being reported as successful; the installer now includes `huggingface_hub`, `pip`, `setuptools`, and `wheel`.
- Rebuilt and replaced `/Applications/Design Asset Manager.app`; packaged verification confirmed the renderer registry mapping, main-process `macos-ai:install-deps` handler, preload `macosAiInstallDeps` API, and packaged Python script updates are present.
- Added an AI Worker mock/planned-capability audit that identifies pure mock prompt/analysis workers, silent mock fallbacks in cooperative model wrappers, product-visible mock runtime providers, probe-only macOS capability cards, and incomplete GPU/MPS telemetry.
- Updated the domain glossary with Real Model Path, Mock Inference Path, Planned Capability, and Runtime Probe so future implementation work can distinguish product-ready inference from probes and simulation.
- Removed product AI Runtime IPC registration of mock runtime, mock external HTTP runtime, and mock Python Worker runtime; the remaining Python Worker runtime points at the real AI Worker entrypoint and carries `DESIGN_ASSET_MANAGER_STRICT_REAL_AI=1`.
- Added a real fetch-backed external HTTP runtime client and made it the provider default, leaving the mock HTTP client available only when tests inject it.
- Added `ai-service/core/mock_policy.py` and strict-mode guards across RAM++, Florence-2, CLIP/SigLIP, WD Tagger, Qwen-VL fallback analyzer, JoyCaption, QwenVL deep analysis, VisualRouter mock scoring, and OPUS-MT translation fallback.
- Added a real `/health` endpoint to the Python AI Worker and made pure mock prompt/analysis endpoints reject strict-mode production requests instead of queueing template workers.
- Made Python GPU telemetry tolerate missing `torch` at Worker import time so the real `/health` endpoint can start before macOS AI dependencies are installed.
- Additional strict-mode/mock-removal checks passed: `npm run typecheck`, `npm run build`, `node scripts/run-ts-test.mjs scripts/ai-runtime-ipc-contract.test.ts`, Python strict mock-block smoke, Python `py_compile`, and `python3 scripts/check-docs-sync.py`.
- Additional strict endpoint smoke passed: strict-mode `/health` is available and Python prompt/analysis mock endpoints return blocked responses instead of enqueueing mock workers.
- Llama status now returns `serverRunning`, `serverModels`, and `serverHealthCheckedAt` from a main-process `/models` health check, and AI Console overview uses that authoritative signal for the Llama route tile and service health panel.
- Additional Llama status checks passed: `npm run typecheck`, `node scripts/run-ts-test.mjs scripts/llama-runtime-local-models.test.ts`, and `node scripts/run-ts-test.mjs scripts/ai-console-macos-branch.test.ts`.
- Rebuilt the current workspace app bundle, replaced `/Applications/Design Asset Manager.app` again, and launched the installed app for user validation.
- Installed bundle verification confirmed `macos-ai:install-deps`, cooperative model download IPC, Llama `serverRunning` status wiring, strict real-AI environment injection, and packaged macOS AI dependency/model download scripts are present in the installed app.
- Added a lightweight cooperative model readiness layer for RAM++, Florence-2, CLIP/SigLIP, and WD Tagger that separates download state from dependency readiness, minimum weight-file shape, strict mock blocking, and real loaded backend state.
- AI Worker `/ai/model/status` now includes cooperative model readiness, and AI Console model rows render dense status pills plus short diagnostics such as dependency-missing, weight-missing, ready-to-load, real-loaded, or mock-blocked.
- Additional readiness checks passed: `env PYTHONPYCACHEPREFIX=/private/tmp/dam-pycache python3 -m py_compile ai-service/core/cooperative_model_readiness.py ai-service/core/model_manager.py ai-service/app.py`, `python3 -m unittest ai-service.tests.test_cooperative_tagger.TestCooperativeTagger.test_model_manager_cooperative_status`, `node scripts/run-ts-test.mjs scripts/ai-console-macos-branch.test.ts`, `npm run typecheck`, `npm run build`, and a redacted Python cooperative status smoke.
- Rebuilt and replaced `/Applications/Design Asset Manager.app` again after the readiness pass; installed-bundle verification confirmed the packaged Python readiness helper, main-process cooperative status bridge, and AI Console dependency/weight diagnostic UI are present.
- Hardened the `macos-ai:install-deps` path so the main process parses structured installer events, returns installed/failed package lists, duration, event tail, and output tail, and avoids logging full local Python/script paths.
- The macOS AI dependency installer now emits per-package completion and package-scoped error events, so AI Console can report exactly which dependency failed instead of showing only a truncated pip tail.
- Additional dependency-installer checks passed: `env PYTHONPYCACHEPREFIX=/private/tmp/dam-pycache python3 -m py_compile ai-service/tools/install_macos_ai_deps.py`, `node scripts/run-ts-test.mjs scripts/macos-ai-deps-installer-contract.test.ts`, `npm run typecheck`, `npm run build`, and `python3 scripts/check-docs-sync.py`.
- Rebuilt and replaced `/Applications/Design Asset Manager.app` after the dependency-installer hardening pass; installed-bundle verification confirmed structured installer parsing, failed-package UI logging, and packaged Python installer events are present.
- Added an app-managed Python runtime resolver for the macOS AI branch. When the managed venv exists, Worker launch, AI Runtime Python Worker config, model downloads, cooperative model downloads, GPU probes, and dependency probes can resolve to the same managed Python instead of drifting across system Python installs.
- `macos-ai:install-deps` now creates/reuses the app-managed venv before running the installer and reports whether the managed runtime was created or reused; model download paths now also ensure the managed Python runtime exists before bootstrapping Hugging Face tooling.
- Additional managed-runtime checks passed: `node scripts/run-ts-test.mjs scripts/ai-runtime-ipc-contract.test.ts`, `node scripts/run-ts-test.mjs scripts/macos-ai-deps-installer-contract.test.ts`, `npm run typecheck`, `npm run build`, and `python3 scripts/check-docs-sync.py`.
- Rebuilt and replaced `/Applications/Design Asset Manager.app` after the managed Python runtime pass; installed-bundle verification confirmed the venv resolver, managed installer path, managed model download path, and AI Console managed-runtime log messages are present.
- Actual app-managed Python installation now succeeded for the core macOS AI dependency set: pip, setuptools, wheel, Hugging Face Hub, Torch, TorchVision, Transformers, ONNX Runtime, Optimum ONNX Runtime, Pillow, NumPy, RAM++ Recognize Anything package, Accelerate, Safetensors, timm, OpenCV, RapidOCR ONNX Runtime, PaddleOCR, PaddlePaddle, and MLX.
- Redacted managed-Python probes confirmed Torch MPS is available, ONNX Runtime exposes CoreML and CPU providers, RAM imports, RapidOCR imports, PaddleOCR/Paddle imports, CLIP/SigLIP ONNX dependencies import, and MLX installed successfully.
- Updated the dependency installer package list to include MLX, RAM++ Recognize Anything, RapidOCR, PaddleOCR, and PaddlePaddle, and updated the OCR environment checker so PaddleOCR is reported instead of being omitted from the probe payload.
- Additional dependency verification passed: `env PYTHONPYCACHEPREFIX=/private/tmp/dam-pycache python3 -m py_compile ai-service/tools/install_macos_ai_deps.py ai-service/tools/check_ocr_env.py`, `node scripts/run-ts-test.mjs scripts/macos-ai-deps-installer-contract.test.ts`, `npm run typecheck`, `npm run build`, `python3 scripts/check-docs-sync.py`, and `npx electron-builder --mac --dir --config.mac.identity=null --config.electronDist=node_modules/electron/dist --config.electronVersion=30.5.1`.
- A refreshed macOS app bundle was generated under the project package output and verified to contain the expanded dependency installer and PaddleOCR environment probe. `/Applications/Design Asset Manager.app` was not replaced in this pass because the escalation request for further external-state access was rejected by the approval system usage limit.

## 2026-06-03 Session: TLS 1.2 Download Fix + CAS Bridge Blocker

### Changes
- Rewrote `ai-service/tools/download_cooperative_hf_model.py`:
  - Added `urllib3.PoolManager.__init__` monkeypatch forcing `ssl_version=ssl.PROTOCOL_TLSv1_2`
  - Added urllib-based fallback downloader with custom SSLContext (TLS 1.2, no verify)
  - Added `--all` flag for batch downloading all cooperative models
  - Added `--model-family` flag for per-model-family downloads
  - Added `NoCasBridgeRedirect` handler to refuse redirects to TLS 1.3-only CAS bridge
- Rewrote `ai-service/tools/download_hf_model.py` with same PoolManager TLS 1.2 patch

### Network Blocker: XetHub CAS Bridge
- All large model weight files (>100MB) on Hugging Face now redirect to `cas-bridge.xethub.hf.co`
- The CAS bridge requires TLS 1.3
- macOS LibreSSL 2.8.3 cannot complete TLS handshake with the CAS bridge
- Small files (CSV, configs, tokenizers) are served from CloudFront directly and download fine
- Solutions for user: use VPN, upgrade Python to OpenSSL 1.1.1+ build, or use hf-mirror.com

### Download Status (partial, via intermittent connections)
| Model | File | Downloaded | Target |
|-------|------|-----------|--------|
| WD Tagger | model.onnx | 161MB | ~800MB |
| WD Tagger | selected_tags.csv | 308KB | 308KB ✓ |
| CLIP | model.safetensors | 0 (corrupted) | ~577MB |
| CLIP | configs (7 files) | ✓ complete | |
| Florence-2 | model.safetensors | not started | ~2.8GB |
| Florence-2 | configs (5 files) | ✓ complete | |
| RAM++ | ram_plus_swin_large_14m.pth | 180MB | ~1.4GB |

### Verification
- `npm run typecheck` passed
- `npm run build` passed
- `npx electron-builder --mac --dir` passed
- `/Applications/Design Asset Manager.app` deployed with TLS 1.2 fixed scripts
