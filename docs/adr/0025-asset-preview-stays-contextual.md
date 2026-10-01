# Asset Preview Stays Contextual

Asset Preview should open as a contextual quick-preview layer over the Asset
Grid, not as a separate page or replacement workspace. Double-click or Space
opens it, Esc closes it, arrow keys move through neighboring assets, and the
preview supports zooming and panning while preserving the current grid
selection and right-side Asset Inspector context.

When an ADR 0465 Custom Field Edit Draft has focus, keyboard ownership is
contextual: an active IME consumes its own Enter or Escape first; otherwise the
typed editor's Escape behavior resolves the active uncommitted draft before it
may close Asset Preview. Asset previous/next navigation invokes the Unsaved
Custom Field Changes Gate when required and never treats preview navigation as
permission to discard a draft. ADR 0466 keeps previous/next movement blocked
after any partial multi-draft resolution and returns focus to the first
remaining blocker.

This keeps high-volume review fast in the Eagle and Finder style: users can
inspect details at a larger size without losing their place in the Asset Grid,
without hiding the inspector workflow, and without paying a navigation cost for
each previewed asset.

Compare View is the transient multi-asset form of this preview context. It may
start from Search Focus View, Asset Grid selection, or an Asset Collection and
keeps two to four assets visible at once. A larger selection remains available
through a candidate strip rather than shrinking every item into one viewport.
Each pane uses the same validated preview path and begins with independent pan
and zoom; synchronized zoom is an explicit option only when the selected visual
units are compatible. The comparison surface may expose differences in
dimensions, format, color state, tags, source, and analysis results and keeps
each asset's external open, drag, copy, and export actions available.

Compare View is Ephemeral Search Session or current-workspace presentation
state according to its source. It owns no asset, Collection Membership, Smart
Filter, saved result, or Collection Board arrangement, and closing it restores
the originating selection and workspace context.

ADR 0405 governs device-local external-open preferences, source-exact Original
Handoff, and the rule that preview media never substitutes for an unavailable
current original. Those actions remain available from contextual preview, but
their source-fidelity and compound-set semantics are independent of preview UI.

ADR 0406 governs validated material original changes: the Design Asset identity
is preserved, Source Content Generation advances, user-authored organization
remains attached, and generation-bound derived evidence becomes stale. That
content lifecycle applies equally when a change is observed from contextual
preview or elsewhere.

Under ADR 0148, professional-format detail is progressively revealed over the
persistent overview. Pan, zoom, asset navigation, and metadata review remain
interactive while current-viewport tiles load or a failed region retries.
