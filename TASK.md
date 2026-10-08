# 2026-10-08 当前：统一 GitHub main，移交 macOS

用户授权以当前工作区（含已采用未提交实现）为准合并仓库，旧分支/版本弃用。
统一源码入口为 GitHub main；普通克隆、目标机准备和启动见
[仓库整合记录](docs/handoff/GITHUB-CONSOLIDATION-20261008.md)。隔离候选保留当前
源码闭包，原 Windows 工作区及暂存不被覆盖；旧远端分支先记录 SHA/恢复副本，
新候选合入后清理。Git 正常历史保留，不 force push。

本轮终点是源码整合与移机交接，不启动 Mac 产品实施。WC01、T23/父#24、
D/E/F及商业首版继续未完成；Mac GGUF/设备/视频接线、原生行为和 Eagle
仍须按[剩余验收清单](docs/handoff/MACOS-REMAINING-ACCEPTANCE-20261008.md)完成。
Windows旧证据保留原身份，新整合构建/CI不能转记成真实产品验收。

---

# 当前：准备 macOS 接续源码与完整验收清单（2026-10-08）

本次整理已完成：`delivery/macos-handoff-20261008/START-HERE.md`提供已核验
源码ZIP/传输SHA/全新解压回执。3112文件、774/786产品源码输入匹配，
12个平台/依赖输入明确留待目标平台准备；环境、模型、账号、库和Git
历史未随包。WC/T23/A–F剩余验收已逐项登记。HEAD与原暂存SHA保持，
没有Mac产品验收或Git发布。ZIP冻结于本轮导出时，之后仅更新此终态入口。

最新用户要求先整理当前候选源码、交接记录和剩余验收，明确WC系列也未完成。本轮仅准备可校验开发源码快照，不执行Mac安装/资料迁移/推理或关闭父级。Windows来源候选dam-8ddc7686f890b3e3 / 786输入，HEAD156a9841e026、保留未提交已采用实现与原暂存；原字节源码ZIP附SHA清单，环境、模型、账号profile和资料库另行准备。WC01的H01–H22/C01–C03/UX、T23/父#24、D/E/F及首版总门持续未完成。当前Mac GGUF运行包/设备采样/视频仍有明确代码缺口，原生与Eagle由Mac接续，不能继承Windows历史PASS。恢复入口见 [Mac交接](docs/handoff/MACOS-CONTINUATION-20261008.md)，逐项对账见 [剩余验收](docs/handoff/MACOS-REMAINING-ACCEPTANCE-20261008.md)。本轮不提交、推送、签名或发布；以下按原日期保留历史。

# 当前：F 1 万条与候选验证，父级未完成（2026-10-08）

用户已将 Eagle/E 开发测试留给 macOS，继续 F，首轮选1万条。当前源码/未签名 Windows x64候选 `dam-8ddc7686f890b3e3` / 786输入、1.0.0；包已生成并普通启动健康/确认退出通过，安装/升级/卸载与签名发布未验。实际生产Host入库10000条，持续测试分三批新增9副本；原件逐个流式SHA核对合计10009记录/24种不同内容。fcc版本v1/v13/v14真实小库迁移/工程恢复和30.14分钟2B CPU+OCR后台通过：9描述+9OCR、重开无重发、驻留归零，非Browser用户路径；8ddc最终10009条重建31.636s、词法P95 1003ms、分页227ms、重开1148ms，335文件/211向量与旧行仍保持。持续期间检索+后台读组合P95 2259.69ms，并发两秒目标未证明。Chrome普通新入口实报ERR_BLOCKED_BY_CLIENT，未绕过；8ddc UI未执行。桌面专项仍后续集中、macOS未验，4MiB旧schema备份限制未扩大，**F父级未完成**。准确入口、版本分界及证据见 [F记录](docs/handoff/RELEASE-SCALE-F-20261008.md)；旧E等待及“不扩F”保留历史身份。

# 当前：E Eagle 正式接线实施，真实验收待准备（2026-10-08）

