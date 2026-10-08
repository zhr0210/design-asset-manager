# Physical Reclaim Detail Rows Show Actual Reclaimed And Shared-Retained Bytes

Every explicitly expanded Physical Reclaim Completion Summary detail row shows two labeled byte fields after ADR 0266's individual completion time: **Actual Reclaimed** and **Shared Retained**. Both are authoritative non-negative integer byte counts from that exact constituent result and both remain visible when zero.

The two fields reuse ADR 0261 Storage Byte Display compact IEC units, exact hover/focus byte integers and accessible text without a row-specific formatter. Compact rounding never replaces the raw integers used for validation. Missing, negative, fractional, non-finite or otherwise unassessable row evidence is not coerced to `0 B`.

Across every constituent in the frozen ADR 0258 member snapshot, including all unloaded lazy pages, the sum of row Actual Reclaimed values must equal the header's authoritative actual reclaimed byte total. The sum of row Shared Retained values must independently equal the header's Shared Bytes Retained By Other Owners total. The host validates both invariants from the full snapshot; the renderer never computes either header total from currently loaded pages.

An Already Absent-only target shows `0 B` Actual Reclaimed and `0 B` Shared Retained because it freed no bytes in the completing episode. Removed Now and Mixed targets report only bytes actually reclaimed. A Completed As Shared target reports the bytes still retained by other owners separately and may also report actual bytes reclaimed earlier in its mixed completion episode; shared bytes never contribute to Actual Reclaimed.

The row does not display or derive an already-absent historical size, logical/apparent package size, projected cleanup size, estimated reclaimability, allocation estimate or per-owner share. Existing completion evidence needed to prove object absence remains host-only and is never relabeled as storage freed. Owner categories, identities and byte apportionment remain outside the result projection.

Row bytes do not affect ADR 0258 alphabetical order, page membership, ADR 0264 card ordering, disclosure, acknowledgement or expiry. There is no largest-first row sort, byte filter, progress bar, comparison badge or recommendation based on either value.

The current project has no Physical Reclaim Completion Summary details or row-byte projection. This ADR changes documentation only: it totals/formats/reclaims no real bytes, reads no user asset, runtime database, package/cache/model/private state and changes no public IPC/schema/AI Worker API. ADR 0268 filters full-snapshot details only by outcome class and never by these byte values.
