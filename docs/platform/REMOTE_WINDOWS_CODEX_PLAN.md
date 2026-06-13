# Remote Windows Codex Plan

This handoff is for the Windows host Codex working on branch
`codex/windows-ai-real-evidence`. Development remains Mac-first; the Windows
host should fast-forward from GitHub, validate parity, and only implement
Windows-specific fixes when the current branch already proves the shared
contract on macOS.

## Ground Rules

- Start by reading `AGENTS.md`, `TASK.md`, this file, and
  `docs/platform/WINDOWS_AI_REAL_EVIDENCE_RESULT.md`.
- Run `git pull --ff-only` before doing any work. Do not continue from stale
  Windows files.
- Preserve the rule: default shared architecture, branch only for real OS,
  runtime, packaging/native dependency, path, or process differences.
- Do not rename IPC channels, database schema semantics, AI Worker HTTP API
  shapes, or shared response fields unless the Mac-side branch has already made
  that explicit contract change.
- Keep privacy: no secrets, full private paths, model cache paths, base64
  payloads, or private asset data in logs, docs, commits, or chat.

## Current Mac-Side State To Pull

The Mac-side branch has recently shared more Platform AI runtime types:

- `PlatformAiWorkerProbeResultBase` owns the Worker probe envelope.
- `PlatformAiWorkerProbeWithRuntimeVersions` is the shared input shape for the
  AI capability matrix.
- Shared Worker probe header projection uses the platform-neutral envelope.

After pulling, Windows should verify these type-only shared-surface changes
still compile and still render the Windows AI status surface correctly.

## Required First Step On Windows

```powershell
Set-Location -LiteralPath 'G:\antigravity\Design Asset Manager'
git fetch origin
git checkout codex/windows-ai-real-evidence
git pull --ff-only
git log -1 --oneline
```

If `git pull --ff-only` fails, stop and report the conflict. Do not merge.

## Validation Gate

Run the focused checks first:

```powershell
node scripts/run-ts-test.mjs scripts/ai-runtime-status-workflow.test.ts
node scripts/run-ts-test.mjs scripts/ai-runtime-panel-contract.test.ts
node scripts/run-ts-test.mjs scripts/ai-console-macos-branch.test.ts
node scripts/run-ts-test.mjs scripts/macos-ai-runtime.test.ts
npm run typecheck
npm run build
python scripts/check-docs-sync.py
git diff --check
```

