# Review Signals Support Dismiss and Snooze

Review Signals should support two user handling paths. Review Signal Dismissal
resolves the signal and moves it into Resolved Review Signal and Review History;
Review Signal Snooze temporarily removes the signal from active unresolved
review queues until a chosen return time.

Separating dismissal from snooze keeps review queues clear without forcing users
to permanently resolve work they only want to postpone. When the snooze expires,
the signal should return as unresolved if it is still relevant.

ADR 0449 excludes advisory Duplicate Text Value Findings from this lifecycle.
They are filter results rather than content Duplicate Signals or other Review
Signals, so equal Text values alone cannot be dismissed, snoozed or written to
Review History.
