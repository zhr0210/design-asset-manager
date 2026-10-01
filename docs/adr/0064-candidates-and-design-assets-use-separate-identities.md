# Candidates and Design Assets Use Separate Identities

Asset Candidates and confirmed Design Assets should use separate identities
because their lifecycles diverge after Candidate Promotion. Candidate Promotion
creates a new Design Asset Identity and preserves traceability through a
Promotion Link to the original Candidate Identity, Asset Source, and Capture
Batch. The promoted candidate leaves active Capture Inbox review, while Undo
Promote can use the Promotion Link and Promotion Snapshot for short-lived
Promotion Reversal.

ADR 0416 uses that same identity boundary for Custom Field Value Transfer. The
new Design Asset becomes the current value owner; the Promoted Candidate keeps
only existing trace/undo evidence rather than a second mutable metadata copy.

ADR 0447 Duplicate Text Value Finding may compare both owner classes but never
merges their identities. Promotion changes the one counted current owner from
Candidate Identity to Design Asset Identity within the same transaction.
