# DAM 工程报告：架构评审与首轮实施前检查

评审日期：2026-09-26。被评材料文件名及报告标注日期为 2026-09-27，保留原标识，不据文件名推定执行时间。

**评审结论：建议保留现有总体架构和“独立标签”首轮切片；对任务放行条件作局部修订后，再由用户明确选择是否进入 IMPLEMENT。无需重做 P00–P27，也不建议继续无界扩充设计。**

本结论是设计建议，不是用户签收、业务代码验收或执行授权。本轮没有修改原上传材料、应用业务代码、Git 状态、真实资料库或服务配置；没有启动推理服务、下载模型、发送素材或调用付费 API。

## 1. 阅读和独立核查范围

阅读了外层 REPORT、实施 SPEC/PLAN、7 张任务草案、测试边界与源码导航；重点审阅 P02/P04/P05 的版本、会话、提交和恢复规则，以及资源、独立标签、自动计划、检索、运行时和全应用协调等阶段设计。检查了 P06–P27 的 22 个独立参考模型，并在本环境重跑其随附夹具。

| 核查对象 | 本次可确认的结果 | 不能由此推定 |
|---|---|---|
| 架构交接 ZIP | CRC 正常；SHA-256 与外层报告记录相符 | 应用安装包可用 |
| 内层 PACKAGE-CONTENTS 清单 | 402 个被登记文件的大小和 SHA-256 全部一致；无额外或缺失文件 | 原工作区源码没有改变 |
| P06–P27 参考模型 | 22 个模型、205 项案例全部通过，输出与包内既有记录一致 | 生产模块、SQLite 事务、真实硬件和模型通过 |
| 首轮 PLAN | 7 张任务；依赖均存在且无环；声明 28 条用户故事 | 每条故事已实现或获得签收 |
| 评审者追加反例 | 发现 P26 关闭后提交、P13 有界 aging 的参考模型覆盖缺口 | 当前 DAM 生产代码有同样漏洞 |
| 原源码指纹 | 未独立复核原工作区 | 不能依据包内 `sourceFingerprintsUnchanged=true` 自称审计过 53 个真实源码文件 |

独立结果见 [REVIEW-CHECKS.json](evidence/REVIEW-CHECKS.json)、[COUNTEREXAMPLES.json](evidence/COUNTEREXAMPLES.json)。报告本身也明确生产、新模型及平台测试均未运行，且包内不含应用源码或完整工作区，见 [原报告](sources/REPORT.md)第 4、8 节。

## 2. 建议保持不变的部分

### 2.1 总体结构

保留 Main/Library Host 单一写权、能力与执行策略分离、Evidence/current/用户覆盖分离、持久 Job/attempt/physical 区分、提交后 Outbox，以及资源许可与推理后端分离。上述是目标结构，不升级为已实现事实。

继续保留 Managed/Eagle/Legacy 的不同权限与数据权威，不用一个通用仓储抹平差异。资料库关闭、任务取消与运行进程终止仍是不同事件；不能将任务持久化当成跨会话授权。[依据：原报告第 3 节](sources/REPORT.md)、[P05 Journal](sources/architecture/P05-20260926/JOURNAL-CONTRACT.md)。

### 2.2 首轮只做独立标签

首轮采用受管库、手动选择、每批 1–8 份素材、已配置且在范围内获准的服务；不把 Runtime 自动安装、跨平台优化、自动后台、向量引擎或设计助手加入前置条件。这是验证新架构的有限切片，不是放弃这些长期能力。[依据：首轮 SPEC](sources/implementation-plan/SPEC.md)的 Solution、Implementation Decisions 和 Out of Scope。

### 2.3 以真实产品调用边界测试

认可控制器/Host 产品意图作为行为测试入口，内部注入 Provider 和时钟；事务通过真实临时资料库验证，权限和展示通过正式 Electron 路径验证。不要把私有辅助函数数量或参考模型 PASS 当作完成度。[依据：测试边界说明](sources/implementation-plan/TEST-SEAMS-AND-DECISIONS.md)。

## 3. 首轮应收紧的放行条件

以下是对现有方案的审阅建议；多数规则已在上层设计中出现，问题是必须落到足够早的任务验收点，不能只存在于另一份文档。

### REV-01｜单一标签写权必须在任务 03 首次写入前验收

**材料事实：**总 SPEC 已要求新旧路径共用 current/代次规则；任务 03 开始保存新标签，任务 04 才显式列出“新旧入口更新 current 标签只有一个权威，切换前 drain”。任务 03 已明确要求 requestGeneration/session/claim/cancel 防线，不能误说这些全部缺失。

**风险推导：**只拿任务 03 单卡执行的 AI 可能实现新表与新 writer，却把旧综合入口的适配留到 04，使中间态存在两个标签 current 选择规则。已有 source-of-truth 设计并不能自动消除这个实施顺序风险。

