# Manual Text Edit Undo Is Layered, Revision-Guarded, And Session-Only

Text editing specializes ADR 0465's two Undo layers. While a Text editor owns an
active ADR 0454 Text Edit Draft, Command/Ctrl+Z and the platform redo shortcut
modify only that draft; input-method composition retains first keyboard
ownership and draft Undo never writes a Custom Field Value or consumes the
committed-edit stack. One successful manual Text commit—whether explicit,
field-exit, value clear or whitespace-only save—creates exactly one
**Text Edit Undo Step**, a Text-typed Custom Field Edit Undo Step, not one step
per keystroke.

When no Custom Field Edit Draft owns the shortcut, global Undo targets the
newest typed step in the current active library session's shared chronological
stack and identifies its owner, field and type before execution. A Text step
retains the exact previous value-or-Missing state, committed Text and resulting
revision only in memory. Undo rechecks that the owner, definition, active
validation rules and committed revision are still current; if so, it creates a
new authoritative revision restoring the previous state. Changed ownership,
lifecycle, definition, validation or value evidence enters ADR 0097
field-aware review or makes the newest step unavailable rather than
overwriting, auto-unarchiving, recreating, name-matching or falling through to
an older step. ADR 0468 keeps it blocking by default and permits advancement
only after exact eligibility returns or the user confirms removal of the whole
entry.

A successful Undo enables Redo only while the exact Undo-produced revision
remains current and no later manual commit has replaced that redo branch. Redo
performs the same current-rule and revision checks and creates another normal
revision. The **Text Edit Undo Stack** is only the Text-filtered view of ADR
0465's memory-bounded, device- and active-library-session-only
**Custom Field Edit Undo Stack**, never a parallel global stack. Library Switch
and application exit clear the shared stack without changing committed values.
ADR 0469 count/byte eviction removes only complete oldest Undo opportunities
and must be represented truthfully. The stack never enters ADR 0455 recovery,
portable library state, backup, history, search, logs, telemetry or plugins. AI
acceptance, metadata import, migration, batch operations, conflict resolution
and Promotion retain their own operation-scoped Undo contracts and never join
this stack.

ADR 0457 Batch Text Edit therefore creates one operation-scoped result and
possible Batch Undo, never one Text Edit Undo Step per successful owner. ADR
0458 keeps its exact previous values in a separate protected device-local
journal with a terminal-result retention window; that durable batch recovery
does not make the shared manual Custom Field Edit Undo Stack persistent.

ADR 0460 successful Cut contributes only to the active editor's native
draft-local Undo/Redo history. Copy contributes no Undo step, and neither action
creates or consumes a committed Text Edit Undo Step before a later successful
commit.

ADR 0461 user-applied writing proposals and explicitly enabled automatic input
substitutions likewise contribute only to draft-local Undo/Redo. Diagnostics
and unapplied proposals contribute no step; only a later successful manual
commit creates one Text Edit Undo Step for the complete draft.

Under ADR 0467, a Text field saved inside an atomic multi-field owner group is
one typed delta in a Compound Custom Field Edit Undo Step rather than an
independent Text Edit Undo Step. The Text-filtered projection may identify the
compound entry, but Undo/Redo cannot extract or replay only its Text delta.
