# Promotion Sheet Gates Ambiguous Candidate Promotion

Single-candidate promotion should expose a primary "Confirm to Library" action.
When the candidate has no Required Review, that action may Quick Promote using
confirmed or default candidate details. When a proven active-library identity
conflict, an explicit target-collection conflict, or similar core Required
Review remains unresolved, the action should open a Promotion Sheet before
Candidate Promotion. Merely lacking a more specific target is not a conflict:
ADR 0033 and ADR 0413 use Unsorted Collection as the valid fallback. Generic
Duplicate Signals remain advisory under ADR 0014 unless they prove a core
identity conflict. Pending, low-confidence, background-sensitive, or
unavailable AI suggestions do not create Required Review by themselves under
ADR 0142.

ADR 0439 Out-of-Constraint Custom Field Values likewise do not create Required
Review or block Quick Promote merely because a later validation rule became
restrictive. When a Promotion Sheet is already shown, it discloses their count
as a non-blocking warning. Permanently missing/incompatible field identity or a
concurrent value/definition change remains a real blocking Promotion conflict.

Batch Promotion should continue to include only Batch-Eligible Candidates by
default, leaving candidates with Required Review in the Capture Inbox for
individual review. This keeps collection workflows fast without silently
promoting ambiguous or poorly classified candidates into the Asset Library.