用户已授权包内E，并选择新建专用公开 Eagle 测试库。普通E profile的配对、safeStorage、可信目录身份、伴随网关、只读预览、撤权与重连、插件下载及随构建打包已有代码；既有Journal/Outbox/三方基线保留。当前dam-11b22b18c2708872 / 782输入，普通Host5332/CLI90398/50422；插件0.2.0包已核对，尚未安装。三份既定公开素材副本已准备，未创建/接触实际Eagle库。相关受控/SQLite/IPC/包回归、typecheck/build/context通过，不是实际Eagle通过；69份untracked覆盖警告保留。旧fb7b候选Chrome直开63476遭ERR_BLOCKED_BY_CLIENT，当前候选未绕过拦截；Browser及读取/写入回读/冲突/恢复/保存重开均未验收。等待用户创建空专用库、安装及内部授权，并恢复Chrome正规入口；必要确认来自Windows computer-use保护规则。准确入口与证据见 [本轮记录](docs/handoff/EAGLE-E-20261008.md)。HEAD与原index保持、未commit/push/发布。**E父级未完成；不扩F，桌面专项仍后续集中验收。**

# 当前：D 浏览器视频与交付闭环完成，桌面专项延期（2026-10-08）

用户授权包内D并批准Blender官方开放许可视频，桌面专项后续集中验收。普通Browser/profile-04 → 指定C公开库独立D副本 → 正式MP4 Copy/v15备份升级 → 工作集视频/两帧/顺序/双语备注/公开来源 → 四类独立副本下载/核对 → 整应用正常保存重开已成立。当前dam-452db36be3f6a1ad / 775输入，最后同一产物普通重开50183/Host3472/CLI29376，Windows x64普通运行；两帧实际30.125与120.4583333秒，重开暂停120.458333秒。旧1MiB备份限制、Chrome缺Range与视频首帧误入整图索引已修复；原C库v14/165素材/330文件保持，D的旧31张相关表行、330文件、211持久向量和7任务保持，最终335文件/保存状态完整签名重开相同。真实取消、来源拒绝、成员移除再加入、下载后取消/明确清理有实际结果。相关回归、typecheck/build/context及主Agent静态自审通过，68个untracked覆盖警告保留。入口、各候选证据和限制见[本轮交付](docs/handoff/WORK-MODE-D-20261008.md)与[精确检查点](docs/checkpoints/d-work-mode-20261008/README.md)。原WIP/暂存保持，未commit/push。**D父级未完成**：指定创作应用真正接收、Native拖拽/置顶/隐藏/多屏与断屏等按用户安排后续集中验收；不以Browser下载或假OS port替代。止于D，不扩E–F；旧T23压力与父#24不自动关闭。

# 此前：C 续验全覆盖与正式兼容复用完成，桌面专项延期（2026-10-08）

用户要求继续C。本轮普通Browser/profile-04沿用指定公开副本，明确准备165份、部分暂停后正常退出与新候选重开、明确恢复至165/165。发现ee31复用重写canonical生成时间，Host回归先红后绿修复，只写派生索引；不回写库补造旧时间，31条副本旧错误保持记录。当前正式dam-58dc70f3d0431312/761输入，最后整应用正常重开于53027；文字/颜色/图文各165/165，混合颜色136/136，中文/英文、库内外图、人工描述与分页选择有实际结果。全211持久记录在全库兼容复用与最终重开前后SHA相同，7任务未隐式重发；最初165素材/330文件/标签及五张完整分析审计保持。5个相关回归、typecheck/build/context及两轴静态审查通过，保留56个untracked覆盖警告。入口/结果/历史错误与版本边界见[本轮交付](docs/handoff/SEARCH-C-COVERAGE-20261008.md)与[精确检查点](docs/checkpoints/c-search-coverage-20261008/README.md)。原WIP与暂存保持，无推送/发布；Native按用户要求延期，T23原Chrome压力与父#24仍未完成。停于C，不扩D–F。

# 此前：C 浏览器范围已交付，桌面专项后续统一验收（2026-10-07）

用户最新要求继续包内 C，并将桌面专项集中到后续统一验证。普通入口为 `npm run start:browser`、既定 profile-04、素材工作区原搜索入口。目标：文字/来源筛选、确定性颜色占比、中英文自然语言与参考图找回，解释命中；已有词法功能在模型缺失/索引恢复时继续可用，更新不打断分页/选择/滚动，保存重开与取消/回收站保护成立。复用已成立且未受影响的本地 AI 检索路径，不重建 A/B、不自动扩展 D–F。

