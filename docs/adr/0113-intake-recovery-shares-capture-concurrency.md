# Intake Recovery Shares Capture Concurrency

Decision class: Spec-candidate（详细契约已提炼，决定效力未取消）。

## Decision

New capture, automatic retry, and restart recovery must share one configurable Acquisition Concurrency Limit, reusing the existing 1–8 range with a default of 3 instead of adding a recovery-specific setting.

## Detailed contract and provenance

详细状态、交互、数值边界和例外的唯一正文为[Candidate与入库规格](../product/specs/capture.md#adr-0113)。此处保留取舍索引；具体机制见[所属子系统](../subsystems/storage-intake.md)，当前资格只查CURRENT-STATE。

本次只整理文档，未宣称该能力已实现。原文与全部段落身份保存在[迁移检查点](../checkpoints/documentation-rebuild-20261015/README.md)，映射见adr-migration.json；来源上下文与有效能力要求在规格中分开。
