# Unsaved Custom Field Resolution Preflights All Drafts And Commits Atomically Per Owner

ADR 0465 may place more than one typed Custom Field Edit Draft behind one
context transition. The Unsaved Custom Field Changes Gate therefore creates an
ephemeral reviewed **Custom Field Draft Resolution Plan** bound to the exact
library, requested transition, ordered affected owners and fields, draft types,
current validation states, base value/definition/rule revisions and an explicit
Save or Discard disposition for every draft. The application may show draft
content only inside this trusted review surface; notifications and aggregate
status remain content-free.

Save All is available only when every affected draft has a unique, current and
type-valid commit result. It never saves the valid subset while silently
leaving Invalid, Ambiguous, Stale or otherwise unresolved drafts behind. The
user must fix each blocker or explicitly change that draft's disposition to
Discard. Fix or Stay preserves every draft and returns focus to the first
blocking field in review order. Per-draft Discard is always explicit. Discard
All requires a second loss-of-work confirmation when more than one draft is
affected or any draft came from protected recovery; the confirmation uses
counts, types and owner scope without reproducing private values.

Confirmation sends the complete plan to trusted validation. Before any write
or discard, the application re-resolves every owner and field and re-runs each
selected Save through its current type parser, definition, constraints and
base revisions. If any selected Save fails this complete preflight, no owner
transaction starts and no draft is discarded; the gate refreshes the blocking
evidence. A renderer-valid projection is never commit authority.

After complete preflight, selected Save drafts are grouped by Candidate or
Design Asset owner. Every owner group commits all of its selected fields in one
transaction or none of them. Owner groups execute sequentially in the exact
order frozen by the reviewed plan; fields inside an owner use the frozen
Inspector definition order with stable field identity as a tie-breaker. Each
owner transaction repeats current identity, rule and revision checks so drift
cannot use the earlier preflight as Last Writer Wins authority.

The application does not promise one transaction across multiple owners. If an
unexpected failure or new drift occurs after earlier owner groups commit, those
proven commits remain authoritative, the failed and unstarted groups retain
their drafts, and the gate shows a truthful **Custom Field Draft Resolution
Result** with resolved, failed and remaining owner/field counts plus contextual
reasons. An explicit Discard is applied only when its owner group reaches its
resolution boundary and, when that owner also has Save drafts, only after that
owner's Save transaction succeeds. This prevents one owner from becoming
half-resolved merely because another owner failed.

The requested navigation, preview movement, Library Switch, Inspector close or
clean quit proceeds only after every affected draft is resolved. Partial
completion keeps the transition blocked and returns Fix/Stay to the first
remaining blocker. Successfully saved or discarded recovered drafts remove
only their matching protected records after the corresponding owner boundary
is proven; retained drafts keep their records.

This transition-scoped resolution is not a Reviewed Batch Action, creates no
Batch Activity record and has no durable result history. It does not change the
operation-scoped Undo contracts of batch, AI, import, migration, conflict or
Promotion work. ADR 0467 gives each successfully committed multi-field owner
group one indivisible compound manual Undo step and orders cross-owner steps by
their actual proven commits; discarded, failed and unstarted groups create no
step. ADR 0469 requires every oversized prospective owner step to resolve its
memory-limit choice during this ADR's complete preflight before any owner
transaction starts. ADR 0470 also binds each reviewed Save Without Manual Undo
boundary to this plan's frozen owner order so execution cannot silently move
which earlier manual entries it clears.
