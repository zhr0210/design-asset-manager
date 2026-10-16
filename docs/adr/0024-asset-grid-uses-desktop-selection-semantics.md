# Asset Grid Uses Desktop Selection Semantics

Decision class: Spec-candidate（详细契约已提炼，决定效力未取消）。

## Decision

Asset Grid should follow desktop library semantics for selection and preview: single-click selects an asset and updates the right-side Asset Inspector, double-click opens Asset Preview, Space opens or closes quick preview, and multi-select changes the inspector into Batch Inspector mode.

## Detailed contract and provenance

详细状态、交互、数值边界和例外的唯一正文为[工作台与导航规格](../product/specs/workspace.md#adr-0024)。此处保留取舍索引；具体机制见[所属子系统](../subsystems/asset-workspace.md)，当前资格只查CURRENT-STATE。

本次只整理文档，未宣称该能力已实现。原文与全部段落身份保存在[迁移检查点](../checkpoints/documentation-rebuild-20261015/README.md)，映射见adr-migration.json；来源上下文与有效能力要求在规格中分开。
