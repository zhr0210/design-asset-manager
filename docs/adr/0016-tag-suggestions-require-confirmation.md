# Tag Suggestions Require Confirmation

AI and algorithmic tags produced for asset candidates should default to Tag
Suggestions rather than confirmed Asset Tags. Users may accept suggestions one
by one, accept them in batches, reject them, or configure explicit high-trust
auto-accept rules for selected sources later.

This protects the Asset Library from silent semantic drift while still giving
users fast organization assistance in the Capture Inbox. AI output can be
visible and actionable immediately, but confirmed library metadata should
reflect either user intent or an explicit user-configured rule.

Under ADR 0142, pending, low-confidence, background-sensitive, conflicting, or
unavailable Tag Suggestions do not block Candidate Promotion by themselves.
They may remain unconfirmed and continue through Design Asset review context.
ADR 0143 keeps accepted or manually added tags as user-controlled metadata and
allows suggestions or confirmed tags to be removed without rewriting the
original asset or unrelated AI evidence.
Extension API v1 analysis providers under ADR 0154 can create attributed Tag
Suggestions but cannot confirm them or overwrite user-authored tags.

ADR 0179 makes confirmation concept-aware. A suggestion may carry one trusted
unique Tag Concept mapping, multiple candidates, or remain Unmapped;
confirmation selects or creates the concept rather than treating a translated
display string as semantic identity. User concepts and ambiguous mappings are
never silently translated, merged, renamed, or auto-confirmed.

ADR 0180 permits only explicit version-bound, calibrated and reversible
Auto-Confirmation Rules. No default rule confirms suggestions; unmapped,
ambiguous, new-concept, incomplete-coverage or incompatible-version evidence
always remains pending.
