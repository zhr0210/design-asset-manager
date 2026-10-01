# Asset Grid Uses a Persistent Asset Inspector

Asset Grid should keep asset cards image-first and show selected-asset details
in a persistent right-side Asset Inspector by default on desktop. The inspector
is the home for the selected asset preview, color palette, title, source URL,
notes, tags, collection memberships, duplicate and analysis signals, basic file
information, and asset actions.

This follows the Eagle reference pattern: the grid stays fast for visual
scanning, while metadata review and editing remain immediately available
without forcing every asset card to carry heavy detail UI. The same pattern
should apply to confirmed design assets and asset candidates when the candidate
is selected from the Capture Inbox or grid-like review views.

Under ADR 0453, Text Custom Fields use their portable Compact or Expanded
default inside this Inspector. A Compact editor may temporarily expand for
multiline content or explicit inspection without changing the field definition
or the selected owner.

ADR 0465 keeps every manual Custom Field edit as a typed revision-bound draft
until a defined type-specific commit boundary. Valid movement between fields
may commit for fast Inspector entry, but owner/route/library changes and
Inspector close cannot discard a pending draft without the contextual Unsaved
Custom Field Changes Gate. When several drafts are pending, ADR 0466 resolves
them through complete preflight and per-owner atomic commits before the
Inspector transition completes.
