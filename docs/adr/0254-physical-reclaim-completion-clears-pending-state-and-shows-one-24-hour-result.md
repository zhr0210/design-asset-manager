# Physical Reclaim Completion Clears Pending State And Shows One Twenty-Four-Hour Result

When an ADR 0252 physical-reclaim attempt authoritatively proves that every exact managed-byte object in the target's remaining scope was safely removed by the current attempt or was already absent under its stable content/volume identity, the host commits **Physical Reclaim Completed**. A missing path, changed directory, unavailable volume or unassessable identity is not completion.

Completion atomically clears the target's Physical Reclaim Pending state, ADR 0253 backoff step/deadline, latest failure reason and active reclaim lease. No later startup, mount, timer or manual trigger may reuse the cleared pending identity or schedule another unlink for that target. The commit does not reopen or rewrite the terminal reference-deletion decision.

Storage Management receives one path-free **Physical Reclaim Completed Result**. It reports actual bytes removed by the completing episode and separately classifies objects verified as Removed Now, Already Absent or a mixture of both; Already Absent contributes zero newly reclaimed bytes. It never substitutes projected/logical size, claims shared bytes as freed or exposes managed paths.

ADR 0255 adds Completed As Shared when every still-present object has another authoritative owner and no unowned failed object remains. The same result separates actual reclaimed/already-absent bytes from shared bytes retained at zero newly freed storage.

The result expires at the earlier of one usable Storage Management viewing opportunity or 24 elapsed hours after completion. A viewing opportunity begins only when a usable renderer acknowledges projection; the card remains stable for that surface session and is removed after dismissal or leaving the surface. If never projected, the 24-hour hard cap removes it. No focus duration, eye tracking, click history or proof of reading is recorded.

ADR 0257 may project several same-generation, same-volume results in one Physical Reclaim Completion Summary. Summary acknowledgement applies to each result included in that rendered projection, but their individual completion times and hard deadlines remain unchanged.

For a summary larger than 50 targets, ADR 0258 makes the authoritative all-member header snapshot the acknowledged projection while loading path-free detail in 50-row lazy pages. A usable acknowledgement of that exact header snapshot closes every represented result's viewing opportunity without requiring page-by-page traversal; it does not acknowledge later or differently scoped results.

ADR 0259 keeps that summary collapsed by default and never auto-expands it for a particular outcome class. The complete collapsed header remains a usable result projection; optional disclosure, page and scroll state last only for the current Storage Management surface session and do not change result lifetime or acknowledgement.

The result is explanatory only. It creates no startup modal, OS notification, badge-driven urgency, Activity History entry, new cleanup authority, Undo, storage reservation or owner mutation. Dismissal or expiry does not recreate Physical Reclaim Pending or affect the already terminal package-copy deletion.

Physical-reclaim completion does not itself prune the minimal terminal deletion evidence used by package-owner/recovery reconciliation. It clears only the physical-reclaim scheduler and result dependencies. ADR 0256 prunes the terminal record only after this result closes, every other dependency closes and a later clean startup reconfirms target absence and owner consistency.

The completion/result record retains only opaque terminal-delete, target, managed-object and stable-volume identities, Removed Now/Already Absent class, actual reclaimed byte count, completion/expiry times and renderer-projection acknowledgement. It contains no paths, payload, user content, credentials, prior failure timeline or attention history and is excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs.

The current project has no Physical Reclaim Pending scheduler, authoritative managed-object completion transaction or 24-hour reclaim result. This ADR changes documentation only: it verifies/clears/reclaims no real bytes, reads no runtime database/package/cache/model/asset/private state and changes no public IPC/schema/AI Worker API.