当前正式产物 `dam-ee312ab271299499` / 761输入，普通 Browser/profile-04，最后整应用正常退出重开于49433。C公开副本165素材，文字/颜色165/165，图文45/165；中英文/混合与库内外参考图、来源/颜色硬条件、人工描述保存重开、回收不回流和派生索引恢复均有实际结果。80%临时等待测试已恢复平衡/10%；新公开小库先搜索再正式备份升级v12/v14、无回填与分析，解决主连接TEMP触发器冲突。原164素材/328文件、人工与确认关系、完整执行记录及未知状态保持；向量/任务重开签名相同。入口、实际结果、回归中的失败与修复、范围及精确差异见[C交付](docs/handoff/SEARCH-C-20261007.md)及[检查点](docs/checkpoints/c-search-20261007/README.md)。保留旧WIP/暂存，不将其整文件提交；无推送/发布。旧T23原Chrome页压力、父#24和延期Native仍未完成；停止于C，不扩D–F。

# 此前：T23 浏览器迁移与去重（2026-10-07）

用户要求桌面验证转浏览器、重合跳过。当前dam-4deb9e68a5e80a0a/759输入，普通Browser61449，同profile-04；当前规模副本164/120素材成功内容及未知记录可见。取消/页外工作集/顶栏三类修复已通过；索引恢复、双语/以图、120分页、后台新公开page三能力、整个应用保存重开成立。原Chrome20标签保留，3临时压力页已关闭；指定原页控制持续超时，因此T23/父级保持未完成。Native专有行为不以Browser冒称PASS。准确入口/去重/版本/受保护数据及损坏副本暂停期间Luna/OCR差异见[浏览器交付](docs/handoff/LOCAL-AI-T23-BROWSER-20261007.md)，下文所有旧无界面/候选记录保留历史身份。原WIP/index保护，本轮只保存精确任务补丁，没有提交/推送。

# 当前：本地 AI 底座连续实施（2026-10-07）

最新用户已要求继续完成T23，当前进入真实界面联合验收；上轮仅无界面限制结束。a97d普通Browser/Native与公开T14副本已读回中文/混合搜索和旧结果，但英文一例60s失败仍保留。正式取消参数接线缺陷已先红后绿修复，仅Client传递范围收窄；Host/Client回归、typecheck/build通过，修订候选8478已普通启动于http://127.0.0.1:51336/#/library（CLI16040/Chrome1000400753），当前正式选择同T14副本后开库处理中。新候选语言/以图、索引恢复/120规模、Chrome压力、模型联合及最终重开继续，父级/T23未完成。最新连续操作检查点见 `.scratch/local-ai-implementation-20261006/T23-PROGRESS.md`，不把旧版本PASS转记8478。

最新用户要求限定五项无界面收尾。本轮已完成70个相关TS/TSX文件最终回归、160项Python单元测试、两个指定公开库只读保护核对、真实效果/性能版本对照及Standards/Spec整改复核；正式源码构建a97d，typecheck/build和context检查通过。交付采用精确任务补丁本地检查点，50个重叠旧WIP不整文件提交，原暂存保护，源码仍在工作区。当前产物没有界面联合验收，T23/父级保持未完成；见[本轮无界面交付](docs/handoff/LOCAL-AI-NON-UI-CLOSURE-20261007.md)及[检查点](docs/checkpoints/local-ai-foundation-20261007/README.md)。下文15:23等段落保持历史身份，不作为当前状态。

15:23 检查点：22bc已完成8B CPU/混合/GPU真实素材及一键3/3、正常重开；4B混合实际描述、生产8B后台新公开素材与真实sent未知/明确新执行恢复、一次审计OOM实际低方案已复验。冷加载取消相邻问题已先红后绿修复并构建565d。当前普通Browser CLI93119，http://127.0.0.1:58187/#/library，Chrome1000400733，同profile-04/T14公开副本；快速开库后状态尚未读回。原生CU第一次窗口发现被用户实体Escape停止，按工具要求结束本轮界面操作，不能算当前原生通过。索引损坏/120分页、当前双语以图联合、Chrome压力、新候选受影响路径与最终全套审查/安全提交仍待。详见本轮PROGRESS最新段，父级保持未完成。

