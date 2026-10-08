# Batch Operations Queue with Conflict Guards

The app may allow multiple Candidate Batch Actions through Batch Operation Queue
and limited Concurrent Batch Operation, but the same Asset Candidate should not
participate in two concurrent actions that change lifecycle state or file
ownership. Lower-risk metadata actions may run concurrently when safe. If a new
action includes a Conflict Candidate, Operation Conflict Guard should queue the
action, exclude or delay the conflicting item, or ask for explicit confirmation
depending on action risk, so candidate state remains trustworthy.

ADR 0430 applies a stricter rule to Custom Field Type Migration: one migration
task at a time may own the library's migration lane, and its target-value writes
commit serially per owner. Interactive metadata work remains allowed and stale
items enter ADR 0426 conflict review rather than being overwritten.

ADR 0457 Batch Text Edit uses ordinary batch-operation conflict guards rather
than the schema-maintenance lane. Concurrent work touching the same owner and
field must queue, exclude or produce a revision conflict before commit.

ADR 0476 Missing Custom Field Initialization uses the same ordinary queue.
Overlap on any owner/field in one atomic initialization group must queue or
conflict the complete owner group before commit; it never enters the Custom
Field Schema Maintenance lane merely because many values are written.
