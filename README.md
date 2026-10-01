> 换主机继续开发：[REHOST](docs/REHOST.md) · [当前交接状态](docs/handoff/CURRENT-STATE.md) · `node scripts/handoff-preflight.mjs`（离线只读）。

> 2026-10-01 完整源码快照与当前限制：[GitHub snapshot notes](docs/agents/GITHUB-SNAPSHOT-20261001.md)。Computer Use 和真实账号验收尚未完成；本分支不是安装包或全面可用承诺。

# Design Asset Manager

Local-first, AI-centered asset workspace for visual creators: understand assets,
find them with explainable matches, inspect them, and safely reuse them. Palette
proportions, tag suggestions, descriptions and prompt reconstruction are core
product goals. Saved multi-asset floating Work Sets connect references to ongoing
design work; advanced creative tools and screen recording are optional plugins. Manual workflows
remain usable when models are unavailable. See the canonical
[product foundation](docs/product/PRODUCT-FOUNDATION.md) for scope and deferred vision,
and [Work Mode](docs/product/WORK-MODE-AND-MOTION-REFERENCE.md) for the new core reference
workflow. These targets exceed the current single Asset Card implementation.

## Current capability and limits

For current wiring, validation evidence and remaining gaps, see
[implementation status](docs/agents/implementation-status.md) and the relevant
module README. Check the current callers when a task depends on a capability;
this project remains an integration work in progress.

## Development direction

The [commercial development goals](docs/product/COMMERCIAL-DEVELOPMENT-GOALS.md)
define quality targets within that product scope. The main agent owns planning,
architecture, implementation, review, documentation, integration and acceptance.
Existing artifacts and verification evidence are retained; delivery requires
scoped diffs and observable validation.

The [2026-09-07 development review](docs/product/DEVELOPMENT-REVIEW-20260907.md)
reassesses the current code and user workflow independently of prior task queues.
Its model-free workflow focus records an earlier integration priority, not the
current product positioning or a renewed task queue. ADR 0483/0484 and the product
foundation define the AI+ core and staged plugin/development-access direction.

## Formal Library workspace

The new `/library` interface now uses the existing Main-owned Active Library and
controlled previews for browsing, lexical/tag search, side inspection and focus viewing.
See the [integration report](docs/design/FORMAL-LIBRARY-CANVAS-20260914.md).
`npm run preview:library-canvas` opens the formal app with an isolated generated test library.

## Design and isolated preview

[DESIGN.md](DESIGN.md) routes to the current [mobbin.md](mobbin.md) visual contract.
Run `npm run prototype:work-mode` for the synthetic Gallery & Glass interaction preview.
It does not start Electron or read a real library. See the
[flow and validation handoff](docs/design/CORE-EXPERIENCE-PROTOTYPE-20260914.md).

## Stack

- Electron main: `src/main/`
- React renderer: `src/renderer/`
- Preload bridge: `src/preload/`
- Shared contracts/types: `src/shared/`
- SQLite runtime data: user data directory
- Python AI Worker: `ai-service/`
- Build: Electron Vite + TypeScript

## Architecture Principles

- Keep Asset Workspace as the primary product surface. Downloads, runtime
  diagnostics and model management serve asset work. Embedded web collection is
  retired; future browser connectors and cloud development access are deferred.
- Keep AI local-first. External inference requires a visible grant for the
  current action or reviewed batch and is never a silent fallback.
