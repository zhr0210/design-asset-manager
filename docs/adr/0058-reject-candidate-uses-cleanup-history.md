# Reject Candidate Uses Cleanup History

User-initiated removal from active Capture Inbox should be Reject Candidate,
not a separate manual cleanup action. A Rejected Candidate should enter Capture
Cleanup History and the same 7-day Recoverable Window used by expired cleaned
candidates.

This keeps the candidate-removal model simple: rejecting means "do not promote
this candidate now," while recovery and Hard Delete use the shared cleanup
lifecycle. It replaces a separate rejected status filter recovery path and
prevents users from having to choose between overlapping cleanup and rejection
commands.

ADR 0478 excludes every Candidate in this cleanup lifecycle from Missing
initialization. Restoring it as an Active Candidate permits a later fresh plan;
the old plan never writes through or follows the cleanup record.
