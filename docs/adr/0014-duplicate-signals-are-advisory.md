# Duplicate Signals Are Advisory

Duplicate analysis should produce Duplicate Signals and candidate groups, but
it must not automatically delete assets, block confirmation, or silently merge
items. Strong duplicate signals may be folded, highlighted, or preselected for
skip/merge actions, while weak duplicate signals should remain lightweight
warnings.

ADR 0038 Exact-Content Result Cluster is a separate transient search
presentation based only on verified byte-identical current content. It neither
upgrades a Duplicate Signal into identity proof nor authorizes merge, deletion,
metadata sharing, lifecycle changes, or a duplicate-resolution action.

ADR 0445 Duplicate Text Value Finding is also separate: it groups current
Custom Field Text occurrences under a user-selected comparison mode for review,
but is not evidence that their owning assets duplicate one another and never
creates a uniqueness, merge, deletion or Promotion decision.

Design reference collections often preserve near-duplicates for real creative
reasons, such as alternate crops, resolutions, annotations, styles, source
contexts, or iteration history. Keeping duplicate handling advisory gives users
automation speed without risking the loss of useful reference material.
