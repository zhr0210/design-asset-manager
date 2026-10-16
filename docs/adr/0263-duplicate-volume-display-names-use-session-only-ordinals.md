# Duplicate Volume Display Names Use Session-Only Ordinals

Decision class: Spec-candidate（详细契约已提炼，决定效力未取消）。

## Decision

When two or more distinct opaque physical-volume identities represented on the current Storage Management surface resolve through ADR 0262 to the same available human-readable display name, every member of that collision group receives a localized parenthesized ordinal, such as **Design Volume (1)** and **Design Volume (2)**.

## Detailed contract and provenance

详细状态、交互、数值边界和例外的唯一正文为[存储清理结果与可访问导航规格](../product/specs/storage-review.md#adr-0263)。此处保留取舍索引；具体机制见[所属子系统](../subsystems/model-library.md)，当前资格只查CURRENT-STATE。

本次只整理文档，未宣称该能力已实现。原文与全部段落身份保存在[迁移检查点](../checkpoints/documentation-rebuild-20261015/README.md)，映射见adr-migration.json；来源上下文与有效能力要求在规格中分开。
