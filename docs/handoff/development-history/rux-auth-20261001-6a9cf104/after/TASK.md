# Current Task

## 有限交付 / 产品验收仍受阻：R00–R08 仓库、UX 与认证整合（2026-10-01）

用户批准本批连续实施。当前代码按唯一AI归属、导航别名、App账号生命周期与5删除/2测试支持迁移收口，buildId `dam-3c75658c506c8e70`。有限契约/SDK/临时Host/Renderer检查通过，Runtime全src平台分支源码断言仍失败，未绕过。认证/清理独立源码复核签收有限范围，没有独立重跑或真实账号证据。

Computer Use 原生工具可用，但同一Electron身份绑定个人实例，受控profile选择未确认；U01–U32全为BLOCKED，不能以selector集成补成通过。已请求用户退出之前个人测试软件，尚未确认；不操作个人实例。A01–A03真实账号NOT_RUN；没有真实凭据/资料库/模型读取、付费推理或素材外发。自建旧受控子进程已精确停止，临时profile保留。

当前run：`.ai-run/rux-auth-20261001-6a9cf104/FINAL-HANDOFF.json`；查看REPORT、REVIEW、SOURCE-MANIFEST、DELTA、CU-RUNS。增量包由START-HERE指引，包含必要before和差异，不覆盖整个WIP。原index/staged字节匹配基线，未提交/暂存；12批准原型保持原摘要。旧DP01报告仍是历史，不能当作当前验收。

STOP（仅本批有限代码交付，不表示用户全部问题已解决）；nextBatchAuthorized=false、automaticResume=false。恢复CU需先确认个人软件退出，重新普通启动受控实例并核对About构建身份；真实账号由用户本机厂商浏览器辅助、限定profile、仅认证不推理。不得自动恢复DP02或新增Provider。

## 已修复：软件首页与账号入口可用性（2026-10-01）

用户报告启动后停留创建库、交互无反馈且找不到AI控制台。确认未开库时底部全局菜单被隐藏，资料库面板可能遮挡顶部控件；失败开库进入recovery-required后AI连接/验收准入无法恢复。修复后未开库也显示菜单和顶部AI入口，四个目的地解释开库要求，搜索/素材动作明确不可用；失败开库只在shutdown idle恢复账号及生成计划服务，保留Host真实恢复状态、UNKNOWN资源保护与原文件。

3条正式Main/Preload/Renderer交互场景与18条OCR/验收生命周期回归通过，实际before/after Main回调证明idle恢复、shutdown不恢复；typecheck/build通过。测试仅用生成图片、临时Host与合成保险库，无真实账号、外发或模型。新回归为scripts/library-startup-navigation.e2e.test.mjs。用户软件已重新启动修复构建，经原生UI点击首页AI按钮并打开连接编辑表单；由用户继续配置和登录。未处理真实库的失败文件或迁移。

本次为新问题修复，不延续DP02。旧DP01报告/源码清单/完成指针保留历史，不能代表修改后的源码或全面软件可用；最近恢复点为本段及当前工作区。未提交、未暂存，原index/staged保持。

## 已完成受限范围：DP01 与受控 ChatGPT 登录入口（2026-09-30）

用户批准本批连续执行，并选择 ChatGPT 订阅登录。01A–01F 已完成：基线、后台 OCR 观察撤权、锚点 v2、生成图片验收、必要回归与独立复核。仅 ChatGPT 受控入口按用户最新批准开放；Google、Codex、Anthropic 订阅和 Copilot 保持限制。

196 项最终隔离行为测试通过；独立重跑81项为其中子集，另有 typecheck/build/PLAN_ONLY。源码679文件清单、45文件本批差异和原始红绿日志可查。原 index/staged 未变，未覆盖无关WIP。真实账号、模型、付费服务、Keychain、用户库、Windows及签名安装均 NOT_RUN；生产后台OCR资格仍空。

唯一完成指针：`.ai-run/LATEST.json`。终态：`.ai-run/dp01-baseline-and-acceptance-20260930-05b5bcba/FINAL-HANDOFF.json`。详细报告、源码、差异、测试与复核均在同一run目录；工程师交接包位于delivery/。

