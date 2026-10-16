# Physical Reclaim Demand Page Loads Have a Ten-Second Monotonic Deadline

Decision class: Spec-candidate（详细契约已提炼，决定效力未取消）。

## Decision

Every uncached ADR 0271 Physical Reclaim Demand Page Load, including each explicit ADR 0272 manual retry, receives its own **Physical Reclaim Demand Page Deadline** of 10 seconds.

## Detailed contract and provenance

详细状态、交互、数值边界和例外的唯一正文为[存储清理结果与可访问导航规格](../product/specs/storage-review.md#adr-0273)。此处保留取舍索引；具体机制见[所属子系统](../subsystems/model-library.md)，当前资格只查CURRENT-STATE。

本次只整理文档，未宣称该能力已实现。原文与全部段落身份保存在[迁移检查点](../checkpoints/documentation-rebuild-20261015/README.md)，映射见adr-migration.json；来源上下文与有效能力要求在规格中分开。
