## 2026-06-06T00:38:50+08:00

Implement Phase 16 (Path Governance Execution), Phase 15B (Packaged Production Validation & Sign-off Planning), and Local Model Download Optimization in the Design Asset Manager project, validating they integrate safely and pass the entire CI suite.

Working directory: <DAM_WORKSPACE>
Integrity mode: development

## Requirements

### R1. Path Governance Execution (Phase 16)
- Transition the path-migration service from dry-run reporting to active migration execution.
- Implement a user-confirmable path remapping operation that physically moves/copies thumbnail/normalized image files to their `managed-cache` locations and updates the corresponding paths in the SQLite database.
- Establish database and asset backup/recovery steps to ensure no data is permanently lost or corrupted if execution fails midway.

### R2. Packaged Production Validation & Sign-off (Phase 15B)
- Configure code-signing and notarization templates in `electron-builder` and GitHub Actions using environment secrets.
- Implement packaging smoke tests (`package:smoke` or equivalent) that run the packaged executable, verify it successfully resolves the app-managed venv and `ai-service` scripts, and starts up without crashing.

### R3. Model Download Optimizer & Parallel Transfer
- Enhance the model downloader tools (`download_cooperative_hf_model.py` and `download_hf_model.py`) to support mirror site switching (e.g., hf-mirror.com) and multi-channel parallel downloading.
- Allow users to download large binary weights for RAM++, Florence-2, CLIP/SigLIP ONNX, and GGUF models safely with resume-on-failure support.

## Acceptance Criteria

### Path Governance Execution (R1)
- [ ] Active path migration physically moves thumbnail/normalized files and updates database paths upon explicit execution, while preserving fallback capability.
- [ ] Rollback recovery successfully restores database state to the backup if migration fails.
- [ ] Automated tests verify active migration and rollback behavior on mock database environments.

### Packaging and Sign-off (R2)
- [ ] Package smoke test script runs post-build verification and outputs resource resolution status.
- [ ] GitHub Actions workflow configuration contains code-signing and notarization placeholders utilizing environment secrets.

### Model Downloader (R3)
- [ ] Downloader CLI tools successfully check mirror connectivity, start parallel downloads, and support resuming interrupted downloads.

### Verification and Integration
- [ ] `npm run ci:governance` passes successfully (100% green).
- [ ] `npm run typecheck` and `npm run build` succeed without errors.

## 2026-06-06T14:35:48+08:00

Implement the cross-platform AI real execution closure roadmap for Design Asset Manager, bridging the gap between platform capabilities and executable action plans.

Working directory: <DAM_WORKSPACE>
Integrity mode: development

## Requirements

### R1. Platform AI Action Plan Execution
- Bridge the gap between AI branch status and real executable actions.
- For AI statuses indicating missing dependencies (`依赖缺失`), missing model artifacts, or insufficient evidence (`证据不足`), map and execute corresponding user-initiated setup tasks (e.g. trigger downloading, runtime launch, or verification actions).
- Keep UI routing dynamic based on evidence gaps.

### R2. Real AI Evidence & Model Route Verification
- Complete the real execution evidence closure for macOS MPS, ONNX, and Qwen3-VL GGUF/mmproj.
- Decide the status/route of the MLX route and execute closure (either fully implement it or cleanly remove/deprecate it).
- Establish Windows parity validation for CUDA/ONNX/Llama routes, maintaining shared workflow and contract interfaces.

### R3. Quality Assurance and Automated Validation
- Every implementation slice must be accompanied by focused automated validation tests (TypeScript/Python unit/integration tests).
- When feasible, use Playwright or Electron simulation to verify UI clicks and capture/review screenshots for visual correctness, preventing overlaps, clipped text, or incorrect states.

## Acceptance Criteria

### UI and Contract Consistency
- [ ] No new platform-specific UI forks for common actions; reuse the shared Platform AI Branch Status response shape and workflow structures.
- [ ] All status changes correctly update the AI Console and Settings panel with accurate evidence, without showing mock/placeholder results.

### Platform Routes
- [ ] Real execution evidence for macOS MPS/ONNX is dynamically probed and cache-expired (5-minute TTL).
- [ ] Qwen3-VL GGUF/mmproj path is verified with real local model files, correctly handling in-progress or incomplete downloads.
- [ ] The MLX route has a definitive implementation or removal state with no dangling dependencies/imports.
- [ ] Windows CUDA/ONNX/Llama routes have corresponding parity status validation.

### Verification
- [ ] All TS tests (`scripts/ai-runtime-ipc-contract.test.ts`, etc.) and Python unit tests run and pass.
- [ ] Dev/production packaging verification checks pass.

## 2026-06-08T07:04:39Z

Implement the remaining long-term planned phases for Design Asset Manager on macOS, including Phase 16 path migration execution, OCR/Llama dependency auto-installers, and macOS production release signing/notarization setup.

Working directory: <DAM_WORKSPACE>
Integrity mode: development

## Requirements

