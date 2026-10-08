# Design Asset Deletion Uses Asset Trash, Not Candidate Cleanup

Delete Design Asset should use the library's Asset Trash workflow rather than
Capture Cleanup History because confirmed Design Assets and Asset Candidates
have separate lifecycles. Deleting a Design Asset should not turn its Promoted
Candidate Record back into an Active Candidate. The Promoted Candidate Record
should remain metadata-only, and its Promotion Link should show that the target
Design Asset is deleted or recoverable according to the Asset Trash state.

ADR 0284 keeps Delete Design Asset separate from Managed Original Recovery.
Choosing to defer recovery, failing to locate an original, or cancelling a
copy-back/ownership-conversion plan never invokes Asset Trash implicitly; only
the user's explicit delete action starts this lifecycle.

ADR 0293 applies this lifecycle to both explicit referenced-asset deletion
choices. Remove Referenced Asset from Library enters Asset Trash without
touching the user-owned original. Delete Referenced Source File is a separate
confirmed filesystem operation and, when it succeeds, also sends the Design
Asset to Asset Trash; neither choice hard-deletes the Design Asset record.
