# Screen Previews Use Explicit Relative Colorimetric Policy

Decision class: Spec-candidate（详细契约已提炼，决定效力未取消）。

## Decision

Ordinary color-managed screen previews use an explicit Preview Rendering Policy of ICC media-relative colorimetric intent with Black Point Compensation enabled.

## Detailed contract and provenance

详细状态、交互、数值边界和例外的唯一正文为[预览、颜色与分析证据规格](../product/specs/preview-analysis.md#adr-0132)。此处保留取舍索引；具体机制见[所属子系统](../subsystems/ai-analysis.md)，当前资格只查CURRENT-STATE。

本次只整理文档，未宣称该能力已实现。原文与全部段落身份保存在[迁移检查点](../checkpoints/documentation-rebuild-20261015/README.md)，映射见adr-migration.json；来源上下文与有效能力要求在规格中分开。
