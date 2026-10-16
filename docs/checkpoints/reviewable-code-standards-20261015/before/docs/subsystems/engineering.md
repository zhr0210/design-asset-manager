# 工程导航、规范、审查与反馈

本页描述当前源码的跨层职责与运行路径；不是运行验收或目标全量交付声明。返回[子系统目录](README.md)，具体用户契约见[产品/目标规格](../product/README.md)与[交互目录](../design/README.md)。

## 职责与状态权威

AGENTS是AI开发的首要入口，按任务直接导航到所属正文，不经过独立文档总入口；开发规范保存稳定保证，指南保存方法，子系统/模块保存具体契约。当前任务、跨系列责任、实际资格和证据各有唯一入口。文档与反馈数据不是执行授权。

## 正式入口与运行链

首入口按当前问题选择，功能/体验从所属专题与行为契约进入，取舍比较可从ADR进入；任何任务仍按主题/影响范围核对相关决定，不固定检索顺序或排除任务类型。实现类任务沿用户目标→所属正文/任务路由→相关决定、必要契约与源码→相关问题/经验转检查→实现/验证→原问题复验→经验事件/日期→候选评估→规范或保护测试。一个事故一主记录可关联多模块，闭源本地记录不依赖GitHub评论。

AI读取材料改变含义、适用范围或检索链路时，批次结束按[维护协议](../../CONTRIBUTING.md#document-retrieval-validation)执行全新低思考只读探查：短任务不提示阅读路径或报告检索过程；主Agent按三层标准审查实际轨迹、归因并修对应拥有者，再以新上下文复验失败及受影响相邻范围。关键缺口不作通过，不挑选成功结果。纯排版只做适用结构检查；详细判据/状态/闭环唯一归指南，过程证据留本任务检查点。

## 失败、取消与兼容保护

新复发才记新事件/复盘日期；同一事故重试/多渠道不增加次数。三个不同日期列候选，严重安全/数据/越权立即处理；提升后保留来源引用，未提升说明原因。输出预算延后完整条目，不截断保证或假称无问题。

## 技术与平台边界

物理目录拥有者、业务专题和任务路由多对多；trusted tracked覆盖与未跟踪候选分列。静态索引不证明运行资格，来源冲突要核对用户最新决定与具体替代范围。

## 源码与详细机制

- [AGENTS.md](../../AGENTS.md)
- [CONTRIBUTING.md](../../CONTRIBUTING.md)
- [docs/code-standards.md](../code-standards.md)
- [LESSONS.md](../../LESSONS.md)
- [docs/agents/DEVELOPMENT-PROBLEMS.md](../agents/DEVELOPMENT-PROBLEMS.md)
- [.codeindex/module-map.json](../../.codeindex/module-map.json)
- [scripts/agent-context-router.mjs](../../scripts/agent-context-router.mjs)
- [scripts/development-feedback.mjs](../../scripts/development-feedback.mjs)

- [文档结构与迁移审计](../../scripts/check-documentation.py)
- [明确候选的文档同步检查](../../scripts/check-docs-sync.py)
- [治理行为测试](../../scripts/documentation-governance.test.py)
- [路由回归](../../scripts/agent-context-router.test.mjs)
- [反馈/三日期回归](../../scripts/development-feedback.test.mjs)

- [ADR类型/主题元数据路由](../../scripts/adr-context.mjs)
- [ADR有界路由行为测试](../../scripts/adr-context.test.mjs)

## 验证与维护

以下是相关聚焦检查入口，按改动风险选择，不自动执行整组：

- `npm run test-agent-context-router`
- `npm run context:check`
- `python3 scripts/check-adr-router.py`
- `python3 scripts/check-agent-context.py`
- `python3 scripts/check-docs-sync.py`

完整配置见[tests-map](../../.codeindex/tests-map.json)，实际命令以package.json/对应脚本为准。正式用户结果、保存重开、真实推理和原生专项按[真实验收](../agents/ui-ux-acceptance.md)；实际版本/缺口仅见[CURRENT-STATE](../handoff/CURRENT-STATE.md)，剩余责任见[主台账](../tasks/TASK-REGISTRY.md)。

改变这里的职责、接口、状态、运行路径、兼容或失败语义时同任务更新正文并描述前后行为；局部内部机制归源码旁README，运行证据归本任务报告，不在本页按日期追加PASS。
