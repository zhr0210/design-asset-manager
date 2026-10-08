# Promotion Transfers File Ownership Without Duplicating Candidates

Candidate Promotion should transfer Asset File Ownership of the captured
original from the Candidate Artifact to the confirmed Design Asset rather than
keeping a second full candidate artifact by default. A single ordinary file or
the complete ADR 0340 Compound Original remains at its stable ADR 0281 Managed
Originals Directory storage location during that transfer; ADR 0341 keeps the
compound's dedicated directory and member layout unchanged.
A Promoted Candidate Record
should retain Trace Metadata, Promotion Link, and Promotion Snapshot context
needed for source history and short-lived Undo Promote, but after the undo
window expires the candidate history should be metadata-only. Deleting
candidate history should not delete the Design Asset, and deleting the Design
Asset should follow the library's own deletion workflow.

ADR 0416 transfers current conforming and ADR 0439 Out-of-Constraint Custom
Field Values in the same Promotion transaction without duplicating them into
ongoing Candidate History. Short-lived Undo Promote restores them through the
existing Promotion Snapshot boundary.

ADR 0447 applies the same one-owner boundary to Duplicate Text findings. A
single query/projection generation cannot count both the promoted Candidate and
new Design Asset occurrence; stale derived results require refresh rather than
temporary double counting.
