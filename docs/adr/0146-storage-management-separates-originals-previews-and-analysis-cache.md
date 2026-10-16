# Storage Management Separates Originals Previews and Analysis Cache

Decision class: Spec-candidate（详细契约已提炼，决定效力未取消）。

## Decision

Storage accounting separates Original Asset Storage, Required Preview Storage, Analysis Proxy Cache, ADR 0277 Offline Library Catalogs, immutable Model Artifact Storage, evictable Model Derived Runtime Cache, ADR 0183 Canonical Embedding Results, rebuildable ANN Search Indexes, ADR 0191 managed Runtime Package active/rollback storage and ADR 0222 Verified Managed Package Copy storage.

## Detailed contract and provenance

详细状态、交互、数值边界和例外的唯一正文为[预览、颜色与分析证据规格](../product/specs/preview-analysis.md#adr-0146)。此处保留取舍索引；具体机制见[所属子系统](../subsystems/ai-analysis.md)，当前资格只查CURRENT-STATE。

本次只整理文档，未宣称该能力已实现。原文与全部段落身份保存在[迁移检查点](../checkpoints/documentation-rebuild-20261015/README.md)，映射见adr-migration.json；来源上下文与有效能力要求在规格中分开。
