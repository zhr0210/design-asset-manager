# Asset Card

This compatibility module owns one native single-asset card and its checked Library generation.
The separate [Work Mode implementation](../work-mode/README.md) now owns saved multi-asset sets and multiple native windows.
The [Work Mode target](../../../docs/product/WORK-MODE-AND-MOTION-REFERENCE.md) under ADR 0485
adds saved multi-asset sets and multiple native windows; this module does not yet implement
that lifecycle, video references or native cross-application file handoff. Its existing
one-window shape is not a product-level limit. No behavior changes through this note.
`asset-card-controller.ts` owns selection, window lifetime and session drafts;
`electron-asset-card-window.ts` owns Electron presentation and sender identity.
`../ipc/asset-card.ipc.ts` registers the narrow bridge.

- The normal application frame may open a card or synchronize a draft. Requests use
  Library/Asset identities and a bounded visible ordering, never filesystem paths.
- Only the owned native frame may inspect or act on the card. Its sandboxed Preload
  exposes `assetCardAPI`, without the normal application bridge. It is built as a
  self-contained bundle because sandbox require cannot load sibling chunks.
- Main checks Library identity/generation before and after asynchronous reads.
  Explicit Library transitions and application shutdown revoke the window; revocation
  destroys the window and cannot be vetoed by renderer beforeunload.
- Opening the same target focuses its existing window. Switching targets retains
  each asset's drafts. Both application and native edits synchronize with Main through a separate draft-only channel; native
  events update the application view without being echoed as another write.
- Drafts are session-only; closing a card retains them, closing/changing Library clears
  them. Clean descriptions follow committed metadata. Dirty descriptions keep the
  comparison base. Completion of an older save cannot replace later typing.
- Description commits reuse the held Active Library connection with an optional atomic
  expected-caption predicate. Legacy two-argument callers remain compatible.
- The quick rotate button changes display only. The explicit [image tools](../image-tools/README.md)
  produce a real cropped/rotated/mirrored/resized PNG from the controlled preview and save
  a separate Managed Asset after review. The original is unchanged.
- [Visual AI](../visual-ai/README.md) now provides confirmed analysis and prompt reversal;
  configuration alone does not authorize transmission. The card does not acquire models.
  AI settings opens the application settings.

Formal wiring is in `src/main/index.ts`, the dedicated `/asset-card` renderer route and
`src/preload/asset-card.ts`. Evidence covers unbundled application execution on macOS
with generated images, temporary profile/Library and blocked external networking;
Windows, packaged application, true inference and large-library performance remain
unverified. A BrowserWindow is real OS behavior, not the earlier browser-only card demo.

Validation: `npm run test-asset-card`, `npm run test-asset-description-draft`,
`npm run test-active-library-ipc`, `npm run test-app-ipc-registration`, and
`node scripts/active-library-electron.e2e.test.mjs`.

Main元数据读取按已有导航窗口（最多500项）或当前素材ID进行，保留调用方的
导航顺序、失效检查和草稿同步；不为每次打开/切换/刷新读取整库。
