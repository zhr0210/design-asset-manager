# Batch Retry Uses Attempt Limits

Each Retry Eligible Failure should have a Retry Attempt Limit of 3 attempts by
default inside the same Unresolved Batch Result. Retry In Flight should disable
additional retry actions for the same item or batch until the attempt finishes.
After the limit is reached, the item becomes Retry Exhausted Failure and
follows Manual Escalation through opening details, changing target collection,
fixing permissions, skipping, or recapturing. Changing the target or recapturing
starts a new recovery path rather than silently resetting the old retry count.

ADR 0403 Recovery Staging Completion Attempt is not a Retry Eligible Failure or
Batch Retry. Its manual count has no arbitrary limit because every later attempt
requires new read-only eligibility proof and explicit confirmation; this does
not permit automatic retry, duplicate in-flight attempts or reuse of consent.

ADR 0479 uses this existing three-attempt per-owner limit for each
Retry-Eligible Missing initialization group in the same result. Replanning,
acknowledgement, conflict or exclusion never resets that result's count, and a
new plan is required when intent or non-transient state changes.