- Keep a Shared Product Surface across Windows and macOS: product workflows, renderer surfaces, main-process orchestration, and shared contracts should be reused unless real platform constraints force a branch.
- Keep platform differences in adapters, runtime-lane evidence, packaging/native dependency plans, and path/process helpers.
- Treat AI inference runtime as the main platform branch: Windows and macOS may use different backends, but product workflow status should stay comparable.

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm run context:route -- --task "Asset Trash restore"
# Explicit route override when the task is intentionally scoped:
npm run context:route -- --module asset-lifecycle
# Add --task to an explicit route when branch-specific callers or tests matter.
# For a genuine cross-capability task, prefer splitting it; otherwise use
# --max-routes 2 --expand and review the larger budget before reading.
# Machine-readable output (no npm banner):
npm --silent run context:route -- --task "Asset Trash restore" --json
npm run context:check
npm run test-agent-context-router
npm run test-python-unittest
python3 scripts/check-agent-context.py
python3 scripts/check-adr-router.py
python3 scripts/check-forbidden-paths.py
python3 scripts/check-docs-sync.py
```

SQLite-focused npm tests use Electron's embedded Node through the repository
test launcher, so a newer shell Node does not require rebuilding native modules.
`npm run dev` starts the real desktop app: startup opens/migrates its runtime
database and schedules legacy palette extraction. It is not an isolated smoke
test. Agent verification should use focused synthetic fixtures unless the
specific runtime data scope has been authorized.

## Directories

- `AGENTS.md`: AI agent rules.
- `.codeindex/`: versioned Agent Context Router catalog/schema, validated test profiles, and governance rules.
- `TASK.md`: current task and boundaries.
- `docs/adr/README.md`: compact ADR decision and delivery-state router.
- `docs/product/NORTH-STAR.html`: durable product vision and horizon map for
  development reference; it is not included in the runtime package.
- `src/main/`: Electron main process, SQLite, IPC, local services and reviewed downloads.
- `src/preload/`: safe renderer bridge.
- `src/renderer/`: React UI, routes, components, stores.
- `src/shared/`: shared types, constants, IPC contracts.
- `ai-service/`: FastAPI AI Worker, model wrappers, queue, tests.
- `scripts/`: checks and maintenance scripts.
- `tools/`: local helper tools.

## Documentation Rules

- Use `AGENTS.md` for project instructions. Read `TASK.md` when resuming work,
  checking earlier validation or locating a recovery point; it is not mandatory
  context for unrelated tasks.
- TASK records the request it belongs to; it does not extend that request's
  boundaries into a later task. Do not update it during a read-only review or
  a request to propose edits before writing.
- Start local tasks at nearby code and tests. When product semantics need
  clarification, select relevant ADRs through `docs/adr/README.md`.
- Module details belong in the nearest module `README.md`.
- Module READMEs describe current behavior, boundaries, and validation; they do not need per-task change logs.
- Do not restore long development plans, reviews, walkthroughs, or historical reports into active docs.

## Protected Boundaries

- Reading or modifying user assets, runtime data, model caches/weights, or archives requires explicit user approval for the specific target and scope.
- Changing IPC channels, SQLite schema semantics, Python AI Worker HTTP API, or another public compatibility seam requires the same specific approval.
- Existing explicit approval remains valid for the same target, operation and
  scope within the conversation. Ask again only for scope or impact beyond it;
  available resources or configured credentials are not approval. Reading
  callers, isolated tests of existing contracts and internal fixes that preserve
  those contracts do not themselves change a public seam. Other data and
  operation safeguards still apply. Continue independent authorized work while
  an approval is pending; see AGENTS.md for the full boundary.
- Do not bypass the Electron poller for AI Worker result sync.
- Do not run model inference inside Electron main.
- Platform AI Branch Status uses dedicated AI Runtime IPC channels for Windows/macOS with one shared response shape.
- `src/main/extensions/photoshow/` is bundled third-party extension content; do not read/refactor `unpacked` by default.

## Rollback

Use `git status`, `git diff`, `git log`, and the commit/tag recorded in `TASK.md`. Never revert, clean, or stage unrelated worktree changes.

Historical version notes are preserved in [README history](docs/history/root-readme-changelog.md).

## 2026-09-13 网页功能退休

内置浏览器、网页采集、站点登录与外部来源搜索已移除。本地素材库搜索、文件导入、
独立图片直链下载、AI、图片工具和入库恢复保留。真实库验证暂停。
范围/影响见[移除报告](docs/product/WEB-COLLECTION-RETIREMENT-20260913.md)，
后续扩展方向见[插件平台讨论稿](docs/product/PLUGIN-PLATFORM-DISCUSSION-20260913.md)。
