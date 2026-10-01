# 阶段报告：P02

## 1. 身份与范围

- 阶段ID/模式：P02 / **SPEC**。
- 时间/执行者/责任人：2026-09-25；Codex；用户/项目责任人待审。
- 需求/决定/测试：R13；DAM-A002/DAM-A006为目标参考，未实施Outbox；Proposed ADR `P02-SCHEMA-GOVERNANCE`（仓库ID待分配）；T02/T03/T07。
- 工作区：`codex/product-reassessment-20260905`；HEAD `3fa00df3bbb605478da6d0af18724d64021e723c`。开始时1339条状态，staged 18、unstaged 775、untracked 560（可重叠）。1745份原有文本和Git index/diff指纹保护。
- 用户已有修改保护：只新增独立P02目录；不覆盖P00/P01、AGENTS/CONTEXT/TASK或源码，不reset/clean/stash/add/commit。记录见`../evidence/WORKTREE-BEFORE.json`和结束保护JSON。
- 实际读取：P01报告/状态、P02任务卡、DATA-12及前序已读HOST-03/MIG-23、S00/S22/S23；AGENTS已有上下文、TASK恢复点、CONTEXT有关库/备份术语；package/lock；控制schema/inspection/materialization、各v1–v8 enable及领域保存/查询、副本恢复、App状态、Eagle独立index/Legacy只读、相关测试源；SQLite和锁定better-sqlite3官方资料。
- 未取得材料：实际用户库状态、当前原生SQLite运行版本、完整新矩阵/备份/恢复原始执行日志、真实断电/Windows/文件系统证据；本轮不尝试补取或运行。
- 前置设计：P01为ready_for_review，用户明确“继续下一步”授权P02 SPEC；不视作P01逐项接受或IMPLEMENT批准，旧报告状态保留。
- 前置实现：P00/P01/P02均not_started；先前受保护源码与当前无差异。

## 2. 事实、提案与批准分开

已核实源码事实及入口：

1. `initializeLibraryControlStore`/`initializeLibraryDataSchema`建立v1；v2–v8由各`enable*`累积创建，按明确业务触发。增量表/约束与事务见版本矩阵。
2. `inspectLibraryControlStore`与`assertLibraryDataSchema`检查已知版本的精确结构，未知高版本和损坏/不符状态不应写入。当前Managed为DELETE模式，不能称已运行WAL。
3. `readVariantIntent`只接受[4,5,6,7]；v8恢复列表却可列出pending副本（F02）。完成写函数本身没有该白名单。运行时影响尚未执行验证。
4. Eagle独立索引`initializeExternalConnectedLibrarySchema`先DDL后版本检查（F03），不能把Managed高版本零写边界泛化到它。
5. 当前未见所读升级调用链具备统一迁移前备份协调；App DB/lock DB/模型存储/Legacy不能共享Managed版本号。

设计提案：集中已知profile/能力与7项迁移登记；计划仅包含达到所需能力的缺失链；先保持原确认/首写事务，再逐条接入一致备份与恢复记录。能力存在、权限可写、模型ready分别表达。

尚未批准：新内部协调器实际接入、公共seam调整、备份目的地/保留配额、恢复工具、F02/F03代码修复、实际数据迁移。新schema版本与迁移历史表均不在本轮范围。

批准来源：本轮用户“继续下一步”，按当前MODE仅授权P02 SPEC。没有因阅读S22/S23而获得运行库备份/恢复权限。

## 3. 变更

SPEC拟改范围：Host内部schema查询/生命周期协调，现行精确inspection/materialization与各enable调用方的渐进委托；独立受控backup/操作记录Adapter；F02/F03待授权聚焦修复。没有修改这些文件。

实际新增：迁移登记ADR、版本/能力矩阵、统一编排设计、备份恢复、源码发现、验证计划、来源索引、本报告；7项登记和v1–v8机器矩阵；64能力组合、14临时库配方、30失败场景、12备份场景；阶段/需求/决定和源码指纹记录。

契约/状态/事务：inspect→plan→review→backup-verified→同步DDL+原领域首写→verify；DB与文件/记录不承诺全局原子。未知结果先核对；旧receipt不跨重启保留权限。v2保留先启schema再推理特例，其余按各原有外层事务。

调用方与唯一权威：既有业务IPC、UI、Host与领域存储接口原样保留。Managed唯一写权仍在Host；Eagle独立索引、App状态独立；Legacy无写权。不恢复旧全局DB或网页功能。

外部副作用：只有公开官方文档读取；无私有内容外发、无依赖安装、无应用/模型进程、无SQLite创建/打开、无真实资料库/Original/缓存操作。