最新：候选 `dam-0f867c43bc6ceb98`，普通 Browser/同 profile-04，当前地址 `http://127.0.0.1:63915/#/library`。最新来源要求替代旧 HF 获取：目录、下载和恢复均走 ModelScope 境内源，拒绝国际回跳。新旧检索空间各 44/44、正式暂停/恢复与切换回退已经实际运行，普通重开保留新空间；中英文及混合查询在公开 coffee 样本前三命中原图/变体。Native v3 多规模/加载方案实际素材、生产后台/中断、Chrome 压力、索引故障副本、原生专项与最终审查/安全提交仍需继续，父级未完成。详见最新 PROGRESS，下面的早期候选记录不代表当前证据。

用户已明确调用 implement，授权按 [本地规格](docs/product/LOCAL-AI-FOUNDATION-SPEC.md)与[23 切片](docs/implementation-plans/local-ai-foundation-20261006/TICKET-PLAN.md)连续实施。此授权取代下文旧的 Q18 实施待确认；子 issue 的对外发布审批仍独立，23 票保持本地草案，父 #24 未修改。范围包含中英文、混合与跨语言语义检索及以图找。

当前：T01 唯一 Governor、T02 离线资格/来源新鲜度与已知来源阻止、T03 57 仓库完整目录/量化组合、T04 复用库存/传输的 GGUF 获取/结构/哈希核验、T05 单 GPU 新鲜余量与完整预算推荐均已有代码和聚焦内部验证。正式 Browser 在 `dam-d5c4e44706940e41` 获取真实 57 仓库，下载 2B Q4_K_M / Q8_0 共 1.45 GiB，暂停于约 0.83 GiB 并明确恢复，完整核验入库。首次 Native 因日志屏蔽端口确认而超时，保持未授资格，已实际退出并正常整应用退出。

修订候选 `dam-93e769b0f2b81137` 已正常重开同一 profile，库存保留；2B GGUF CPU 实际双色图验证通过，加载约 1.3 秒、工作集峰值约 2.62 GiB。已从正式选择器打开指定 44 资产公开库；coffee 独立描述遇冷加载线程变化触发配置取消，旧结果保留。正在固定非显式切换的冷加载绑定，随后重建复验 T06，再连续 GPU/混合、4B/8B、分析/资源与检索切片。此时 T06 用户分析/联合重开尚未成立，T07–T23 未完成；不以资格挑战关闭父级。测试夹具不授真实推理资格。

当前普通 Browser 地址 `http://127.0.0.1:56080/#/library`，Chrome Tab1000400580，实际 Host 使用 CLI 指定 profile（见下文准确命令）。本轮证据 `.scratch/local-ai-implementation-20261006/evidence/`，CPU 资格和下载暂停已有截图。没有库 schema 修改、模型资料损坏实验或云端新调用；既有人工/文件保护仍须最终只读 oracle 复核。最终完整测试/code-review/本任务提交尚未进行。

原 WIP/暂存保护，起始文件保存在 `.scratch/local-ai-implementation-20261006/before`，起始 index SHA256 为 `a15e17ebf7ccf5fc372772ec11b867a2ca4cf50b6b59750b2cb3d60c7b7bfb1c`，2026-10-07 核对未变。沿用指定公开库/profile、模型和服务，Browser 优先；故障/迁移使用可恢复副本。最终需当前版本构建、正式模型/检索/资源闭环、保存重开、code-review 与仅本任务提交。

---

# 此前：to-tickets任务拆分草案已完成，待用户确认后发布（2026-10-06）

最新更正：语义检索须包含中英文，已同步本地规格及T17/T18/T19/T21/T22/T23；中文、英文、中英混合与跨素材描述/标签语言命中纳入真实资格、迁移和质量/延迟验收。23票及34条边不变，批准状态仍pending。父#24依to-tickets要求保留原发布正文，快照已保存，语言补充将进入相关子票；本地规格为修订版本，不再冒称与父issue原文一致。

