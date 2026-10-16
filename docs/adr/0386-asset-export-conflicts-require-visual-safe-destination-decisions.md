# Asset Export Conflicts Require Visual Safe Destination Decisions

Decision class: Spec-candidate（详细契约已提炼，决定效力未取消）。

## Decision

Asset Export preflights the complete ADR 0384 directory tree against both the current destination and every other planned output after ADR 0385 name normalization.

## Detailed contract and provenance

详细状态、交互、数值边界和例外的唯一正文为[导出、交付与性能规格](../product/specs/export.md#adr-0386)。此处保留取舍索引；具体机制见[所属子系统](../subsystems/media-handoff.md)，当前资格只查CURRENT-STATE。

本次只整理文档，未宣称该能力已实现。原文与全部段落身份保存在[迁移检查点](../checkpoints/documentation-rebuild-20261015/README.md)，映射见adr-migration.json；来源上下文与有效能力要求在规格中分开。