**建议：**将任务 04 中的“单写切换”最小子项前移至任务 03 的首次启用条件。任务 04 继续负责确认/拒绝与检索分类，不必整体前移，也不要新增 03 依赖 04 的环。

必须验证：

- 旧综合请求先发、新标签后发，新标签先完成时，旧综合迟到不能夺回当前标签。
- 新标签失败时保留上次**已提交**有效结果，不复活被新请求替代的旧在途请求。
- 旧综合历史仍按原契约可读；caption/prompt 等独立来源不被拼成虚构新 bundle。
- 单个用户动作不会新旧各发一次请求、各提交一次效果。

来源：[任务 03](sources/implementation-plan/draft-tickets/03-single-tag-result.md)、[任务 04](sources/implementation-plan/draft-tickets/04-find-review-tag-suggestions.md)、[P04 兼容迁移](sources/architecture/P04-20260926/COMPATIBILITY-MIGRATION.md)第 31–39 行。

### REV-02｜最小共享准入同样必须从任务 03 开始

**材料事实：**任务 03 要求有界预算；任务 05 明确提出新标签物理并发为 1，且与旧视觉入口共享有界准入。总 SPEC 已写明不能新旧各自无限叠加。

**建议：**在首次新旧可同时执行之前，明确共享准入对象、所有者、作用域与释放条件。任务 05 是扩大至批次并验证公平和进度，不是第一次补资源互斥。

第一轮只需实现能证明的最小能力：受控解码/预处理的字节与临时内存上限、请求槽位、等待/取消、与旧视觉入口共用的总准入。限额数值必须来自选定实现与安全夹具，不在此臆定整机 GB 值或叠加后的具体并发数字。

对于用户自管模型服务，只能说明 DAM 控制自己的输入处理和请求准入；不能宣布已控制该外部服务实际驻留内存或整机 GPU 占用。完整遥测、模型驻留、动态降速和公平调度继续保留为下一资源专题，不应在报告中标成已完成。

来源：[任务 03](sources/implementation-plan/draft-tickets/03-single-tag-result.md)、[任务 05](sources/implementation-plan/draft-tickets/05-bounded-batch-and-rerun.md)、[测试边界说明](sources/implementation-plan/TEST-SEAMS-AND-DECISIONS.md)、[P08](sources/architecture/P06-P27-SPEC-20260926/P08/DESIGN.md)。

### REV-03｜把 P05 会话纠正变为明确的当前契约入口

**材料事实：**P04 CURRENT-SELECTION 第 25 行仍写“重开新 generation”；P05 CURRENT-BASELINE 第 11–17 行已明确纠正：持久 `libraryGeneration` 在普通重开时可能不变，应另用当前 Host session/lease 身份。报告已诚实披露该纠正，并非遗漏发现。

**建议：**保留 P04 历史原文，在新版实施入口增加显式替代记录，而不是要求每个接手 AI 自己消解冲突。至少建立以下术语表：

| 名称 | 本轮应采用的语义 |
|---|---|
| libraryGeneration | 持久库控制信息；不假定每次重开变化 |
| hostSessionId / leaseIdentity | 当前打开/锁持有身份；重新打开必须重新绑定 |
| requestGeneration | 同素材、内容、能力的新请求顺序 |
| claimEpoch / attemptId | 当前尝试的认领和迟到提交防线 |
| attemptToken | 当前进程私有短时凭据；不从数据库恢复为授权 |

在任务 02/03 的机器验收项中加入“相同 libraryGeneration、不同新会话，旧 attempt 结果拒绝”。不得简单替换字符串或将四种身份合并为一个 version。

来源：[P04 选择器](sources/architecture/P04-20260926/CURRENT-SELECTION.md)、[P05 纠正说明](sources/architecture/P05-20260926/CURRENT-BASELINE.md)、[P05 Journal](sources/architecture/P05-20260926/JOURNAL-CONTRACT.md)。

### REV-04｜任务 02 的 schema、回退与现有功能兼容需要可判定结论

**材料事实：**下一 schema 版本、精确 DDL/profile、备份细节未最终确定；任务 02 包含这些设计与实现责任。当前包没有真实源码，不能在本次评审中安全指定“就用 v9”。

**建议：**在同一任务内分出两个审阅节点，不必扩成另一轮庞大架构：

1. 先核对当前工作区、确定增量结构/profile/版本、首写触发点、备份与失败语义，形成任务级决策。
2. 再实施持久意图和正式读取，执行临时库迁移/回滚/关开测试。

必须区分两种“安全拒绝”：旧程序遇到未知新 profile 拒写是保护；**新版程序升级自己支持的资料库后，把原本可用的笔记/OCR/工作集/下载全部拒绝，不能视为兼容验收通过。**现有业务能力应保持可用；确需功能限制则应单独说明影响并取得范围决定，不能只写“回归或安全拒绝”就结束验收。

