# Candidate Rejection and Signal Dismissal Are Distinct Actions

Reject Candidate should be presented as a Candidate-Level Action because it
removes the whole asset candidate from active Capture Inbox review and moves it
into the cleanup recovery lifecycle. Review Signal Dismissal should be
presented as a Review Signal Action because it resolves only a specific signal,
such as "not a duplicate," without rejecting the candidate itself.

The UI should keep these actions in separate regions and use distinct labels:
"Reject Candidate" for candidate-level removal and "Dismiss This Signal" for
signal-level resolution. This prevents users from accidentally rejecting a
candidate when they only meant to dismiss one review signal, or dismissing a
signal when they meant to remove the candidate.
