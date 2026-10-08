# Physical Reclaim Demand Page Retry Is Manual Single-Flight Without Attempt Limits

After an ADR 0271 Physical Reclaim Demand Page Load fails, the application performs no automatic application-level retry. The committed rows remain visible and the path-free inline error offers the only **Physical Reclaim Manual Page Retry** action. A transient-looking error, repeated failure or continued expansion never starts a hidden request on the user's behalf.

Retry targets the same requested page and is bound again to the exact current summary generation, stable-volume identity, member-set digest and selected ADR 0268 outcome filter. If that identity/filter/page is no longer current or valid, the renderer clears the obsolete error and sends no retry. A retry cannot reuse a response from another filter, summary, generation or page.

Only one user-demand request for that summary and requested page may be in flight. Activating Retry starts that request and disables the Retry action together with ADR 0271's page-changing controls until it resolves. Repeated activation, keyboard repeat or duplicate UI events cannot enqueue or overlap additional requests. Other independent summaries retain their own isolated state.

A failed retry or ADR 0273 timeout restores the same inline error and immediately makes Retry available again. There is no fixed attempt limit, exponential backoff, cooldown, increasing delay, attempt counter or permanent lockout. Failures replace the existing inline state instead of stacking messages; the user may stop, change page/filter, collapse the summary or leave Storage Management at any time.

A successful retry atomically commits the exact whole page under ADR 0271, clears the error and recenters the ADR 0270 three-page window. Changing page/filter, collapsing, leaving the surface or invalidating the snapshot clears the obsolete error and any attempt-local state. No retry count, failure sequence or last-attempt time survives that state change or renderer session.

Repeated failure never escalates to a toast, modal, global banner, OS notification, Activity History, telemetry, support payload or diagnostic record. It does not change the complete summary header, member acknowledgement, constituent expiry, ADR 0256 closure, card order or any authoritative host state.

The current project has no Physical Reclaim Completion Summary or manual page retry. This ADR changes documentation only: it retries/counts/locks no real request, reads no user asset, runtime database, package/cache/model/private state and changes no public IPC/schema/AI Worker API. ADR 0273 gives every initial demand load and manual retry its own 10-second monotonic deadline.
