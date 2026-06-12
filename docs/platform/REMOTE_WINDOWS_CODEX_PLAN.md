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

1. **Finish Platform AI runtime type sharing.**
   Remove remaining renderer/shared workflow references to concrete
   macOS/Windows probe result unions when the code only needs
   `PlatformAiWorkerProbeResultBase` or a small shared view type. Keep concrete
   types at IPC boundaries and platform-specific runtime detail projectors.

2. **Audit AI Console platform probe consumption.**
   Identify places where AI Console still treats macOS Worker probe data as the
   only concrete source. If Windows data can use the same shared view model,
   introduce a shared renderer-ready type and tests. Do not change existing IPC
   response shapes.

3. **Promote shared branch/probe panel input types.**
   Where Settings or AI Console components only render shared fields, move those
   component props to shared platform-neutral types. Keep CUDA/MPS/Llama route
   details in platform-specific lane evidence.

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
