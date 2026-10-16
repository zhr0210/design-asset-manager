# Capture Cleanup History Shows Minimal Recovery Fields

Decision class: Spec-candidate（详细契约已提炼，决定效力未取消）。

## Decision

Capture Cleanup History should show only the fields needed to understand and act on recoverable cleaned candidates: thumbnail, source, Cleanup Reason, cleanup time, Recoverable Until, and restore or Hard Delete actions.

## Detailed contract and provenance

详细状态、交互、数值边界和例外的唯一正文为[筛选、审查与回收站规格](../product/specs/review-trash.md#adr-0057)。此处保留取舍索引；具体机制见[所属子系统](../subsystems/library-lifecycle.md)，当前资格只查CURRENT-STATE。

本次只整理文档，未宣称该能力已实现。原文与全部段落身份保存在[迁移检查点](../checkpoints/documentation-rebuild-20261015/README.md)，映射见adr-migration.json；来源上下文与有效能力要求在规格中分开。
