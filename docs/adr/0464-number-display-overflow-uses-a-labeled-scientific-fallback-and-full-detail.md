# Number Display Overflow Uses A Labeled Scientific Fallback And Full Detail

Decision class: Spec-candidate（详细契约已提炼，决定效力未取消）。

## Decision

An exact Decimal128-equivalent value can produce thousands of ordinary-decimal characters under a valid display rule, so inline layout must be bounded without turning clipping into false numeric evidence.

## Detailed contract and provenance

详细状态、交互、数值边界和例外的唯一正文为[数字字段、显示与精度规格](../product/specs/custom-number.md#adr-0464)。此处保留取舍索引；具体机制见[所属子系统](../subsystems/organization.md)，当前资格只查CURRENT-STATE。

本次只整理文档，未宣称该能力已实现。原文与全部段落身份保存在[迁移检查点](../checkpoints/documentation-rebuild-20261015/README.md)，映射见adr-migration.json；来源上下文与有效能力要求在规格中分开。
