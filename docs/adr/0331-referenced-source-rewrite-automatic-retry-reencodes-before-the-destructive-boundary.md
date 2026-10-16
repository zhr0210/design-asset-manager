# Referenced Source Rewrite Automatic Retry Re-Encodes Before The Destructive Boundary

Decision class: Spec-candidate（详细契约已提炼，决定效力未取消）。

## Decision

**Referenced Source Rewrite Automatic Retry** is allowed only after a classified transient source read, encoder-process failure, application-owned staging write or complete-verification I/O failure before the Referenced Source Rewrite Destructive Boundary.

## Detailed contract and provenance

详细状态、交互、数值边界和例外的唯一正文为[引用源操作与恢复规格](../product/specs/referenced-operations.md#adr-0331)。此处保留取舍索引；具体机制见[所属子系统](../subsystems/storage-intake.md)，当前资格只查CURRENT-STATE。

本次只整理文档，未宣称该能力已实现。原文与全部段落身份保存在[迁移检查点](../checkpoints/documentation-rebuild-20261015/README.md)，映射见adr-migration.json；来源上下文与有效能力要求在规格中分开。
