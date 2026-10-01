# Physical Reclaim Summary Headers Show Localized Latest Completion Time

The first logical line of an ADR 0260 Physical Reclaim Completion Summary ends with a labeled **Latest Completed** value. It uses the exact same Latest Constituent Completion Time UTC instant that ADR 0264 uses as the card's primary sort key, so the visible explanation and actual newest-first order cannot refer to different events.

At render time, the instant is formatted in the application's current locale and current system time zone. When it falls on the renderer's current local calendar date, the compact label shows localized short time. Otherwise it shows localized month, day and short time. It never displays an unlabeled timestamp that could be mistaken for the summary's creation, projection, acknowledgement or expiry time.

Hover, keyboard focus and accessible text expose the complete localized year, month, day, time through seconds, time-zone name and numeric UTC offset. Compact and full forms are derived from the same authoritative instant; neither can be supplied independently or parsed back into result state.

The header never uses a live relative phrase such as “just now,” “minutes ago” or “yesterday,” and it shows no age or expiry countdown. A local midnight boundary, locale change or time-zone change may reformat the compact/full text and local-date classification, but it cannot move the card during the current session, modify the underlying UTC instant, restart acknowledgement or extend/shorten any constituent's host-owned 24-hour expiry.

The application may refresh the label at a local calendar-day boundary or ordinary rerender, but it creates no periodic minute-level timer, attention animation or proof-of-reading signal. System-clock or time-zone display drift affects presentation only; ordering and expiry continue from authoritative host instants and elapsed-time rules rather than the rendered string.

No localized timestamp string, time-zone label or display refresh is persisted to settings, result state, database, filesystem, Full Library Backup, export/merge/sync, Activity History, telemetry or support logs. The completion instants already required by ADRs 0254 and 0257 remain the only retained time evidence.

The current project has no Physical Reclaim Completion Summary header or latest-completion formatter. This ADR changes documentation only: it formats/sorts/expires no real result, reads no user asset, runtime database, package/cache/model/private state and changes no public IPC/schema/AI Worker API. ADR 0266 reuses this format for each expanded target's own completion instant without changing the header time.
