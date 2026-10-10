# DAM 任务主台账

整理日期：2026-10-11；证据截至2026-10-10，源码基线 `a1faf93` / `codex/macos-migration`。本页独占跨系列任务状态与剩余条件。[CURRENT-STATE](../handoff/CURRENT-STATE.md)独占可用能力/启动/身份，[TASK](../../TASK.md)只记录正在做的工作。

整理不新增产品PASS、任务授权或远端关闭。Mac适用范围已收敛，不等于WC01、A–F全平台、DualClient父#23、LocalAI父#24或商业发行全部完成。历史源码/合成/真实UI/模型证据各有平台、构建与范围，不混成一个verified。

## 使用与编号

- 每个用户结果/消费者只有一个当前责任ID；下方旧编号仅映射，不另建重复队列。多ID关联同结果时，共用同一证据但逐条核对差额。
- `DualClient:T01–T23`来源父#23；`LocalAI:T01–T23`来源父#24。T号是本地拆票号，不能当GitHub子issue号，未发布子票不伪造链接。
- `WC:W01–W06`是WC01原六卡；`WC:H01–H22/C01–C03/UX01–UX03`是后续模块/故障对账。WC:C01与A–F:C检索不同。
- `RUX:U01–U32/A01–A03`是旧交互验收编号；`Deferred:U01–U12`是后来的待测表。相同数字不合并。RUX明细按历史规格读，不杜撰缺失标题或已验状态。
- `SCOPED_PASS`只用于明确范围已成立，整个责任目标可继续PARTIAL；`NOT_ASSESSED`表示尚无完整证据，不能推断完全无实现。延期、取消和工具/设备缺口分别保留。

## 当前责任与接续

下列各行都继承普通入口→实际执行→正确结果→保存重开→相关失败/取消/原件保护要求；记录“已验”指对应证据版本，不自动转记到后续产物。

<a id="ai"></a>
### AI · 标签、描述、OCR与基础分析

- 分支：`codex/macos-migration`。状态：**Mac限定范围已验；完整矩阵PARTIAL**。
- 已验范围：175三图后台/一键3/3、人工保护、20次保存；T23修订与取消/重开保持。
- 剩余条件：多样中文OCR、反推/细化及声明Provider质量，批量部分失败/双端冲突与恢复完整条件。
- 证据：[AF-MACOS-20261010.md](../history/task-consolidation-20261011/handoff/AF-MACOS-20261010.md)；[adf175-final-t23-readback-protection.json](../checkpoints/af-macos-20261010/adf175-final-t23-readback-protection.json)。
- 下一动作：按声明能力固定公开样本/质量标准，再补差额，已验三能力不重做。

<a id="model"></a>
### MODEL · 模型来源、安装、资格与运行

- 分支：`codex/macos-migration`。状态：**Mac最小组合已验；完整矩阵PARTIAL**。
- 已验范围：ModelScope 2B CPU/Metal/hybrid、既有4B限定结果；175停用/实际退出/重新验证恢复连接。
- 剩余条件：8B/其他声明模式、撤信任/损坏/完整来源与安装恢复的新产物矩阵；签名目录资格分开。
- 证据：[CURRENT-STATE.md](../handoff/CURRENT-STATE.md)；[AF-MACOS-20261010.md](../history/task-consolidation-20261011/handoff/AF-MACOS-20261010.md)。
- 下一动作：核对预算后只准备适用组合，禁止国际模型回退；不把下载当资格。

<a id="resource"></a>
### RESOURCE · 共享资源、忙闲、取消和物理释放

- 分支：`codex/macos-migration`。状态：**Mac适用运行已验；完整调度PARTIAL**。
- 已验范围：统一内存不重复计账，4B内存拒绝留旧2B，实际进程退出/驻留许可保护。
- 剩余条件：公平配额、电源/热状态、最低配置、长负载与故障/OOM联合；Windows原页压力另见NATIVE。
- 证据：[AF-MACOS-20261010.md](../history/task-consolidation-20261011/handoff/AF-MACOS-20261010.md)；[LOCAL-AI-NON-UI-CLOSURE-20261007.md](../handoff/LOCAL-AI-NON-UI-CLOSURE-20261007.md)。
- 下一动作：同硬件/输入固定阈值补测，UNKNOWN不早释放，资源恢复不复活撤权。

