# Shortfall Coverage Does Not Auto Stop Selection Or Keep The Target

The ADR 0230 combined footer compares Owner-Aware Batch Reclaimable Bytes with ADR 0226 Keep Pin Storage Shortfall as a **Keep Shortfall Coverage State**. Each affected physical volume is evaluated separately. A volume shows remaining shortfall when projected reclamation is lower, Covered when it exactly meets the requirement, or Covered With Excess with projected excess physical bytes when it is higher.

The overall state is Not Yet Covered while any required volume remains short, even if another volume has excess. It becomes Covered only when every affected volume meets or exceeds its own requirement, and Covered With Excess when all are covered and at least one has projected excess. Cross-volume totals, logical package sizes and unrelated free space never offset a deficient volume.

Reaching Covered or Covered With Excess changes explanation only. The application does not stop selection, close the review, clear or disable other checkboxes, choose a subset, open confirmation, execute deletion or retry Keep Pin Admission automatically. The selected identities, ADR 0231 Stable Cleanup Selection Order, ADR 0227 hold, ADR 0228 budget and ADR 0229 volume slot continue unchanged until an explicit user action or their existing terminal rules.

The user may continue selecting or deselecting rows after coverage. The host recomputes per-volume owner-aware totals, remaining/excess bytes and ADR 0231 non-additive margins from a fresh generation, while rows stay in place. The footer displays that the current Keep shortfall is satisfied and how many projected physical bytes exceed it; it never implies that projected bytes have already been freed.

No row is labelled Unnecessary, Excess, Remove From Selection or part of a computed minimum set. Shared-owner complementarity can make multiple different subsets cover the same shortfall, and an individual marginal contribution can change when another row is selected. The host therefore does not infer which package has less user value or solve a hidden automatic deletion plan.

If the user opens ADR 0230 irreversible confirmation with projected excess, the same sheet separately states per-volume required, projected and excess physical bytes and that the user selected more projected reclamation than the current Keep request requires. This is an informational excess warning inside the explicit confirmation, not a second consent trick, forced deselection or permission to delete an unselected row.

Owner-graph invalidation before execution may change Covered to Not Yet Covered or change the excess. ADR 0231 disables stale confirmation and returns the refreshed per-volume state for review without reordering rows or preserving an outdated promise. Execution then uses ADR 0230 item-atomic revalidation and reports actual physical reclamation, which may differ from the projection.

After deletion, the workflow recomputes actual availability and a fresh Keep Pin Storage Shortfall. Neither projected coverage nor actual batch success automatically creates a Keep owner; the user must explicitly retry Keep Pin Admission. If concurrent writes or changed owners recreate a shortfall, the pending copy remains pending and the UI explains the new state.

ADR 0233 permits a deliberately Not Yet Covered selection with at least one eligible row and a fresh owner generation to execute as explicit Partial Managed Copy Cleanup. Its confirmation shows projected remaining shortfall and uses Delete Selected Managed Copies; nothing authorizes an automatic deletion to reach coverage.

Coverage state, per-volume required/projected/remaining/excess bytes and projection generation are session-bound operational UI state. They are excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs and contain no paths, content, credentials, user-value score or attention history.

The current project has no managed package-copy registry, Keep shortfall projector, batch owner graph, per-volume coverage footer or excess confirmation. This ADR changes documentation only: it covers/selects/deletes/keeps no real copy, reads no package/private state and changes no public IPC/schema/AI Worker API.
