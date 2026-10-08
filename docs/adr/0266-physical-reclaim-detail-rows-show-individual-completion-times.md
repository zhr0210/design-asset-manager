# Physical Reclaim Detail Rows Show Individual Completion Times

Every explicitly expanded Physical Reclaim Completion Summary detail row shows a labeled **Completed** value immediately after that target's Removed Now, Already Absent, Mixed or Completed As Shared outcome class. The value is the authoritative completion instant of that exact constituent ADR 0254 result, not the summary projection time, page-load time, acknowledgement time or expiry deadline.

Row timestamps reuse ADR 0265's formatting without variation: a completion on the renderer's current local calendar date shows localized short time; another date shows localized month, day and short time. Hover, keyboard focus and accessible text expose the full localized year, month, day, time through seconds, time-zone name and numeric UTC offset.

The maximum of all constituent row completion instants must equal the header's Latest Completed instant and ADR 0264 primary card-order key. A lazy ADR 0258 detail page is bound to the same opaque generation, stable volume and member-set digest as its header; stale or mismatched row-time evidence cannot be substituted, parsed from localized text or used to rewrite the acknowledged snapshot.

Completion time is explanatory only. Rows remain in ADR 0258's stable alphabetical package-identity order and are never sorted, paged, promoted, highlighted or auto-scrolled by time. Midnight, locale and time-zone changes may reformat visible timestamps but cannot move a row, change a page boundary, create another acknowledgement or affect any independent 24-hour expiry.

Row timestamps use no relative-age phrase, expiry countdown, minute-level refresh timer or attention animation. They reuse the completion instants already retained for result lifetime and summary ordering, creating no additional durable time field, localized-string cache, row-view history or proof-of-reading signal.

The detail response remains path-free. Completion time adds no path, device identifier, owner evidence, payload or user content and is excluded from settings, Full Library Backup, export/merge/sync, Activity History, telemetry, publisher feedback and support logs together with the rest of the ephemeral summary projection.

The current project has no Physical Reclaim Completion Summary details or row-time formatter. This ADR changes documentation only: it loads/formats/sorts no real result, reads no user asset, runtime database, package/cache/model/private state and changes no public IPC/schema/AI Worker API. ADR 0267 places Actual Reclaimed and Shared Retained byte fields after this completion time without changing time semantics.
