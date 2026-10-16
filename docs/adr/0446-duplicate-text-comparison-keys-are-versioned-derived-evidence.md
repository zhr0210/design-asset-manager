# Duplicate Text Comparison Keys Are Versioned Derived Evidence

Decision class: Spec-candidate（详细契约已提炼，决定效力未取消）。

## Decision

ADR 0445 duplicate discovery needs deterministic grouping without treating a comparison transform as stored metadata. **Exact Duplicate Text Comparison** uses the authoritative NFC scalar sequence unchanged. **Case-Insensitive Duplicate Text Comparison** applies locale-independent Unicode full case folding and then NFC, but does not trim, collapse whitespace, remove diacritics or discard valid formatting; it is deliberately distinct from ADR 0444 pattern matching's simple fold and from ADR 0433 name comparison's additional edge trimming.

## Detailed contract and provenance

详细状态、交互、数值边界和例外的唯一正文为[文本字段、检索与编辑规格](../product/specs/custom-text.md#adr-0446)。此处保留取舍索引；具体机制见[所属子系统](../subsystems/organization.md)，当前资格只查CURRENT-STATE。

本次只整理文档，未宣称该能力已实现。原文与全部段落身份保存在[迁移检查点](../checkpoints/documentation-rebuild-20261015/README.md)，映射见adr-migration.json；来源上下文与有效能力要求在规格中分开。