STOP；nextBatchAuthorized=false；automaticResume=false。读取旧活动记录或本完成入口不恢复队列，不自动进入DP02；真实账号由用户自行登录，素材外发仍逐动作授权。

## 已完成受限范围：Pi Provider准入与认证契约收尾（2026-09-30）

用户“按照包内规划提示继续”批准评审包有限实施。Main/Worker共享准入，明确关闭Google原生推理/订阅认证与Copilot未闭合路径；保留API与旧数据。稳定hostID、窄select契约、实际Codex SDK两分支的Worker/Main/React合成贯通、过期撤权、已知Anthropic订阅令牌API伪装拒绝已完成。

聚焦矩阵45、相关回归125、typecheck/build与独立最终30项通过；重新封印11829文件/2链接，未升级依赖。校验约1–3秒、约190MB读取，可取消且无缓存；真实disk-cold未测。

OpenAI注册/client/JWT与完整受控认证网络未实现，生产仍禁用；真实账号、模型、Keychain、Windows/签名安装均NOT_RUN。未读取真实资料库/凭据、启动模型、调用付费API、下载或发布；原WIP/index保护见报告。

- [最新报告](.ai-run/pi-provider-hardening-20260930/REPORT.md)
- [Provider矩阵](src/main/ai-gateway/PROVIDER-MATRIX.md)
- [独立复核](.ai-run/pi-provider-hardening-20260930/REVIEW-FINAL.md)
- [最终状态](.ai-run/pi-provider-hardening-20260930/FINAL-HANDOFF.json)
- [交接包](.ai-run/pi-provider-hardening-20260930/delivery/DAM-PI-PROVIDER-HARDENING-20260930.zip)

COMPLETED_RESTRICTED_SCOPE / STOP，nextBatchAuthorized=false；不自动进入真实账号或历史阶段。下方记录为历史，其广泛“适配接线”表述不覆盖本批实际准入限制。

## 已完成限定隔离范围：Pi统一模型接入（2026-09-30）

用户“开始执行”批准PI01–08，随后明确选择“先完成隔离验收，真实账号后续配置”。固定Pi0.99.1/独立Node24.21.0、加密凭据与补偿、正式模型配置/任务分配、视觉及独立标签、订阅认证适配、单独授权外部细化已接线。新增43项与相关130项回归、两个配置断言脚本、typecheck/build通过；独立复核修复五项问题后重跑资源2/Host7/旧认证目录1通过。

真实模型/API/订阅账号、OS Keychain、Windows/签名安装包未验收。未访问真实素材库、模型缓存或真实凭据，未启动真实模型或上传素材。本轮只安装批准的公开Pi/Node执行依赖，无提交/推送/发布。2715基线无缺失，授权修改有before；原staged diff摘要一致，index原始字节摘要不同且无法归因，详见保护记录。

- [实施报告](.ai-run/pi-integration-20260930/REPORT.md)
- [独立复核](.ai-run/pi-integration-20260930/REVIEW-FINAL.md)
- [最终状态](.ai-run/pi-integration-20260930/FINAL-HANDOFF.json)
- [源码交接包](.ai-run/pi-integration-20260930/delivery/DAM-PI-INTEGRATION-20260930.zip)

COMPLETED_ISOLATED_SCOPE / STOP，nextBatchAuthorized=false。真实账号按用户选择延期，不自动进入旧队列或真实资料库验收。下方旧记录仅作历史。

## 已完成：后台 OCR 单能力闭环（2026-09-29）

用户“继续下一轮”批准的限定批次已完成并独立签收。新增本次开库独立许可、显式v13执行存储、原子领取/幂等OCR回执、共享手动OCR资源门槛、发送前资格复核和保守中断恢复。sent/unknown跨会话不自动重领；Runtime变化撤销旧许可。生产qualification=null保持等待，B01开关仍只收集计划。

35项真实临时Host（含4个owned SIGKILL）、3项组件、2项正式后台OCR通过；旧17进程/12控制器/B01 19、标签30/13/22、资源10和存储/Host/关闭回归、正式手动OCR/B01各1通过，typecheck/build通过。独立复核重跑35并核验148份源码。真实模型/用户库/Windows未验收，未下载、安装或发布；原工作区与索引保留。

