# Storage Byte Displays Use Localized IEC Units With Exact Byte Values

Storage Management uses one **Storage Byte Display** rule for ADR 0260 Physical Reclaim Completion Summary values and later storage-facing byte totals. Authoritative byte counts remain non-negative integers. Zero renders as `0 B`; positive values use a 1024 base with the technically accurate unit symbols `B`, `KiB`, `MiB`, `GiB` and `TiB`.

The compact value selects the largest unit whose unrounded magnitude is at least one, capped at `TiB`. Raw-byte values remain whole integers. A scaled value below 10 uses one fractional digit; a scaled value of 10 or more uses no fractional digits. If rounding would display `1024` of one scaled unit, presentation carries into the next unit instead of showing a boundary value such as `1024 MiB`.

A positive byte count must never render as numeric zero. Compact rounding is presentation only and never replaces the authoritative integer used for aggregation, acknowledgement, storage accounting, safety-reserve checks or result closure. ADR 0260 invalid, negative, non-finite, fractional or unavailable evidence remains unusable rather than being coerced to `0 B`.

Every compact byte value exposes the exact integer byte count with current-locale grouping in its hover/focus description and accessible text. The exact text localizes its number separators and the word for bytes, while the IEC symbols remain stable technical symbols. The compact and exact representations come from the same raw integer and cannot be separately supplied by the renderer.

Target and outcome counts use the current application locale's integer grouping, never compact `K`/`M` abbreviations, fractional values or inferred zeros. Localized display strings are not persisted: result state retains only raw counts and raw byte integers, and changing locale re-renders the same snapshot without changing its identity, acknowledgement or expiry.

The same formatter applies to header and ADR 0267 detail-row Actual Reclaimed bytes and Shared Bytes Retained By Other Owners so zero and nonzero quantities remain directly comparable. It does not add a user-selectable unit preference or silently redefine package sizes, GPU memory, download progress, asset metadata or other existing screens; those currently inconsistent formatters require separate reviewed migration if they later adopt this storage rule.

The current project has no Physical Reclaim Completion Summary or shared Storage Management byte formatter. This ADR changes documentation only: it reads/formats/reclaims no real result or bytes, accesses no runtime database/package/cache/model/asset/private state, modifies none of the existing formatter code and changes no public IPC/schema/AI Worker API. ADR 0262 defines the path-free, render-time display identity of the physical volume without changing numeric formatting.
