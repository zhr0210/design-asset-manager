# Remote Windows Validation Guide

Development remains Mac-first. Use the Windows host to validate real Windows
runtime, packaging, native dependency, path, process, and renderer behavior
after the shared implementation is pushed.

## Current State

The Real AI Evidence Closure assignment is complete through commit `8d53d03`.
There is no pending Windows-only implementation assignment.

Validated Windows evidence includes:

- CUDA fixed-tensor execution;
- WD Tagger ONNX Session load;
- CLIP ONNX finite 512-dimensional embedding;
- Llama CUDA GGUF/mmproj text and generated-image inference;
- shared Windows Platform AI Branch Status projection;
- Electron/Playwright AI Console screenshot and overflow checks;
- explicit OCR generated-image probe preserving dependency/artifact gaps.

## Standard Sync

```powershell
git fetch origin
git checkout codex/windows-ai-real-evidence
git pull --ff-only
git log -1 --oneline
```

Stop if fast-forward fails. Do not merge or redesign shared contracts on the
Windows host.

## Validation

Run focused checks first:

```powershell
npm run typecheck
npm run build
npm run ci:test-runtime-safety
python scripts/check-docs-sync.py
git diff --check
```

For AI evidence changes:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows-ai-real-evidence-validation.ps1
```

For future Runtime Package Executor changes, use generated local package
fixtures first. Do not download a runtime or model unless the task explicitly
authorizes the exact source and scope.

## Reporting

Write only a sanitized summary to
`docs/platform/WINDOWS_AI_REAL_EVIDENCE_RESULT.md` or the nearest current task
document. Include the commit, commands, pass/fail status, workflow evidence,
screenshot/overflow result, and blocker category.

Never include credentials, complete private paths, model-cache paths, user
asset data, image payloads, or binary contents.