### R1. Phase 16 Path Migration Execution (macOS)
- Activate and wire the `PathMigrationExecutor` to allow users to migrate absolute paths to logical `{ pathRootId, relativePath }` structures.
- Expose a safe IPC channel for dry-run checks and migration execution.
- Build a Settings UI/drawer to display dry-run results (affected rows, missing files, proposed path mappings, collisions).
- Implement database backup before write, and a robust rollback capability that restores settings and DB path fields upon failure or user cancellation.

### R2. OCR & Llama Dependency Auto-Installers
- Implement a user-initiated UI install/update flow for EasyOCR, RapidOCR, and PaddleOCR ONNX dependencies, replacing the deferred state.
- Implement a user-initiated GGUF/mmproj model downloader/installer flow within the Llama runtime panel.
- Ensure all download, installation, and server start actions are explicitly triggered by the user and update the UI status dynamically.

### R3. macOS Code Signing & Notarization
- Verify and wire the Apple entitlements (`build/entitlements.mac.plist`) and notarization post-package hook (`scripts/notarize.js`) into the build pipeline.
- Ensure local manual packaging can successfully ingest code signing credentials if present.

### R4. Quality Assurance and Validation
- Provide focused automated tests for the migration database updates, path mapping/remap layer, and installers.
- Ensure the TypeScript and Python test suites pass cleanly, and the production package builds successfully.

## Acceptance Criteria

### Path Migration
- [ ] Storing and resolving paths using logical root IDs (`library:primary`, `managed:cache`, etc.) works correctly on macOS.
- [ ] Settings panel shows an accurate path migration dry-run report.
- [ ] Migration creates a database backup before performing modifications, and rollback restores previous state on cancellation.
- [ ] Existing absolute paths remain compatible and readable as legacy fallbacks.

### Dependency Installers
- [ ] EasyOCR, RapidOCR, and PaddleOCR ONNX dependencies can be installed via user-initiated UI triggers.
- [ ] GGUF models and mmproj vision adapters can be downloaded and verified within the application UI.
- [ ] AI Console displays live download progress and model load readiness.

### Release & Verification
- [ ] Packaging hooks resolve correctly and typechecks/builds pass cleanly.
- [ ] Automated tests for path migration, remapping, and installers run and pass.

## 2026-06-08T18:02:54+08:00

Complete the remaining platform AI integration tasks, replacing mock paths with real model routes where possible, disabling silent mock fallbacks in cooperative tagging, and wiring dynamic action plan UI triggers.

Working directory: <DAM_WORKSPACE>
Integrity mode: development

## Requirements

### R1. Platform AI Action Plan Dynamic UI Wiring
- Bind workflow status labels (such as `依赖缺失`, `证据不足`, `尚未实现`) to executable UI operations in the AI Console.
- Clicking an action on a card must guide the user directly to the corresponding installer trigger or service management page (e.g. download model files, trigger dependency installers, or start backend runtimes).

### R2. JoyCaption & Deep Visual Analysis Realization
- Replace pure mock manual prompt reverse (JoyCaption) and mock layout analysis (VLM Deep Analysis) endpoints in the Python Worker.
- Integrate them with the real local Llama (OpenAI-compatible) service running Qwen3-VL, or safely hide/disable these manual options from the renderer if no real local/external backend is configured, instead of generating random/templated mock logs.

### R3. Fail-Closed Tagging & Translation Fallbacks
- Block silent mock fallbacks in cooperative taggers (`RAM++`, `Florence-2`, `CLIP`, `WD Tagger`) and the translation service (`OPUS-MT`).
- Replace silent mock predictions (filename-based mock tagging and placeholder translations) with real error reporting: if a model fails to load or packages are missing, the tagging/translation task must fail closed with a descriptive error.
- Implement a structured model state machine (`not_downloaded`, `downloaded`, `dependency_missing`, `load_failed`, `loaded_real`) for cooperative models to track availability before running inference.

### R4. Real AI Evidence Validation (macOS)
- Complete light-weight inference or load-readiness checks for macOS MPS (torch.mps), ONNX Runtime (CPU/CoreML), and Llama GGUF/mmproj routes.
- Cache the real execution evidence with a 5-minute TTL to prevent repeated slow probes.

## Acceptance Criteria

### Action Plan & UI Wiring
- [ ] UI cards for AI status display active buttons (e.g. "下载模型", "安装依赖") instead of display-only warning text when actions are needed.
- [ ] Actions correctly delegate to existing preload IPC handlers (`llamaRuntimeStartInstall`, `ocrInstallDependencies`, etc.).

### Real VLM & Fail-Closed taggers
- [ ] Python Worker prompt reverse and deep analysis fail cleanly or return real VLM outputs; no templated mock text is written.
- [ ] RAM++, Florence-2, CLIP, and WD Tagger fail tasks with real error messages when PyTorch/ONNX libraries or model weights are missing.
- [ ] OPUS-MT translation failure does not silently produce dummy localized text.

### Evidence Probing
- [ ] MPS and ONNX compatibility checking run real light-weight tensor and model load checks.
- [ ] Probing states cache successfully with 5-minute TTL.
- [ ] TypeScript and Python test suites pass cleanly (`npm run ci:governance`, `npm run typecheck`, and Python tests).
