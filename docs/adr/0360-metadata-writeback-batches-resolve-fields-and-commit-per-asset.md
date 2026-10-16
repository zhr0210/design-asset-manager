# Metadata Writeback Batches Resolve Fields And Commit Per Asset

Decision class: Spec-candidate（详细契约已提炼，决定效力未取消）。

## Decision

An **Original Metadata Writeback Batch** begins only after the user selects Design Assets and one semantic **Metadata Writeback Field Set**, such as title, rating and keywords.

## Detailed contract and provenance

详细状态、交互、数值边界和例外的唯一正文为[归属转换与元数据写回规格](../product/specs/writeback.md#adr-0360)。此处保留取舍索引；具体机制见[所属子系统](../subsystems/storage-intake.md)，当前资格只查CURRENT-STATE。

本次只整理文档，未宣称该能力已实现。原文与全部段落身份保存在[迁移检查点](../checkpoints/documentation-rebuild-20261015/README.md)，映射见adr-migration.json；来源上下文与有效能力要求在规格中分开。