<a id="search"></a>
### SEARCH · 文字、语义、以图、索引与解释

- 分支：`codex/macos-migration`。状态：**Mac限定范围已验；完整质量PARTIAL**。
- 已验范围：T23 189图片覆盖/190词法；中英/混合/以图；175规模库明确仅3图，向量/任务重开保持。
- 剩余条件：固定排名质量集、跨语言/混合硬条件完整矩阵、空间升级/回滚、损坏恢复、感知重复与完整谱系。
- 证据：[AF-MACOS-20261010.md](../history/task-consolidation-20261011/handoff/AF-MACOS-20261010.md)；[c175-selected-three-real.json](../checkpoints/af-macos-20261010/c175-selected-three-real.json)。
- 下一动作：匹配已有证据后仅执行缺失场景，不给万条库自动回填。

<a id="library"></a>
### LIBRARY · 素材权威、组织、草稿、旧库与恢复

- 分支：`codex/macos-migration`。状态：**正式路径已有证据；完整恢复PARTIAL**。
- 已验范围：Copy/人工优先/原件保护/正常切库；万条33条逐项恢复；真实27MB v1/v12工程恢复。
- 剩余条件：Legacy旧格式只读、损坏副本、真实UI备份恢复；所有草稿类型/多端冲突/断连迟到与Mac锁卷矩阵。
- 证据：[AF-MACOS-20261010.md](../history/task-consolidation-20261011/handoff/AF-MACOS-20261010.md)；[MACOS-REMAINING-ACCEPTANCE-20261008.md](../history/task-consolidation-20261011/handoff/MACOS-REMAINING-ACCEPTANCE-20261008.md)。
- 下一动作：先准备公开可恢复副本，经正式入口补验；现代v1副本不冒充Legacy。

<a id="download"></a>
### DOWNLOAD · 素材下载、磁盘空间与恢复

- 分支：`codex/macos-migration`。状态：**完整消费者未验；PARTIAL**。
- 已验范围：已有代码/持久恢复历史，模型传输和副本交付只证明各自消费者。
- 剩余条件：素材下载自己的取消/未知提交/重开、磁盘不足/清理/来源落库与恢复。
- 证据：[MACOS-REMAINING-ACCEPTANCE-20261008.md](../history/task-consolidation-20261011/handoff/MACOS-REMAINING-ACCEPTANCE-20261008.md)；[WC01-FAILURE-QUEUE-20261003.md](../handoff/WC01-FAILURE-QUEUE-20261003.md)。
- 下一动作：限定公开素材和可恢复副本补独立下载路径，不借模型下载替代。

<a id="work"></a>
### WORK · 工作集、视频、参考帧与文件交付

- 分支：`codex/macos-migration`。状态：**Mac适用范围已验；原生差额另列**。
- 已验范围：官方实片取帧210.123→210.500、来源备注、同包重开；175新副本Preview实际文档与SHA同源。
- 剩余条件：全部交付格式/取消/系统接收声明矩阵；工作集草稿冲突差额。
- 证据：[AF-MACOS-20261010.md](../history/task-consolidation-20261011/handoff/AF-MACOS-20261010.md)；[adf175-final-t23-readback-protection.json](../checkpoints/af-macos-20261010/adf175-final-t23-readback-protection.json)。
- 下一动作：复用现有工作集/实片证据，剩余Native条件到NATIVE，不新造重复窗口。

<a id="native"></a>
### NATIVE · 原生窗口、跨应用、外屏与平台联合

- 分支：`codex/macos-migration`。状态：**延期/设备缺口；NOT_RUN条件保留**。
- 已验范围：当前Mac部分点击/Preview/拖出历史证据；Browser/Native结论分开。
- 剩余条件：真实断网；Windows指定原Chrome页压力；外屏/拔插；最终完整置顶/隐藏/拖单多图与ZIP/托盘/快捷键。
- 证据：DEFERRED原U01–U05；[MACOS-BUGFIX-DELIVERY-20261010.md](../history/task-consolidation-20261011/handoff/MACOS-BUGFIX-DELIVERY-20261010.md)。
- 下一动作：按用户安排网络窗口/Windows机器/外屏；不用Mac样本关闭Windows项。

<a id="auth"></a>
### AUTH · Pi账号生命周期与安全存储

