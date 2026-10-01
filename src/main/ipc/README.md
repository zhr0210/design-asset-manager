# Main IPC

IPC handlers expose main-process services to the preload bridge and renderer.

## Entry Files

- `asset-card.ipc.ts`: Main-only open/draft synchronization and owned-card-only inspect/action.
- `ai-backend.ipc.ts`: restored trusted configuration and explicit connectivity/model-list probes, using injected App Settings and a dependency-isolated, GET-only ModelServiceProbe (no legacy inference imports).
- `asset.ipc.ts`: asset library operations.
- `asset-tag.ipc.ts` and `tag.ipc.ts`: tag workflows.
- `download.ipc.ts`: download queue.
- `settings.ipc.ts`: app settings.
- `ai-client.ipc.ts`, `ai-worker.ipc.ts`, `ai-model.ipc.ts`: AI controls.
- `ai-runtime.ipc.ts`: AI Runtime controls and Platform AI Branch Status projection channels.
- `color-palette.ipc.ts`, `ocr*.ipc.ts`: analysis helpers.

## Rules

- Native cards never receive the full application Preload. Window tokens and current
  Library generation bind actions; Library transitions force revocation. Draft sync
  is memory-only. Caption writes optionally compare the previous caption atomically.
- Successful tag/caption/Trash mutations notify the native card to refresh metadata.
  Notification failure does not convert a committed write into a reported write failure.
- Do not rename IPC channels without updating preload and shared contracts.
- Keep validation close to the handler.
- Use dedicated AI Runtime channels for Platform AI Branch Status; do not overload raw capability probe channels with product workflow status.
- Explicit AI Runtime load probes must use registered model identities rather than renderer-provided paths, return sanitized evidence, and require a user action.
- Explicit runtime execution probes must use fixed synthetic inputs and remain distinct from model-load evidence.
- AI Client handlers must use shared channel constants and request/response types rather than string literals or inline payload types.
- Legacy direct/cooperative model acquisition, direct model deletion, compatibility self-repair and the combined Llama Runtime/GGUF install start fail closed with `LEGACY_MODEL_MUTATION_BLOCKED` until the verified Model Artifact Installer exists. Read-only listing/planning remains compatible; direct/cooperative cancel channels return `NO_ACTIVE_LEGACY_MODEL_TRANSFER` because this build cannot own an older downloader process.

## Tests

```bash
npm run typecheck
npm run build
```

## Change Log

| Version | Time | Change |
| --- | --- | --- |
| v1.3.6 | 2026-08-10 | Contained legacy model acquisition, direct deletion and compatibility self-repair behind stable fail-closed results while preserving read-only status and honest no-active cancellation responses. |
| v1.3.5 | 2026-06-06 | Extended the registered ONNX probe to accept the shared CLIP family request and return real embedding evidence. |
| v1.3.4 | 2026-06-06 | Added the user-initiated fixed-tensor Python MPS execution probe channel. |
| v1.3.3 | 2026-06-06 | Added the user-initiated, registered-model-only WD Tagger ONNX load probe channel. |
| v1.3.2 | 2026-06-06 | Adopted the shared AI Client channel and request/response contract across handlers and preload. |
| v1.3.1 | 2026-06-04 | Added Platform AI Branch Status channel guidance for `ai-runtime:get-macos-ai-branch-status` and `ai-runtime:get-windows-ai-branch-status`. |
| v1.3.0 | 2026-06-04 | Documented dedicated Platform AI Branch Status IPC rule for Windows/macOS shared response shape. |
| v1.2.1 | 2026-05-31 | Added settings folder picker IPC for external model storage selection. |
| v1.2.0 | 2026-05-31 | Added Llama runtime installer IPC for hardware detection, install progress, server control, and tests. |
| v1.2.1 | 2026-06-06 | Extended the existing Llama server test channel with text plus generated-image inference evidence; no user asset is read or persisted. |
| v1.1.0 | 2026-05-31 | Added AI backend IPC handlers for external backend settings, health checks, and model lists. |
| v1.0.0 | 2026-05-31 | Rewrote README as compact IPC ownership and channel-safety notes. |

## Confirmed image actions (2026-09-12)

`visual-ai.ipc.ts` registers scoped prepare/run/results/cancel/tag-confirmation for the main
window and the current owned native card. See [Visual AI](../visual-ai/README.md).
`download.ipc.ts` adds explicit receipt-based execution beside history CRUD; old URL-based
enqueue requests cannot bypass confirmation. See [Managed download](../managed-download/README.md).

`image-tools:prepare/save/discard` is a narrow image-variant bridge, accepting identities and
bounded options instead of file paths. Main and current owned native card are the only
callers; save consumes a review receipt. See [image tools](../image-tools/README.md).

## Restored tag metadata (2026-09-13)

`tag:create-alias`, `tag:remove-alias`, and `tag:set-parent` retain existing Preload
arguments, return the Active Library success envelope and trigger the existing metadata
refresh notification. Trusted Main sender and exact argument validation precede Host calls.
The Host uses its held Library connection; no global TagService or schema migration is used.
Tag projections include aliases/parent metadata and confirmed Asset alias search fields.
Merge/delete stay in the disabled list pending identity retention and recovery semantics.

图片工具的可选 `source`/`cropRect` 扩展已获批准：缺省source保留preview行为，
原件读取仅存在于Main内部，不增加文件路径或原件读取Preload channel。区域基于
方向归正/旋转/镜像后的画面。review补充输入来源/尺寸；save仍只接受receipt。

`download:retry` keeps its id argument and response envelope. For a live recovery-required
job it selects held, verified local recovery after the UI confirmation, rather than another
HTTP transfer. Normal failed/cancelled downloads retain Range retry semantics; importing and
completed jobs cannot start another attempt. No recovery path accepts Renderer file paths.

2026-09-13: browser/site-login/external-search/page-extraction IPC handlers and their Preload
methods are removed. Local `tag-search:*`, Library, independent `download:*`, AI and image
tools are retained. The generic application composition no longer accepts browser managers,
extractors, login services or browser event registrars.
