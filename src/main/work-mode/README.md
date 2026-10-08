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

Both authenticated Workspace clients can list and control existing native windows by current Library scope
and saved work-set id through `work-windows:list` and `work-windows:control`. The Shared Client exposes
`workSets.windows(scope)` and `workSets.control(input)`; the control kinds are pin (with a boolean), hide,
recover and close. This separate interface returns open/visible/pinned/unsaved status without native tokens,
draft contents or geometry. Only the actual native port reports visibility and writes window placement.

Workspace close freezes and flushes participants before checking the window's serialized state. A dirty
work-set or notebook keeps its window and draft, shows the native surface, and returns `review-required`;
there is no Workspace discard flag. A clean close saves the real layout with open=false before destroying
the window. Failed/unknown flushes retain windows, and input is released after the check. State changes
publish the shared work-sets event so both clients can reread. Restricted `work-window:*` token APIs remain
native-sender-only. These paths are tested with real temporary SQLite and HTTP plus a fake OS port; that
evidence proves transport, persistence and draft safety, not physical pinning or cross-display effects.

See ADR 0489 and `docs/product/WORK-SETS-20260920.md`. The existing Asset Card module remains a compatibility
entry. The D additions below do not certify physical native or cross-display effects.

## D: media references and independent file copies (2026-10-08)

Ordinary Copy import accepts H.264, unrotated MP4 up to 96 MiB, one hour and 3840×2160 on Windows.
`windows-video-runtime.ts` verifies the packaged, source-bound MIT helper and uses Windows Media Foundation.
It queues decoding through the shared Governor (512 MiB reservation); the helper sets a 384 MiB process
commit limit before decoding. Cancellation/close retains the reservation until actual process close.
The helper is emitted under `out/main/windows-video/` during the normal build; rebuild its source with
`npm run build:windows-video`. Unsupported platforms/codecs do not silently substitute a decoder.

First confirmed video import backs up and upgrades the held Library to v15. Windows backup initial images
are bounded at 4 MiB, with existing journal, file-identity, memory and commit evidence checks preserved.
Canceling import does not upgrade. The migration extends the verified schema without rewriting old assets,
manual content or analysis records. Video is excluded from whole-image AI consumers; its first-frame preview
is not presented as whole-video analysis.

`work-media-storage.ts` owns references per current set/member/source generation. Requested and actual
100 ns ticks, order, notes, public source URL, selected frame and playback position persist in SQLite;
full-size PNGs remain separate from Originals and required first-frame previews. Removed relationships do
not delete the video or delivered copies. Drafts, session/revision checks, idempotent capture, rollback and
member revocation use the existing Host. URLs are recorded without fetching and reject credentials/query/hash.

`WorkMediaPanel` and `WorkFileHandoffPanel` expose the same actions in the Browser and native work windows.
`work-file-handoff.ts` prepares byte-identical Original/Preview copies, full-size compatible PNG or a selected
reference frame. Copies and provenance survive close/restart in the app profile, bounded at 64 copies/1 GiB.
Cleanup is explicit, after receiver-read review, through the system Trash. Each read rechecks library/member
authority and file content. Native drag additionally checks the private window actor/token; a default-app
open is only `open-requested`, never receiver success. External-source Original delivery is refused rather
than moving or overwriting third-party originals; this first path covers managed Copy assets.

`media-response.ts` supports authorized GET/HEAD and single byte ranges for both loopback and native media.
Ranges run only after the Host's normal membership/file verification. Invalid/multiple ranges receive 416;
range responses do not add filesystem access or cache media. This fixes real Chrome MP4 seeking.

Browser acceptance uses Blender's Big Buck Bunny (CC BY 3.0), actual decoding/downloads and full app reopen.
`scripts/work-media.test.ts` covers the real codec/Host persistence, cancellation, format/authority rejection
and handoff lifecycle. `scripts/work-media-http.test.ts` covers range transport and authorization.
Real read-only preservation/download oracles are scoped to the designated public source and D copy.
Native receiver import, physical drag/pin/hide/multiscreen remain deferred; D's parent is not complete.
See `docs/handoff/WORK-MODE-D-20261008.md` for candidate-specific evidence and limitations.

macOS native windows use `vibrancy: under-window` and `visualEffectState: active` to soften the desktop behind
them even when unfocused. CSS backdrop filtering alone cannot blur other application windows. The macOS Renderer removes its full-panel tint, CSS backdrop blur, 6px inset and second rounded surface;
foreground colors track system appearance. Images stay unfiltered. Non-macOS uses a legible solid fallback,
not an unverified imitation of native desktop blur. See DESIGN.md for the window interaction contract.