- 分支：`codex/macos-migration`。状态：**限定登录/协议有历史证据；完整矩阵PARTIAL**。
- 已验范围：既有正规账号入口/应用内部保存、Pi固定Node/SDK/seal；Agent不读秘密。
- 剩余条件：拒绝/取消/离页/刷新串行/重启/锁定/撤销/OS安全存储及多端权限完整矩阵。
- 证据：[WC01-PI-REASONING-20261005.md](../handoff/WC01-PI-REASONING-20261005.md)；[LOCAL-DUAL-CLIENT-IMPLEMENTATION.md](../history/task-consolidation-20261011/product/LOCAL-DUAL-CLIENT-IMPLEMENTATION.md)。
- 下一动作：只在正规入口由用户输入账号；公开非敏感状态核对，不读取Cookie/token/回调。

<a id="ui"></a>
### UI · 信息架构、视觉与交互一致性

- 分支：`codex/macos-migration`。状态：**普通入口限定已验；完整UX PARTIAL**。
- 已验范围：共享AI分类/配置器、正式选择/审查与可见错误；RUX已有历史实现。
- 剩余条件：golden历史FAIL/STALE、焦点/键盘/缩放/长内容/主题/减少动态、反馈位置完整条件。
- 证据：[WC01-FAILURE-QUEUE-20261003.md](../handoff/WC01-FAILURE-QUEUE-20261003.md)；[LOCAL-DUAL-CLIENT-IMPLEMENTATION.md](../history/task-consolidation-20261011/product/LOCAL-DUAL-CLIENT-IMPLEMENTATION.md)。
- 下一动作：用最新批准DESIGN固定参考与尺寸，不降阈值；旧无效参考先审适用性。

<a id="governance"></a>
### GOVERNANCE · 文档、失败队列、源码与证据归属

- 分支：`codex/macos-migration`。状态：**本次任务文档整理；非产品验收**。
- 已验范围：候选/源码已整合；单台账和编号映射；已关闭故障引用原版本证据。
- 剩余条件：未确认独立复核、安全删除代码/覆盖迁移条件；远端两平台CI仍失败，Windows与远端未复验。
- 证据：TASK-REGISTRY及CONSOLIDATION；[latest-main-ci-recheck.json](../checkpoints/af-macos-20261010/latest-main-ci-recheck.json)。
- 下一动作：仅处理当前真实故障，保留历史FAIL；不自动push/发布或重跑全部历史。

<a id="scale"></a>
### SCALE · 规模、并发、迁移和普通候选

- 分支：`codex/macos-migration`。状态：**Mac万条限定已验；发行/压力差额保留**。
- 已验范围：10018条，91样本1801.5秒；三批9新副本18效果；暂停/正常退出/物理退出/重开无重发；原10000全字段/4.35GB SHA同。
- 剩余条件：持续推理压测、更长负载、十万合成/真实多样规模、完整旧schema故障迁移/用户UI恢复；不能借Mac关Windows。
- 证据：[f175-30min-and-reopen-real.json](../checkpoints/af-macos-20261010/f175-30min-and-reopen-real.json)；[f175-original-row-protection.json](../checkpoints/af-macos-20261010/f175-original-row-protection.json)。
- 下一动作：30分钟含空闲且只有3种图片内容；下一批先冻结规模/多样性/阈值。

<a id="eagle"></a>
### EAGLE · Eagle配对、索引、写回与冲突

- 分支：`codex/eagle-integration`。状态：**用户延期；PARTIAL**。
- 已验范围：8cf60c7隔离方向调整与端口修复；原件权威/Journal边界保留。
- 剩余条件：正规配对、实际读取/写回/冲突/撤权/断连恢复/重开；测试库内容已获准。
- 证据：[BRANCHES.md](../handoff/BRANCHES.md)；[EAGLE-E-20261008.md](../handoff/EAGLE-E-20261008.md)。
- 下一动作：在Eagle分支按新方向调整；不把旧插件包或代码接线当真实配对通过。

<a id="assistant"></a>
### ASSISTANT · 受控设计助手提议工作集

