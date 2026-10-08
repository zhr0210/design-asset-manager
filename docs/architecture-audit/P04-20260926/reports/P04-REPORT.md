# 阶段报告：P04

## 1. 身份与范围

- 阶段/模式：**P04 / SPEC**；2026-09-26；执行者Codex，评审责任人用户/项目架构设计师待审。
- 需求/决定/测试：R09、R14；DAM-A003/DAM-A012目标参考；Proposed ADR P04-EVIDENCE-AND-OVERLAY（仓库编号未分配）；T02、T04、T05、T06。
- 工作区：`codex/product-reassessment-20260905`；HEAD `3fa00df3bbb605478da6d0af18724d64021e723c`。开始时1397条Git状态：staged 18、unstaged 775、untracked 618（可重叠）；保护1807份既有文本及index/staged/unstaged diff摘要。
- 保护：仅新增本P04目录，不覆盖业务代码/前序报告/AGENTS/CONTEXT/TASK，不自动暂存、提交或清理。源路径/指纹见evidence。
- 实际读取：包最小交接/U01/CURRENT-STATE/P04/模板/指定章节，S00相关章节，P02/P03报告与迁移登记，相关Host/visual-ai/OCR/查询/契约/Renderer/测试源与锁文件。AGENTS已有本轮提供的当前内容；CONTEXT术语与TASK恢复点按需查阅。
- 未取得：新实现、最终DDL/schema号、当前真实库/模型状态、新框架行为日志和平台证据；不补造已测试结论。
- 直接前置P02/P03：设计均ready_for_review，实施not_started。用户“继续完成长目标”授权按现有SPEC继续P04设计；不等于前序评审通过，不扩大到IMPLEMENT或P05自动执行。

## 2. 事实、提案与批准分开

已核实事实详见 [CURRENT-BASELINE](../CURRENT-BASELINE.md)：

1. 视觉综合Evidence一次写入四字段关联结果，当前摘要按完成后createdAt取最新；没有请求代次防先发后到覆盖。
2. 用户描述标志、confirmed标签关系已经独立保护；建议拒绝查询按evidence+label生效，正式visual-ai未提供reject入口，旧reject通道受限。
3. 专用OCR有独立v8证据/current、有效空文字和revision/session/source检查；整段修订重跑保留，但没有独立原修订基准或跨分块区域迁移。
4. 专用OCR空结果阻止视觉OCR回退；历史visual-ai-v1不能反推精确当时配方。

提案：每能力追加Evidence、Host持久请求代次/claim、独立current选择、用户覆盖；同一完整物理响应可分别验证提交；残缺JSON不救字段。保留旧current种子和真实未知信息，失败不清空，晚到旧任务不夺权。

待审：schema版本/DDL、sourceFamily和标签规范化、caption解除锁定保留文字、质量门槛、新公共投影兼容和P05claim所有权。只批准文档设计，本轮无公共seam修改、数据迁移、真实执行或默认后台分析批准。

## 3. 变更

实际新增：源码基线、证据/validator设计、选择器、覆盖规则、兼容迁移、验证计划、来源、Proposed ADR和本报告；2份draft-07提案schema、4份合成Evidence示例、24条验证用例设计、36条选择/覆盖场景、16条兼容场景；状态/需求/决定/P02登记增量提案及保护记录。

SPEC拟改边界：

| 模块 | 未来修改目的 |
| --- | --- |
| visual-ai-controller/ocr-controller | 创建/持有Host ticket，提交明确能力；兼容综合模式保留 |
| visual-ai-storage/ocr-storage/ActiveLibraryHost | 统一提交防护、幂等和用户状态；实际SQL留Main |
| active-library-asset-queries + shared契约/工作流 | 返回每能力来源和effective projection，不伪造旧综合Evidence |
| 当前Inspector/VisualAiPanel/搜索/AI文件夹直接调用方 | 消费逐能力状态；共享现有组件，不重画UI |
| P02迁移协调与精确schema检查 | 登记新feature与旧行保留；号/DDL评审后才编写 |

事务：每能力结果/指针同Host事务；用户编辑CAS；P05未落地前不声称Job/Outbox已一体化。旧IPC可保留委托，切换时只有一个生产writer。不创建全体未来模块，不改原件/组织/工作集所有权。