最新用户调用to-tickets。以已发布规格#24为父级完成[23项纵切草案](docs/implementation-plans/local-ai-foundation-20261006/TICKET-PLAN.md)，一票一文件保存于本任务scratch目录；34条真实前置边、T01/T02/T03初始frontier，T01–T22映射覆盖70条User Stories，T23负责联合验收。GitHub原生blocked-by读接口已核对，计划批准后按依赖顺序创建子issue、替换实际编号并挂接/回读依赖，标签ready-for-agent。按指定技能“Iterate until the user approves the breakdown.”尚未发布子issue；父#24未修改/关闭，产品代码/依赖/模型/资料库未动。

下一动作是确认颗粒度、阻塞边及合并/拆分偏好；若批准则连续发布全部批准票并核对，不逐票询问。产品实施授权与此发布流程分开，原Q18仍无明确答复。以下保留规格与设计背景。

最新用户明确调用to-spec，要求综合当前讨论生成并发布实施规格，未新增访谈。已完成[本地规格](docs/product/LOCAL-AI-FOUNDATION-SPEC.md)，发布为[GitHub #24](https://github.com/zhr0210/design-asset-manager/issues/24)，标签ready-for-agent；70条用户故事、31项Implementation Decisions与17项Testing Decisions覆盖已确认模型/HF/GGUF、资源、分析、离线及文字/语义/以图检索。正式WorkspaceClient/Host业务Interface是首选自动测试Seam，真实可见界面与保存重开负责用户验收。远端正文与本地规格一致，标签已回读；原index保持。

本次交付止于规格发布，没有产品代码/依赖/模型/资料库变化，也未将拟议ADR标为Accepted。Q18没有明确答复，规格与ready标签不伪造新版整体确认或自动启动实施。以下保留设计背景、实际缺口和下一实施路径；父级用户功能仍未完成。

最新用户要求：通过grill-with-docs进一步参考llama等优秀本地AI软件，基于DAM定位讨论底层优化。固定源码核对扩至llama.cpp/Ollama/vLLM/Immich/Tantivy/promptfoo，形成[八方向工程参考](docs/product/AI-ENGINEERING-REFERENCE-20261006.md)。Q15明确检索底层纳入本轮设计；Q16已验证、未漂移/撤信任的模型继续离线可用；Q17覆盖中文文字/组合条件、语义文字与以图找。此前完整HF目录、先运行2B/4B/8B Instruct GGUF、官方优先社区补充及使用闭环保持。Q7–Q12的默认平衡、同模型/量化已验证自动调节、兼容宽松许可、一次有审计本地OOM恢复和输入/输出标准保持；消费者由Q15/Q17增加本地检索/索引。修订已收敛到[新版底座设计](docs/product/LOCAL-AI-RESOURCE-COORDINATION.md)、[拟议ADR0492](docs/adr/0492-host-resource-coordination-keeps-runtime-allocators-owned.md)与[量化方案](docs/handoff/QWEN-QUANT-DEVICE-20261006.md)。

当前完成源码/许可研究、正式查询链核对与可审阅修订；没有产品代码、依赖、模型或资料库变化。实际共享UI已搜索描述/OCR/建议并解释，但全库投影扫描；另一Host搜索语义更窄，无正式索引分页/向量路径。24h来源过期仍可阻本地运行，离线选择尚未实现；显存与GGUF同样未交付。此前Q6整体确认被重设计请求替代，Q13要求调整，现Q15–Q17已纳入新版；依指定grilling仍待新版整体共享理解确认。确认后连续实施统一资源/Adapters、HF/GGUF使用、必要分析优化、离线资格与指定检索，并做正式应用真实验收，不逐Interface或切片问继续。检索是最新增加的范围，其余C–F不自动续做；沿用已指定公开副本/profile、账号内部使用及原件/人工/事务/真实释放保护。

---

# 此前：B 模型管理闭环已完成（2026-10-06，Hugging Face / Windows CPU 范围）

最新用户授权：继续包内 B；A 的完成范围与证据保持，不自动扩大到 C–F。普通启动 → AI 与模型 → 本地模型与 OCR → 可信目录安装或已有模型引用/复制导入 → 配套与完整性核验 → 真实验证后启用 → 素材实际分析 → 卸载/切换/重开。取消、损坏/缺配套、信任撤销、升级失败保留旧版本是必需分支。

复用 A 的 Supervisor、共享资源账本、唯一 Host 与能力消费者；不重做基础文件或全部架构。仅使用既定公开库副本、AIModels/models 与已有可信 Python/服务；必要公开模型准备在 B 内实施，账号与私钥不进入 Agent。浏览器优先，必要原生效果单列。

用户已明确没有 DAM 发布公钥/签名目录，模型从 Hugging Face 获取。后端正式查询 10 个登记相关仓库/78 个数据文件链接；2B/4B 为受管 CPU float32 安装组合，其余只显示固定提交下载链接与支持范围，不冒充 DAM 签名。真实 HF 2B 下载 3.97GiB 已暂停/重开/明确恢复并校验入库；用户 4B 只读引用与受管复制 8.28GiB 入库。最终候选 `dam-f7bec71152122626`（729输入）已完成实际分析、资源与切换、撤信任、取消/放弃和整应用保存重开。准确入口、证据版本及限制见 [B 完成记录](docs/handoff/MODEL-MANAGEMENT-20261006.md)。

已修复真实 2B 的完整 JSON fence、正式预览贪心重复循环、切库错误 drain 安装器，以及运行器更新后显式核对环境并清除旧资格。最后验收发现撤销本地信任会自动改选云服务，已删除 Renderer 与基础分析 Host 的第一可用服务 fallback；缺默认时要求明确选择，OCR 独立可用，主动选云仍须核对。最终候选复验 4B 一键三项、2B coffee 描述和撤信任 OCR 均正式保存；坏候选保持未获资格，旧结果与人工内容保留。

最后整个应用正常退出后重开同一产物：Host PID66540、Browser http://127.0.0.1:55129/#/ai/local-models（端口/PID不是固定入口）；选定 HF2B，正常/10%，实际卸载后驻留/准备/计算0。重开前后请求90/尝试89/效果84/后台60及执行审计/outbox不变。44资产、88文件哈希、42受保护资产、9人工描述与确认关系保持。证据 `.scratch/b-model-management-20261006/evidence/reopen-final.json`；原 WIP/index 保留。**B完成后停止，不自动扩C–F。** DAM发布者签名目录、GPU/更多组合运行、软件签名安装发行与其他平台保持未覆盖，不冒称已交付。

---

# A 闭环 A0–A5 已完成（2026-10-06，指定 Windows/CPU 范围）

最新授权：按 DAM-FUNCTIONAL-CONVERGENCE-20261006 包 START-AI-CORE 连续实施 A。普通入口 → 同一 profile/公开测试库 → DAM 托管 Qwen3-VL 4B CPU 与真实 RapidOCR/已有 Luna 连接 → 独立标签、描述、OCR/基础分析 → 生产后台 → 中断恢复 → 保存重开。A 成立后停止，不扩 B–F。

保护既有 WIP/index；真实范围沿用公开 24 图库副本、已指定 AIModels/models 和本机既有连接，凭据只由应用内部使用。迁移/中断先用可恢复副本。普通命令新增显式 --profile 参数；统一设置路径在 Host 内迁移，旧文件保留。

结果：候选 `dam-bd704c7ba0e1f78b`（719输入）已通过普通启动、同Host双端/不同profile、正式Qwen/RapidOCR、独立与有字/无字一键、生产新素材后台、资源等待/恢复、暂停重开、本地真实sent中断与明确恢复、已有Luna low真实云分析及sent取消、最终退出重开。三能力可独立可用，基础分析不生成反推。主Agent同会话自验，不冒称独立人员复核。

从仓库根目录启动：

```powershell
npm run start:browser -- "--profile=G:\antigravity\Design Asset Manager 1001\.scratch\wc01-real-model-library-20261005\run-U4eFuo\profile-04"
npm run start:desktop -- "--profile=G:\antigravity\Design Asset Manager 1001\.scratch\wc01-real-model-library-20261005\run-U4eFuo\profile-04"
```

可见选择 `.scratch/ai-core-20261006/real-library-01`。当前Browser http://127.0.0.1:54775/#/library，Host PID48364；端口/PID随重启变化。44资产仍为24独立公开资料与20副本；48原件/预览、20新增原件、22非目标原素材、9人工描述、2OCR修订、5确认标签和组织关系保持。最终请求81/尝试80/效果76/后台60与历史不因重开增加，原index保持。

资源工作集峰值20.840 GiB，private commit观测27.286 GiB，不混作同一指标；真实OCR资格峰值约448 MiB。Chrome指定组原20标签保留，5份同网址临时页加载（basement网络失败不计通过），约30分钟混合观察，临时页已关闭。最终正常/10%已保存重读，驻留/计算/准备0且自有执行子进程已退出。当前其它应用使完整本地加载可能等待；实际本地推理在正常/5%与足够余量下完成，OCR/云仍独立可用。

完整结果、26项矩阵证据归属、旧失败与限制见 [A 完成记录](docs/handoff/AI-CORE-20261006.md)。OCR空格粘连、标签风格推测及订阅费用/网络wire数/输出硬cap未知如实保留。GPU、更多模型、官方分发、语义检索、大库及安装发行未验证/未实施；WC01其它原承诺未因此全部关闭。**A完成后停止，不自动继续B–F。**

---

以下为上轮已完成记录，保留原日期与范围。

# 基础文件采用完成，Pi 思考强度真实入口续接通过（2026-10-06）

本轮用户请求：结合当前真实工作区合并七份候选，先建立产品介绍/完整愿景/技术架构主文再精简AGENTS；核对CHANGE-MAP的30项；在当前目标内充分工程自主，指定真实应用/资料/库/模型验证直接纳入实施，保留隐私/原件/用户状态及必要权限。本轮不重开全部历史队列，也不把基础文件完成当产品功能全部完成。

已完成：[README](README.md)、[产品基准](docs/product/PRODUCT-FOUNDATION.md)、[ARCHITECTURE](ARCHITECTURE.md)、[CONTRIBUTING](CONTRIBUTING.md)、[PROJECT](PROJECT.md)、[验收流程](docs/agents/ui-ux-acceptance.md)、[AGENTS](AGENTS.md)合并；旧PROJECT原字节归档，REHOST/商业目标/发行验收及相关导航冲突同步。30/30语义保留记录在[本轮交接](docs/handoff/FOUNDATION-ADOPTION-20261006.md)。AGENTS 15,448→6,117字节，未丢弃产品/架构/保护语义。

文档：最终144项本地链接、包内22份清单SHA/长度、PROJECT字节归档、context:check、docs-sync、ADR router、diff检查通过；新会话自动加载NOT_RUN，当前上下文八问自审完成。不改DESIGN或索引；保留既有1个untracked源码覆盖警告。

续接最近授权用户结果：Pi思考强度。确认690源码输入无漂移、实际Main字节及PID52160/端口62288。Browser真实gpt-6-luna/low生成双色图验证成功；桌面普通同profile入口接入同Host，六档选择、high草稿取消恢复low、保存后Browser刷新读回及公开测试库重开/已有low结果回读通过。24资产/schema13只读oracle核对人工字段/关系、其他23素材与48原件/预览保持。本轮只新增1次生成图动作，未重发素材分析；wire数/费用/本次probe token用量未知。

真实入口：当前打开的[Browser](http://127.0.0.1:62288/)和Design Asset Manager桌面窗。Browser在low连接页；桌面在public-01-astronaut既有low结果。该运行实例沿用已指定WC01-REASONING-R2 profile和work-browser公开图副本，账号由应用安全内部使用，Agent未读秘密。常规npm启动命令默认profile与此受控profile不同，不冒称普通冷启动已验收。

恢复：`.scratch/foundation-20261006/`保存before、baseline、文档核对、当前build输入/输出核对及CU截图；[当前投影](docs/handoff/CURRENT-STATE.md)、[本轮交接](docs/handoff/FOUNDATION-ADOPTION-20261006.md)。上批TASK完整原字节见[历史快照](docs/history/task-snapshots/TASK-before-foundation-20261006.md)，上批终态锚点和历史FAIL/NOT_RUN保持。

完成范围仅上述基础合并和Pi已有结果续接；未做其他真实档位/任务质量、安装包/macOS、完整键盘/原生账号生命周期或全产品验收。未保存导航丢草稿、普通profile路径权威与订阅无token硬cap仍是既有缺口，不因文档通过而关闭。新会话加载核对待实际新会话；不为此创建新聊天。没有业务源码改动、commit/push/发布；原WIP和暂存区保持。