- 分支：`后续批次，未创建新分支`。状态：**完整闭环未取得证据；NOT_ASSESSED**。
- 已验范围：C检索/D工作集提供基础。
- 剩余条件：需求→条件→检索→证据解释→工作集提议→用户确认、安全窄工具与失败原子性。
- 证据：DP08历史规格；PRODUCT-FOUNDATION。
- 下一动作：另定首个设计参考任务，不以手动工作集代替助手，也不推断完全无代码。

<a id="mobile"></a>
### MOBILE · 移动收集、云推理与多端同步

- 分支：`后续批次，未创建新分支`。状态：**未来目标；NOT_ASSESSED**。
- 已验范围：桌面双客户端只有可复用语义。
- 剩余条件：移动离线收集/编辑、冲突/删除标记/设备撤权、同步与云推理独立权限及成本。
- 证据：DP10历史规格；PRODUCT-FOUNDATION。
- 下一动作：另定移动首版范围；用户取消窗口云分享不等于取消移动同步。

<a id="openai"></a>
### OPENAI · 订阅接入的独立协议/发行资格

- 分支：`后续批次，复用既有Pi边界`。状态：**部分与AUTH重合；独立资格未关闭**。
- 已验范围：已有Pi合法路径/限定调用。
- 剩余条件：固定应用身份/注册、账号刷新补偿、推理资格与开源/商业分发边界；厂商最新规则需单独核验。
- 证据：EXT01历史规格；WC01-PI-REASONING。
- 下一动作：不由一次登录/本地分析授资格，不自动启用或调用新账号。

<a id="google"></a>
### GOOGLE · Google受控传输支线

- 分支：`后续批次，未创建新分支`。状态：**独立资格未关闭；NOT_ASSESSED**。
- 已验范围：已有安全限制保留。
- 剩余条件：固定SDK或窄传输的目的地/重定向/字节/取消/重试及实际服务资格。
- 证据：EXT02历史规格。
- 下一动作：先按固定源码定支持边界，不移除approvedFetch或静默打开Provider。

<a id="release"></a>
### RELEASE · 平台安装、开源、签名与商业发行

- 分支：`后续批次，未创建新分支`。状态：**用户延期；NOT_RUN条件保留**。
- 已验范围：Mac依赖/ABI/未签名普通候选可启动，source/产物可追溯。
- 剩余条件：品牌、双平台安装升级卸载保库、签名/公证、许可供应链/手册/发布与最低配置质量门。
- 证据：[RELEASE-ACCEPTANCE.md](../product/RELEASE-ACCEPTANCE.md)；[BRANCHES.md](../handoff/BRANCHES.md)。
- 下一动作：另定发行权限/费用/平台范围；构建成功不等于可发行。

<a id="window-ext"></a>
### WINDOW-EXT · 工作浮窗完整交互扩展

- 分支：`后续批次，保留现有架构`。状态：**用户延期；云上传分享CANCELLED**。
- 已验范围：现有局部副本/拖出成果按各构建保留。
- 剩余条件：通用暂存、文字/链接、文件承诺、监视/系统入口/PDF等新增用户结果。
- 证据：[DROPOVER-FEATURE-CATALOG-20261009.json](../history/handoff-snapshots/macos-20261009-20261010/DROPOVER-FEATURE-CATALOG-20261009.json)；DEFERRED原U10。
- 下一动作：另选范围实施后验；不因整理复刻第三方所有功能。

## 原任务编号映射

以下仅保留关联、原目标和依赖；完成范围一律回到上方责任ID，不复制状态。

### A–F / WC原六卡 / DP / RUX / EXT

