# Missing Initialization Scope Freezes Current Live Value Owners

A Missing Custom Field Initialization Plan writes only one active Local Library
Instance and freezes a **Missing Initialization Owner Scope** from one of three
explicit sources. Current Selection uses the selected current owner identities
from the active result set; a Stable Filter uses one complete, immutable result
generation evaluated inside the active library; Library-Wide enumerates every
current Active Candidate and every non-deleted Design Asset in that library at
planning time. Candidate and Design Asset owners may coexist in one scope and
remain separately counted. A cross-library result surface never creates one
cross-library write plan, activates another library or schedules a later write;
the user must activate each library and create a separate plan there.

Only current value owners can enter the frozen operation. Promoted Candidate
Records, Candidate History, rejected or expired records in Capture Cleanup
History, hard-deleted records and Design Assets in Asset Trash are lifecycle
exclusions even when a search explicitly uses Include Deleted or the user
selects their visible placeholders. Review shows those exclusions instead of
silently dropping them or treating historical evidence as current metadata.
The user must restore the Candidate or Design Asset and create a fresh plan if
it should receive a value.

Original-file availability is not owner lifecycle. An otherwise active Design
Asset remains eligible when a referenced source, managed original, volume or
other source-byte dependency is offline, missing or under its normal recovery
state because Custom Field Values are authoritative library metadata. Source
availability alone neither excludes the owner nor creates a conflict; an
unproven owner identity, non-writable library boundary or owner-specific
authoritative conflict still blocks that owner under its existing recovery
contract.

Before confirmation, any owner-lifecycle or result-generation change that
would alter the reviewed membership invalidates the plan and requires a fresh
scope preview. Confirmation freezes exact identities and revisions. A later
Promotion, Reject, cleanup, Asset Trash transition, permanent deletion or other
loss of current editable-owner status makes only that frozen owner group
Conflict or Excluded at execution or Undo. Execution never follows a Promotion
Link, substitutes the resulting Design Asset, restores a deleted object, writes
history, or admits a newly created, restored or newly matching owner.