- [报告](.ai-run/background-ocr-20260929/REPORT.md)
- [最高优先级终态](.ai-run/background-ocr-20260929/FINAL-HANDOFF.json)
- [独立复核与原始重跑输出](.ai-run/background-ocr-20260929/REVIEW-FINAL.md)

本批COMPLETED/STOP，nextBatchAuthorized=false；不自动进入真实模型资格、caption或其他能力派发。下方旧批记录仅作历史。

## 已完成：OCR 子进程退出与资源/drain 边界（2026-09-29）

用户“继续下一轮”批准的限定批次完成并通过独立复核。取消/超时等待owned child close；无法确认时UNKNOWN仍占用资源；Main关库/退出等待OCR，迟到结果不保存，退出期间authority回调不能重开准入。未改变schema/公共IPC或B01开关含义。

17项进程、12项controller、19项B01集成、正式OCR与B01各1项及OCR存储/Host/契约/退出回归通过，typecheck/build通过。独立复核重跑17/12并核验134份源码。只使用生成素材、临时库及stdlib合成执行器，未重验真实RapidOCR/模型、真实用户库或Windows。原工作区及索引保留。

- [报告](.ai-run/ocr-exit-boundary-20260929/REPORT.md)
- [最高优先级终态](.ai-run/ocr-exit-boundary-20260929/FINAL-HANDOFF.json)
- [独立复核](.ai-run/ocr-exit-boundary-20260929/REVIEW-FINAL.md)

本批COMPLETED/STOP，nextBatchAuthorized=false；不自动进入caption、后台派发或全资源框架。下方旧批次记录仅作历史。

## 已完成：B01 后台分析意图与准入基础层（2026-09-29）

本轮“批准进入下一轮”已交付限定B01并独立签收：新入库默认tags/caption/OCR轻量持久意图，v12明确升级，无历史回填，等待原因、暂停/恢复/取消与Main/card权限。19项Host/controller、4政策、2真实组件、1正式Electron及8项相关回归通过，typecheck/build通过。1071基线仅17批准文件修改，索引/staged保持。

**尚未实现自动模型执行或全资源Governor**；生产dispatchAvailable=false，计划开关不授予未来推理/上传权限。独立caption、OCR物理exit drain、Runtime ownership/执行包络仍待后续；未操作真实库/模型/缓存、安装依赖或提交发布。

- [最高优先级终态](.ai-run/background-foundation-20260928/FINAL-HANDOFF.json)
- [B01报告](.ai-run/background-foundation-20260928/REPORT.md)
- [检查点](.ai-run/background-foundation-20260928/HANDOFF.md)

本批已停止，nextBatchAuthorized=false。下方旧批次记录仅作历史。

## 已完成：C07-S 增量收尾 F01–F03（2026-09-28）

用户“批准处理”的三项局部收尾已完成，独立源码审查通过。F01统一最近100终态句柄保留，活动任务与持久效果不删除；F02生命周期epoch与迟到receipt释放，实际组件红绿和正式页面可达性通过；F03提供最高优先级终态入口，nextBatchAuthorized=false，不自动恢复旧ACTIVE记录。
执行30、组件3、正式面板1、Provider9、批次12、恢复22、资源10及政策5项通过；typecheck/build和正式执行场景通过。原暂存/未暂存/未跟踪工作保留，无提交发布。真实模型/用户库/Windows/安装包未验收，历史原生等待仍未定位，其他后台进程UNKNOWN。

- [最高优先级终态](.ai-run/tags-hardening-20260928/FINAL-HANDOFF.json)
- [收尾报告](.ai-run/tags-hardening-20260928/REPORT.md)
- [检查点](.ai-run/tags-hardening-20260928/HANDOFF.md)

下方原批次完成记录保留为历史，不能由其旧授权自动启动新任务。

## 连续批次已完成：C01–C07-S（2026-09-27）

