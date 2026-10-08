# Snooze Cannot Outlive Candidate Retention

Review Signal Snooze should defer review attention, not change asset-candidate
retention. For Retention Warning signals, Snooze Return Time must not be later
than the candidate's expiration time under the Candidate Retention Policy.

If the user wants to keep a candidate beyond its current expiration time, the
workflow should use Retention Extension rather than snooze. This prevents a
deferred reminder from promising that a candidate will still be recoverable
after the retention policy would have expired it.
