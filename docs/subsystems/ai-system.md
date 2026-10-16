# AI能力与执行

从连接、模型到请求、执行和结果的完整系统说明。标签、描述、OCR、反推/深度分析可共享基础设施，但输入、许可、证据与人工状态保持各自身份；Pi、模型制品和Runtime不是同一种对象。

## 按任务与阶段定位

| 问题 | 章节 | 谁不拥有这项权威 |
| --- | --- | --- |
| 提供方/账号/协议配置 | [连接与账户](#connections) | Pi不拥有Library/任意素材/工具权限 |
| 模型来源/库存/校验/选择 | [模型制品](#models) | 安装完成不等于启用/推理或外发许可 |
| 基础分析、后台范围/attempt/current | [能力请求与提交](#requests) | 单次executor成功不等于Host已提交 |
| OCR空结果/修正 | [OCR](#ocr) | 有效无字不是失败，旧结果不能覆盖人工修正 |
| 深度分析/反推/派生工具 | [视觉能力](#visual) | 创作推演不是事实，工具不覆盖Original |
| 预算、Worker/驻留、取消/物理退出 | [执行与资源](#execution) | Promise结束不等于资源已释放 |
| 本地/本机服务/远端怎样分界 | [执行位置与控制权](#inference-targets) | 协议或localhost不能决定进程/模型控制权 |
| “模型调度”指选模型还是运行顺序 | [四项职责与代码拥有者](#scheduling-ownership) | 路由、任务排程、驻留和资源准入不互相授予权限 |

## 职责与状态权威

DAM自身的连接配置、受管模型与执行资源由App Host协调，独立本机服务/远端服务不因此转移其模型或设备控制权；结果及人工内容最终归当前Library事务。GUI只表达能力意图与反馈，搜索系统拥有索引/查询；向量生成可使用AI执行资源，不把所有查询当生成推理。

<a id="inference-targets"></a>
## 执行位置与控制权

本地/外部推理保留共用的能力请求、许可、验证和Host提交链，但执行适配与准入条件按下表区分。2026-10-16用户确认这一职责方向；这是文档/契约分工，不代表三路径已统一成完整新API或全部产品资格已验。

| 推理目标 | DAM可负责的范围 | 不能假定拥有的权力/证据 |
| --- | --- | --- |
| DAM管理的本地Runtime | 对自有模型实例按验证计划加载、驻留、准入、停止/实际退出及回收；设备资源和进程身份绑定 | Promise/取消ACK不能代替物理释放；不能跨Runtime任意操作别人的allocator |
| 用户启动/独立管理的本机服务 | 连接与请求资格、客户端并发/超时、可观察状态，以及协议明确且用户允许的管理动作 | 地址在localhost不授予杀进程/卸载共享模型/回收全部显存权；不能干扰其他软件消费者 |
| 远端API或推理服务 | 身份/目的地/外发许可、实际请求与返回、服务配额/费用/限流和取消状态 | 不拥有远端设备/显存；断开请求不证明远端停止或零费用，限额未知不能标作硬保证 |

协议适配（Pi、OpenAI兼容HTTP、私有Worker等）、执行位置和控制权是不同维度。相同HTTP协议可连接本机或远端；本机代理也可能外发，不能仅凭URL证明隐私边界。控制权不明时按无进程/模型管理权处理，并核对实际目的地/服务策略；不能补造已获授权。

远端推理同样消耗本机图像准备、编码、缓存、序列化、网络缓冲、临时Worker和结果解析资源；这些仍计Host本地预算。它不计本地模型驻留，外部并发/RPM/TPM/费用也不是RAM/显存账本。此分界不授权新增云端服务、购买、下载模型或静默本地/远端fallback。

<a id="scheduling-ownership"></a>
## 四项职责与代码拥有者

避免以“模型调度”统称下列不同操作。逻辑边界不要求四个服务/进程或四个新目录；现有模块可共同实现不同职责，但状态和改变语义的权限必须可区分。

| 职责 | 作出的决定 | 当前源码/接口拥有者与状态 |
| --- | --- | --- |
| 模型选择与路由 | 为能力确定提供方、模型和适用参数/目的地，形成Task Model Binding；与用户选择/许可一致 | [TaskModelSettings](../../src/renderer/components/asset/TaskModelSettings.tsx)保存任务默认；[basic-analysis.resolveRule](../../src/main/background-analysis/basic-analysis-controller.ts)解析能力绑定，[Visual Controller](../../src/main/visual-ai/visual-ai-controller.ts)冻结review；[连接服务](../../src/main/ai-gateway/ai-connection-service.ts)按绑定调用。未据此声称已有通用自动路由/最优模型选择器 |
| 任务调度 | 哪个能力/分析单元先运行，前台/后台、等待、暂停与重试怎样衔接 | [后台控制器](../../src/main/background-analysis/background-analysis-controller.ts)拥有后台claim/持续规则，[基础分析](../../src/main/background-analysis/basic-analysis-controller.ts)协调能力attempt；[Governor](../../src/main/local-ai-resources/resource-governor.ts)的acquire/pump安排资源等待者。当前有foreground/background队列机制，不等全部ADR目标的全局任务优先/aging已完成 |
| 模型驻留管理 | 已选模型的加载、复用、空闲回收、停止和实际终态 | [managed-vision-runtime](../../src/main/services/ai-runtime/managed-vision-runtime.ts)保留实例/状态及releaseIdle/stop实际回收；OCR/retrieval/Pi有各自真实拥有者。Governor记录reserveResident占用和UNKNOWN，不替Runtime证明已释放；独立本机服务须另按服务能力/许可处理 |
| 资源准入与协调 | 系统当前能否安全开始准备/执行，预算/设备余量/请求槽与压力约束是否满足 | Host的[createLocalAiResourceGovernor](../../src/main/local-ai-resources/resource-governor.ts)、[VisualAdmission](../../src/main/visual-ai/visual-admission.ts)协调本地资源；[createGgufLoadPlan](../../src/main/local-ai-resources/gguf-load-plan.ts)生成已选制品的装载候选，Runtime保留allocator/真实回收权。外部服务限额/费用约束须按实际服务另核对，不能从本地permit推定 |

规划可反馈资源可行性给模型选择层，但一旦某单元绑定冻结，资源优化只能在其验证过的执行安排中调整；不能偷偷改变checkpoint、权重量化、输入覆盖、输出标准或外部目的地。资源不足可等待/暂停/拒绝对应操作，或向用户/已批准选择策略提出重规划；没有授权不能改用更小模型或云服务。

模型驻留与一次计算、准备材料与请求slot各有生命周期；释放请求permit不代表驻留已回收，停止ACK也不代表实际close。资源可用不会恢复已撤销的库/素材权限。一个Host协调跨Runtime总体预算，各Runtime保留自身真实模型/allocator、KV缓存/逐步计算与可支持的回收操作；不建设虚构共享张量池或让DAM重做底层引擎调度。

既有[0173](../adr/0173-local-ai-uses-one-global-resource-governor.md)给出全局本地协调目标；[0492](../adr/0492-host-resource-coordination-keeps-runtime-allocators-owned.md)仍为Proposed、整体方案待确认。本轮只确认上述职责/路径分界，不把0492所有回收/offload/重试方案标成Accepted或已实现，也不采用旧“未实现”摘要否认当前已存在的Governor/managed路径。

## 正式入口与运行链

连接/账号与模型准备 → 正式详情/设置后台策略发起能力请求 → 冻结素材/来源/配置和许可 → 资源准入 → 对应Pi/GGUF/OCR/其他executor → 按能力验证 → claim/修订/权限复核 → Library事务证据/current/outbox → GUI回读。开始执行、得到响应、提交、通知、物理释放不是同一个状态。按下表阶段定点阅读，不要求一次全读所有实现。

<a id="connections"></a>
### 连接、账户与协议

**职责与状态权威。** Main持有连接、账号生命周期与安全凭据接口；Pi独立Node Worker适配允许协议，不拥有Library提交、任意工具或素材读取权。模型目录/安装与连接配置、执行许可、外发范围彼此独立。

**正式入口与运行链。** 设置的连接/账号操作→可信Main→正规登录/安全存储→冻结某次能力的provider/model/effort→已封印Pi资源一动作一进程→有界私有stdio响应→调用者验证并由Host保存。Agent诊断只看非敏感结果。

**失败、取消与兼容保护。** 登录回调到达不等于凭据提交；撤销/目标变更/退出按对应身份收敛。配置漂移不能沿用旧review，已有连接不代表任意资料可外发。失败分类/未知提交保留，不静默切换额外计费服务。

**技术与平台边界。** Pi资源按平台Node、锁、完整文件清单和Main摘要绑定；依赖改变须生成器重新seal并验证产物，不能手改摘要求通过。DAM使用Pi Worker的模式与Magpie自建provider/gateway、适配Pi客户端的模式不同。

<a id="models"></a>
### 模型制品与正式库存

**职责与状态权威。** 正式managed模型库存/来源/恢复传输归App Host；模型制品是数据，Runtime包是执行依赖。独立签名Catalog核心/registry/pilot有各自受限Seam，不能把其未交付安装能力推断为正式managed库存不存在。

**正式入口与运行链。** 设置→本地模型与OCR→Main命名动作→目录/固定revision与完整SHA→受管恢复传输/只读引用或复制→完整校验→库存→单独加载/验证/启用。签名官方目录走独立release pin与信任根校验；开发缺签名输入时相应页面fail closed，不否认其他managed入口。

**失败、取消与兼容保护。** 下载完成、结构正确、预计适合、运行支持、真实执行通过是不同事实。损坏/环境漂移/撤信任拒绝，临时远端不可用不删除旧内容。暂停/重开不自动恢复，升级失败保留旧制品；不执行仓库代码/pickle/隐含下载。

**技术与平台边界。** 正式来源依既有境内镜像策略逐跳校验，旧huggingface文件名仅兼容命名。平台、量化、CPU/GPU/Metal方案分别验证；本轮开发验收只使用已有权重，不触发模型下载。签名发行仍受独立发布范围。

<a id="requests"></a>
### 能力请求、后台与结果提交

**职责与状态权威。** Host拥有持久请求、attempt、每能力证据/current、决策及outbox；Main控制器负责输入/调用/提交协调。标签、短描述、OCR是可独立完成/重跑的基础能力；反推不是基础分析自动附带输出。

**正式入口与运行链。** 正式详情单项/一键基础分析或设置后台规则→命名IPC→冻结能力/来源/配置→资源准入→实际executor→验证→claim-fenced事务证据/回执→事件回读。后台启用有独立确认，只处理规则范围的新素材，不因旧收集开关自动回填。

**失败、取消与兼容保护。** 人工编辑/确认/拒绝优先，迟到结果可历史保留但不抢current。资源不足等待，不凭空增加attempt。已发送未确认保持unknown，重开不自动重发；未发送可按新session重新准入。暂停/关库/退出撤销新准入并收敛子任务，成功回读/通知重放不再次推理。

**技术与平台边界。** 手动/后台共享实际执行与资源账本，本地OCR可独立准入。历史Worker poller只是旧lane，不能套到全部Pi/managed执行。真实质量、用量未知和取消费用分别记录。

<a id="ocr"></a>
### OCR执行与人工修正

**职责与状态权威。** OCR控制器拥有识别生命周期，持久结果及人工修正归当前Library Host；结果中的文字、位置、语言/配方证据与人工文本分别保存。当前能力不由旧FastAPI OCR通道是否启用决定。

**正式入口与运行链。** 正式详情/基础分析/后台OCR→受限asset-ocr动作→当前素材/预览/环境资格→资源准入→自有私有Worker→校验有效文字或有效空结果→Host保存→回读。安装/环境验证、执行资格和识别质量是不同状态。

**失败、取消与兼容保护。** 已验证空结果不退回旧文字；失败/不支持不冒充空结果。人工修正优先，旧代次不得覆盖。取消与环境/库变更收敛真实进程，物理close前占用保留；输入/等待/失败反馈按UI规格检查。

**技术与平台边界。** RapidOCR等通过实际可信Python及已存在模型运行，Darwin与Windows资源测量/依赖分别验证。不因目录在场自动下载或安装依赖权重；测试缺模型仅保留对应缺口。

<a id="visual"></a>
### 深度分析、反推与图片工具

**职责与状态权威。** 界面表达具体能力意图，Main拥有受控预览、review/执行与身份校验，Host拥有证据与提交。深度分析、反推、独立标签、基础描述不能因共用模型而混为一条无边界结果。

**正式入口与运行链。** 素材详情/获授卡片→VisualAiPanel准备/确认→visual-ai-controller→按当前连接调用Pi/managed或既有传输→解析/验证→Host存证→回读。图片工具产生受控派生/新素材时复用Copy/variant入口，不覆盖Original。

**失败、取消与兼容保护。** 冻结目标、来源、配方和配置；权限/代际/owner变化撤销review。未知远端结果不能标未执行重试，取消保留此前线性化提交；失败留旧有效结果和输入。反推文本命中不等于画面事实，用量/截断/实际调用次数如实表示。

**技术与平台边界。** Pi是协议执行Worker，本地推理由自有Runtime承担；不因为一个openai-compatible文件名推定全部厂商相同。共享UI、真实模型质量和原生卡片交互分别验收。

<a id="execution"></a>
### Runtime、资源准入与物理退出

**职责与状态权威。** Host资源账本区分模型驻留、准备/计算及临时材料。具体运行器拥有自有进程、私有协议和真实释放句柄。Pi、GGUF、OCR、retrieval有不同执行路径，不能由统一ready标签授予全部能力。

**正式入口与运行链。** 能力请求→当前配置/制品/环境指纹→完整预算→准入→自有进程加载/验证/执行→结果交给Host→物理close后释放。前后台共享预算，准备保护由真实拥有者finally解除，但不提前释放仍存活的驻留。

**失败、取消与兼容保护。** 压力/未知采样拒绝新增危险准入；取消/超时发出停止后仍等真实close。旧launch清理不确认替代进程退出，退出未知保留隔离。idle回收和关库/退出有独立生命周期，失败不能假归还许可。

**技术与平台边界。** macOS使用Metal/共享RAM和libproc观测，Windows CUDA/CPU与原生Job等按实际路径；监测/终止不冒称硬OS上限。32个旧Runtime/branch/probe通道及通用Runtime Package生产入口由disabled-app拒绝；保留源码/测试不是当前入口。

## 失败、取消与兼容保护

每阶段分别识别无配置/无模型、等待、有效空结果、失败、取消和UNKNOWN；不以一个ready代替所有资格。人工优先、来源/库代际/owner失效即撤权；旧attempt不抢current，未知提交不自动重发，物理退出未知保留隔离与资源占用。细则和例外保留在所属阶段。

## 技术与平台边界

macOS Metal/统一内存与Windows CPU/CUDA/原生约束分别验证，Pi只适配允许协议、不替代本地加速/调度。普通CI的隔离不替代真实AI验收；只使用现有模型，不下载补齐或更新权重。旧FastAPI/poller/禁用Runtime通道按原阶段限定，不代表全部正式能力未实现。外部接口/SDK值核对实际安装与原始资料。

## 源码与详细机制

### 当前边界与待核对范围

现有[AiBackendConfig](../../src/shared/types/ai-backend.types.ts)分别保存processingLocation、transport、provider/auth等信息，但没有上述三类控制权的统一显式字段；[Visual Controller](../../src/main/visual-ai/visual-ai-controller.ts)含位置/URL分类逻辑，其存在不证明可识别任意代理背后的真实目的地。用户服务生命周期权限、全服务配额调度和完整全局策略覆盖仍需按具体消费者核对，不能把目标图转记为当前架构已全部落实。

本轮不新建调度器、不移动产品代码或修改数据库/运行接口。后续代码任务先沿上表定位实际消费者/重复责任，只有发现具体契约缺口才决定重构；不为文档四个职责强制造四层平台。

### 外部项目参考的适用范围

| 参考 | 本次核对的分工 | 对DAM的适配边界 |
| --- | --- | --- |
| [Open WebUI连接](https://docs.openwebui.com/getting-started/quick-start/) | Ollama与OpenAI兼容连接可进入统一模型/使用入口 | 接入方式不等执行地点，应用层不因接入就拥有推理进程 |
| [LiteLLM请求架构](https://docs.litellm.ai/docs/proxy/architecture) | 认证/预算/请求限流、模型部署路由、Provider参数转换分别组织 | 借鉴请求层分工，不照搬自动回退、重试或将其限额当物理GPU调度 |
| [Ollama Scheduler](https://github.com/ollama/ollama/blob/main/server/sched.go)、[并发/驻留说明](https://docs.ollama.com/faq) | 已装载runner、队列、并行和装载/卸载由推理服务协调 | 若DAM仅是它的客户端，不能建立第二套不受其执行器确认的物理显存账 |
| [vLLM架构](https://docs.vllm.ai/en/latest/design/arch_overview/) | Engine Core安排请求/KV缓存，Worker持有权重/执行/设备内存 | Host跨Runtime协调与引擎内部执行不同层，不照搬服务集群架构进桌面应用 |

上述为2026-10-16核对官方文档/源码后的参考分析，不声明DAM依赖这些框架或已取得其能力；具体API/版本变动实施时另核验。

源码按阶段链接定位；下面是去重后的源/测试入口集合，不是本轮已执行或必须每次全跑的清单：

- [src/main/ai-gateway/README.md](../../src/main/ai-gateway/README.md)
- [src/main/ai-gateway/PROVIDER-MATRIX.md](../../src/main/ai-gateway/PROVIDER-MATRIX.md)
- [src/main/ai-gateway/ai-connection-service.ts](../../src/main/ai-gateway/ai-connection-service.ts)
- [src/main/ai-gateway/pi-runtime-host.ts](../../src/main/ai-gateway/pi-runtime-host.ts)
- [pi-runtime/README.md](../../pi-runtime/README.md)
- [src/main/ipc/ai-connection.ipc.ts](../../src/main/ipc/ai-connection.ipc.ts)
- [pi-runtime/worker.mjs](../../pi-runtime/worker.mjs)
- `npm run test-prompt-reverse-workflow`
- `npm run test-openai-compatible-provider`
- `npm run test-llama-openai-backend`
- `npm run test-python-unittest`
- `npm run test-ai-runtime-status-workflow`
- [src/main/model-library-workspace/README.md](../../src/main/model-library-workspace/README.md)
- [src/main/model-library-workspace/managed-model-library.ts](../../src/main/model-library-workspace/managed-model-library.ts)
- [src/main/model-library-workspace/china-model-mirror.ts](../../src/main/model-library-workspace/china-model-mirror.ts)
- [src/main/model-library-workspace/model-file-transfer.ts](../../src/main/model-library-workspace/model-file-transfer.ts)
- [src/main/model-library/README.md](../../src/main/model-library/README.md)
- [src/main/model-library-workspace/model-library-workspace.composition.ts](../../src/main/model-library-workspace/model-library-workspace.composition.ts)
- `npm run test-legacy-model-management-containment`
- `npm run test-model-acquisition-local-only`
- `npm run test-model-artifact-readiness`
- `npm run test-model-artifact-readiness-display`
- `npm run test-model-library-catalog-admission-tracer`
- [src/main/background-analysis/README.md](../../src/main/background-analysis/README.md)
- [src/main/independent-tags/README.md](../../src/main/independent-tags/README.md)
- [src/main/background-analysis/basic-analysis-controller.ts](../../src/main/background-analysis/basic-analysis-controller.ts)
- [src/main/background-analysis/background-analysis-controller.ts](../../src/main/background-analysis/background-analysis-controller.ts)
- [src/main/ipc/main-ipc-composition.ts](../../src/main/ipc/main-ipc-composition.ts)
- `npm run test-ai-client-ipc-contract`
- `node scripts/run-ts-test.mjs scripts/ai-result-sync-projector.test.ts`
- `node scripts/run-ts-test.mjs scripts/ai-tag-suggestion-sync-sink.test.ts`
- [src/main/ocr/README.md](../../src/main/ocr/README.md)
- [src/main/background-ocr/README.md](../../src/main/background-ocr/README.md)
- [src/main/ocr/ocr-controller.ts](../../src/main/ocr/ocr-controller.ts)
- [src/main/ocr/ocr-runtime.ts](../../src/main/ocr/ocr-runtime.ts)
- [src/main/ipc/asset-ocr.ipc.ts](../../src/main/ipc/asset-ocr.ipc.ts)
- `npm run ci:test-runtime-safety`
- `npm run test-node-host-platform-defaults`
- [src/main/visual-ai/README.md](../../src/main/visual-ai/README.md)
- [src/main/visual-ai/visual-ai-controller.ts](../../src/main/visual-ai/visual-ai-controller.ts)
- [src/main/visual-ai/openai-vision.transport.ts](../../src/main/visual-ai/openai-vision.transport.ts)
- [src/renderer/components/asset/VisualAiPanel.tsx](../../src/renderer/components/asset/VisualAiPanel.tsx)
- [src/main/ipc/visual-ai.ipc.ts](../../src/main/ipc/visual-ai.ipc.ts)
- [src/main/image-tools/README.md](../../src/main/image-tools/README.md)
- [src/main/services/ai-runtime/README.md](../../src/main/services/ai-runtime/README.md)
- [src/main/services/ai-runtime/managed-vision-runtime.ts](../../src/main/services/ai-runtime/managed-vision-runtime.ts)
- [src/main/local-ai-resources/resource-governor.ts](../../src/main/local-ai-resources/resource-governor.ts)
- [src/main/visual-ai/visual-admission.ts](../../src/main/visual-ai/visual-admission.ts)
- [src/main/retrieval-workspace/retrieval-runtime.ts](../../src/main/retrieval-workspace/retrieval-runtime.ts)
- [src/main/ipc/disabled-app.ipc.ts](../../src/main/ipc/disabled-app.ipc.ts)
- `npm run test-ai-console-status-module`
- `npm run test-ai-python-environment`
- `npm run test-ai-python-runtime-host-context`
- `npm run test-ai-runtime-host-context`

## 验证与维护

边界变更至少按实际影响检查：相同HTTP协议下的三类目标、资源不足且保持原绑定/目的地、前后台排程、空闲/活动驻留、取消后延迟close/旧launch、远端未知结果/限额及本地准备占用。检查选[资源策略回归](../../scripts/ai-resource-policy.test.ts)、[VisualAdmission集成](../../scripts/visual-admission.integration.test.ts)、[managed负向](../../scripts/managed-vision-negative.test.ts)、[实际进程runner](../../scripts/real-ai-runtime-process-runner.test.ts)等适用入口，不据链接称本轮已跑或全部服务已验。正式测试只用现有模型并遵守已明确资料/服务范围。

先按任务读阶段/适用契约和README，从最小相关回归按消费者扩大；普通界面发起→实际推理→内容质量/证据→Host保存回读→适用取消/重开分列。仅目录/probe/JSON正确不能证明用户功能。新增约束/索引按[三层行为验收](../../CONTRIBUTING.md#document-retrieval-validation)；实际身份/限制见[CURRENT-STATE](../handoff/CURRENT-STATE.md)，步骤见[真实验收](../agents/ui-ux-acceptance.md)。