回退也要分开：可退回兼容新 schema 的旧功能模式，不等于可启动旧二进制；恢复备份不能覆盖升级后新增人工内容而声称无损。

来源：[任务 02](sources/implementation-plan/draft-tickets/02-persist-reviewed-tag-intent.md)、[首轮 SPEC](sources/implementation-plan/SPEC.md)、[P02 schema 治理](sources/architecture/P02-20260925/SCHEMA-GOVERNANCE-SPEC.md)、[P04 回退](sources/architecture/P04-20260926/COMPATIBILITY-MIGRATION.md)。

## 4. 两个实际复现的规格模型覆盖缺口

原有 205 案例仍全部通过。下面的输入是本次评审者新增，不是包内原测试；它们说明参考模型没有表达某些目标不变量。**不能将它们写成生产故障。**

### REV-05A｜P26：关闭后仍能产生新效果

`P26/evidence/spec-model.py` 的 `commit` 分支只做效果 ID 去重，没有检查 closing/closed 或当前权限。追加输入：

```json
{
  "capacity": 1,
  "events": [
    {"op": "closing"},
    {"op": "close"},
    {"op": "commit", "id": "late-new-effect"}
  ]
}
```

实际返回的核心字段：

```json
{"events":["revoked","closed","new-effect"],"effects":1,"closed":true}
```

而 P26 文字设计要求未提交 AI 写入受撤权防护，已提交效果保留。该模型目前验证了“停止新准入、drain 后关闭、去重”，没有验证“关闭后不能产生新的业务提交”。

**补充要求：**在模型职责说明中标明缺失边界，或增加能够区分普通业务提交、已提交回执重读、关闭协调记录的状态验证；最终必须在真实 Host/临时库中重放相关竞争。不要粗暴实现“closing 后所有内部记录都不能写”，否则会阻断 P05 合法的关闭前暂停/unknown 持久记录。

来源：[P26 设计](sources/architecture/P06-P27-SPEC-20260926/P26/DESIGN.md)、[P26 原参考模型](sources/architecture/P06-P27-SPEC-20260926/P26/evidence/spec-model.py)、[追加反例实录](evidence/COUNTEREXAMPLES.json)。

### REV-05B｜P13：有上限的 aging 不等于无饥饿调度

原参考模型排序主项为 `priority + min(age, ageCap)`，其次才看 locality。评审使用的合成条件是：前台优先级 10、等待年龄 0；后台优先级 0，年龄递增；ageCap=5；两者均可运行且预算充足，每轮出现新的前台任务。

运行 100 个选择轮次，后台被选择 0 次。原因可直接由公式推导：后台最高得分 5，始终小于新前台的 10。这里 10/5/100 只是反例参数，不是建议生产配置。

P13 文字设计已经提出后台 fair-share/配额，但模型没有实现该机制。因此该模型不足以验证后台最终会得到资源。

**补充要求：**在实施完整智能调度前，补充可检验的后台保底份额、配额/轮转或其他明确机制，并说明保证成立的条件。系统压力一直不允许执行时，不能承诺后台仍必须完成。此项不必阻塞首轮手动单并发标签，但必须是后续 P13 的放行条件。

来源：[P13 设计](sources/architecture/P06-P27-SPEC-20260926/P13/DESIGN.md)、[P13 原参考模型](sources/architecture/P06-P27-SPEC-20260926/P13/evidence/spec-model.py)、[追加反例实录](evidence/COUNTEREXAMPLES.json)。

## 5. 不阻塞首轮、但应现在登记的设计风险

### REV-06｜P16 全局投影版本可能让后台分析与分页互相干扰

**来源事实：**P16 的游标绑定 `projectionRevision`，该版本变化即 `refresh-required`；P11 又计划持续后台提交标签、描述、OCR。[P16](sources/architecture/P06-P27-SPEC-20260926/P16/DESIGN.md)、[P11](sources/architecture/P06-P27-SPEC-20260926/P11/DESIGN.md)。

**设计推导，尚未实测：**若任何素材 AI 字段更新都递增该全局版本，用户翻到下一页前可能反复被要求刷新。不能以强一致为名，让默认后台分析阻碍浏览。

建议在 P16 实施前明确“查询成员/排序版本”与“行展示版本”的关系。可比较按受影响查询失效、有限生命期结果 ID 快照等方案；权限撤销、Trash、内容不适用仍要在每页访问时即时检查，不能通过维持旧快照泄漏内容。不要现在引入长期持有的数据库写事务解决翻页。

验收场景：持续提交与当前分页成员/排序无关的 AI 结果时，用户仍能完成分页；真正改变命中集合/排序的更新有明确刷新或快照策略；旧权限立即失效。

