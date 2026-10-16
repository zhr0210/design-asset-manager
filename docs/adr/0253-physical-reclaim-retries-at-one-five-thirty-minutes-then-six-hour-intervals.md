# Physical Reclaim Retries At One Five Thirty Minutes Then Six-Hour Intervals

Decision class: Spec-candidate（详细契约已提炼，决定效力未取消）。

## Decision

After ADR 0252's immediate physical-reclaim attempt ends with a retryable transient I/O, busy-file or permission outcome and scoped bytes remain, **Physical Reclaim Retry Backoff** schedules the next active-application attempts after 1 minute, then 5 minutes, then 30 minutes, and thereafter no more than once every 6 hours.

## Detailed contract and provenance

详细状态、交互、数值边界和例外的唯一正文为[模型存储与清理恢复规格](../product/specs/model-storage-lifecycle.md#adr-0253)。此处保留取舍索引；具体机制见[所属子系统](../subsystems/model-library.md)，当前资格只查CURRENT-STATE。

本次只整理文档，未宣称该能力已实现。原文与全部段落身份保存在[迁移检查点](../checkpoints/documentation-rebuild-20261015/README.md)，映射见adr-migration.json；来源上下文与有效能力要求在规格中分开。
