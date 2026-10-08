# Work Sets Separate Saved References From Native Window Authority

Status: Accepted (2026-09-20), under the authorized multi-reference work-set/window persistence task.

Persist each Work Set's name, ordered asset references, columns, note and colors in the held Active Library
control database. Window placement/pinning/open-state is keyed separately by an opaque application-device
identity. The identity lives in app-scoped storage; library data never stores machine paths or permission
tokens. This keeps movable library content separate from a particular display arrangement.

The first explicit work-set save upgrades v1–v6 to v7. Read/open never upgrades, and the UI discloses older
application incompatibility. A per-set optimistic revision prevents two editors overwriting one another;
independent work sets may save concurrently. Native content Save commits metadata and actual window
geometry in one transaction. Passive move/resize records geometry separately, without modifying notes.
Members remain references: removal/set deletion does not delete assets; unavailable/Trash members remain
in the saved order for recovery. Recursive library organization is outside a work window.

A Main controller owns up to eight native work windows, one per set. Each has an independent in-memory
Electron session, a sandboxed narrow preload, an owned frame and a revocable window token. Preview and
notebook access are restricted to that window's current members and held library authority; no general
application API, arbitrary filesystem path or external network capability is exposed. Closing/switching
the library drains layout writes and retires its session before revoking every window. Restoring layout
never restores old grants. Duplicate open focuses the existing window rather than adding another writer.

Hide retains a live window and its drafts; Close explicitly removes that window while preserving the set.
Quit/library transitions disclose unsaved work-set or notebook content. Saved open windows can be restored
by explicit user action after the library is reopened; off-screen bounds are clamped to available work areas.
The approved browser prototype and native route share WorkReferencePanel; the prior single Asset Card and
its AI/image tools remain a compatibility entry rather than being silently removed.

This delivers an image-based multi-window reference workflow. Video/reference-frame execution, safe native
file handoff, physical monitor-change behavior and Windows packaging still require separate implementation
or platform evidence; neither saved layout nor BrowserWindow existence proves those capabilities.
