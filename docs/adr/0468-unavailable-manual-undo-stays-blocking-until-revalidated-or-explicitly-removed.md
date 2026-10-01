# Unavailable Manual Undo Stays Blocking Until Revalidated Or Explicitly Removed

The chronological ADR 0465 Custom Field Edit Undo Stack must not silently change
meaning when its newest step becomes ineligible. A failed eligibility check
therefore marks that exact ordinary or compound entry as an **Unavailable
Custom Field Edit Undo Step** and opens contextual **Unavailable Undo Step
Review**. The review identifies the owner, single/compound scope, affected field
count and types, and typed blocking reasons. It does not execute another stack
entry, mutate metadata, reopen a draft or expose values in notifications.

Keep is the default. The unavailable step remains the newest stack entry and
continues to block older Undo rather than acting as permission for automatic
fallthrough, skip-once or best-effort partial replay. Relevant owner,
definition, rule, value-revision or availability evidence may trigger a silent
read-only eligibility recheck without opening UI or executing Undo. A recheck
uses exact identities and revisions, never name matching or value-equality
substitution. If the step becomes eligible, its ordinary Undo action becomes
available again; it is never applied automatically.

The review also offers explicit **Remove Undo Step** for the unavailable newest
entry. One confirmation discloses permanent loss of that complete Undo
opportunity and any Redo branch owned by it. Trusted confirmation first repeats
the eligibility check. If the step is eligible again, removal does not proceed
and the review refreshes to the available state. Otherwise removal deletes only
that entire in-memory stack entry and its Redo state; it changes no Custom Field
Value or revision, recovery journal, portable metadata, activity/history record,
log, notification or plugin-visible state.

After proven removal, the next older entry becomes newest but is neither
prevalidated nor executed until the user invokes Undo again. Removal itself
creates no Undo/Redo step and cannot be undone. An ADR 0467 compound entry is
removed as a whole; the review cannot remove one field delta or create separate
type-specific steps. There is no Remove All Unavailable, skip just this time,
remembered auto-remove, timeout removal or background cleanup based on drift.

This explicit path does not make the stack durable. ADR 0278 Library Switch and
normal application exit still clear the complete session-only stack under ADR
0465, including unavailable entries, without changing values. Independent
oldest-step eviction follows ADR 0469 count/byte limits and may remove an
unavailable entry only when it is the complete oldest entry selected by normal
capacity policy, not merely because it drifted. ADR 0470's explicitly reviewed
Save Without Manual Undo boundary is a separate chronological reset, not an
Unavailable Undo Step Review clear-all action. ADR 0471 may also reclaim that
complete entry as part of last-resort oldest-first critical-pressure eviction;
Unavailable status grants no memory pin.