| 来源编号 | 对应责任 | 仍需区分的条件 |
| --- | --- | --- |
| A | AI / RESOURCE / AUTH | 独立能力、批量、真实Provider与恢复分别验 |
| B | MODEL / RESOURCE | 每平台/模型/量化/模式分别绑定 |
| C | SEARCH | 质量/代际/硬条件不由覆盖率替代 |
| D | WORK / NATIVE | Browser不替原生，手工工作集不替助手 |
| E | EAGLE | 用户延期，独立分支 |
| F | SCALE / LIBRARY / RELEASE | 规模与普通包不替签名发行 |
| WC01（父级） | GOVERNANCE / RESOURCE / MODEL / AUTH / UI | 原Windows六卡与后续失败差额按各证据保留PARTIAL |
| WC:W01 | GOVERNANCE / SCALE | WIP/候选/source归属 |
| WC:W02 | RESOURCE / AI | 平台能力不可用与实际unsafe/UNKNOWN不同 |
| WC:W03 | MODEL / AUTH / SCALE | target/ABI/Pi seal/default生产入口 |
| WC:W04 | GOVERNANCE | 单current与历史边界 |
| WC:W05 | GOVERNANCE / UI | 具体失败、runner、golden不降标准 |
| WC:W06 | GOVERNANCE / NATIVE | 最终候选、复核、交付与停止 |
| DP01 | GOVERNANCE / AI / AUTH | 旧基线/验收入口不整轮重做 |
| DP02 | AI / AUTH / OPENAI | 真实本地与API、OS凭据分别绑定 |
| DP03 | AI | 独立描述/基础组合/逐能力保存 |
| DP04 | RESOURCE / SCALE | 唯一账本、成本与性能完整条件 |
| DP05 | MODEL / AI / RESOURCE | 验证组合、后台三能力与切换 |
| DP06 | SEARCH / SCALE | Host中文/大库/行刷新分页 |
| DP07 | SEARCH | 向量/混合/谱系/重复候选 |
| DP08 | ASSISTANT | 需求到提议并确认保存，不是手动D |
| DP09 | RELEASE / MODEL / GOVERNANCE | 平台准备可复用，发行门独立 |
| DP10 | MOBILE | 移动/同步不是loopback双客户端 |
| RUX:R00 | GOVERNANCE / LIBRARY | 冻结现场/身份/恢复 |
| RUX:R01 | UI | 入口/功能归属与CU基线 |
| RUX:R02 | UI / LIBRARY | 统一导航/返回/全局与库范围 |
| RUX:R03 | AUTH | 认证诊断/拒绝/完整账号生命周期 |
| RUX:R04 | UI / AI / MODEL | 唯一配置器与消费者迁移 |
| RUX:R05 | GOVERNANCE | 有证明删除/生产图/覆盖迁移，非本轮源码删除 |
| RUX:R06 | GOVERNANCE | 测试规范/文档/产物边界 |
| RUX:R07 | UI / AUTH / NATIVE | 正式屏幕路径与真实认证分别验 |
| RUX:R08 | GOVERNANCE | 分层签收/增量交接/停止 |
| EXT01 | OPENAI / AUTH | 独立订阅协议/发行资格 |
| EXT02 | GOOGLE | 独立受控传输，不自动解禁 |

### WC后续模块/故障对账

历史已修故障不重开；最新Mac局部证据仅补其对应条件。

| 来源编号 | 原消费者/故障 | 对应责任 |
| --- | --- | --- |
| WC:H01 | local transitions | LIBRARY / NATIVE |
| WC:H02 | active-library-host | LIBRARY / SCALE |
| WC:H03 | legacy-readonly-workspace | LIBRARY |
| WC:H04 | persistent-download | DOWNLOAD |
| WC:H05 | download-space-management | DOWNLOAD |
| WC:H06 | visual-ai-download | DOWNLOAD / AI |
| WC:H07 | visual-ai-provider | AI / OPENAI / GOOGLE |
| WC:H08 | tag-batch | AI |
| WC:H09 | independent-tag-intent | AI / LIBRARY |
| WC:H10 | tag-decision | AI |
| WC:H11 | tag-recovery | AI / LIBRARY |
| WC:H12 | tag-execution | AI / RESOURCE |
| WC:H13 | background-analysis | AI / RESOURCE / SCALE |
| WC:H14 | background-ocr-runtime-observation | AI / RESOURCE |
| WC:H15 | ai-acceptance | AI / MODEL |
| WC:H16 | background-ocr | AI |
| WC:H17 | model-library-workspace | MODEL |
| WC:H18 | pi-auth-prompts | AUTH / UI |
| WC:H19 | pi-runtime | AUTH / MODEL |
| WC:H20 | workspace-motion | UI / NATIVE |
| WC:H21 | pi-visual | AI / OPENAI |
| WC:H22 | gallery parity | UI |
| WC:C01 | codec isolation | RESOURCE / AI |
| WC:C02 | visual admission | RESOURCE |
| WC:C03 | context router | GOVERNANCE |
| WC:UX01 | probe自身保存误报冲突 | UI / AUTH |
| WC:UX02 | 原生窗口 | NATIVE |
| WC:UX03 | 错误位置反馈 | UI |

