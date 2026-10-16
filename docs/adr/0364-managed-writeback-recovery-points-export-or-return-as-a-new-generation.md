# Managed Writeback Recovery Points Export Or Return As A New Generation

Decision class: Spec-candidate（详细契约已提炼，决定效力未取消）。

## Decision

A healthy local or backup-backed Managed Metadata Writeback Recovery Point offers two independent operations. **Export Managed Writeback Recovery Copy** writes the exact recovery payload to a user-selected external destination without changing the Design Asset, Asset File Ownership, current Original Asset, Source Content Generation or recovery-point retention. **Use Managed Writeback Recovery Point As Current** is a separately reviewed managed-source replacement, not undo, database rollback or historical-state reactivation.

## Detailed contract and provenance

详细状态、交互、数值边界和例外的唯一正文为[归属转换与元数据写回规格](../product/specs/writeback.md#adr-0364)。此处保留取舍索引；具体机制见[所属子系统](../subsystems/storage-intake.md)，当前资格只查CURRENT-STATE。

本次只整理文档，未宣称该能力已实现。原文与全部段落身份保存在[迁移检查点](../checkpoints/documentation-rebuild-20261015/README.md)，映射见adr-migration.json；来源上下文与有效能力要求在规格中分开。
