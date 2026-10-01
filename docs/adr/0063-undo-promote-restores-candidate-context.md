# Undo Promote Restores Candidate Context

Undo Promote should be a short-lived Promotion Feedback action, not long-term
version history. When available, it should perform Promotion Reversal from a
Promotion Snapshot: remove the promoted design asset from library surfaces,
return the candidate to Capture Inbox review, and preserve source context,
analysis output, Tag Suggestions, Duplicate Signals, and Collection Suggestion.
ADR 0439 also restores each transferred Custom Field Value and its bounded
validation evidence before evaluating the live marker against the current rule.
After the promoted design asset is edited or the undo window expires, Undo
Promote should no longer be available and users should use normal asset
management actions instead.
