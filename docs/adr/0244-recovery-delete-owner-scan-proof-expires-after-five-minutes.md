# Recovery Delete Owner Scan Proof Expires After Five Minutes

An ADR 0241 Recovery-Protected Owner Scan that freshly proves no declared owner issues one **Recovery Owner Scan Validity Window**. Its destructive absence proof and delete-eligibility token remain valid for at most five elapsed minutes from the host's terminal scan commit, not from opening Storage Management, opening confirmation or beginning to type the package name.

The host owns the hard deadline using a monotonic bounded duration plus a conservative wall-time ceiling. Sleep, timezone/locale changes, clock anomalies, focus changes or a stalled renderer cannot lengthen it. Process restart, host lease loss or inability to assess the original scan deadline invalidates the token rather than recreating the remaining time.

The confirmation may open while the token is valid and shows a coarse remaining-validity countdown alongside the exact package identity and destructive consequence. Opening, dismissing, reopening, scrolling, accessibility interaction, typing, clearing or matching the package name never pauses, refreshes or replaces the scan deadline.

At final submission, the host requires the exact recovery gate, target, stable volumes, no-owner scan generation and hard deadline still to be valid before it may accept ADR 0241 deletion. Renderer click time, a queued IPC event, cached enabled button or confirmation animation before expiry is not acceptance. ADR 0243 owner-generation invalidation remains immediate and may end eligibility earlier than this time cap.

If the five-minute deadline passes before host acceptance, no reference or byte is deleted. The host invalidates the no-owner proof and eligibility token, closes/disables the confirmation, clears the typed package name and enters **Recovery Owner Scan Expired**. The ADR 0240 safety gate remains unchanged, and the only destructive-path continuation is another explicit complete owner scan.

Recovery Owner Scan Expired does not automatically rerun the scan, reopen confirmation, repopulate text, queue a delete-when-fresh intent or infer that ownership probably stayed unchanged. Low-disk pressure, an empty blocking-owner list, another window or repeated confirmation attempts cannot renew the proof. A new scan always receives a new generation and fresh five-minute deadline.

The five-minute window is neither a deletion transaction timeout nor permission to skip final generation revalidation. It bounds only how long a completed absence proof may authorize host acceptance. A timely accepted request atomically transitions to ADR 0245's one maximum-five-second reference-removal transaction; later scan expiry neither cancels that transaction nor constrains its separate physical cleanup. Expiry never retroactively authorizes a request that arrived late.

Validity state contains only opaque target/gate/scan identity, terminal scan time, hard deadline and expired/current class. It retains no typed package name, paths, owner evidence payload, credentials, content or attention history and is excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs. Expiry creates no notification or activity-history record.

ADR 0248 applies the same non-renewable five-minute absence-proof validity to its entirely new Unassessable Delete Finalization Owner Scan. That finalization never inherits remaining time, proof or confirmation from an ADR 0241 scan; expiry before host acceptance preserves the neutral ADR 0247 gate and requires another explicit complete scan.

A timely ADR 0248 host acceptance atomically transitions to ADR 0249's separate maximum-five-second normalization transaction. Later expiry of the finalization scan proof neither cancels that accepted transaction nor constrains physical cleanup; it still cannot authorize a late request.

The current Runtime Package/session UI has a separate ten-minute local-manifest selection TTL but no recovery owner scan, absence-proof token, five-minute destructive validity window or host deadline projection. That existing selection TTL is not reused as this policy. This ADR changes documentation only: it starts/expires no real scan, deletes no owner or bytes, reads no runtime database/package/cache/private state and changes no public IPC/schema/AI Worker API.
