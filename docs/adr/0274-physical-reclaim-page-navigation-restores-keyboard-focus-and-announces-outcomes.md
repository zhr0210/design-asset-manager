# Physical Reclaim Page Navigation Restores Keyboard Focus And Announces Outcomes

When keyboard or assistive-technology activation starts an ADR 0269 page action, the renderer records the initiating pagination control as the **Physical Reclaim Page Navigation Focus Origin**. ADR 0271 may temporarily disable that control during a demand load, but a matching completion, ordinary failure or ADR 0273 timeout resolves focus against the recorded origin only if the same summary, filter and expanded detail projection still exists.

After resolution, focus returns to the initiating control when it is still rendered and enabled. If a successful navigation reaches a boundary that disables that origin, such as Next on the final page or Previous on page one, focus moves to the always-labeled current-page input instead. A direct-page submission therefore returns to its input, and a manual ADR 0272 retry may return to Retry after another failure because Retry was that attempt's explicit origin.

Pointer activation receives no programmatic focus movement. The browser's ordinary pointer-focus behavior may remain, but the renderer never forces focus to the clicked button, current-page input, first detail row, summary header or status message. Successful navigation still scrolls the detail region to its top under ADR 0269; scrolling and focus are separate behaviors.

Loading uses one visible atomic polite status, such as “Loading page 7”, and announces it once for a user-demand cache miss. Successful cached or demand navigation uses the same polite live region to announce a localized result such as “Page 7 of 23 loaded; 50 items on this page.” The item value is the committed row count for that page, not the complete filtered-result count, and the total-page value comes from the exact host projection.

Ordinary failure and timeout use one immediate assistive-technology alert associated with the inline pagination error. The alert identifies the requested page and says it could not load or timed out without endpoint, path, identifier, package/private detail or diagnostic code. The newly shown Retry action enters the normal Tab order after the error and is not automatically focused for the initial failure.

If filter change, collapse, leaving Storage Management, renderer-session loss or snapshot invalidation makes the pending request obsolete, the renderer neither restores focus into removed/obsolete controls nor announces a false success or failure. Focus stays wherever the user subsequently placed it. ADR 0270 prefetch, cache fill/eviction and discarded stale responses never move focus or produce live-region output.

Focus-origin and live-message state are ephemeral renderer presentation state. They create no settings, database/filesystem/browser-storage value, Full Library Backup, export/merge/sync state, Activity History, telemetry, support payload, notification or evidence that any detail row was read.

The current project has no Physical Reclaim Completion Summary or navigation-focus policy. This ADR changes documentation only: it moves no real focus, announces no private result, reads no user asset, runtime database, package/cache/model/private state and changes no public IPC/schema/AI Worker API. Pagination placement and sticky scrolling behavior are defined separately rather than assumed here.
