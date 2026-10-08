# 阶段报告：P01

## 1. 身份与范围

- 阶段ID/模式：P01 / **SPEC**。
- 时间/执行者/责任人：2026-09-24起草，2026-09-25收尾；Codex；用户/项目责任人尚未签收本设计。
- 需求R / 决策 / 测试T：R01/R24/R26/R32；DAM-A001/DAM-A020；Proposed ADR `P01-CONTRACT-BOUNDARY`（仓库编号待分配）；T01/T02/T21/T22。
- 工作区：`codex/product-reassessment-20260905`，HEAD `3fa00df3bbb605478da6d0af18724d64021e723c`；1310条Git状态，staged 18、unstaged 775、untracked 531（集合重叠，不可相加）。指纹保护1716份现有文本及Git index/diff。
- 已有修改保护：只新增独立P01文档目录；P00报告、用户暂存/未暂存/未跟踪文件不覆盖。前后比对见`../evidence/WORKTREE-PRESERVATION.json`。
- 实际读取：P00报告/状态/静态证据基线；P01任务卡和模板；包05/U01/S00及HOST-03/CONTRACT-04/DEV-21/OBS-18/P01相关R/DAM-A；AGENTS已有当前内容、TASK恢复点、CONTEXT相关术语；package/lock、现行Visual/OCR/Host契约、两Preload、VisualAiPanel、IPC、Controller、Storage、可信sender与现有验证工具调用。官方资料见`../REFERENCES.md`。
- 未取得/未验证：Python共同schema验证器的受控锁版本及环境、生产validator打包结果、P01新handler/依赖检查器、跨语言和新权限/事务运行证据。历史私有输入/模型原文不读取、不恢复。
- 前置设计状态：P00仍为ready_for_review。用户在上一轮报告后说“继续下一步”，明确允许继续P01 SPEC；这不等于逐项P00验收签字，已在当前状态记录授权解释，未回写旧报告。
- 前置实现状态：P00/P01均未实施；不能据此把P00或其他阶段标accepted。前置受保护源码指纹与P00相比无变化。

## 2. 事实、提案与批准分开

已核实源码事实：

1. 现行`visual-ai:confirm-tag`从VisualAiPanel经主/卡片Preload进入Main，在Controller/Host/Storage完成标签事务；现有两入口共享Host写权。
2. Visual/OCR为ok信封，Active Library为success信封；confirmTag成功值为void，不能伪装成JSON null。
3. 通知失败当前被Controller捕获而不推翻提交；旧IPC压平Error为字符串，Host也泛化部分内部Error。新code不能从旧文案可靠推断。
4. package-lock锁Ajv6.15.0且为devDependency，现有codeindex为Draft-07；Python仅Pydantic>=2.0，未声明统一JSON Schema验证器。
5. 主窗口sandbox=false仍是事实；P01没有修改配置或声称已有全局安全加固。

设计提案：只为该实际请求定义新增v1信封、Request/Result schema和合成夹具；Host生成traceId、封闭错误组合、提交成功与通知warning分开；增量兼容两种旧信封；模块清单从真实当前模块出发。草案暂选Draft-07并记录与2020-12路线的比较，而不是假设Ajv6支持目标方言。

尚未批准：新增公开channel/方法、payload收窄、错误目录、任何新依赖/生产依赖调整、内部错误传递变化、schema/DB迁移、全局Job/资源调度、任何后台/外发行为。

已批准变更及来源：用户“继续下一步”授权P01 SPEC产物；没有IMPLEMENT授权。Proposed ADR保持待审，不占用仓库正式ADR编号。

## 3. 变更

SPEC拟改模块/接口：见`../COMPATIBILITY-MAP.md`。未来小范围涉及shared版本契约、visual-ai IPC/确认子流程、Host/Storage窄错误事实、主/卡片Preload以及局部调用适配；当前一概未改。

本轮实际新增：Proposed ADR、CONTRACT-SPEC、COMPATIBILITY-MAP、MODULE-DEPENDENCIES、VALIDATION-PLAN、REFERENCES、README、本报告；4份schema文档、56个结构夹具与20项行为场景、兼容样本、模块/错误/需求/决定/阶段清单、工作区与文档校验资料。

状态/事务：未来以收到请求→鉴权→形状/范围检查→Host事务→通知→应答为样本；waiting/failed/cancelled/indeterminate/committed-with-warning分开。不加数据库表、不实施持久Job/Outbox，不让请求ID成为权限或永久去重权威。

保留调用方/唯一权威：VisualAiPanel、主Preload、卡片Preload及原Visual/OCR/Host API保持不变；唯一标签写入仍为Active Library Host的现有存储事务。旧Worker/Runtime/删除拒绝表不恢复。

