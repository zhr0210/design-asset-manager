# Native Work Sets

`work-window-controller.ts` owns one window per saved set and at most eight live windows. It verifies owned
sender/frame/token, scopes previews/notebooks to current members and serializes each window's operations.
`electron-work-window.ts` gives each window a separate memory session, sandbox preload, protocol handler,
blocked external networking and native drag/resize/pin behavior. `work-window-bounds.ts` keeps bounds visible.

Saved set content lives in the held Active Library v7 schema, not this controller or browser storage.
Device placement is keyed by an app-scoped opaque identity. Explicit native Save commits content plus layout
atomically; passive geometry writes are separately reported. Hide retains drafts, Close releases a slot and
sets open=false, and library/shutdown drain retires capabilities while retaining saved restore records.

`WorkSetWindow` shares `WorkReferencePanel` and `FocusView` with the approved prototype. It can save in-scope
image notebooks but cannot organize the library, enumerate unrelated files or invoke arbitrary application IPC.
Main-window locate/add events pass identities to the existing workbench; they do not acquire new permissions.

See ADR 0489 and `docs/product/WORK-SETS-20260920.md`. The existing Asset Card module remains a compatibility
entry. Native file handoff, video/reference frames, Windows and physical cross-display behavior are not claimed.

macOS native windows use `vibrancy: under-window` and `visualEffectState: active` to soften the desktop behind
them even when unfocused. CSS backdrop filtering alone cannot blur other application windows. The macOS Renderer removes its full-panel tint, CSS backdrop blur, 6px inset and second rounded surface;
foreground colors track system appearance. Images stay unfiltered. Non-macOS uses a legible solid fallback,
not an unverified imitation of native desktop blur. See DESIGN.md for the window interaction contract.
