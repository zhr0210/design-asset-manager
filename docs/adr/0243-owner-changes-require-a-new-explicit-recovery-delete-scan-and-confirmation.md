# Owner Changes Require A New Explicit Recovery Delete Scan And Confirmation

When any managed owner generation changes after an ADR 0241 Recovery-Protected Owner Scan, the host immediately invalidates that scan token, absence proof, reclaim projection and any open Delete Recovery-Protected Managed Copy confirmation. Storage Management enters **Recovery Owner Changed** for the exact target and keeps ADR 0240's safety gate authoritative.

Recovery Owner Changed shows that package ownership changed and the prior destructive review is no longer valid. Advanced delete remains disabled. Returning from an ADR 0242 management destination, reopening Storage Management, renderer reload, process restart or observing that a blocking activity has ended never automatically reruns the complete scan or re-enables deletion.

The only next destructive-path action is an explicit Run Full Owner Scan Again. It creates a new bounded scan over the complete authoritative managed owner stores, manifests and transaction journals, assigns a new opaque scan generation and recomputes blocking-owner categories, stable affected volumes, logical/shared bytes and owner-proven physical reclamation from current state.

If the new scan finds a declared owner, ADR 0242 continues to show its normal lifecycle destination and deletion stays unavailable. If it freshly proves no owner, the host may issue a new ADR 0241 delete-eligibility token and open a new irreversible review. A prior no-owner result, prior exact-name match or previous confirmation event is never reused as partial proof.

ADR 0244 gives each new no-owner proof a non-renewable five-minute hard validity window. Even without another owner-generation event, expiry before host acceptance invalidates eligibility, clears typed text and requires another explicit complete scan rather than refreshing the current generation.

Every new delete review clears the typed package-name field. The user must re-enter the exact currently displayed package name after seeing the refreshed identity, byte projection and no-Undo consequence. Browser autofill, renderer form restoration, clipboard history, another window or a cached component state cannot populate or submit the destructive confirmation automatically.

The final delete still revalidates the new recovery-gate generation, owner-scan generation, stable volume identity and absence proof under ADR 0241. If ownership changes during rescan or confirmation, the host returns to Recovery Owner Changed again without deleting, retaining typed text or queuing another scan. There is no retry loop, remembered delete-when-free intent or automatic execution after the last blocker ends.

Owner-generation invalidation is host-wide across application windows and processes for the same authoritative managed stores. A renderer-local snapshot cannot remain valid merely because its page did not observe another install, rollback, transaction or copy transition. Distinct unrelated owner graphs may continue independently when their stable store/volume evidence proves separation.

The same invalidation rule applies to ADR 0248's fresh Unassessable Delete Finalization Owner Scan. Any relevant owner change invalidates its proof, projection and newly typed confirmation; it never falls back to the older recovery-delete scan or authorization.

Recovery Owner Changed state retains only opaque target/gate and invalidated/current scan generations plus a coarse change reason. Typed confirmation text is never persisted or logged. State and projections contain no paths, owner journal payload, credentials, user content or attention history and are excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs.

The current Runtime Package/session UI has no durable owner generations, recovery scan token, cross-window invalidation, explicit rescan workflow or typed-name recovery delete. This ADR changes documentation only: it scans/confirms/deletes no real owner or bytes, reads no runtime database/package/cache/private state and changes no public IPC/schema/AI Worker API.
