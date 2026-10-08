# Candidate Lifecycle Uses a Retention Policy

Status: superseded in part by ADR 0058 for rejected candidate recovery.

Candidate Review Page should default to pending asset candidates. Candidate
Promotion turns a candidate into a design asset and removes it from the default
Candidate Grid, while keeping it traceable from the candidate's Capture Batch
under a promoted status filter.

Rejected candidates should remain recoverable from a rejected status filter
until the Candidate Retention Policy expires. The default retention period is
30 days and should be user-configurable. Retention cleanup applies only to
unpromoted asset candidates and their capture-inbox staging data; it must not
delete promoted design assets, original assets in the Asset Library, or
duplicate candidates merely because a Duplicate Signal exists.
