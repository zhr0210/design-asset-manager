# ADR任务索引

ADR是所有项目任务的相关决定上下文，不是统一首站。功能/体验先从[子系统](../subsystems/README.md)与行为规格理解当前契约，取舍比较可直接从这里进入；按主题/影响范围挑原文，任务类型只调关注面。不全量加载494篇，也不把全部Core当启动必读。

| 需要什么 | 进入哪里 |
| --- | --- |
| 本次属于什么任务、应关注哪类决定 | [任务类型索引](indexes/tasks.md) |
| 涉及哪个领域/子系统 | [主题目录](indexes/topics.md) |
| Core/Supporting/Spec-candidate/Historical的完整分类 | [性质分类](indexes/classification.md)，仅需核对分类时读 |
| 取舍背景、跨领域原则与旧替代说明 | [背景与维护](indexes/reading-context.md)，按相关问题读取 |

## Read Protocol

1. 明确本次任务类型及主题/影响范围；类型只调阅读重点，不排除任何任务或同主题相关决定。
2. 需要决定背景时，用任务/主题索引或元数据路由挑少量候选，读取支撑当前结论的决定及适用契约章节。高层比较不要求遍历全部细节；规定具体行为/权限/执行机制前须核对相应条款。预算延后/未命中不等于无适用决定。
3. 核对声明状态、前提与后续明确替代，按需跟到跨主题的原文引用。未显式声明状态不等于未批准；Proposed/Historical不冒充现行有效规则。
4. 若结论或方案与有效决定冲突，指出条款及原因/前提变化；按最新明确用户决定的具体替代范围处理，不静默推翻或增加逐次审批。
5. 决定有效性、当前实现和实际资格分开：当前机制见[子系统](../subsystems/README.md)，交付见[CURRENT-STATE](../handoff/CURRENT-STATE.md)，目标细节见[规格](../product/specs/README.md)。

```sh
node scripts/adr-context.mjs route --kind design --topic work-mode --task "悬浮窗交互" --json
```

默认3条元数据候选，不加载正文；范围不明不会输出全量语料。完整命令与任务类型见上方索引。

读取已有决定与创建新记录分开。新建/重开取舍见[创建条件](../agents/domain.md#record-a-new-decision)，术语另查CONTEXT，文档方法归CONTRIBUTING。任何任务适用不等于每个任务读全部ADR，也不授权恢复旧队列。

新增有效决定：[0494：工作集退役独立备注和用色](0494-work-sets-retire-own-notes-and-palettes.md)。其迁移范围不包括素材笔记、独立色板和原件。
