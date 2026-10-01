# Physical Reclaim Demand Page Loads Have a Ten-Second Monotonic Deadline

Every uncached ADR 0271 Physical Reclaim Demand Page Load, including each explicit ADR 0272 manual retry, receives its own **Physical Reclaim Demand Page Deadline** of 10 seconds. The interval starts when the renderer dispatches that exact bound request and uses elapsed monotonic time rather than wall-clock, time-zone or localized calendar time.

A complete matching response may commit only while its request is still active before the deadline transition. Once 10 elapsed seconds are reached, the renderer marks that request token expired, clears the programmatic busy/loading state, restores page-changing controls and shows a localized path-free “Page load timed out” inline error with the same manual Retry action. ADR 0274 immediately announces that timeout and restores any still-valid keyboard focus origin without auto-focusing the initial Retry. The committed page and scroll position remain unchanged.

An expired request is permanently stale even if its underlying work later completes successfully. A late response cannot replace rows, change selected page, enter the ADR 0270 three-page window, satisfy a later retry or alter the inline timeout state. Each Retry creates a new request token and a new independent 10-second deadline; it never revives the expired request.

If the renderer/host transport supports scoped cancellation, timeout may best-effort cancel only that expired read request. Cancellation success is not required for the UI timeout to finish. When cancellation is unavailable or races with completion, the host may finish its local read, but the renderer safely ignores the response through the expired token and exact request identity.

Success, ordinary failure, filter/page change, summary collapse, snapshot invalidation, leaving Storage Management or renderer-session loss ends the active deadline early and prevents its timer from producing a later error. If the application is suspended while a request is active and resumes after the monotonic deadline, it applies timeout before accepting any queued response.

The 10-second boundary is presentation/request-liveness policy, not a claim that host result state failed or that deletion/reclaim work was retried. Timeout does not acknowledge the summary, change any constituent expiry, affect ADR 0256 closure, record a page view or clear a valid current-page cache entry.

Deadline, expiry token and timeout error are ephemeral renderer state. They create no settings, database/filesystem/browser-storage value, Full Library Backup, export/merge/sync state, Activity History, telemetry, support payload, notification or durable performance record.

The current project has no Physical Reclaim Completion Summary or demand-page deadline. This ADR changes documentation only: it starts/expires/cancels no real request, reads no user asset, runtime database, package/cache/model/private state and changes no public IPC/schema/AI Worker API. ADR 0274 defines post-navigation focus and assistive-technology loading/completion announcements.