## 4. 验证记录

静态文档检查不能替代SQLite行为测试。详细记录见`../evidence/STATIC-CHECKS.json`。

| T ID / 场景 | 证据等级 | 实际命令或检查方法 | 环境/输入范围 | 结果PASS/FAIL/NOT_RUN | 退出码与日志路径 |
| --- | --- | --- | --- | --- | --- |
| T03 版本/登记引用一致 | DOC/SRC | JSON解析、源码对象名与定义摘要、版本链/矩阵元数据一致性 | 当前源码文本/P02目录，无SQLite | PASS（以检查JSON为准） | 0；STATIC-CHECKS.json |
| T02/T07 权威/故障场景文档 | DOC | 场景ID、expected/NOT_RUN状态、引用/模板核对 | 合成配方，不物化DB | PASS（文档结构） | 0；STATIC-CHECKS.json |
| 工作区/旧阶段保护 | SRC/DOC | Git index/diff与原1745份文本摘要比对 | 原工作区及新增目录 | PASS（以保护JSON为准） | 0；WORKTREE-PRESERVATION.json |
| T03 v1–v8实际迁移/未知版本拒写 | L2/L3 | 未调用enable/inspection或SQLite | 无运行输入 | NOT_RUN | 无 |
| T02 三库/真实库/用户数据 | L2–L4 | 未打开/修改任何资料库 | 无 | NOT_RUN | 无 |
| T07 崩溃/备份/恢复/文件发布 | L2–L4/L6 | 仅设计故障夹具，未执行 | 无 | NOT_RUN | 无 |
| F02/F03运行复现与修复 | L2/L3 | 源码分支发现，未启动隔离实验 | 无 | NOT_RUN | 无 |
| 模型/Windows/打包/压力 | L5/L6 | 未运行 | 无 | NOT_RUN | 无 |

SPEC测试计划单列于`../VALIDATION-PLAN.md`；不存在临时DB文件或本轮迁移PASS。旧测试报告和脚本断言仅作历史/源码导航，不补退出码或全矩阵通过结论。

## 5. 故障、安全与兼容

关库/取消：迁移需在Host协调lane阻止新准入、等待此前inFlight，不能等待自身造成死锁；备份与DB事务前后分别处理取消，commit之后不得自动降级。此为待实施设计，未声称当前已有该入口。

恢复：检查实际source/target profile、领域回执、备份记录与文件归属；不根据日志phase盲重放，不删除热sidecar或未知文件。重开重新取得身份/lease，旧授权无效。

用户状态/重复：保留手工描述、确认标签、OCR修订、笔记、组织和工作集引用。DDL与原首条写入同事务；新migration ID不代替领域幂等。表结构的附带创建不启动其他AI/下载能力。

旧数据/接口：已知较高版本保持；未知高版本拒绝；旧二进制兼容需实际验证，不降低user_version冒充回退。Legacy只读，Eagle独立index，App不被设为v8。

未覆盖：当前库真实状态、原生SQLite/平台包、真正断电/损坏恢复、备份空间/耗时、外部并发写入、模型与语义质量。

## 6. 回退

停准入/drain：本轮无业务执行需要停止，不终止用户服务。未来迁移前后必须由Host协调，不能把close后的失效连接交给backup。

源码/配置：本轮无改动；独立P02目录可归档，原报告和用户工作保持。不用git回退恢复用户库。

数据回退：无本轮schema变化可回滚。未来区分代码入口回退、可重建索引恢复、数据库/文件备份恢复；旧备份会丢后续用户更改时需明确批准。

临时制品：仅文档/JSON配方与静态校验辅助，无临时DB、模型或应用进程。

不能自动回退影响：无本轮业务副作用；未来DB已提交或文件已发布不能假装由日志/通知失败自动撤销。

## 7. 结论与接手

设计状态：**ready_for_review**；实施状态：**not_started**。

P02 SPEC完成。完整版本登记、迁移/备份边界和失败配方已起草，实际协调器/备份/迁移仍未实现。F02/F03为新增源码发现，保留待验证、待授权修复状态。

用户审核：仅有继续P02设计授权，无ADR/实现/真实迁移签收。

下一阶段候选P03；本轮未开展。P01/P02待审不被伪造为reviewed；IMPLEMENT还需审批具体范围、备份/记录策略以及兼容影响。

已更新：独立P02文档、`../manifests/CURRENT-STATE.json`、stages/REQUIREMENT-TRACE/DECISION-TRACE与evidence；未更新仓库TASK或历史阶段。

**本阶段结束，停止，不自动进入P03。**