### REV-07｜源码报告中的两项发现必须独立追踪，不能当已复现缺陷

P02 F02 记录 v8 副本恢复 reader 的版本白名单遗漏；F03 记录 Eagle 独立索引在拒绝未知版本之前执行 DDL 的检查顺序。原作者已明确没有运行复现。[P02 SOURCE-FINDINGS](sources/architecture/P02-20260925/SOURCE-FINDINGS.md)第 11–28 行。

建议分别建立最小临时数据复现及修复任务。F02 与活动库版本兼容矩阵有关，不能在新 schema 扩展时忽略；F03 是 Eagle 独立域问题，不应成为手动标签的全局前置，也不应夹带真实 Eagle 操作。不能从分支推导升级成“用户数据已损坏”。

### REV-08｜默认三能力与历史 Embedding 基线需要明确替代记录

首轮 SPEC 已发现旧 ADR 的自动基线包含 Embedding，而当前目标基础计划为 tags/caption/ocr。此前用户已明确默认基础三项、反推手动，目标架构又把 Embedding 与语义检索启用策略关联；无需再把同一产品问题原样抛回给用户。

在后续 P11/P17 实施时，记录新决定适用的范围：基础默认计划采用三项；Embedding 在语义检索明确启用及条件满足后执行；保留旧 ADR 历史并标记相应条款被替代，不把历史向量或未完成任务静默删除。[首轮 SPEC Further Notes](sources/implementation-plan/SPEC.md)、[P11](sources/architecture/P06-P27-SPEC-20260926/P11/DESIGN.md)。

## 6. 建议保留的 7 任务结构与放行点

| 任务 | 建议 | 放行条件 |
|---|---|---|
| 01 Provider 兼容抽取 | 保留，作为首个代码切片 | 明确 IMPLEMENT 后，限定真实仓库；原综合/反推、人工保护、有界重试等回归有证据；无 schema 变化 |
| 02 持久标签意图 | 保留，内部先做版本/备份决策节点 | REV-03/04 已写明；新 profile 不破坏同库现有功能；重复请求和重开只读可验证 |
| 03 单素材成功保存 | 保留，前移两个门槛 | 单写切换与最小共享准入已经生效；session/claim/cancel、一次事务、旧结果保护都验收 |
| 04 检索/分类/确认/拒绝 | 保留 | 复用已经唯一化的 current；拒绝来源族与规范化版本明确；不扩大旧拒绝语义 |
| 05 有界批次与重跑 | 保留 | 扩展既有准入而不是首次补准入；并发、乱序、部分成功、取消竞争有真实临时库证据 |
| 06 关开与中断恢复 | 保留 | 只续未完成；旧 session 不复活；outcome_unknown 不盲重发；热日志安全拒绝与应用级恢复分别报告 |
| 07 全链验收 | 保留 | 正式 Electron 与临时库、新能力/旧能力兼容通过；真实模型条件不足仍 NOT_RUN；不自动放行 Windows/签名/真实库 |

任务 04 与 05 仍同依赖 03，无需人为新增相互阻塞。后续完整资源主题需真实测量，先复用本轮小准入边界，不推倒重写标签 Job。

## 7. 下一轮交给编码 AI 的最小范围

建议下一轮只做“实施前收敛”，而不是重复完成 28 阶段：将 REV-01–04 落入新版首轮任务验收；登记两个参考模型反例与 P16 风险；生成当前术语与替代关系；在有源码的环境核对任务 01 的实际入口和候选测试。完整可复制提示词见 [02-NEXT-AI-PROMPT.md](02-NEXT-AI-PROMPT.md)。

本次未切换 IMPLEMENT。用户明确切换后，建议只启动任务 01，在其行为回归与变更审查完成后再进入 02；不要把“整套框架评价积极”理解为全部源码、数据库、云端及发布操作都已获得授权。

## 8. 交接与证据保存

本评审包中 `sources/` 为相关输入的字节一致副本，不是经过修订的执行规格；其来源路径、大小与 SHA-256 在 [SOURCE-COPIES.json](evidence/SOURCE-COPIES.json)。`evidence/Pxx-REPLAY.json` 为本次独立重放，保留模型和夹具摘要。

[review_checks.py](evidence/review_checks.py) 可在原工程报告已安全解包且内层 ZIP 解包至 `architecture/unpacked` 的条件下重放。脚本只执行本次已检查的参考模型，不导入生产模块。运行示意：

```text
python -B review_checks.py <已解包工程报告目录> <新的证据输出目录>
```

报告所列分支/HEAD 与源码指纹是原作者的工作区定位信息；必须取得对应工作区补丁/源码快照才能重现源码现状。哈希用于核对，不包含缺失文件的内容。参考资料的新版本核验与真实平台选择不在本次材料评审范围内。