已在用户“运行无上限，委托独立复核”授权下完成本批，现已停止。
C02A/B、C03、C04、C05、C06及最终C07-S获独立只读审查通过；C01保留历史SELF_REVIEW对账标签。
新增独立标签意图/执行、唯一current、确认与同内容同族拒绝、1–8批次/force、显式安全恢复和Outbox重投。
C06恢复22项（含7个owned-process真实SIGKILL切点），相关12/25/13回归及最终15条风险检查通过。
正式Main/Preload/Renderer覆盖检索、AI分类、Main/card、批次与两次重启；仅生成数据和自有loopback。
最终100相关源摘要977d048219c9bf1a5d6759ebc8850d42652ab0555380aba248266f600e8a09d6；
2282基线文本无意外修改/缺失，原索引与staged diff保持。未暂存/提交/推送/发布。
交接ZIP833条目已独立核验，补丁独立重建100文件，含历史失败与限制；不是完整仓库，不自动覆盖原WIP。

- [最终汇报](.ai-run/independent-tags-20260927/C07-S/FINAL-REPORT.md)
- [交接包](.ai-run/independent-tags-20260927/delivery/DAM-INDEPENDENT-TAGS-IMPLEMENTATION-20260927.zip)
- [恢复与最终状态](.ai-run/independent-tags-20260927/HANDOFF.md)

没有进入C07-R真实模型、真实用户库、Windows或安装包/签名验收；未安装依赖或启动模型服务。
Standalone Electron RUN_AS_NODE历史原生等待仍未定位，失败保留；正式Electron Main另有通过证据。
controls=convention_only，没有常驻运行器、后台自动化或自动进入后续旧阶段。

## 已完成：首轮任务01 Provider内部抽取（2026-09-27）

用户确认开始实施，范围仅任务01。正式visual-ai综合分析/反推保留原公共IPC、
schema、UI、四字段结果及Host写入口。已抽取单次HTTP Provider，重试只由
runVisionRequest负责；1536→3072最多一次截断重试，仍共用控制器每素材时限。
新增内部provider/clock注入，默认生产组合继续使用兼容HTTP与系统时钟。

先运行既有基线均通过；新增Provider→真实临时Host测试在实现前失败、抽取后通过。
最终8项新集成、7组传输、既有视觉/下载临时库集成、OCR存储回归及typecheck通过。
覆盖900ms后重试只剩100ms、人工描述/OCR修订/确认标签保护、取消/owner撤销、
同generation重开旧响应零写入、通知失败保留已提交结果；使用生成素材与合成Provider。

未运行真实模型、正式GUI/打包/Windows或真实用户库测试。没有新tags-only能力、
任务持久化或新schema；未进入02A，未发布Issue、暂存、提交或推送。
用户既有修改保留；旧规格/评审文件不改写。实施与审查证据：
[任务01实施报告](docs/implementation-reports/task01-provider-extraction-20260927/TASK01-IMPLEMENTATION-REPORT.md)。

## 已完成：真实推理复测与获准下载 Qwen3-VL 8B（2026-09-24）

用户明确要求完成真实测试，批准下载Qwen3-VL 8B量化模型。选择官方Instruct
Q4_K_M与F16视觉投影，固定revision和两个SHA256，共6,186,814,624字节；
见 `docs/product/QWEN3-VL-8B-EVALUATION-20260924.manifest.json`。下载与完整性校验已完成，
文件保留在隔离评估目录；不等于正式应用已配置/激活该模型。
既有2B模型与投影已复核，b11057原始包重新下载校验并核对42个运行文件。

新代码+2B在8192上下文、seed42、本机Metal上完成4张生成图真实推理：4/4结构保存、
搜索/AI分类/工作集/关库重开通过，源哈希不变；约56.5秒，服务采样RSS峰值约3.57GiB。
4/4中文描述，但只有2/4标签集全中文，抽象图仍有场景推断，不放行模型质量。
报告与生成图保存在 `docs/product/evidence/qwen-comparison-20260924/`。
2B服务已停止，正式provider配置未修改。

