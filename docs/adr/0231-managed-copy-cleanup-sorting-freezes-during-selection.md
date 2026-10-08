# Managed Copy Cleanup Sorting Freezes During Selection

An ADR 0230 Managed Package Copy Batch Delete list initially sorts eligible rows by **Independent Managed Copy Reclaimable Bytes** descending: the physical delta if that one app-owned copy reference were deleted while every other owner and candidate remained. This is a storage-impact ordering, not a recommendation or statement of user value. The UI does not label any row “recommended,” “safe to remove,” “unused” or “best” merely because it appears first.

Ties use stable path-free package identity and opaque copy identity so the same owner-graph snapshot produces deterministic order without filenames, paths, access history or attention data. Lifecycle, revocation, compatibility, age and Keep status remain visible facts but are not covert value scores or default-delete priorities. A user may deliberately choose another explicit sort, but no sort mode selects rows.

While the selection is empty, a fresh host owner-graph snapshot may update independent reclaimable values and the default order. Once the user selects the first row, the current **Stable Cleanup Selection Order** freezes. Selecting/deselecting rows, recalculating shared ownership, budget countdown, shortfall changes or background owner invalidation updates values and eligibility in place but does not automatically move rows.

An item that becomes ineligible or disappears from ordinary candidates stays at its keyed position as an Excluded/Unavailable placeholder until selection is cleared, the batch finishes or the user explicitly refreshes the result set. This prevents row collapse from moving another destructive checkbox under the pointer. Selected identity is host-issued and stable; array position, displayed label and renderer index never authorize deletion.

An explicit user sort remains a presentation action under ADR 0081: it may reorder the same keyed result set while preserving selected identities and focus, but the action must be deliberate and cannot occur as a side effect of checking a box. Filter, volume, search, route or candidate-scope changes that can hide selected package copies clear the destructive selection before presenting a different result set; there is no implicit cross-scope selection.

After every selection change, the host computes **Marginal Batch Reclaim Contribution** from the current selected set. For an unselected row it means the extra physical bytes projected if that row were added; for a selected row it means the physical reclamation projected to be lost if that row were removed. The value is a counterfactual aid, not an independent byte claim.

Marginal contributions are explicitly non-additive. Two selected references may jointly release a shared blob even though neither releases it alone, or each removal counterfactual may appear to lose the same shared bytes. Row margins therefore may overlap and never have to sum to Owner-Aware Batch Reclaimable Bytes. The per-volume combined footer from ADR 0230 remains the only authoritative projected total and shortfall comparison.

ADR 0232 may mark that footer Covered or Covered With Excess, but neither state reorders rows, stops selection or identifies a minimum/unnecessary row. Continued explicit selection only updates margins and the combined per-volume remaining/excess projection in place.

Every projection carries an opaque owner-graph generation. If another process, install, delete, Keep/unpin transition or transaction changes ownership, the host invalidates the generation. The renderer keeps row positions stable, marks affected values Recalculating and disables irreversible confirmation until a fresh generation arrives; it never silently executes from stale margins or locally recomputes filesystem ownership.

ADR 0243 applies the same host-authoritative invalidation principle more strictly to recovery-protected single-copy deletion: owner change clears the prior scan and typed confirmation, but unlike this ordinary list refresh it requires a new explicit complete scan before another destructive review can exist.

After batch completion, explicit selection clearing or an explicit refresh, a new result-set snapshot may apply the default descending independent-reclaim order again. Mixed-result rows follow ADR 0230/ADR 0084 outcome focus rather than being reinserted under the pointer during execution. No automatic reordering occurs while confirmation or deletion is running.

Sort key, frozen row order, selected opaque identities, projection generation and marginal byte values are session-bound UI/operation state. They are excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs and do not create package-use or user-value history.

The current project has no Verified Managed Package Copy list, owner-graph generation, independent/marginal reclaim projector, stable destructive-row placeholder or batch package selection. Existing renderer sorts cover unrelated asset/tag views and cannot infer package ownership. This ADR changes documentation only: it sorts/selects/deletes no real copy, reads no package/private state and changes no public IPC/schema/AI Worker API.
