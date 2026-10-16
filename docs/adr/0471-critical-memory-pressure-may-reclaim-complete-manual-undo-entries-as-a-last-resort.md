# Critical Memory Pressure May Reclaim Complete Manual Undo Entries As A Last Resort

Decision class: Spec-candidate（详细契约已提炼，决定效力未取消）。

## Decision

The ADR 0469 device setting is a normal retention maximum, not authority to endanger application or operating-system responsiveness. **Critical-Pressure Manual Undo Reclamation** is therefore a trusted-host last resort.

## Detailed contract and provenance

详细状态、交互、数值边界和例外的唯一正文为[手工编辑撤销与内存规格](../product/specs/manual-undo.md#adr-0471)。此处保留取舍索引；具体机制见[所属子系统](../subsystems/organization.md)，当前资格只查CURRENT-STATE。

本次只整理文档，未宣称该能力已实现。原文与全部段落身份保存在[迁移检查点](../checkpoints/documentation-rebuild-20261015/README.md)，映射见adr-migration.json；来源上下文与有效能力要求在规格中分开。
