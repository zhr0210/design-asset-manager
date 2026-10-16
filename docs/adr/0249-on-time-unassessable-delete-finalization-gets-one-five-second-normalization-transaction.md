# On-Time Unassessable Delete Finalization Gets One Five-Second Normalization Transaction

Decision class: Spec-candidate（详细契约已提炼，决定效力未取消）。

## Decision

When the host accepts ADR 0248 Finalize Unassessable Recovery Delete before its fresh owner-scan deadline, it atomically consumes that exact finalization authorization and enters one **Unassessable Delete Finalization In Flight** transaction.

## Detailed contract and provenance

详细状态、交互、数值边界和例外的唯一正文为[模型存储与清理恢复规格](../product/specs/model-storage-lifecycle.md#adr-0249)。此处保留取舍索引；具体机制见[所属子系统](../subsystems/model-library.md)，当前资格只查CURRENT-STATE。

本次只整理文档，未宣称该能力已实现。原文与全部段落身份保存在[迁移检查点](../checkpoints/documentation-rebuild-20261015/README.md)，映射见adr-migration.json；来源上下文与有效能力要求在规格中分开。
