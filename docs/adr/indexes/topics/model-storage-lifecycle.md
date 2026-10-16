# 模型存储与清理恢复：ADR候选目录

仅列标题/性质/原文声明状态，非正文合集或已交付声明。先按具体任务挑少量决定，再读原文和链接契约。未显式状态不等于未批准；Proposed/Historical不冒充有效已确认规则。

运行关系见[相关子系统](../../../subsystems/ai-system.md#models)，其他主题见[主题目录](../topics.md)。

| 决定 | 性质 | 声明状态 |
| --- | --- | --- |
| [0223 · Awaiting Package Decisions Expire After Seven Days And Explicit Keep Pins Them](../../0223-awaiting-package-decisions-expire-after-seven-days-and-explicit-keep-pins-them.md) | Spec-candidate | 原文未显式标状态 |
| [0224 · Missed Pending Package Warnings Receive One 24-Hour Grace](../../0224-missed-pending-package-warnings-receive-one-24-hour-grace.md) | Spec-candidate | 原文未显式标状态 |
| [0225 · Unpinning A Kept Package Copy Starts A New Pending Decision Cycle](../../0225-unpinning-a-kept-package-copy-starts-a-new-pending-decision-cycle.md) | Spec-candidate | 原文未显式标状态 |
| [0226 · New Keep Pins Must Preserve The Storage Safety Reserve](../../0226-new-keep-pins-must-preserve-the-storage-safety-reserve.md) | Spec-candidate | 原文未显式标状态 |
| [0227 · Storage Resolution Holds Pending Package Cleanup For At Most Thirty Minutes](../../0227-storage-resolution-holds-pending-package-cleanup-for-at-most-thirty-minutes.md) | Spec-candidate | 原文未显式标状态 |
| [0228 · Storage Resolution Holds Share One Cumulative Thirty-Minute Episode Budget](../../0228-storage-resolution-holds-share-one-cumulative-thirty-minute-episode-budget.md) | Spec-candidate | 原文未显式标状态 |
| [0229 · Only One Storage Resolution Hold May Be Active Per Volume](../../0229-only-one-storage-resolution-hold-may-be-active-per-volume.md) | Spec-candidate | 原文未显式标状态 |
| [0230 · Managed Package Copy Batch Delete Is User Selected And Owner Aware](../../0230-managed-package-copy-batch-delete-is-user-selected-and-owner-aware.md) | Spec-candidate | 原文未显式标状态 |
| [0231 · Managed Copy Cleanup Sorting Freezes During Selection](../../0231-managed-copy-cleanup-sorting-freezes-during-selection.md) | Spec-candidate | 原文未显式标状态 |
| [0232 · Shortfall Coverage Does Not Auto Stop Selection Or Keep The Target](../../0232-shortfall-coverage-does-not-auto-stop-selection-or-keep-the-target.md) | Spec-candidate | 原文未显式标状态 |
| [0233 · Not Yet Covered Selections May Execute As Explicit Partial Cleanup](../../0233-not-yet-covered-selections-may-execute-as-explicit-partial-cleanup.md) | Spec-candidate | 原文未显式标状态 |
| [0234 · Running Batch Cleanup Gets One Five Minute Terminal Drain](../../0234-running-batch-cleanup-gets-one-five-minute-terminal-drain.md) | Spec-candidate | 原文未显式标状态 |
| [0235 · Covered Drain Results Get One Sixty-Second Explicit Keep Decision](../../0235-covered-drain-results-get-one-sixty-second-explicit-keep-decision.md) | Spec-candidate | 原文未显式标状态 |
| [0236 · Post-Cleanup Keep Now Uses A Live Compact Final Confirmation](../../0236-post-cleanup-keep-now-uses-a-live-compact-final-confirmation.md) | Spec-candidate | 原文未显式标状态 |
| [0237 · Safe Final Keep Recheck Accepts Nonblocking Byte Drift](../../0237-safe-final-keep-recheck-accepts-nonblocking-byte-drift.md) | Spec-candidate | 原文未显式标状态 |
| [0238 · On-Time Final Keep Requests Get One Five-Second Commit Transaction](../../0238-on-time-final-keep-requests-get-one-five-second-commit-transaction.md) | Spec-candidate | 原文未显式标状态 |
| [0239 · Interrupted Keep Commits Reconcile Once And Show A Twenty-Four-Hour Result](../../0239-interrupted-keep-commits-reconcile-once-and-show-a-24-hour-result.md) | Spec-candidate | 原文未显式标状态 |
| [0240 · Unassessable Keep Recovery Protects Only The Affected Copy](../../0240-unassessable-keep-recovery-protects-only-the-affected-copy.md) | Spec-candidate | 原文未显式标状态 |
| [0241 · Unrecoverable Keep State Allows Only Owner-Proven Advanced Delete](../../0241-unrecoverable-keep-state-allows-only-owner-proven-advanced-delete.md) | Spec-candidate | 原文未显式标状态 |
| [0242 · Blocking Managed Owners Route To Their Normal Lifecycle](../../0242-blocking-managed-owners-route-to-their-normal-lifecycle.md) | Spec-candidate | 原文未显式标状态 |
| [0243 · Owner Changes Require A New Explicit Recovery Delete Scan And Confirmation](../../0243-owner-changes-require-a-new-explicit-recovery-delete-scan-and-confirmation.md) | Spec-candidate | 原文未显式标状态 |
| [0244 · Recovery Delete Owner Scan Proof Expires After Five Minutes](../../0244-recovery-delete-owner-scan-proof-expires-after-five-minutes.md) | Spec-candidate | 原文未显式标状态 |
| [0245 · On-Time Recovery Delete Gets One Five-Second Reference Removal Transaction](../../0245-on-time-recovery-delete-gets-one-five-second-reference-removal-transaction.md) | Spec-candidate | 原文未显式标状态 |
| [0246 · Interrupted Recovery Delete Reconciles Once And Shows A Twenty-Four-Hour Result](../../0246-interrupted-recovery-delete-reconciles-once-and-shows-a-24-hour-result.md) | Spec-candidate | 原文未显式标状态 |
| [0247 · Unassessable Recovery Delete Reconciliation Protects Only The Affected Copy](../../0247-unassessable-recovery-delete-reconciliation-protects-only-the-affected-copy.md) | Spec-candidate | 原文未显式标状态 |
| [0248 · Unassessable Recovery Delete Uses A Fresh Owner-Proven Finalization](../../0248-unassessable-recovery-delete-uses-a-fresh-owner-proven-finalization.md) | Spec-candidate | 原文未显式标状态 |
| [0249 · On-Time Unassessable Delete Finalization Gets One Five-Second Normalization Transaction](../../0249-on-time-unassessable-delete-finalization-gets-one-five-second-normalization-transaction.md) | Spec-candidate | 原文未显式标状态 |
| [0250 · Interrupted Unassessable Delete Finalization Reconciles Once And Restores Neutral Safety](../../0250-interrupted-unassessable-delete-finalization-reconciles-once-and-restores-neutral-safety.md) | Spec-candidate | 原文未显式标状态 |
| [0251 · Unassessable Delete Finalization Allows New Fully Gated Manual Attempts](../../0251-unassessable-delete-finalization-allows-new-fully-gated-manual-attempts.md) | Spec-candidate | 原文未显式标状态 |
| [0252 · Physical Reclaim Pending Retries Owner-Safe Cleanup Without Repeating Delete Intent](../../0252-physical-reclaim-pending-retries-owner-safe-cleanup-without-repeating-delete-intent.md) | Spec-candidate | 原文未显式标状态 |
| [0253 · Physical Reclaim Retries At One Five Thirty Minutes Then Six-Hour Intervals](../../0253-physical-reclaim-retries-at-one-five-thirty-minutes-then-six-hour-intervals.md) | Spec-candidate | 原文未显式标状态 |
| [0254 · Physical Reclaim Completion Clears Pending State And Shows One Twenty-Four-Hour Result](../../0254-physical-reclaim-completion-clears-pending-state-and-shows-one-24-hour-result.md) | Spec-candidate | 原文未显式标状态 |
| [0255 · Physical Reclaim Completes As Shared When Other Owners Retain All Remaining Bytes](../../0255-physical-reclaim-completes-as-shared-when-other-owners-retain-all-remaining-bytes.md) | Spec-candidate | 原文未显式标状态 |
