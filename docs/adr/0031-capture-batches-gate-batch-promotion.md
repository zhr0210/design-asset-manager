# Capture Batches Gate Batch Promotion

Each web, extension, drag, or import capture should create a Capture Batch.
Candidate Review Page should show the batch source, capture time, candidate
count, and status counts for pending, promoted, and rejected candidates.

Capture Batch should support one-click Batch Promotion for Batch-Eligible
Candidates only. A proven active-library identity conflict or another core
Required Review may exclude a Candidate from default batch promotion and leave
it available for individual review. A generic Duplicate Signal, including a
weak Trash Duplicate signal, is advisory under ADR 0014 and ADR 0072 and does
not block by itself. Under ADR 0142, pending or low-confidence unresolved Tag
Suggestions alone likewise do not exclude an otherwise eligible Candidate;
they remain unconfirmed advisory metadata after promotion.

This gives fast collect-and-confirm workflows without turning batch actions
into silent approval of ambiguous candidates.
