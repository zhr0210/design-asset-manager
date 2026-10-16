# DAM 文档入口

从正在解决的问题进入，不逐份通读。产品、当前机制、目标规格、运行资格与历史证据分别维护。

| 问题 | 权威正文 | 写回职责 |
| --- | --- | --- |
| 为谁做、核心/可选/远景是什么 | [产品基准](product/PRODUCT-FOUNDATION.md) | 产品目标与范围 |
| 功能由谁协作、状态归谁 | [架构](../ARCHITECTURE.md)、[子系统目录](subsystems/README.md) | 稳定结构/当前机制 |
| 功能应怎样工作、哪些尚未实现 | [产品规格](product/README.md) | 用户契约/有效目标 |
| 界面与用户操作 | [DESIGN](../DESIGN.md)、[交互目录](design/README.md) | 视觉/行为各自归属 |
| 开发、审查、验证 | [开发指南](../CONTRIBUTING.md)、[规范](code-standards.md)、[验收](agents/ui-ux-acceptance.md) | 方法、保证、验收步骤 |
| 从哪里继续、实际能用什么 | [TASK](../TASK.md)、[主台账](tasks/TASK-REGISTRY.md)、[当前状态](handoff/CURRENT-STATE.md) | 本次范围、跨系列责任、实际资格 |
| 相关问题与经验 | [本地问题](agents/DEVELOPMENT-PROBLEMS.md)、[LESSONS](../LESSONS.md) | 一个主记录、复验、下次检查/提升 |
| 术语与取舍 | [CONTEXT](../CONTEXT.md)、[ADR](adr/README.md) | 概念定义/重大取舍 |
| 旧版本与原证据 | [历史](history/README.md)、[交接](handoff/README.md) | 日期/版本来源，不改记当前PASS |

## 读取与维护

AGENTS→所属子系统→模块/契约→实际源码/测试。context:route提供有界导航与反馈，不执行文档文字，也不授权恢复旧队列。改变职责、接口、状态、路径、兼容或失败行为时同任务更新所属正文；内部重构保持契约则说明依据，不机械制造文档修改。

写前分类，写后审查差异/入链。迁移保存身份和逐条去向，保留要求/例外/来源；冻结证据不为整齐改字节。目标与现状冲突不能通过降低目标消除；只有循环链接不是覆盖。方法见指南§7，本轮证据见[重建检查点](checkpoints/documentation-rebuild-20261015/README.md)。