外部副作用：仅读取S18/S24/S30及补充官方公开文档；未上传私有素材/源码、未安装依赖、未启动应用/模型、未接触真实库/缓存、未修改服务配置或终止用户服务。

## 4. 验证记录

本轮只验证文档可读、引用与状态一致性；**schema语义与行为测试未运行**。不得把下表文档PASS当作P01产品实现通过。

| T ID / 场景 | 证据等级 | 实际命令或检查方法 | 环境/输入范围 | 结果PASS/FAIL/NOT_RUN | 退出码与日志路径 |
| --- | --- | --- | --- | --- | --- |
| T01 文档/JSON与引用完整 | DOC | 新文档JSON解析、本地$ref/夹具ID/目录检查 | P01独立目录与现有源码路径 | PASS（以静态日志为准） | 0；`../evidence/STATIC-CHECKS.json` |
| T01 工作区与旧阶段保护 | SRC/DOC | Git index/diff与原有文本摘要前后比较 | 原工作区，不读Runtime数据 | PASS（以保护日志为准） | 0；`../evidence/WORKTREE-PRESERVATION.json` |
| T01/T22 模板和阶段状态 | DOC | 7节模板、P00不改/P01待审、未开始P02 | 独立阶段登记 | PASS（以静态日志为准） | 0；STATIC-CHECKS.json |
| T01/T21 Schema编译与56份夹具语义 | 计划L1 | 未运行Ajv或Python验证器 | 合成规格，待批准一致性环境 | NOT_RUN | 无 |
| T01 依赖AST规则/实际禁边 | 计划L1 | 未实现/执行依赖规则检查器 | 模块清单只是设计 | NOT_RUN | 无 |
| T02/T21 sender、scope、Host与事务 | 计划L2–L4 | 未运行应用/临时SQLite行为测试 | 无本轮业务输入 | NOT_RUN | 无 |
| T22 提交后通知/日志泄露/结果未知 | 计划L3/L4 | 仅编制故障与哨兵夹具 | 无日志系统部署 | NOT_RUN | 无 |
| 模型/平台/打包 | L5/L6 | 未执行 | 无 | NOT_RUN | 无 |

SPEC测试计划单列于`../VALIDATION-PLAN.md`。已有旧接口/模型历史通过不计为新契约通过；没有补写缺失exitCode。

## 5. 故障、安全与兼容

关库/取消/恢复：沿现有scope/lease边界，旧generation不得在重试时复活；提交后取消不能当作未提交。IPC响应丢失要核对结果，不编造Host已回复或自动重放。

用户状态：仅确认用户点击的有效建议；不改描述/OCR/原件/文件夹。重复确认复用现有关系事务而非新requestId表。

资源/授权：本样本无推理、资源许可或自动后台队列；合法JSON不授予任何库权。Python共同夹具验证不等于Worker可以调用确认接口。

兼容：保留旧ok/value、success/error和void返回；新错误不能直接替换旧字符串；unknown版本不降级执行。通知失败保留成功并给warning。

未覆盖：新schema方言实际引擎一致性、AST强制、平台包依赖、真正多窗口权限/并发、模型/硬件/语义质量、外部服务最终执行位置；全部保留待验。

## 6. 回退

停准入/drain：本轮未启业务执行，无需停止任何用户服务。未来实施回退只关闭新channel/消费面，并按现有Host关闭顺序收敛。

源码/配置：未修改；新增P01目录可独立归档，不使用git reset/clean/stash。原P00状态及现有公共契约保持。

数据兼容：无schema升级或真实写入，不需要数据回滚。未来已确认标签不能用源码回退删除。

临时制品：仅本轮文档生成/校验辅助脚本，无长期模型/应用进程，无素材临时副本。公开来源索引是文档，不是安装计划。

不可自动回退影响：无本轮业务副作用；未来运行后的提交事实不能因通知失败或切换开关而撤销。

## 7. 结论与接手

设计状态：**ready_for_review**；实施状态：**not_started**。

P01 SPEC交付完成；不能宣称新handler、validator或依赖规则已接线。无阻止设计出稿的源码缺失；实施前仍需审核ADR/字段、选择并锁定Python一致性环境、明确Ajv生产作用域及公共seam修改范围。

用户/责任人审核：仅有“继续下一步”的阶段续行授权，无P01设计签收或IMPLEMENT批准。

下一阶段：候选P02，未读取执行其任务卡、未开始；P01仍待审。P00报告原状态不改写，续行说明见本目录状态。

已更新路径：本目录各SPEC文档、schemas/fixtures、`../manifests/CURRENT-STATE.json`、stages、REQUIREMENT-TRACE、DECISION-TRACE；未更新仓库TASK或AGENTS。

**本阶段结束，停止；不自动进入P02。**
