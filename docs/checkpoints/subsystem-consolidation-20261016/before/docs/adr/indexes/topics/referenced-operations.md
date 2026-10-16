# 引用源操作与恢复：ADR候选目录

仅列标题/性质/原文声明状态，非正文合集或已交付声明。先按具体任务挑少量决定，再读原文和链接契约。未显式状态不等于未批准；Proposed/Historical不冒充有效已确认规则。

运行关系见[相关子系统](../../../subsystems/storage-intake.md)，其他主题见[主题目录](../topics.md)。

| 决定 | 性质 | 声明状态 |
| --- | --- | --- |
| [0301 · Cross-Volume Referenced Source Moves Use Verified Transfer](../../0301-cross-volume-referenced-source-moves-use-verified-transfer.md) | Core | 原文未显式标状态 |
| [0302 · Verified Cross-Volume Destinations Survive Old-Source Cleanup Failure](../../0302-verified-cross-volume-destinations-survive-old-source-cleanup-failure.md) | Supporting | 原文未显式标状态 |
| [0303 · Cross-Volume Source Transfer Publishes Only Verified Staging](../../0303-cross-volume-source-transfer-publishes-only-verified-staging.md) | Core | 原文未显式标状态 |
| [0304 · Cross-Volume Transfer Collisions Open Visual Conflict Review](../../0304-cross-volume-transfer-collisions-open-visual-conflict-review.md) | Core | 原文未显式标状态 |
| [0305 · Transfer Destination Replacement Trashes Before Publishing](../../0305-transfer-destination-replacement-trashes-before-publishing.md) | Core | 原文未显式标状态 |
| [0306 · Failed Replacement Publication First Restores The Trashed Occupant](../../0306-failed-replacement-publication-first-restores-the-trashed-occupant.md) | Supporting | 原文未显式标状态 |
| [0307 · Successful Replacement Retains Device-Local Displaced-File Recovery](../../0307-successful-replacement-retains-device-local-displaced-file-recovery.md) | Supporting | 原文未显式标状态 |
| [0308 · Local File Recovery Survives Forgotten Library Registration](../../0308-local-file-recovery-survives-forgotten-library-registration.md) | Supporting | 原文未显式标状态 |
| [0309 · Cross-Volume Transfer Reversal Is A New Verified Transfer](../../0309-cross-volume-transfer-reversal-is-a-new-verified-transfer.md) | Core | 原文未显式标状态 |
| [0310 · Successful Cross-Volume Transfer Retains Old-Source Recovery](../../0310-successful-cross-volume-transfer-retains-old-source-recovery.md) | Supporting | 原文未显式标状态 |
| [0311 · Same-Volume Relocation Collisions Use Visual Conflict Review](../../0311-same-volume-relocation-collisions-use-visual-conflict-review.md) | Supporting | 原文未显式标状态 |
| [0312 · Relocation Replacement Recovers Trashed Occupants Before Retry](../../0312-relocation-replacement-recovers-trashed-occupants-before-retry.md) | Supporting | 原文未显式标状态 |
| [0313 · Simple Same-Volume Relocation Has A Verified Thirty-Second Undo](../../0313-simple-same-volume-relocation-has-a-verified-thirty-second-undo.md) | Supporting | 原文未显式标状态 |
| [0314 · Referenced Source Path Batches Commit And Recover Per Item](../../0314-referenced-source-path-batches-commit-and-recover-per-item.md) | Core | 原文未显式标状态 |
| [0315 · Referenced Source Path Batch Undo Only Reverses Eligible Simple Relocations](../../0315-referenced-source-path-batch-undo-only-reverses-eligible-simple-relocations.md) | Supporting | 原文未显式标状态 |
| [0316 · Referenced Source Path Batch Cancellation Stops Only Pre-Commit Work](../../0316-referenced-source-path-batch-cancellation-stops-only-pre-commit-work.md) | Supporting | 原文未显式标状态 |
| [0317 · Referenced Source Path Batches Serialize Active Work Per Physical Volume](../../0317-referenced-source-path-batches-serialize-active-work-per-physical-volume.md) | Supporting | 原文未显式标状态 |
| [0318 · Referenced Source Path Automatic Retry Is Pre-Publication And Bounded](../../0318-referenced-source-path-auto-retry-is-pre-publication-and-bounded.md) | Supporting | 原文未显式标状态 |
| [0319 · Referenced Source Rewrite Stages And Verifies Before Replacing User Bytes](../../0319-referenced-source-rewrite-stages-and-verifies-before-replacing-user-bytes.md) | Core | 原文未显式标状态 |
| [0320 · Referenced Source Rewrite Recovery Reconciles Before One Safe Rollback](../../0320-referenced-source-rewrite-recovery-reconciles-before-one-safe-rollback.md) | Core | 原文未显式标状态 |
| [0321 · Rewritten Old Source Recovery Is Not Rewrite Undo](../../0321-rewritten-old-source-recovery-is-not-rewrite-undo.md) | Supporting | 原文未显式标状态 |
| [0322 · Same-Format Rewrite Is A Distinct Protected Flow](../../0322-same-format-rewrite-and-cross-format-source-change-are-complete-separate-flows.md) | Supporting | 原文未显式标状态 |
| [0323 · Cross-Format Source Change Adopts The Export Before Old-Source Cleanup](../../0323-cross-format-source-change-adopts-the-export-before-old-source-cleanup.md) | Historical | superseded |
| [0324 · Cross-Format Source Change Blocks Active-Library Relationship Conflicts](../../0324-cross-format-source-change-blocks-active-library-relationship-conflicts.md) | Historical | superseded |
| [0325 · Cross-Format Source Change Cancels Only Before Relationship Commit](../../0325-cross-format-source-change-cancels-only-before-relationship-commit.md) | Historical | superseded |
| [0326 · Cross-Format Source Change Batches Require Explicit Pairs And Commit Per Item](../../0326-cross-format-source-change-batches-require-explicit-pairs-and-commit-per-item.md) | Historical | superseded |
| [0327 · Source Format Change Shares Referenced Source Volume Lanes](../../0327-source-format-change-shares-referenced-source-volume-lanes.md) | Historical | superseded |
| [0328 · Source Format Change Automatic Retry Is Pre-Commit And Bounded](../../0328-source-format-change-automatic-retry-is-pre-commit-and-bounded.md) | Historical | superseded |
| [0329 · Referenced Source Rewrite Cancels Only Before Old-Source Trash](../../0329-referenced-source-rewrite-cancels-only-before-old-source-trash.md) | Spec-candidate | 原文未显式标状态 |
| [0330 · Referenced Source Rewrite Batches Use One Plan And Commit Per Item](../../0330-referenced-source-rewrite-batches-use-one-plan-and-commit-per-item.md) | Spec-candidate | 原文未显式标状态 |
| [0331 · Referenced Source Rewrite Automatic Retry Re-Encodes Before The Destructive Boundary](../../0331-referenced-source-rewrite-automatic-retry-reencodes-before-the-destructive-boundary.md) | Spec-candidate | 原文未显式标状态 |
| [0332 · Referenced Source Rewrite Holds One Shared Volume Lane Through Publication](../../0332-referenced-source-rewrite-holds-one-shared-volume-lane-through-publication.md) | Spec-candidate | 原文未显式标状态 |
| [0333 · Source Rewrite Plans Keep Current By Default And Resolve Per Format](../../0333-source-rewrite-plans-keep-current-by-default-and-resolve-per-format.md) | Spec-candidate | 原文未显式标状态 |
| [0334 · Source Rewrite Presets Have Explicit Personal And Library Scopes](../../0334-source-rewrite-presets-have-explicit-personal-and-library-scopes.md) | Spec-candidate | 原文未显式标状态 |
