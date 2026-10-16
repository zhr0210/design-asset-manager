# Custom Field Schema Maintenance Uses One Cooperative Library Lane

Decision class: Spec-candidate（详细契约已提炼，决定效力未取消）。

## Decision

Running several large Custom Field Type Migrations, Select-option maintenance operations or constraint revalidations against the same library could amplify database contention and stale-preview conflicts, while draining one task without yielding would make ordinary asset work feel blocked.

## Detailed contract and provenance

详细状态、交互、数值边界和例外的唯一正文为[自定义字段与迁移规格](../product/specs/custom-fields.md#adr-0430)。此处保留取舍索引；具体机制见[所属子系统](../subsystems/organization.md)，当前资格只查CURRENT-STATE。

本次只整理文档，未宣称该能力已实现。原文与全部段落身份保存在[迁移检查点](../checkpoints/documentation-rebuild-20261015/README.md)，映射见adr-migration.json；来源上下文与有效能力要求在规格中分开。
