# Missing Initialization Retries Only Proven Transient Uncommitted Failures

A failed Missing initialization owner group is retryable only when trusted
reconciliation proves both that no field in the atomic group committed and that
the failure was transient rather than a plan, identity, lifecycle, validation,
storage-authority or revision conflict. **Retry Missing Initialization
Failure** is an explicit manual action over one or more user-selected
Retry-Eligible owner groups; the product offers no automatic retry loop and no
undifferentiated Retry All that can absorb conflicts, exclusions or unknown
outcomes.

Immediately before each retry, trusted execution revalidates the exact Local
Library Instance, operation and failure-effect evidence, owner lifecycle, every
field identity/type/rule/option/default revision, frozen assignment and the
exact still-Missing base state for the complete original owner group. The group
retries with the original frozen values and commits all fields atomically or
none. Any Present field, owner/lifecycle change, definition or rule drift,
incompatible operation evidence, ambiguous prior outcome or other mismatch
reclassifies the complete group as Conflict, Excluded or Manual Recovery
Required without a write. Retry never shrinks the group, follows Promotion,
uses a newer default, overwrites a value or turns current equality into revision
authority.

Retry becomes available only from a terminal reconciled operation result.
Paused or unstarted owners remain Resume or Cancel Remaining work, not failed
retry members. A device that did not initiate the operation may retry after ADR
0477 proves the same exact library-bound authority and exclusive ownership;
there is no device-local previous-value dependency to transfer or reconstruct.
An infrastructure interruption whose write outcome is not yet proven enters
normal operation reconciliation and cannot be labelled transient merely to
unlock Retry.

ADR 0092's existing per-owner limit of three attempts applies inside the same
Unresolved Batch Result, with no simultaneous retry for one owner group. Users
may select any explicit subset of currently Retry-Eligible groups after
reviewing counts and reason classes, but cannot select ineligible rows through
a catch-all action. Each outcome merges into the original result under ADR
0091, preserving attempt count and latest outcome rather than creating a new
batch history entry or reopening the frozen scope. Exhaustion, conflict,
exclusion, acknowledgement or later repair never resets the old count; changed
intent or repaired non-transient state requires a newly reviewed Missing
Initialization Plan.

ADR 0480 closes every remaining Retry-Eligible group when trusted Undo
admission commits the result's reverse direction. A partial or failed Undo never
reopens this ADR's forward retry authority.
ADR 0481 additionally ends all not-yet-admitted Retry at the operation's
original shared action deadline without resetting that deadline after an
attempt.
