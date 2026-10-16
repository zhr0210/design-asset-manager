# Custom Field Schema Maintenance Has Fixed Cross-Platform Responsiveness Acceptance

Decision class: Spec-candidate（详细契约已提炼，决定效力未取消）。

## Decision

A cooperative schema-maintenance scheduler is not sufficient if its profiles can still make a 100,000-owner library unresponsive. **Custom Field Maintenance Responsiveness Guard** is therefore a fixed cross-platform release acceptance contract, not a configurable quality level: interaction-to-visible-response latency is at most 100 ms p95 and 250 ms p99, Asset Library grid frame time is at most 33 ms p95, no UI freeze exceeds 500 ms, and Pause feedback becomes visibly acknowledged within 200 ms without claiming that an admitted item has already stopped.

## Detailed contract and provenance

详细状态、交互、数值边界和例外的唯一正文为[自定义字段与迁移规格](../product/specs/custom-fields.md#adr-0431)。此处保留取舍索引；具体机制见[所属子系统](../subsystems/organization.md)，当前资格只查CURRENT-STATE。

本次只整理文档，未宣称该能力已实现。原文与全部段落身份保存在[迁移检查点](../checkpoints/documentation-rebuild-20261015/README.md)，映射见adr-migration.json；来源上下文与有效能力要求在规格中分开。
