# Candidate与入库：详细能力契约

本文承接原ADR中的细节，保留所有原数字、例外、状态和相互约束；[来源映射](../../checkpoints/documentation-rebuild-20261015/adr-migration.json)逐段核对。**有效要求不是当前交付声明，也不是本轮实施队列。** 现行已批准产品/设计在其明确替代范围内优先；不凭实现缺失判决定无效。

当前系统从[storage-intake](../../subsystems/library-lifecycle.md#intake)进入；当前实际能力/版本见[CURRENT-STATE](../../handoff/CURRENT-STATE.md)，交互与视觉分别归[交互目录](../../design/README.md)/[DESIGN](../../../DESIGN.md)。详细条款按下面独立主题定位，不全量装入每次上下文。

## 主题导航

- [0109 · Successful Capture Activity Is Ephemeral](#adr-0109)
- [0113 · Intake Recovery Shares Capture Concurrency](#adr-0113)

<a id="adr-0109"></a>

## 0109 · Successful Capture Activity Is Ephemeral

**适用范围：素材任务下载已退休；本节状态词只在仍适用的入库/未来producer契约中核对，不恢复旧下载执行器。**

决定来源：[0109-successful-capture-activity-is-ephemeral.md](../../adr/0109-successful-capture-activity-is-ephemeral.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0109-p001"></a>

Successful Candidate Activation should remain only as Recent Capture Completion in a collapsed Capture Activity section for the current application session or at most 24 hours, whichever ends first, and must not create a second durable activity history. Long-term trace stays with Capture Batch and Candidate History. An Unresolved Acquisition Failure remains visible and contributes to Capture Attention Badge until retry succeeds, the user cancels the intake, or the user explicitly acknowledges that no further recovery is needed. Resolving attention does not erase the stable Candidate Identity or minimal failure trace required for recovery evidence and idempotency.

<a id="adr-0113"></a>

## 0113 · Intake Recovery Shares Capture Concurrency

决定来源：[0113-intake-recovery-shares-capture-concurrency.md](../../adr/0113-intake-recovery-shares-capture-concurrency.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0113-p001"></a>

New capture, automatic retry, and restart recovery must share one configurable Acquisition Concurrency Limit, reusing the existing 1–8 range with a default of 3 instead of adding a recovery-specific setting. Intake Recovery Queue orders recovery work by original gateway acceptance time and respects source request-delay or rate-limit requirements. Foreground Capture Priority reserves capacity for newly user-triggered capture when the limit permits and otherwise places it ahead of not-yet-started recovery work, without interrupting an already writing or validating artifact. Capture Activity exposes Recovery Pause for queued and resumable recovery work without blocking the current workspace or cancelling Candidate Intake.
