# Manual Custom Field Editing Uses One Typed Draft, Recovery, And Undo Framework

Eight core Custom Field types must not create competing navigation gates,
recovery stores and global Undo stacks. Every manual field interaction therefore
uses one shared parent contract: a typed **Custom Field Edit Draft** bound to the
exact library, Candidate or Design Asset owner, Custom Field Definition, base
value revision and applicable definition/validation revisions. A draft carries
its type-specific candidate input and validation state but has no current
metadata, search, filter, sort, export or discovery authority before commit.

Each Custom Field Type keeps its own input, intermediate states, validation and
commit gestures. Text Edit Draft remains the Text specialization with ADR 0454
multiline and IME behavior. Number Edit Draft remains the Number specialization:
explicit Save, Enter or deliberate movement to another editable field in the
same Inspector attempts commit only when parsing is unique, constraints pass
and every bound revision remains current. An empty Number literal is only a
pending Clear-to-Missing proposal; explicit commit may clear the current value,
but emptiness is never parsed as zero. Invalid, Ambiguous, over-precision,
out-of-domain and out-of-range Number drafts stay visibly editable and never
substitute the last valid value.

Input-method composition retains first keyboard ownership for every applicable
typed editor. Operating-system window blur, application deactivation and
incidental focus loss never commit a Custom Field Edit Draft. If owner,
definition, rule or value evidence changes, the draft becomes a **Stale Custom
Field Edit Draft** and enters ADR 0097 field-aware conflict review instead of
Last Writer Wins. Type-specific Escape or cancel behavior may discard only the
active draft and reveal the current authoritative value.

Leaving the affected owner/result scope, route, Inspector or library, and clean
application quit, use one contextual **Unsaved Custom Field Changes Gate** with
Save, Discard and Stay. The gate identifies every affected field and its type
and validity without exposing private values in notifications. A requested Save
cannot complete the transition while any selected draft is invalid, ambiguous,
stale or otherwise unresolved; Discard removes only the selected drafts, and
Stay preserves the editing context. ADR 0466 owns complete preflight,
per-draft disposition, deterministic ordering, per-owner atomic commit and
truthful cross-owner partial results. No navigation may silently save, discard
or partially reinterpret a draft.

Undo has two shared layers. While an editor owns an active Custom Field Edit
Draft, the platform Undo/Redo shortcuts modify only that draft after any active
input method releases them. Each successful single-draft manual commit creates
exactly one typed **Custom Field Edit Undo Step** containing the exact previous
value-or-Missing state, committed typed value and resulting revision in memory.
When no draft owns the shortcut, global Undo targets the newest step in one
chronological **Custom Field Edit Undo Stack** for the active library session,
regardless of field type. Undo and Redo revalidate exact owner, definition,
rules and current revision before creating another authoritative revision;
drift enters field-aware review or makes the step unavailable. ADR 0468 keeps
an unavailable newest step blocking until exact eligibility returns or the user
explicitly removes the complete entry; global Undo never falls through
silently.

The shared stack is memory-bounded under ADR 0469's device-local count and byte
maximums and is cleared by Library Switch or application exit without changing
values. It never enters portable library state, backup, history, search, logs,
telemetry, plugins or crash recovery. Text Edit Undo Step is the Text-typed
specialization formerly described by ADR 0456; there is no parallel Text stack.
AI acceptance, import, migration, batch edit, conflict resolution and Promotion
keep their operation-scoped Undo contracts and never insert per-item steps into
this manual stack.

ADR 0466 may commit multiple fields for one owner in one atomic resolution
boundary. ADR 0467 maps that boundary to one indivisible compound manual Undo
step, preserving the same per-owner atomicity through Undo and Redo. ADR 0470
owns the exceptional timeline reset after a proven Save Without Manual Undo;
it does not turn this stack into durable history.

Qualifying uncommitted drafts share one trusted-main-process **Protected Custom
Field Draft Recovery Journal** infrastructure. Each protected record declares
its type and carries only that type's required original input, device-local
interpretation context and exact identity/revision bindings. The operating
system protects the complete payload with no plaintext fallback, and the
journal remains excluded from portable state, backup, sync, search, export,
plugins, logs, telemetry, notifications and crash reports. Type-specific rules
decide when a stable draft qualifies; immediate choice interactions that commit
without a pending draft create no recovery record. ADR 0472 applies that
immediate path to an explicit changed Boolean choice: only trusted proven
commit changes authority or creates an ordinary manual Undo step.

ADR 0455 remains the Text recovery specialization. A stable Number draft may
qualify after IME composition ends and the debounce boundary is reached,
including an Invalid or Ambiguous literal so user work is not discarded. Its
record carries the original literal and Number Input Locale identity, but any
stored parse/validation projection is non-authoritative. Recovery on the same
verified library instance re-runs the current pinned parser, type constraints
and revision checks; it never auto-commits, converts emptiness to zero, chooses
an ambiguous interpretation or matches a missing identity by name.

Protected Custom Field Draft Recovery and the session-only manual Undo stack
share no value records or retention authority. Batch Text Undo Journal and
future batch-type journals remain separate operation-recovery classes with
their existing preflight, durable progress and retention policies. ADR 0471
may reclaim complete manual stack entries under proven Critical memory pressure
but cannot reclaim or reinterpret protected draft recovery.
