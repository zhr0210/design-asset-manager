# 阶段报告：P05

## 1. 身份与范围

P05 / **SPEC**；2026-09-26；执行者Codex，用户/架构设计师待审。需求R11；DAM-A005/A006/A007目标决定；T06/T07/T08/T13。Proposed ADR P05-JOURNAL-COMMIT，仓库编号待分配。

工作区`codex/product-reassessment-20260905`，HEAD `3fa00df3bbb605478da6d0af18724d64021e723c`；开始时1425条Git状态：staged 18、unstaged 775、untracked 646（可重叠）。保护1835份既有文本和index/staged/unstaged diff摘要。仅新增本P05目录，不覆盖用户工作、前序报告或TASK。

读取：包最小交接/U01/当前状态/P05/模板/JOB-07/SEC-10（DATA-12沿前序约束）、P02/P04报告、源码Host/lease/control-store/readonly、视觉/OCR取消、下载Journal及相关测试/锁文件；S00前序导航，公开S23本轮核对。AGENTS当前内容已在上下文，CONTEXT按术语定位、TASK仅恢复点。

未取得：新Journal/DDL/claim/Outbox/恢复实现或运行日志，真实库状态、真实Provider幂等/费用/取消证据、实际SQLite版本/Windows/断电结果。

直接前置P02/P04均ready_for_review / not_started；用户“继续下一步”授权P05 SPEC，不是前序评审签收或IMPLEMENT批准。

## 2. 事实、提案与批准分开

核实源码事实见 [CURRENT-BASELINE](../CURRENT-BASELINE.md)：

- 正式视觉/OCR任务仍为内存状态，结果写库后才内存完成/通知；缺新统一持久任务与Outbox事务。
- Host已经持lease、drain inFlight后关闭；上层先invalidate控制器。下载Journal有immutable intent/CAS和专用恢复，但不代表AI队列已交付。
- **libraryGeneration从持久控制表读取，普通重开不保证变化**；leaseIdentity/notebookSession每次新建。P05修正P04目标中的简化假设，以当前Host session/lease与短时token共同阻止旧提交。
- 当前Managed要求DELETE模式；热sidecar会阻止打开，任务恢复须等数据库可安全打开。

设计提案：分离batch/job/attempt/physical；唯一requestGeneration/claim权威复用P04；Evidence/Job成功/Outbox同事务；重复消费幂等；远端结果未知单列；重开重新准入。

待审：schema版本/DDL/保留与配额、恢复默认策略、公共状态适配、Provider查询/成本协议、后续资源协调。批准仅为本阶段文档设计，无模型/云调用/真实库/公共接口变更。

## 3. 变更

实际新增：任务状态机、Journal/claim/commit、Outbox、恢复/授权、兼容迁移、来源/验证、ADR、报告与状态记录；3份契约文档（含1份draft-07事件schema），70条故障/幂等/消费/远端场景设计；P02增量登记提案及保护证据。

SPEC拟改：ActiveLibraryHost及生命周期组合增加分析准入/会话fence；visual-ai/OCR控制器委托Journal；P04存储同事务加入Job/Outbox；查询/Preload直接调用方适配新等待/未知状态。源码和测试本轮均未改。

单写权威仍为有效Managed Host连接；Worker不能写SQLite。下载/Capture保留原领域Journal。新DDL需P02审核且不能塞入v8精确profile；P04Evidence/用户覆盖不再复制。

外部副作用：仅读取SQLite官方公开文档；没有安装、启动服务、打开SQLite、读取模型/私有素材、操作真实库或付费API。

## 4. 验证记录

PASS仅指文档/保护。实际日志见 [STATIC-CHECKS](../evidence/STATIC-CHECKS.json)，计划另见 [VALIDATION-PLAN](../VALIDATION-PLAN.md)。

| T ID / 场景 | 证据等级 | 实际命令或检查方法 | 环境/输入范围 | 结果PASS/FAIL/NOT_RUN | 退出码与日志路径 |
| --- | --- | --- | --- | --- | --- |
| 契约/状态机声明/场景/引用 | DOC | `python3 /tmp/validate-dam-p05-documents.py`，标准库元数据检查 | 本阶段MD/JSON，无业务import | PASS（文档） | 0；STATIC-CHECKS.json |
| 工作区与前序保护 | DOC/SRC | Git摘要与原1835份文本hash对照 | 原工作区及本独立目录 | PASS（保护） | 0；WORKTREE-PRESERVATION.json |
| T06 claim/重试/强制重跑 | L1–L3计划 | 未运行新状态机/Host事务 | 24场景仅期望 | NOT_RUN | 无 |
| T07 关闭/崩溃/重开 | L2–L4计划 | 未创建DB或终止进程 | 20故障场景仅设计 | NOT_RUN | 无 |
| T08 Outbox与同事务效果 | L2–L3计划 | 未执行消费者/索引 | 14场景仅设计 | NOT_RUN | 无 |
| T13 远端未知/授权/费用 | L3/L5计划 | 未调用Provider | 12场景仅设计 | NOT_RUN | 无 |
| 事件schema语义/平台/真实模型 | L1/L5/L6 | 未运行Ajv/模型/平台包 | 无 | NOT_RUN | 无 |

历史测试及源码测试断言只作导航，不补退出码，不作为新队列已通过。文档状态引用检查不是状态机模拟或行为测试。

## 5. 故障、安全与兼容

同request重投不新建代次，force-rerun新request新代次；claim与token防旧worker；成功效果Job级唯一。unknown physical即使暂停重开也阻止盲重发。cancel不撤销已提交结果或未知费用。

重开可保持原libraryGeneration，必须新session/lease并清旧token准入；关库不能在quiescing后借普通run写中断标记，也不自等drain。热日志/损坏库先回P02恢复检查，不删除sidecar。

用户描述/确认标签/OCR修订沿P04；旧Evidence保留，不伪造历史Job。旧API保留兼容委托且单写；原Owner/sender/窗口范围检查继续。资源许可/云授权/库权限分别核对，队列状态不携带权限。

未覆盖：真实崩溃持久性、Windows、规模、实际云API和费用、真实模型取消/资源释放；不得据此放行生产。

## 6. 回退

本轮无业务或数据改动，独立文档可归档，不需停止用户服务。未来停新准入、撤销claim/token、drain已开始短事务，保留未完成意图、Evidence、Outbox及回执；不清日志修复。

新schema启用后只能用兼容代码回退功能，不能降user_version或旧二进制硬写。数据库备份恢复按P02明确后续用户改动损失并授权；git回退不是数据恢复。已外发/计费不受本地回退控制。

无本轮素材临时副本、DB/模型进程；仅文档生成与检查辅助。无本轮不可逆业务影响。

## 7. 结论与接手

设计 **ready_for_review**，实施 **not_started**。P05 SPEC所需状态机、Journal/claim/commit接口、Outbox协议与恢复故障夹具已交付，运行行为均未实现/未测试。

P02/P04仍待审，不妨碍设计起草，但不视为实施门槛已满足。用户仅授权继续本阶段；无ADR/DDL/实现签收。

下一候选P06，未开始；按新任务卡核对前置，接手本阶段关于session与generation的修订。更新路径仅本目录manifests/evidence/报告与设计，原包、P00–P04与根TASK未改。

**本阶段结束，不自动进入P06。**
