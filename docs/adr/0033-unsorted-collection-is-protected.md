# Unsorted Collection Is Protected

Unsorted Collection should be a System Collection used as the fallback target
for promoted Design Assets and newly indexed Referenced Assets without a
clearer explicit, suggested, mapped, or rule-assigned collection target. It
should be visible in a stable system slot at the top or bottom of the collection
navigation when it contains assets or is relevant to promotion/indexing, and it
may auto-hide when empty.

Users should not be able to delete Unsorted Collection, because Candidate
Promotion and Progressive Reference Indexing need a dependable fallback target.
Users may customize its display name so the workspace can match their own
organizing language without removing the protected fallback behavior.

Under ADR 0413, this fallback is a normal Search-First Organization state. Its
membership alone creates no Review Signal, attention badge, promotion block or
lower search/reuse status. Users may browse or filter it explicitly without an
obligation to empty it.
