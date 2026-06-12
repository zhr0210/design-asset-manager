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
   document/body horizontal overflow.

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