### 双客户端切片（父#23）

原规格仍保留目标/依赖，旧实施矩阵仅为原候选证据。

| 来源编号 | 原用户结果 | 对应责任 |
| --- | --- | --- |
| DualClient:T01 | 保留桌面行为，扩展共享业务入口 | LIBRARY |
| DualClient:T02 | 双入口连接唯一 Host，浏览器可普通启动 | LIBRARY / NATIVE |
| DualClient:T03 | 页面内选择目录，创建和打开素材库 | LIBRARY |
| DualClient:T04 | 多文件复制入库，预览并检索找回 | LIBRARY / SEARCH |
| DualClient:T05 | 文件夹、色板与配色复用 | LIBRARY / WORK |
| DualClient:T06 | 标签、别名层级与 AI 文件夹 | LIBRARY / AI |
| DualClient:T07 | 回收站、恢复与失败收录恢复 | LIBRARY |
| DualClient:T08 | 描述冲突与本机草稿恢复闭环 | LIBRARY |
| DualClient:T09 | 图片笔记保存、冲突与恢复 | LIBRARY / WORK |
| DualClient:T10 | 工作集内容编辑、引用与草稿恢复 | WORK / LIBRARY |
| DualClient:T11 | 浏览器控制原生工作窗口与单素材卡片 | NATIVE |
| DualClient:T12 | 图片工具审查与派生结果保存 | WORK |
| DualClient:T13 | 共享设置、模型摘要与构建诊断 | UI / MODEL |
| DualClient:T14 | 双端连接配置与账号生命周期 | AUTH |
| DualClient:T15 | 已有视觉与标签 AI 的浏览器闭环 | AI |
| DualClient:T16 | OCR 环境选择、识别与修订恢复 | AI / LIBRARY |
| DualClient:T17 | 独立下载、取消与获准入库 | DOWNLOAD |
| DualClient:T18 | 连接库入口与独立索引反馈 | EAGLE |
| DualClient:T19 | 旧素材只读找回与准入反馈 | LIBRARY |
| DualClient:T20 | 跨客户端切库、未保存审查与安全退出 | LIBRARY / NATIVE / AUTH |
| DualClient:T21 | 移除旧桥回退，闭合双端能力与故障契约 | GOVERNANCE / LIBRARY |
| DualClient:T22 | 完整 Browser 用户路径与视觉验收 | UI / LIBRARY |
| DualClient:T23 | 原生系统专项与受影响路径复测 | NATIVE / WORK |

### 本地AI底座切片（父#24）

T01–T22源码收尾与所有组合实测分列；T23 Mac适用范围通过不自动关闭完整父级。

| 来源编号 | 原用户结果 | 原直接依赖（LocalAI） | 对应责任 |
| --- | --- | --- | --- |
| LocalAI:T01 | 统一现有 CPU/OCR 资源行为与正式状态 | 无 | RESOURCE / AI |
| LocalAI:T02 | 已验证模型离线使用与来源新鲜度分离 | 无 | MODEL / NATIVE |
| LocalAI:T03 | 完整境内量化组合目录与选择 | 无 | MODEL |
| LocalAI:T04 | GGUF 下载、导入、核验与库存恢复 | T03 | MODEL |
| LocalAI:T05 | 真实 RAM/逐 GPU 余量与量化推荐 | T01、T03 | MODEL / RESOURCE |
| LocalAI:T06 | 受管 GGUF 2B CPU 验证、分析与重开 | T01、T04 | MODEL / AI |
| LocalAI:T07 | GGUF 2B GPU 与混合加载正式路径 | T05、T06 | MODEL / RESOURCE |
| LocalAI:T08 | GGUF 4B Instruct 推荐到真实使用 | T07 | MODEL |
| LocalAI:T09 | GGUF 8B Instruct 推荐到真实使用 | T07 | MODEL |
| LocalAI:T10 | 正式标签/描述约束生成与严格校验 | T06 | AI |
| LocalAI:T11 | 一键分析准备复用、缓存失效与显式重跑 | T01 | AI / RESOURCE |
| LocalAI:T12 | 同模型加载调节、驻留与桌面压力收敛 | T07 | RESOURCE |
| LocalAI:T13 | 一次有审计的本地 OOM 恢复 | T12 | RESOURCE |
| LocalAI:T14 | GGUF 生产后台派发、取消与中断核对 | T06 | AI / RESOURCE |
| LocalAI:T15 | 统一中文文字检索、增量索引与稳定分页 | T01 | SEARCH |
| LocalAI:T16 | 文字索引落后、损坏与代际重建恢复 | T15 | SEARCH |
| LocalAI:T17 | 独立本地检索模型安装、离线与图文验证 | T01、T02 | MODEL / SEARCH / NATIVE |
| LocalAI:T18 | 明确范围生成持久向量与可恢复覆盖 | T15、T17 | SEARCH |
| LocalAI:T19 | 中英文自然语言语义找图与混合命中解释 | T18 | SEARCH |
| LocalAI:T20 | 库内与外部单图的以图找相似素材 | T19 | SEARCH |
| LocalAI:T21 | 检索空间升级、向量索引重建与回滚 | T16、T20 | SEARCH |
| LocalAI:T22 | 正式任务阶段诊断与质量/性能版本对照 | T06、T15 | RESOURCE / SEARCH / SCALE |
| LocalAI:T23 | 真实应用联合闭环与当前版本证据 | T08、T09、T10、T11、T13、T14、T21、T22 | AI / MODEL / RESOURCE / SEARCH / NATIVE |

