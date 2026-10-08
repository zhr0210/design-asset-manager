# Asset Grid Uses Desktop Selection Semantics

Asset Grid should follow desktop library semantics for selection and preview:
single-click selects an asset and updates the right-side Asset Inspector,
double-click opens Asset Preview, Space opens or closes quick preview, and
multi-select changes the inspector into Batch Inspector mode.

Multi-selection should preserve the grid as the primary context. The Batch
Inspector should show aggregate information, shared metadata, mixed-value
states, batch tag actions, batch collection membership actions, and applicable
asset actions without forcing users into a separate modal workflow.

This matches Eagle and Finder-like expectations for high-volume asset browsing:
selection is lightweight, preview is fast, and batch work remains adjacent to
the grid instead of replacing it.
