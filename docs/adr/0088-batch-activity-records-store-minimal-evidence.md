# Batch Activity Records Store Minimal Evidence

Batch Activity Records should store only the evidence needed to explain a
Candidate Batch Action. Each record should keep Minimal Batch Fields; failed,
skipped, or excluded items may keep Item Reference and Reason Snapshot. Content
Snapshot Exclusion applies to every record: do not store image binaries,
complete file contents, complete sensitive paths, base64 payloads, or original
file copies. If a referenced item is later deleted, Batch Result History should
show a deleted placeholder with the original result summary rather than trying
to recreate private content.

ADR 0392 stores Asset Export mode/count/reason summaries without source paths,
content snapshots or exported copies. Reveal uses a separate expiring
device-local destination locator, while replacement recovery uses an independent
Local File Recovery receipt.

ADR 0403 Recovery Staging Attempt Compaction keeps the original interruption,
total manual-attempt count, state-changing nodes, coalesced identical no-change
runs and final result for the same 30-day lightweight record. It stores only
times, counts, outcomes, proven bytes and typed reasons, never member filenames,
complete paths, raw errors, private payloads or staging contents.

After that record expires, ADR 0401 governs terminal-marker and anti-replay-
tombstone lifecycle. A Recovery Staging Terminal Marker keeps only opaque
operation/item identity, terminal result class, final evidence generation and a
proven completion or later verification time. A Recovery Anti-Replay Tombstone
keeps only opaque identity, retired-unknown class, last-known evidence
generation and retirement time. Neither record is searchable, user-visible,
exportable or backed up, and neither contains a path, member name, reason text,
private payload or expired activity detail.

Under ADR 0429, an acknowledged Custom Field Migration Result may retain its
item-scoped evidence only for the shared result/Undo window. Expiry or explicit
early clearing removes values, mappings, item outcomes and Undo evidence and
keeps only the migration time, type pair, aggregate counts and source-field
disposition as Pruned Batch Detail.

ADR 0458 keeps previous Batch Text values and item detail entirely outside
Batch Activity Records. Its Batch Text Terminal Marker contains only opaque
operation/initiating-device identities, terminal class/time, Undo deadline and
journal acknowledgement state; it contains no owner, field, action parameter,
Text value or reason detail and disappears after the device-local journal can
no longer be offered.

Under ADR 0481, Missing-initialization expiry or confirmed early clearing
removes owner/field/assignment, effect, retry-attempt and executable direction
detail. Pruned Batch Detail may keep only first terminal time, scope and
owner-class counts, aggregate forward/retry/Undo outcomes and expiry/clear
disposition without becoming reconstruction authority.

ADR 0401 reconstruction uses Claim-Scoped Recovery Evidence Authority: minimal
journals/receipts prove committed intent and boundaries, matching member and
generation evidence proves physical state, and task state is only a consistency
projection. Missing evidence, source recency or database state alone cannot
manufacture an outcome or authorize a mutation.