Then run the Windows real-evidence validation when runtime state and time allow:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows-ai-real-evidence-validation.ps1
```

Capture a sanitized summary in
`docs/platform/WINDOWS_AI_REAL_EVIDENCE_RESULT.md`. Do not include full local
paths or model cache paths.

## Remaining Work, Ordered By Maintenance-Cost Reduction

1. **Completed: finish Platform AI runtime type sharing.**
   Renderer and shared runtime-status workflows no longer reference concrete
   macOS/Windows branch or Worker probe result types. Shared branch metadata,
   Worker diagnostics input, runtime-version probe, and display types now cover
   those consumers. Shared Python compatibility and execution response bases
   cover display projectors without MPS/CUDA unions or casts, and one shared
   display state machine now handles both accelerators through platform copy.
   Shared Worker probe diagnostics projection also owns connection, ONNX, and
   CLIP fields. One platform copy table and connection matcher serve both
   diagnostics and panel projectors. Branch-panel, Worker-panel, and
   capability-matrix display copy now comes from one
   `PLATFORM_AI_SURFACE_COPY` table keyed by `PlatformAiBranch`; the full AI
   Runtime settings-panel title, description, error, and action copy is now a
   nested entry in that same table. The concrete macOS/Windows diagnostics
   display aliases and wrappers are removed; one shared projector selects only
   the genuine MPS/CUDA device field from `PlatformAiBranch`. Concrete response
   names remain at main-process, IPC contract, platform type-definition, and
   genuine MPS/CUDA adapter boundaries. Platform AI Branch Status labels and
   route-overview copy also come from one branch-keyed display table; runtime
   lane definitions, evidence scoring, current-OS mapping, and platform action
   commands remain intentionally concrete. AI Console and AI Runtime settings
   now share one renderer-local request adapter that selects the existing
   capability, Python status, and Python execution-probe methods by
   `PlatformAiBranch`; all concrete preload channel methods remain unchanged.
   The main Platform AI Branch Status projector now keeps shared workflow
   titles and branch-aware summaries in `WORKFLOW_METADATA`, leaving the
   per-platform `WORKFLOWS` tables focused on concrete lane topology.
   `RUNTIME_LANE_METADATA` now also owns default lane labels and runtime kinds,
   with a branch-specific override only for the existing macOS external-HTTP
   Ollama fallback. The platform tables still own lane membership, ordering,
   primary-lane selection, and workflow-specific CLIP labels. Shared
   `PlatformAiRuntimeLaneId` typing now also covers main-process lane metadata
   and model-readiness routes. The readiness mapper uses shared Python and
   Llama accelerator lane families while intentionally emitting evidence for
   both branches; the branch projector remains responsible for selecting the
   applicable platform topology. Platform AI action command routing now keeps
   its sole macOS-specific AI Tag runtime installer in
   `PLATFORM_ACTION_COMMAND_OVERRIDES`; Windows and unspecified branches retain
   the shared Runtime management command. Worker diagnostics now use
   `PLATFORM_AI_WORKER_PROBE_ACCESSORS` for the genuine macOS
   `isMacOS`/MPS fields and Windows platform/CUDA fields, leaving the shared
   projector free of platform control-flow branches. Diagnostics selection now
   resolves the branch once and selects from a branch-indexed probe map,
   preserving explicit branch priority, Windows-only inference, and the
   ambiguous dual-probe macOS default. The renderer Platform AI Runtime adapter
   now maps branches to the existing concrete preload methods through
   `PLATFORM_AI_RUNTIME_REQUEST_METHODS`, and the main branch-status projector
   maps branches to real OS platform names through `PLATFORM_BRANCH_PLATFORMS`.
   The follow-up completion audit is also covered by
   `scripts/ai-runtime-status-workflow.test.ts`: renderer/shared Platform AI
   surfaces must not reintroduce direct `platformBranch === "windows"` or
   `platformBranch === "macos"` control flow, and remaining platform checks are
   locked to audited runtime registry/resolution, provider registration,
   platform detection, Doctor, OCR/Llama runtime installation, branch-status
   OS matching, shared platform metadata constants, and Doctor display masking
   boundaries. These remaining checks are genuine OS/runtime/path/process
   adapters, not renderer/shared workflow type branching. Shared current-branch
   runtime metadata lookup now also uses `PLATFORM_AI_BRANCH_RUNTIME_DESCRIPTORS`
   and `CURRENT_PLATFORM_AI_BRANCH_PRIORITY` instead of hand-written
   macOS/Windows metadata-key calls; marker-to-branch resolution uses
   `PLATFORM_AI_BRANCH_BY_MARKER`. Main-process disabled branch runtime
   provider registration now uses `PLATFORM_AI_BRANCH_RUNTIME_PROVIDER_DESCRIPTORS`
   so the existing runtime ids, platforms, metadata keys, and profile rules are
   registered through one shared loop. Python Worker auto-start support is now
   also represented by `PYTHON_WORKER_AUTOSTART_PLATFORMS`, preserving the
   existing macOS/Windows auto-start set without an inline bootstrap branch.
   Runtime profile defaults and hardware-hint overrides now use
   `DEFAULT_RUNTIME_PROFILE_RULES` and `HARDWARE_RUNTIME_PROFILE_RULES`,
   preserving the existing Windows CPU/CUDA and macOS arm64/x64 recommendations
   without a hand-written platform if-chain. Platform profile detection uses
   `PLATFORM_PROFILE_RULES` for the existing win32/darwin/linux profile mapping
   while preserving the real OS capability booleans. Doctor display projection
   now uses `DOCTOR_PLATFORM_LABELS` for the existing macOS label while keeping
   raw platform fallback for Windows and other platforms. Platform AI default
   branch fallback now uses `DEFAULT_PLATFORM_AI_BRANCH` across shared
   projectors and renderer initial state, preserving the existing macOS default
   without duplicating default policy at each call site. Platform AI branch
   runtime provider profile selection now also lives in descriptor
   `profileRules`, preserving the existing macOS Apple Silicon, macOS Intel,
   and Windows CUDA profile outputs without per-branch resolver functions.
   Platform AI branch workflow topology now also stays separate from
   `resolveWorkflowDefinition()` / `resolveRuntimeLane()`, so platform tables
   keep genuine lane membership and primary-lane differences while shared
   runtime-kind and default-label resolution happens once. Runtime profile
   recommendation reason copy now also lives in `RUNTIME_PROFILE_REASON_MESSAGES`,
   preserving the existing Windows CUDA, Windows CPU, macOS Apple Silicon,
   macOS Intel, and external-inference reason strings without a profile-id
   if-chain. Llama no-GPU accelerator default selection now lives in
   `DEFAULT_LLAMA_ACCELERATOR_RULES`, preserving the existing Windows Vulkan
   default and cross-platform CPU fallback while keeping artifact/path/process
   differences inside the Llama runtime adapters. The read-only Llama
   governance plan now also selects macOS llama.app and Windows llama.cpp
   adapters through `LLAMA_RUNTIME_PLATFORM_ADAPTERS`, preserving adapter output
   without plan-flow platform conditionals. Managed OCR/Python venv executable
   path selection now lives in `OCR_MANAGED_PYTHON_RUNTIME_ADAPTERS`,
   preserving the existing Windows `Scripts/python.exe` and cross-platform
   `bin/python` paths while keeping interpreter discovery and installer
   processes in OCR platform adapters. OCR base Python discovery selection now
   also lives in `OCR_BASE_PYTHON_RESOLVERS`, preserving Windows `where python`
   and common install-root search, macOS Homebrew fallback, and the
   cross-platform `python` fallback. Llama server executable selection,
   missing-executable copy, chmod-before-spawn policy, zip extraction command
   choice, and Windows force-stop command now live in
   `LLAMA_SERVER_PROCESS_ADAPTERS`, preserving the existing Windows
   `llama-server.exe` and cross-platform `llama-server` process behavior.
   Llama hardware detection dispatch now also uses the internal
   `hardwareDetectionAdapters` table, preserving macOS, Windows, and generic
   CPU fallback probe behavior while keeping OS commands in concrete adapters.
   Electron app lifecycle policy now lives in
   `ELECTRON_APP_LIFECYCLE_POLICIES`, preserving the existing Windows
   AppUserModelId value, Windows/default quit-on-all-windows-closed behavior,
   and macOS keep-running behavior without inline entry-point platform
   branches. The completion-audit source contract now also separately proves
   `src/main`, `src/shared`, and `src/renderer` have no direct
   `process.platform ===/!== "win32"/"darwin"` control-flow branches; remaining
   `process.platform` usages are adapter lookup/default-parameter, platform
   detection, IPC current-platform reporting, or runtime metadata boundaries.
   Shared Platform AI runtime metadata helper functions now also live in
   `platform-ai-runtime-metadata.constants.ts`, preserving the concrete
   macOS/Windows lane topology while removing duplicate capability-builder and
   fallback-status policy from the concrete runtime constant files. Shared
   `currentPlatformLaneStatus()` now also owns the common unavailable,
   required-arch fallback, and evidence-insufficient lane-status policy while
   the concrete macOS/Windows constants retain genuine lane membership,
   ordering, labels, backend names, warnings, and topology. AI Runtime
   app-data root path selection now uses `AI_RUNTIME_APP_DATA_ROOT_ADAPTERS`,
   preserving the existing Windows and default macOS app-managed runtime
   directory semantics without a local `isWin` ternary in runtime manager
   creation. Llama runtime package artifact matching now uses
   `LLAMA_RUNTIME_PACKAGE_PATTERN_RULES`, preserving the existing macOS,
   Linux, Windows CUDA, Windows Vulkan, and Windows CPU release filename
   matching without platform conditionals in the planner flow.

2. **Completed: audit AI Console platform probe consumption.**
   AI Console requests both existing platform probe IPC responses, selects the
   current branch through the shared workflow, and stores shared probe/display
   values plus the selected `PlatformAiBranch`. Concrete IPC response shapes
   remain unchanged.

3. **Completed: promote shared branch/probe panel input types.**
   Settings and AI Console branch/probe panels use shared metadata, Worker
   probe, display, lane, and `PlatformAiBranch` inputs. Platform booleans no
   longer cross those renderer component or shared projector boundaries.
   CUDA/MPS/Llama details remain in their runtime adapters and lane evidence.

4. **Re-run Windows evidence after each shared-surface slice.**
   At minimum run the focused TypeScript tests and typecheck/build on Windows.
   For product-facing UI changes, use Electron/Playwright screenshots and check
   document/body horizontal overflow. For audit-only test/docs slices that do
   not change product-facing renderer or runtime code, record the focused source
   contract validation and skip the full real-evidence script unless runtime
   state and time make a re-run useful.

5. **Update the task ledger, not root docs.**
   Record each slice, commands run, screenshot result or skip reason, Windows
   validation result, and the next smallest slice in `TASK.md`.

## Commit Rules

- Use small commits.
- Stage only touched files; never use `git add .`.
- Ignore unrelated dirty files unless they block the task.
- Commit messages should describe the shared-surface reduction, for example:
  `Share platform AI worker probe panel input type`.

## Stop Conditions

Stop and report instead of guessing when:

- `git pull --ff-only` fails.
- A validation failure contradicts the shared contract.
- A fix would require changing IPC channel names, shared response fields,
  database schema semantics, or AI Worker HTTP API shapes.
- A command would expose secrets, full private paths, model cache paths, or
  private asset data.
