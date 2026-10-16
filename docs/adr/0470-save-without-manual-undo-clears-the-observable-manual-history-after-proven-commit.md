# Save Without Manual Undo Clears The Observable Manual History After Proven Commit

Decision class: Spec-candidate（详细契约已提炼，决定效力未取消）。

## Decision

An authoritative manual save that creates no Undo entry cannot leave older entries apparently reachable, because the next Undo would silently skip the newest change and act on an earlier state. **Save Without Manual Undo** therefore creates a **Manual Undo History Boundary** for the active library session.

## Detailed contract and provenance

详细状态、交互、数值边界和例外的唯一正文为[手工编辑撤销与内存规格](../product/specs/manual-undo.md#adr-0470)。此处保留取舍索引；具体机制见[所属子系统](../subsystems/organization.md)，当前资格只查CURRENT-STATE。

本次只整理文档，未宣称该能力已实现。原文与全部段落身份保存在[迁移检查点](../checkpoints/documentation-rebuild-20261015/README.md)，映射见adr-migration.json；来源上下文与有效能力要求在规格中分开。
