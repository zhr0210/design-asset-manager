# Background OCR: single capability, qualified execution only

Main-owned chain: AI Console session review → Main-only IPC → Host permission/claim → shared
OCR controller/material permit → owned Runtime process → atomic Host OCR + receipt. The
Python worker never opens the library database. New schema v13 is explicitly confirmed from
v12 with the existing qualified backup/growth/lease protocol; new libraries still start at v1.
Enabling B01 first remains a separate action; opening/reading does not migrate or enroll history.

`background_ocr_permission` holds the latest choice/revision/Runtime fingerprint, not a complete
consent event history. Actual grant is a Host in-memory value bound to the current notebook
session and a revocation epoch. Close/reopen and observed Runtime changes invalidate it;
A → B → A cannot restore an old grant. There is no persistent bearer capability in the database.

Host configuration is composed through the [Host-private schema maintenance Module](../library-lifecycle/README.md#host-private-schema-maintenance).
It synchronously revokes before lifecycle queueing, preserves raw OCR errors and
only grants after commit acknowledgement and the final epoch check. Backup/growth
qualification and v13 semantics are unchanged. Isolated maintenance tests cover
queued revocation, rollback, acknowledgement uncertainty and restoration failure;
they do not qualify a production Runtime or Windows schema upgrade.

`background_ocr_attempts` holds one current attempt per immutable B01 intent, plus a permanent
success receipt. This is not a full attempt event log. Claim uses the held connection and a
transaction, checks Managed ownership, current source/preview generations, intent decision,
policy and current session permission. Tokens remain in memory. The original baseline recipe
continues to identify the intent; the execution independently records rapidocr-preview-v1 and
Runtime fingerprint, while OCR evidence carries model hashes, input digest and observation.

| Durable state | Meaning / eligible recovery |
| --- | --- |
| claimed | No Runtime dispatch; abandoned old-session claim needs fresh permission |
| sent | Persisted before dispatch; orphaned sent stays blocked, never assumed safely stopped |
| deferred | Resources changed before sent; same-Runtime fresh admission may retry after backoff |
| succeeded | OCR + receipt committed atomically; never re-infer for this intent |
| failed / cancelled | Known returned resources; new consent may retry, or explicit intent resume after cancellation |
| unknown | Task rejected without confirmed child close; reservation remains, no reclaim |

Late close may finalize a current UNKNOWN claim safely; if authority has expired, the durable
unknown is retained. Orphan sent/unknown from another application session needs a future
explicit reconciliation mechanism; this module does not guess whether an orphan process died.
Exact effect replay validates its digest and returns the saved receipt without overwriting a
later manual OCR correction. Altered effects reject. Finish is lifecycle-serialized coordination;
it cannot turn sent/unknown into deferred and cannot downgrade a succeeded receipt.

Runtime identity and qualified envelope are checked before reservation/claim and again after
asynchronous preparation, before sent. System resource changes defer safely; Runtime changes
revoke consent. Manual and background use one actual OCR gate and VisualAdmission ledger;
UNKNOWN transfers the permit to the release token, not the rejected request promise.
Host-side material accounting includes bounded source copies, decoded pixels, codec, frozen
preview and response expansion. It is a conservative software reservation, not measured model
memory. Full background qualification must cover this plus Runtime/model peaks. Production
`qualify` returns null; the UI clearly waits. Main's test qualifier requires the already isolated
synthetic-E2E mode plus its explicit test flag; it does not certify any production Runtime.

Scheduler: one active tick; no scheduling without current explicit consent; 5s after successful
work, 30s for no candidates/wait/failure. Dedicated indexed LIMIT 1 selection does not invoke
B01 full-count aggregation. Recent records use an updated_at index and LIMIT 20. EXPLAIN
checks are query-shape evidence, not a large-library latency benchmark; B01 OBS-01 remains.

Shutdown revokes consent before draining OCR and scheduler/confirmation work. Each drain is
bounded; failure does not assert that Host storage can close. Existing v12 reader refuses v13,
while v13 compatibility checks cover tags/combined/OCR corrections/notebook/organization/
worksets/download metadata and reopen. No real user library is used in these tests.

Validation: background-ocr.integration.test.ts (temporary real Host, synthetic Runtime,
fault-injected resource events and owned Host SIGKILL cutpoints); background-ocr-ui.test.mjs
(real React with explicit bridge substitutes); background-ocr-electron.e2e.test.mjs (compiled
Main/Preload/Renderer, generated PNGs, stdlib protocol executable, both production-null and
synthetic-qualified paths). Real RapidOCR quality, real model qualification, Windows,
installer/signing and real user library migration remain NOT_RUN. This is not a full Governor,
caption implementation, tag scheduler, or automatic approval for future model execution.

DP01 observation hardening: every runtime observation (read, prepare, confirm, tick,
claim and before sent) rechecks the original Host session/revision/authority after await.
Observed mismatch revokes the current grant; A to B to A cannot restore it. A stale observation
retires only the matching local grant and never revokes a newer Host grant. Confirmation
rechecks review identity before configure and post-configure session/revision. Production
qualification remains null; the 21 controller and 10 temporary real Host tests do not
qualify a real Runtime or authorize background execution.
