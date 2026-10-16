# Managed Original Readable Stems Preserve Unicode With Dual Length Budgets

Decision class: Spec-candidate（详细契约已提炼，决定效力未取消）。

## Decision

Managed Original Storage Name v1 derives its **Managed Original Readable Stem** from the received filename stem without transliteration, pinyin conversion, ASCII slugging, timestamp insertion, title substitution, or content-based renaming.

## Detailed contract and provenance

详细状态、交互、数值边界和例外的唯一正文为[资料库身份与存储角色规格](../product/specs/library-storage.md#adr-0288)。此处保留取舍索引；具体机制见[所属子系统](../subsystems/library-lifecycle.md)，当前资格只查CURRENT-STATE。

本次只整理文档，未宣称该能力已实现。原文与全部段落身份保存在[迁移检查点](../checkpoints/documentation-rebuild-20261015/README.md)，映射见adr-migration.json；来源上下文与有效能力要求在规格中分开。