### 历史统一待测编号（视图映射）

| 旧编号 | 当前责任条目 / 精确条件 |
| --- | --- |
| Deferred:U01 | NATIVE：真实断网延期 |
| Deferred:U02 | NATIVE：Windows原Chrome指定页压力 |
| Deferred:U03 | NATIVE：外屏/拔插设备缺口 |
| Deferred:U04 | NATIVE / WORK：最终完整系统窗口及拖放矩阵 |
| Deferred:U05 | WORK：官方实片/取帧/重开已验范围；Native差额仍保留 |
| Deferred:U06 | MODEL：8B和其他声明模式 |
| Deferred:U07 | SEARCH：189覆盖及175限定3图/重开已验，不再当新未完成任务 |
| Deferred:U08 | EAGLE：用户延期方向调整 |
| Deferred:U09 | RELEASE：签名安装/商业发行延期 |
| Deferred:U10 | WINDOW-EXT：交互扩展延期；云上传分享取消 |
| Deferred:U11 | 各责任条目剩余条件：WC/父#24/全矩阵，不另建泛化“全部补验”任务 |
| Deferred:U12 | GOVERNANCE：最新main两平台CI失败，未远端重跑 |

## 来源与证据边界

- [WC/DP/RUX任务包原始文档](../history/task-consolidation-20261011/vision-audit-20261003/README-START-HERE.md)：2026-10-03静态审阅/提案，包内28份清单摘要已核验，未执行工具。包明确不整轮重做已执行RUX/DP01/双客户端；历史STOP/授权限制不覆盖最新明确用户要求。
- [双客户端规格与原拆票](../product/LOCAL-DUAL-CLIENT-TICKETS.md)、[本地AI原拆票](../implementation-plans/local-ai-foundation-20261006/TICKET-PLAN.md)：目标/依赖来源，不维护第二份当前状态。
- [2026-10-08剩余审计](../history/task-consolidation-20261011/handoff/MACOS-REMAINING-ACCEPTANCE-20261008.md)及[WC历史失败](../handoff/WC01-FAILURE-QUEUE-20261003.md)保留原事实/版本边界（归档导航见整理清单）；其中旧Mac NOT_RUN/旧未授权由后续精确证据和用户要求限定替代，不当当前禁令或新失败。
- 最近Mac scoped evidence只限记录的候选和公开素材。30分钟包含空闲；万条只是3种图片内容，不代表多样质量或连续推理压力。27MB备份工程恢复不代表用户UI恢复。
- 原始PASS/FAIL/UNKNOWN不改判；历史错误摘要/时限问题无法追因时仍UNKNOWN；旧4B单次退出与Pi颜色失败的因果缺口保留，未当当前复现bug重开。没有实证的Provider质量、OS行为、发行、远端任务状态不填完成。
- [整理清单](CONSOLIDATION-20261011.md)记录移动、去重、保留与引用调整；本轮不变更产品API/schema/运行行为，不执行新模型/账号/资料库操作，不关闭远端issue。
