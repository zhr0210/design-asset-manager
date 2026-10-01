# Expired Candidates Get a Recoverable Cleanup Window

Expired, unpromoted asset candidates should not be hard-deleted immediately.
Capture Inbox Cleanup should first remove them from the active Capture Inbox and
place them in a 7-day Recoverable Window, where they can be restored from
Capture Cleanup History or hard-deleted explicitly.

After the 7-day Recoverable Window ends, the candidate should be hard-deleted.
This gives users a short safety net for missed expiration warnings while still
preserving the Candidate Retention Policy as a real cleanup boundary instead of
turning Capture Inbox into permanent hidden storage.
