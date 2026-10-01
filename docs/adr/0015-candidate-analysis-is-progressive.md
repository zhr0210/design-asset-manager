# Candidate Analysis Is Progressive

Asset candidates should appear in the Capture Inbox as soon as original-source
capture succeeds, with basic metadata and a thumbnail available first. Color
palette extraction, tag suggestion, duplicate signaling, and other lightweight
analysis should fill in progressively in the background rather than blocking
the candidate from appearing.

This keeps capture interaction responsive while still making the candidate more
useful over time. The UI should show per-candidate analysis state so users can
review, classify, or confirm simple candidates immediately and wait only when a
specific analysis result matters.

ADR 0141 further separates an already-available local baseline from resource-
aware Deferred Detail Analysis. External providers never participate in this
automatic progressive path without an explicit scoped External Analysis Grant.