已从上次精确测试调用记录恢复原8份文件清单，仅访问清单中的原文件，重建受限预览。
2B/8192真实8图已完成：8/8结构有效，中文描述与中文标签覆盖8/8，6/8遵守最多8标签；
3份截断重试，合计11次请求，中位数4.96秒，整批111.85秒，8份源哈希不变。
2B生成素材正式Electron联动17环节通过，两个视觉请求均完成，OCR/手工保护、
AI文件夹/提示词搜索、取消零晚写及重启恢复通过；报告已归档。
2B/4096同样8图也8/8通过，3份重试，中位数4.86秒，最终输出与8192逐字段一致。
8B主权重与视觉投影现已均通过固定SHA256。首次完整下载主权重SHA256失败，
逐段官方重新下载比对修复第3、22、31段后整文件通过；校验前没有加载模型。
本机恢复文件 `/tmp/dam-approved-qwen8b-state.json` 的verified为true。
8B生成四图4/4完成保存、搜索、AI分类、工作集与重开，约60.10秒，采样RSS约4.55GiB。
四组标签均中文，但抽象图仍有山峦/月亮的场景推断。
8B真实八图analyze为8/8首次完成，零重试，中文描述/标签、最多8标签均8/8，
单份中位数20.82秒，整批163.54秒；独立reverse同样8/8首次完成，零重试，
中位数19.01秒，整批155.07秒。8B正式Electron联动17环节通过，包括真实保存、
AI分类/提示词搜索、OCR/手工保护、真实取消零晚写及应用重启恢复。
不把2B结果替代8B验收。UI验收工具新增“本次两个视觉任务均完成”
断言，避免已有证据或保护检查通过掩盖推理失败；失败报告仍先保留。
8份原文件最终SHA256一致；临时私有预览、模型原文和路径manifest已清理。
本轮模型服务均已停止，18080端口关闭，正式provider配置未修改；没有外发素材。
typecheck、脚本语法与公共报告脱敏检查通过。未提交或暂存本轮/无关改动。
结构、语言约束和数据链路验收完成；真实设计的事实准确率、跨设备稳定性仍未量化，
保持AI建议语义，不放行默认无人确认自动分析。
[最终对比与证据](docs/product/QWEN3-VL-REAL-COMPARISON-20260924.md)。

## 已完成：新 AI 后端吸收旧接口经验的代码修复（2026-09-23）

用户要求继续完善新后端。已核对两份9月23日新旧对比记录与正式调用链，
修改 `visual-ai:*` 的内部预览/请求/解析/错误反馈；不恢复旧IPC，不改变公共契约或库schema。
正式请求采用1024/JPEG85受控预览、中文紧凑设计提示、专用OCR职责分离；
截断时同图片/模型/服务最多重试一次，1536→3072 token，共享原时限和取消信号。
兼容完整JSON的代码块、说明文字和文本content数组，继续拒绝残缺结果。
确认页披露重试与OCR入口，失败反馈区分超时、格式、权限、请求容量等。

验证：7组transport测试、正式控制器/临时库集成、OCR存储回归和typecheck通过。
覆盖重试单次保存、持续截断不覆盖、重试取消/超时零写入、1024尺寸、手工内容保护与OCR修订搜索。
所有输入/服务/库均为临时合成，无真实素材库或模型访问、无真实推理、无外发。
真实8份设计稿及用户原8B模型尚未用本轮代码复测，不据此放行默认自动分析。
[实现与验收记录](docs/product/VISUAL-AI-BACKEND-HARDENING-20260923.md)。

## 已完成：旧提示词反推provider隔离复现（2026-09-23）

用户指出原项目旧AI接口反推曾完整可用，并要求复现。当前活动库显式拒绝旧
`ai-worker:run-prompt-reverse`，旧IPC还写全局数据库；因此只在隔离环境调用旧
`LlamaOpenAIProvider.runPromptReverse`，不恢复旧IPC、不接触活动库。
沿用已授权8份设计稿与已校验的Qwen3-VL **2B**权重，本地服务使用旧默认中文提示、
1024像素PNG、温度0.6、1536/3072 token重试及8192上下文。8/8返回完整可解析JSON、
中文描述、英文提示词和中文标签；2份首次截断后重试完成。但标签中位数64.5，
结构成功不等于标签质量合格，也不能代表用户原Ollama/llama 8B模型。
边界对照将旧provider改为1280像素、4096上下文、温度0.2，2份均在重试后
仍截断于4096上下文；旧provider仍报告success并提取部分字段，新正式入口会拒绝残缺结果。
原8份文件哈希未变，本地服务已停止，临时原图与原始模型输出清理。
[脱敏复现记录](docs/product/LEGACY-PROMPT-REVERSE-REPRO-20260923.md)。

