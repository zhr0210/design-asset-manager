# Design Asset Manager

Local desktop app for managing design assets.

## Features

- Import, normalize, thumbnail, and store local image assets.
- Browse, search, tag, batch tag, and inspect assets.
- Capture assets through an embedded browser and download queue.
- Extract palettes, OCR text, and text foreground colors.
- Run AI tag suggestions, prompt reverse, visual analysis, and local model management through a Python AI Worker.

## Stack

- Electron main: `src/main/`
- React renderer: `src/renderer/`
- Preload bridge: `src/preload/`
- Shared contracts/types: `src/shared/`
- SQLite runtime data: user data directory
- Python AI Worker: `ai-service/`
- Build: Electron Vite + TypeScript

## Architecture Principles

- Keep a Shared Product Surface across Windows and macOS: product workflows, renderer surfaces, main-process orchestration, and shared contracts should be reused unless real platform constraints force a branch.
- Keep platform differences in adapters, runtime-lane evidence, packaging/native dependency plans, and path/process helpers.
- Treat AI inference runtime as the main platform branch: Windows and macOS may use different backends, but product workflow status should stay comparable.

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run build
python -m unittest discover ai-service/tests
python scripts/check-agent-context.py
python scripts/check-forbidden-paths.py
python scripts/check-docs-sync.py
```

## Directories

- `AGENTS.md`: AI agent rules.
- `.codeindex/`: module map, test map, forbidden path rules.
- `TASK.md`: current task and boundaries.
- `src/main/`: Electron main process, SQLite, IPC, services, browser integration.
- `src/preload/`: safe renderer bridge.
- `src/renderer/`: React UI, routes, components, stores.
- `src/shared/`: shared types, constants, IPC contracts.
- `ai-service/`: FastAPI AI Worker, model wrappers, queue, tests.
- `scripts/`: checks and maintenance scripts.
- `tools/`: local helper tools.

## Documentation Rules

- Required startup context is only `AGENTS.md` and `TASK.md`.
- Module details belong in the nearest module `README.md`.
- Every module README must keep a change log with version, time, and change content.
- Do not restore long development plans, reviews, walkthroughs, or historical reports into active docs.

## Protected Boundaries

- Do not read or modify archives, eval reports/datasets, model caches, runtime SQLite DBs, model weights, or user asset libraries by default.
- Do not casually change IPC channels, SQLite schema semantics, or Python AI Worker HTTP API.
- Do not bypass the Electron poller for AI Worker result sync.
- Do not run model inference inside Electron main.
- Platform AI Branch Status uses dedicated AI Runtime IPC channels for Windows/macOS with one shared response shape.
- `src/main/extensions/photoshow/` is bundled third-party extension content; do not read/refactor `unpacked` by default.

## Rollback

Use the nearest module README change log to locate the version, time, changed module, and affected entry files before reverting.

## Change Log

| Version | Time | Change |
| --- | --- | --- |
| v1.8.0 | 2026-06-04 | Added compact Windows/macOS shared architecture principles and Platform AI Branch Status contract boundary. |
| v1.7.0 | 2026-05-31 | Fixed blurry image preview in AssetInspectorDrawer by upgrading the source from a 512px low-resolution thumbnail to the high-resolution fileUrl (with graceful fallback). |
| v1.6.0 | 2026-05-31 | Removed max-width limits (max-w-7xl, max-w-[1320px], max-w-[1540px]) from AppShell, Settings, and AI Console wrappers, allowing components to adaptively stretch and fill the maximized desktop workspace. |
| v1.5.0 | 2026-05-31 | Removed sidebar user information card and added a centralized global Day/Night theme toggle button with local storage persistence and full dark mode styling. |
| v1.4.0 | 2026-05-31 | Added download source selection dropdown to Llama runtime installation wizard to allow choosing between HuggingFace official and HF-Mirror with hot-reloading support. |
| v1.3.0 | 2026-05-31 | Removed the `docs/` startup dependency and moved current task guidance to root `TASK.md`. |
| v1.2.0 | 2026-05-31 | Reduced required agent startup context to two files and documented the new rule. |
| v1.1.0 | 2026-05-31 | Rewrote root README from source structure with project boundaries and docs governance. |
| v1.0.0 | 2026-05-31 | Rebuilt compact project README. |
