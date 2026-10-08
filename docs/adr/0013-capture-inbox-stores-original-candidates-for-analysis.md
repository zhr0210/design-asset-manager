# Capture Inbox Stores Original Candidates for Analysis

Asset candidates should default to downloading the original-quality source,
validating it, and committing it into the active library's Original Asset
Storage before Candidate Activation, then run lightweight analysis such as color
palette extraction, tag suggestion, and duplicate signaling before the user
confirms the candidate into the Asset Library. Preview-only capture may remain
an optimization for constrained cases, but it is not the default product
workflow.

This favors immediate local review quality over minimal network and disk use.
The Capture Inbox should give users enough evidence to classify, tag, compare,
and batch-confirm candidates without waiting for a second download step, while
still preserving the distinction between an Asset Candidate and a confirmed
Design Asset. Incomplete transfer chunks remain Managed Intake Artifacts rather
than accepted Candidate Artifacts, and ADR 0280 keeps every activated original
independent from application installation, cache, and producer/plugin storage.