## 历史：用户授权8份设计稿的本地模型复测（2026-09-23）

用户允许使用1份PSD和7张图片复测已验证模型。本轮仅在权限受限的临时目录建立最长边1600像素的预览，
PSD只用合成图；8份原文件测试前后SHA-256一致。没有写入活动库/Eagle连接库、正式AI结果或provider配置，
没有向外部发送图片。原图、预览图及模型原文不入项目文档。

RapidOCR1.4.4：8/8执行成功，人工选取的33项可见文字锚点命中30项，其中R2的装饰小字仅1/4；
冷启动显著偏慢，重复调用约1.43秒。Florence-2：MPS 24/24任务完成，能概括部分主题，但对象标签多为笼统/重复类别且描述英文。
Qwen3-VL **2B＋llama.cpp**直连当前提示：1600预览仅1/8通过结构契约，5次截断、2次格式无效；
按当前正式预处理参数生成1280/JPEG85输入再测，仍1/8通过，但合格样本改变，其余7次截断。
定向诊断确认一次截断响应正好生成1800 token，未触及4096上下文上限。这不是旧Ollama 8B的测试，
也不是正式Electron入库8次失败。分离OCR并缩短输出的实验为8/8结构有效，
仍几乎全英文；纯中文约束定向3/3有中文描述/标签，但未覆盖余下5张，也未通过事实质量验收。
Qwen使用原有模型与投影文件，经固定SHA-256复核一致；模型服务已停止、18080端口关闭。

[完整脱敏验收记录](docs/product/LOCAL-AI-REAL-DESIGN-RETEST-20260923.md)。
当前结论：OCR可继续作为可修订专用证据；Florence对象标签和已测2B直连当前提示不放行默认中文自动分析。
没有修改正式提示/模型设置，RAM++/WD/CLIP仍未实测。

## 历史：生成图联合验收与Florence-2独立实测（2026-09-20至23）

当前用户要求继续本地AI测试验收。已复用此前获准Qwen/RapidOCR，在生成临时库完成真实Electron联动。
首次两次视觉分析成功，OCR/修订/手工描述保护、真实取消无晚写、进程重启恢复通过（17环节）。
复核时海报有一次有效结构校验失败；失败原样保留，软件未写入，OCR/用户内容仍保留。
Qwen仍主要输出英文并含冗余标签，所以数据边界通过不等于模型质量放行。
另用首次已保存真实结果验证了AI标签文件夹和反推提示词命中，零新推理、元数据未修改。

最终证据：成功轮KWQVXy、稳定性复核Q9MosU，已归档本轮产品记录。
模型服务已停止、18080端口关闭；未读取真实素材库，不改用户正式provider配置。

Florence-2 Large原生格式转换的固定revision/11个模型文件/25项wheel，共1,678,018,077字节，
用户于2026-09-23批准后已下载、逐文件复核、独立临时Python3.9离线安装。
禁用remote code与下载fallback，在生成6图上分别以CPU/MPS运行短描述、详细描述、对象检测；
两设备首轮均18/18无运行错误。对象检测初次被解析为空，定位到模型位置token之间的空白，
仅在评估器的对象检测解析前规范化后，两设备再各运行6/6，杯子/盆栽/笔记本检出，
但三圆抽象图误检为4个egg。纯白图描述产生笔记本等幻觉，输出为英文，
进程峰值RSS约4.36GiB（CPU）/4.66GiB（MPS）。因此离线执行通过，质量不放行默认分析；
旧Worker和正式素材库未接入，RAM++/WD/CLIP未下载或实测。

[本轮验收结论](docs/product/LOCAL-AI-ACCEPTANCE-20260920.md)
[Florence具体范围](docs/product/FLORENCE-EVALUATION-20260920.md)
Florence生成样本与CPU/MPS原始报告保存在 `docs/product/evidence/florence-20260923/`；
旧生成库临时恢复点已过期，持久证据见上述产品记录；Florence生成夹具和本机已校验模型的临时运行环境
仍可用于已授权范围内的复核，但临时目录可能被系统清理，不能当作正式安装状态。
未暂存/提交或改动无关代码；没有自动开始RAM/WD/CLIP下载或插件工作。
