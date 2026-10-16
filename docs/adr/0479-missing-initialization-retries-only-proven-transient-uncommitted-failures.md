# Missing Initialization Retries Only Proven Transient Uncommitted Failures

Decision class: Spec-candidate（详细契约已提炼，决定效力未取消）。

## Decision

A failed Missing initialization owner group is retryable only when trusted reconciliation proves both that no field in the atomic group committed and that the failure was transient rather than a plan, identity, lifecycle, validation, storage-authority or revision conflict. **Retry Missing Initialization Failure** is an explicit manual action over one or more user-selected Retry-Eligible owner groups; the product offers no automatic retry loop and no undifferentiated Retry All that can absorb conflicts, exclusions or unknown outcomes.

## Detailed contract and provenance

详细状态、交互、数值边界和例外的唯一正文为[布尔与缺失字段初始化规格](../product/specs/missing-initialization.md#adr-0479)。此处保留取舍索引；具体机制见[所属子系统](../subsystems/organization.md)，当前资格只查CURRENT-STATE。

本次只整理文档，未宣称该能力已实现。原文与全部段落身份保存在[迁移检查点](../checkpoints/documentation-rebuild-20261015/README.md)，映射见adr-migration.json；来源上下文与有效能力要求在规格中分开。