外部副作用：无。未联网、安装、打开SQLite、运行应用/合成服务/模型、访问真实资料库或读取权重。

## 4. 验证记录

PASS仅指文档静态一致性与保护，详细实际检查日志见 [STATIC-CHECKS](../evidence/STATIC-CHECKS.json)。

| T ID / 场景 | 证据等级 | 实际命令或检查方法 | 环境/输入范围 | 结果PASS/FAIL/NOT_RUN | 退出码与日志路径 |
| --- | --- | --- | --- | --- | --- |
| 文档契约/夹具/追踪 | DOC | `python3 /tmp/validate-dam-p04-documents.py`；JSON/元数据/引用/模板检查 | 新P04文档，不import业务 | PASS（文档） | 0；STATIC-CHECKS.json |
| 工作区保护 | DOC/SRC | Git index/diff摘要及既有1807份文本hash比对 | 原源码/文档及P04独立目录 | PASS（保护） | 0；WORKTREE-PRESERVATION.json |
| T05 schema与semantic validator | L1计划 | 未运行Ajv或新validator | 24用例/4示例仅期望 | NOT_RUN | 无 |
| T04/T06 selector/并发/取消/幂等 | L1–L3计划 | 未执行选择器/Provider/SQLite | 36场景仅设计 | NOT_RUN | 无 |
| T02/T04 旧读/用户保护/单写 | L2–L4计划 | 未运行Host/Electron/迁移 | 16兼容场景仅设计 | NOT_RUN | 无 |
| 真实模型/质量/平台/真实库 | L5/L6 | 未执行 | 无 | NOT_RUN | 无 |

新测试计划另列 [VALIDATION-PLAN](../VALIDATION-PLAN.md)。历史2026-09-24推理摘要来自S00/TASK与前序报告，本轮未重跑，不作为本阶段任何行为PASS。查找路径未命中已更正，不误报为测试结果。

## 5. 故障、安全与兼容

关库/取消使ticket失效；新请求递增generation，重试替换claim；过期响应拒绝，失败保留上次有效current。已提交成功不被通知失败改写，未知回执先查效果记录。

人工空caption/空OCR修订均是有效用户决定；confirmed关系不因AI重跑变动。OCR新分块不能按下标套旧修订；历史修订基准缺失明确unknown。旧视觉OCR空串不冒充专用OCR成功无文字。

旧记录只投影不批量复制/删除；新独立字段不伪装成同模型综合结果。Managed写权只在Host，Eagle/Legacy不混用迁移。任务记录与schema存在不携带模型执行/外发许可。

资源/平台/语义质量未验证；本阶段不调整模型参数或默认选择，不宣称恢复队列/Outbox/跨平台已交付。

## 6. 回退

本轮无业务或数据改动，无需停止服务/回退数据库；独立文档可归档，原工作区与前序文件保持。

未来切换先停止准入、撤销receipt、drain旧任务与in-flight，再切单一writer。新写开启前可回旧代码；开启后只能用理解新schema且保留全部能力状态的兼容代码，不能降user_version或用旧bundle覆盖。

投影回退须证明新有效结果、有效空、拒绝/固定/修订不会丢失；不具备表示能力时拒绝“无损回退”。恢复旧备份可能丢后续用户编辑，需明确范围批准，不用git回退冒充数据恢复。

临时制品仅文档生成/检查辅助；没有用户素材副本、DB或模型进程。本轮无不可自动回退的业务影响。

## 7. 结论与接手

设计状态：**ready_for_review**；实施状态：**not_started**。

P04 SPEC交付完成，Evidence/validator/当前选择/用户覆盖/兼容读与迁移交接均已细化。文档通过不代表新推理框架或独立提交已实现。

前置待审不阻塞本次设计起草，但阻止据此宣称IMPLEMENT可直接放行。用户审核记录仅续行SPEC，未签收ADR/DDL/运行结果。

下一候选P05。其直接依赖以任务卡重新核对；需接手单一requestGeneration/claim所有者和同事务成功/Outbox边界。P02/P03/P04均仍待审，P05未开始。

已更新本目录与manifests/CURRENT-STATE、stages、REQUIREMENT-TRACE、DECISION-TRACE、MIGRATION-ADDENDUM及evidence，未覆盖原包、P00–P03或根TASK。

**本阶段结束，不自动启动P05。**
