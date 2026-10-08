# DAM 本地 AI 底层工程参考

2026-10-06。状态：源码调研与设计咨询，未实施；资源设计 Q13 已明确要求调整，随后 Q15–Q17 确认新增检索设计与已安装模型离线使用，新版整体共享理解尚未确认。本页补充 RAM/VRAM 协同之外的工程机制，具体设计收敛到 [底座设计草案](LOCAL-AI-RESOURCE-COORDINATION.md)，产品定位与稳定责任仍见 [产品基准](PRODUCT-FOUNDATION.md)、[技术架构](../../ARCHITECTURE.md)。

本次只读公开源码、官方文档与项目许可，没有安装项目、运行模型、访问用户资料、读取秘密或操作资料库。下述收益是迁移目的及后续验证方向，不能当作 DAM 已实现、质量已通过或性能已改善的证据。当前仓库事实中明确标注“已核对”的部分由主 Agent 本轮直接核对调用源码；其余缺口需在实际调用链确认。

## 先服务 DAM 的完整素材路径

DAM 的差异化来自收录后逐步理解、找回时解释证据、检查修正后安全复用。底层选择应帮助普通用户可靠完成这条路径：原图和人工内容不丢失，无模型仍可管理，失败不抹去旧有效结果，重开能找回，模型与推理来源可追溯。

这些参考各有职责：llama.cpp 是实际执行推理的引擎；Ollama 包装模型库存、服务和运行生命周期；Immich 把图像理解接到素材收录、后台处理与找回流程。DAM 要学习它们对用户有用的机制，保持自己的 Host、资料库与素材工作台，不整体照搬项目架构。

建议围绕下列八个方向补强既有底座。用户已通过 Q15 确认将检索底层也纳入本轮设计，通过 Q16 确认已验证模型继续离线可用，通过 Q17 确认中文文字/组合条件、语义文字和以图找三种路径；新版整体方案仍待确认，本页不启动实施。扩散项目的参考不增加图像生成，Ollama/vLLM 的参考不增加默认 daemon、Docker、Redis、通用 Agent 或向量平台。

| 方向 | 用户直接获得什么 | 与当前范围的关系 |
| --- | --- | --- |
| 1. 精确模型组合与可恢复制品 | 选对版本、投影和运行包；下载中断可恢复，升级失败保留旧版 | 当前模型设计；已确认已验证模型离线可用 |
| 2. 有界配方与受约束输出 | 标签、描述更少格式失败；超限有明确原因 | 当前分析底座可纳入，不降低已有严格校验 |
| 3. 执行身份与取消/恢复 | 取消某个任务不误伤其它能力；旧执行不覆盖新状态 | 保留已有语义，核对新原生 Adapter 等价性 |
| 4. 分层复用与版本化缓存 | 连续分析减少重复准备；换图、换库、换模型不串结果 | 当前性能设计可选择小范围接入 |
| 5. 渐进后台与有界批次 | 先能浏览，再补理解；回填可暂停、结果逐项可用 | 保留已实现的持久派发，补必要消费者协同 |
| 6. 可重建增量检索投影 | 大库查询不必每次读全库；文字、语义及以图找有依据 | Q15/Q17 已确认三种路径纳入本轮设计 |
| 7. 任务质量与版本回归 | 模型升级、量化或运行包变化可比较，不靠一次 probe 宣称全能力合格 | 当前模型验收可纳入；工具是否采用按收益决定 |
| 8. 可诊断的普通运行 | 看懂等待、失败、慢在哪里；诊断不泄露账号或原图 | 当前底座可纳入，技术细节留高级诊断 |

## 1. 精确模型组合与可恢复制品

**机制与来源。** Ollama 的 manifest 将权重、projector、template、system、license、params 分成内容摘要 layer；能力来自模型与投影、模板/parser 等的组合。llama.cpp 多模态需要语言模型与匹配 mmproj，且其多模态子项目明确可能发生兼容变化。因此“Qwen3-VL 4B”不足以作为执行身份：DAM 可绑定 runtime 构建/hash、模型及投影 revision/hash、tokenizer/template/processor、语言/视觉量化与语义限制。元数据宣称 vision 仍只是候选能力，不能代替真实图像资格。

源码：[Ollama layer](https://github.com/ollama/ollama/blob/8a971df3bacec93944ec894f2939fd2567afc5dd/manifest/layer.go#L26)、[能力推导](https://github.com/ollama/ollama/blob/8a971df3bacec93944ec894f2939fd2567afc5dd/server/images.go#L181)、[llama.cpp 多模态](https://github.com/ggml-org/llama.cpp/blob/8345f333951c661d166b00e6f9362e553768f292/tools/mtmd/README.md#L21)。

**现有可保留底座。** 主 Agent 已核对 [model-file-transfer](../../src/main/model-library-workspace/model-file-transfer.ts)：流式 hash、文件身份/mtime 前后复核、`.part`、严格 Range、`fd.sync` 与无覆盖发布；[managed-model-library](../../src/main/model-library-workspace/managed-model-library.ts) 已有发布意图 journal、rename 与 DB 事务、固定来源绑定和撤信任。应在这些路径扩 GGUF 组合和可复用内容身份，不另造模型注册表或第二套安装真相。

**缺口与收益。** 需核对组合指纹是否贯穿库存、资格、默认任务、尝试和证据，确保错投影/错模板在加载前得到解释，环境更新不偷用旧资格。内容寻址去重若采用，还要核对 Library/profile 归属、引用计数、磁盘成本与删除边界，不能用文件名相同判断相同制品。

**适用边界。** Ollama 分块下载完成后的 blob rename 不等于最终模型已通过完整 SHA；PullModel 完整复核后才发布 manifest。其 Windows manifest 替换回退含 remove→rename，不能据此承诺 DAM 的断电原子性。只借内容身份、恢复与最后发布引用的思路，保持 DAM 更明确的 journal/marker/fsync 语义。[下载](https://github.com/ollama/ollama/blob/8a971df3bacec93944ec894f2939fd2567afc5dd/server/download.go#L131)、[完整校验](https://github.com/ollama/ollama/blob/8a971df3bacec93944ec894f2939fd2567afc5dd/server/images.go#L1251)、[manifest 发布](https://github.com/ollama/ollama/blob/8a971df3bacec93944ec894f2939fd2567afc5dd/manifest/manifest.go#L1265)。

**已确认的离线方向。** 现有来源信任有 24h 窗口，明确验证/切换会在线复核上游；推理 worker 自身阻网，但上游资格过期仍可能阻本地加载。用户 Q16 已确认：已下载固定提交、已验证、未撤信任且本地未漂移的模型继续离线可用，资格不因在线检查超过 24h 而单独失效。目录更新/远程撤销检查新鲜度与本地运行资格分开；文件、依赖、环境变化或已知撤信任仍拒绝。断网无法获知新的远程撤销，清楚显示最后检查。这里记录新设计选择，现有代码尚未修改。

## 2. 有界配方与受约束输出

**机制与来源。** llama.cpp grammar、Ollama format/schema、vLLM structured outputs 可以限制生成形状，减少模型自行添加文字或遗漏结构的机会。它们仍需输出后的业务校验：llama.cpp schema 转换器对某些不支持的 regex 会警告并放宽为任意字符串；Ollama 官方示例在 schema 生成后仍做模型验证。vLLM 当前使用 `structured_outputs`，旧 `guided_json` 等不能按旧文章直接接入。

源码：[llama.cpp schema 限制](https://github.com/ggml-org/llama.cpp/blob/8345f333951c661d166b00e6f9362e553768f292/common/json-schema-to-grammar.cpp#L390)、[Ollama structured outputs](https://github.com/ollama/ollama/blob/8a971df3bacec93944ec894f2939fd2567afc5dd/docs/capabilities/structured-outputs.mdx#L80)、[vLLM 当前合同](https://github.com/vllm-project/vllm/blob/8bd7737a03bfcd4a1bca008f9f0e94729f8d67dc/docs/features/structured_outputs.md#L9)。

**现有可保留底座。** 主 Agent 已核对标签/描述配方的完整结构、字段、长度与截断拒绝，以及总时限内一次重试。现有 [managed_vision_worker](../../ai-service/tools/managed_vision_worker.py) 使用 AutoProcessor/chat template、CPU float32/SDPA；health 与真实双色资格已经分开。保留严格解析和内容分层，不以“模型输出 JSON”推断标签事实、OCR正确或任意执行授权。

**缺口与收益。** 当前 provider 接口尚无后端 schema/grammar 约束。新 Adapter 可显式声明支持的 schema 子集，配方同时冻结 schema、素材修订、受控输入视图、输出上限、context/图片覆盖、总时限与调用上限；成功仍走已有 Host 校验/事务。应测格式失败与重试的变化，并单独评价内容准确性。

**成本与边界。** 模型 tokenizer/template 不同会影响约束效果及 token 预算；不支持的 schema 要明确拒绝或落到已验证普通生成＋严格后验校验。context、图像与输出范围保持已确认要求，资源紧张不自动缩图、截上下文或降低质量标准。llama.cpp 输入超 context 的显式错误可用作“输入过大”和“暂时 busy”的分类参考。[输入检查](https://github.com/ggml-org/llama.cpp/blob/8345f333951c661d166b00e6f9362e553768f292/tools/server/server-context.cpp#L3395)。

## 3. 执行身份与取消/恢复

**机制与来源。** Ollama 对 loading/ready/no-slots/not-responding 等状态作区分，引用归零后按 keep-alive 回收；迟到的旧 PID 事件不能删新 runner。llama.cpp 的取消携带目标 task ID，仅释放对应 slot；vLLM 客户端断开会 abort 该 request，覆盖输出处理器和 engine。健康检查、执行完成、结果提交、取消确认与资源释放分别表达。

源码：[Ollama 生命周期](https://github.com/ollama/ollama/blob/8a971df3bacec93944ec894f2939fd2567afc5dd/server/sched.go#L394)、[llama.cpp 目标取消](https://github.com/ggml-org/llama.cpp/blob/8345f333951c661d166b00e6f9362e553768f292/tools/server/server-queue.cpp#L602)、[vLLM request 取消](https://github.com/vllm-project/vllm/blob/8bd7737a03bfcd4a1bca008f9f0e94729f8d67dc/vllm/v1/engine/async_llm.py#L766)。

**现有可保留底座。** 主 Agent 已核对 [basic-analysis-storage](../../src/main/background-analysis/basic-analysis-storage.ts)：evidence/current/outbox 同事务与幂等，重开 claimed→paused、sent→unknown。资源模块已有真正退出后释放，不把 stop 请求当退出。新原生路径需对齐这些语义，不能为了多 request 把它们拆成互不知情的新队列。

**缺口需核对。** 新 Adapter 的 request ID、执行实例 epoch、迟到事件、错误归类、取消粒度和释放证据是否完整；仅支持整实例退出的后端不能声称能独立取消共享实例中的一个请求。按实际用户路径验证取消标签、其它独立能力仍可用，重开不会盲目重发未知提交。

**适用边界。** 这是单 Host 的执行保护，不增加 tenant/远程服务平台。框架 API key、loopback 或 vLLM cache salt 不能替代 DAM 会话/角色/库权限；vLLM 官方安全说明也不承诺同实例 tenant 隔离。[安全边界](https://github.com/vllm-project/vllm/blob/8bd7737a03bfcd4a1bca008f9f0e94729f8d67dc/docs/usage/security.md#L553)。

## 4. 分层复用与版本化缓存

**机制与来源。** Immich 在一次 ML 请求中先 decode 图像，再将输入与模型依赖输出传给多个任务；模型缓存键含类、模型名与 graph/options，载入有锁。vLLM prefix cache 用父 block、tokens 及图像 hash/LoRA/salt 等附加身份，只保存完整 block；这与“相同 prompt 文本就复用全部输入”不同。

源码：[Immich 输入/依赖复用](https://github.com/immich-app/immich/blob/3f8cfe0b70ef3807753e5789907138cbd312072a/machine-learning/immich_ml/main.py#L166)、[模型缓存键](https://github.com/immich-app/immich/blob/3f8cfe0b70ef3807753e5789907138cbd312072a/machine-learning/immich_ml/models/cache.py#L17)、[载入锁](https://github.com/immich-app/immich/blob/3f8cfe0b70ef3807753e5789907138cbd312072a/machine-learning/immich_ml/models/base.py#L78)、[vLLM prefix identity](https://github.com/vllm-project/vllm/blob/8bd7737a03bfcd4a1bca008f9f0e94729f8d67dc/docs/design/prefix_caching.md#L15)。

**DAM 可迁移的层次。** 受控预览/解码材料复用、视觉编码/KV 加速缓存、已验证能力结果复用应分别记账。缓存键至少覆盖素材内容及输入视图修订、模型/runtime/template/processor、任务/配方/schema；模型空间、换库、撤权与用户编辑各有失效边界。一次基础分析的逻辑任务可独立提交，同时共享适用物理计算。

**现有底座与待核对。** 现有材料 scope、预览保护与结果 evidence 可保留；主 Agent 未找到通用跨素材推理 cache 的正式通过声明。需核对当前哪些 prepared input 已复用，先避免重复 decode/同模型重复准备，不从零建设跨框架张量池。

**收益与成本。** 目标是减少重复准备和 warm request 等待，测命中、prefill 工作量、实际等待与错复用。缓存增加内存/磁盘、失效与隐私成本；KV 是易失加速，不能充当业务完成记录。llama.cpp 提醒 prompt cache 受 batch 等影响不保证逐 bit 一致；不照搬默认大缓存当产品策略。[cache 行为](https://github.com/ggml-org/llama.cpp/blob/8345f333951c661d166b00e6f9362e553768f292/tools/server/README.md#L587)。

## 5. 渐进后台与有界批次

**机制与来源。** Immich 收录后分阶段做 metadata、preview、smart search、OCR 等；全库回填按有界批次流出资产 IDs，force 与补缺分开，队列有独立状态/并发/暂停。其源码给 dedup/jobId 的任务使用单个 add，因为 bulk 路径不能直接假定具备同一去重语义。vLLM token/encoder budget、chunked prefill/decode 优先可作为后续批处理思想，但不是 DAM 默认平台。

源码：[Immich 任务阶段](https://github.com/immich-app/immich/blob/3f8cfe0b70ef3807753e5789907138cbd312072a/docs/docs/administration/jobs-workers.md)、[补缺与 force 回填](https://github.com/immich-app/immich/blob/3f8cfe0b70ef3807753e5789907138cbd312072a/server/src/services/smart-info.service.ts#L67)、[批量/去重边界](https://github.com/immich-app/immich/blob/3f8cfe0b70ef3807753e5789907138cbd312072a/server/src/repositories/job.repository.ts#L198)、[vLLM 分段调度](https://github.com/vllm-project/vllm/blob/8bd7737a03bfcd4a1bca008f9f0e94729f8d67dc/docs/configuration/optimization.md#L49)。

**现有可保留底座。** DAM 已有持久 claim/outbox、独立能力、unknown 核对，不能把这些写成从零缺口。收录不等待 AI、旧有效结果不因重跑失败消失、人工内容优先也是产品基准。复用现有 SQLite/Host 权威，无需因为 Immich 使用 BullMQ/Redis/container 就引入它的部署结构。

**缺口需核对与收益。** 核对事件触发、素材/能力/输入版本去重、补缺范围、暂停后续跑、聚合失败提示，以及前台优先和后台批次是否统一使用资源意图。批处理必须返回各素材的独立结果/尝试，部分失败不回滚已正确提交的能力；先同模型有限复用，再考虑跨 request continuous batching。

**成本与边界。** 批次变大可能让取消与前台响应变差，prefill 与 decode 的权衡也不同。效果应同时看资产处理进展、前台任务完成/取消延迟和公平性；不以吞吐单指标准许无限并发，不自动回填未获启用的 embedding。

## 6. 可重建增量检索投影

**选择与来源。** Tantivy 是可嵌入的 Rust 搜索库，此次源码 Cargo 标示 0.27.0；比增加独立搜索服务更贴近单机 DAM，仍只作为机制参考。它提供单 writer lock、有界 indexing memory、操作序号、batch、commit、稳定 searcher 快照；更新是 delete＋add，在一次 commit 后统一可见。默认 delayed reader reload 不保证 commit 返回后的立即查询已见更新，需要显式 reload 或读代次合同。

源码：[writer/commit/batch](https://github.com/quickwit-oss/tantivy/blob/1783018f9e6c0ffa4a884df3812011d8d13e4b52/src/indexer/index_writer.rs#L760)、[原子可见更新示例](https://github.com/quickwit-oss/tantivy/blob/1783018f9e6c0ffa4a884df3812011d8d13e4b52/examples/deleting_updating_documents.rs#L101)、[reader reload](https://github.com/quickwit-oss/tantivy/blob/1783018f9e6c0ffa4a884df3812011d8d13e4b52/src/reader/mod.rs#L288)。

**当前已核对的真实缺口。** 正式共享界面 [Library](../../src/renderer/routes/Library.tsx) 调用 [asset-discovery.workflow](../../src/shared/workflows/asset-discovery.workflow.ts)，已搜索名称、文件名、确认标签/别名、有效 AI 建议、描述、OCR 和反推，并给出命中解释；当前显式传入 includes-pending。其输入来自全库 assets:list，逐项匹配并排序，metadata/AI/OCR 变化再次读取全库。另一个 [active-library-host](../../src/main/library-lifecycle/active-library-host.ts) searchAssets 同样先 readAssets 再 filter，但字段语义更窄。两条链目前没有正式索引分页或向量消费者；UI 的 500 ID 窗口切片不是检索分页。优化应统一 Host 查询、按页返回 IDs/修订/命中依据，再窄读权威投影，同时保留现有字段和明确的建议状态，不把索引变成资料或用户编辑的新真相。

**迁移设计。** 从已提交的元数据/有效证据产生可重建增量索引，保留提交水位、投影代次、批次范围与重放幂等；DB 与外部 index 不是天然同一事务。现有 AI 通知 outbox 的单一 delivered 字段不能直接当多消费者队列；索引使用独立 dirty/journal 或明确的消费者水位。索引落后/损坏应诚实显示覆盖或提供可用词法路径，重建不能破坏原件/人工状态。一次查询用稳定代次；人工保存后的新增内容可见，撤销/删除/修订后的旧命中经 Host 当前权威复核，不能为了快返回过时信息。

**模型空间与重建。** Immich 同维数换 CLIP 模型仍删除旧 embedding，并在晚结果写入前再核对 modelName，证明维数相同不能当同空间。但其源码仍有全库自动重建 TODO，不能据此声称它实现了无损代际切换。DAM 后续宜以精确模型/预处理身份建立新代次，核对覆盖后切换，保留适用旧结果；这是待设计建议，不是上游已实现事实。[Immich 模型变化与晚结果](https://github.com/immich-app/immich/blob/3f8cfe0b70ef3807753e5789907138cbd312072a/server/src/services/smart-info.service.ts#L34)。

**成本与范围。** Tantivy 本身不保证 ID 唯一，应用须维护；Rust/本机桥、打包 ABI、磁盘 merge、中文分词和字段排名各需实测。先比较现有 SQLite 的增量读索引是否足够，不默认换数据库。BM25/向量也不能自动解决中文、人工优先、条件筛选或命中解释。Q15/Q17 已确认中文精确/组合条件、语义文字与以图找纳入本轮设计；检索使用独立、经启用和验证的模型空间，现有 CLIP/SigLIP forward probe 与 Qwen 描述不能替代正式检索资格，未启动新版实施。

## 7. 任务质量与版本回归

**机制与来源。** promptfoo 支持多 provider/prompt/test-case 对照及确定性 JSON schema、字段/文本、finish-reason、延迟等断言；`is-json` 用完整 JSON.parse，`contains-json` 提取片段，两者不能混为同一完成标准。缓存可能使成本或时间比较失真，应明确选择新执行或缓存场景。内容语义仍需要有根据的参考与人工审核，不靠字面命中证明视觉事实。

源码：[确定性评测](https://github.com/promptfoo/promptfoo/blob/d4076fd92ef6fe763e4add85c0c38aa30832668b/site/docs/configuration/expected-outputs/deterministic.md)、[JSON 断言差别](https://github.com/promptfoo/promptfoo/blob/d4076fd92ef6fe763e4add85c0c38aa30832668b/src/assertions/json.ts#L8)、[本地 provider/评审配置](https://github.com/promptfoo/promptfoo/blob/d4076fd92ef6fe763e4add85c0c38aa30832668b/site/docs/providers/ollama.md#L240)。

**DAM 的质量门槛。** 基础格式/加载资格、具体任务质量、性能及真实产品路径分开。比较身份应记录模型/投影/runtime、量化、模板/processor、配方/schema、输入视图与评测样本版本。代表性公开素材覆盖照片/设计图/插画、中文与小字、无文字、透明图、相似素材、观察与推断边界；标签看有效主体与无据推测，描述看可核对事实覆盖，OCR看文字/位置及有效无文字，检索看已指定查询的命中与解释。

**现有底座与缺口需核对。** 保留真实双色 probe、严格配方校验和既有公开素材验收；一次 probe 不升级为所有任务质量证明。需核对可重跑的版本对照数据、基准输入/人工标注、运行包改变后受影响重验，以及保存结果/未知审计/人工内容保护是否一起核对。工具可只作开发评测依赖；如果既有测试足够，独立实现少量断言即可。

**成本与保护。** promptfoo 的 `similar` 默认用外部 OpenAI embedding，model-graded 断言也可能增加服务/费用。必须明确采用本地或已授权服务，指定公开材料和预算，不启动默认远端 judge，不读账号秘密，也不以另一模型评分替代必要事实核对。此页没有运行评测，没有新性能数字或质量承诺。

## 8. 可诊断的普通运行

**机制与来源。** Ollama 响应有 load/prompt-eval/eval duration/count，vLLM 区分 queue、TTFT、decode/ITL，llama.cpp 有 slots/metrics。不同指标定义需保留：vLLM 所引 per-request TTFT 从 scheduled 到首 token，排队时间另列；DAM 标签/描述的用户终点是完整有效结果保存，不是第一个 token 出现。

源码：[Ollama 指标](https://github.com/ollama/ollama/blob/8a971df3bacec93944ec894f2939fd2567afc5dd/api/types.go#L562)、[vLLM per-request metrics](https://github.com/vllm-project/vllm/blob/8bd7737a03bfcd4a1bca008f9f0e94729f8d67dc/docs/features/per_request_metrics.md#L49)。

**迁移收益。** 保留现有 request/attempt/evidence 审计，补有界的排队、输入准备、冷/热加载、视觉编码/prefill、生成、验证、提交和取消/释放时间，绑定实际执行与组合指纹。区分输入超限、依赖不支持、忙/资源不足、解析失败、运行时异常、未知提交，使 UI 给出可操作恢复，而高级诊断能定位到底层阶段。

**现有底座与待核对。** 构建身份、实际模型结果和中断记录应继续作为证据线索；端到端耗时分解、运行时错误码归一和来源版本可读性需核对当前消费者。日志不能记录 Cookie、令牌、完整认证回调、环境或原始私人素材；普通状态展示等待/失败原因，详细诊断按范围导出，不能变成任意文件/终端入口。

**成本与边界。** 测量本身有开销，sample/日志保留有界；不开启默认全量 trace/持续 profile。用普通应用启动、真实任务与保存重开绑定版本；框架 benchmark、研究脚本或可编译不能关闭用户结果。

## 固定来源与采用边界

| 固定公开来源 | 许可原文 | 可采用与参考的区别 |
| --- | --- | --- |
| llama.cpp `8345f333951c661d166b00e6f9362e553768f292` | [MIT](https://github.com/ggml-org/llama.cpp/blob/8345f333951c661d166b00e6f9362e553768f292/LICENSE) | 固定受测原生运行包/适配器是直接候选，仍核实际依赖、平台和模型许可 |
| Ollama `8a971df3bacec93944ec894f2939fd2567afc5dd` | [MIT](https://github.com/ollama/ollama/blob/8a971df3bacec93944ec894f2939fd2567afc5dd/LICENSE) | manifest/生命周期思想可借；用户明确配置本地服务可适配，不默认打包整套 daemon/registry |
| vLLM `8bd7737a03bfcd4a1bca008f9f0e94729f8d67dc` | [Apache-2.0](https://github.com/vllm-project/vllm/blob/8bd7737a03bfcd4a1bca008f9f0e94729f8d67dc/LICENSE) | token 预算/cache/结构化输出作为参考；不默认引入面向服务器的平台及 GPU 环境 |
| Immich `3f8cfe0b70ef3807753e5789907138cbd312072a` | [AGPL-3.0](https://github.com/immich-app/immich/blob/3f8cfe0b70ef3807753e5789907138cbd312072a/LICENSE) | 依据已确认宽松许可策略，独立实现流水线/失效/批次思想，不复制其 AGPL 实现或部署栈 |
| Tantivy `1783018f9e6c0ffa4a884df3812011d8d13e4b52`；Cargo 0.27.0 | [MIT](https://github.com/quickwit-oss/tantivy/blob/1783018f9e6c0ffa4a884df3812011d8d13e4b52/LICENSE) | 借增量、commit 与稳定快照；后续是否直接用库以实测需求及本机集成成本决定 |
| promptfoo `d4076fd92ef6fe763e4add85c0c38aa30832668b` | [MIT](https://github.com/promptfoo/promptfoo/blob/d4076fd92ef6fe763e4add85c0c38aa30832668b/LICENSE) | 可选开发评测工具，保留通知；provider/judge/remote kernel 权限与模型许可另核 |

固定提交是本次源码观察点，不等于应该立即安装该 main 构建，也不证明某个模型/平台组合已获运行资格。直接复用宽松许可代码需保留通知与相应义务；独立学习概念不等于允许复制 GPL/AGPL 实现。“开源可商用”或“分开进程”都不能自动证明与 DAM 的发行方案兼容。资源项目的固定来源及特定 PyTorch/allocator 边界继续见 [资源设计](LOCAL-AI-RESOURCE-COORDINATION.md)。

## 已确认选择与下一步

- Q15：检索底层也纳入本轮设计，具体范围由 Q17 确认；不将参考项目的全部搜索能力变成队列。
- Q16：已验证、固定提交、未撤信任且本地未漂移的模型继续离线可用；在线检查过期不单独撤销资格。文件/依赖/环境变化或已知撤信任仍拒绝，显示最后远程检查，断网不声称知道新撤销。现有 24h 行为尚未修改。
- Q17：中文名称/标签/描述/OCR 的精确和组合搜索、自然语言语义找图、以图找相似素材均纳入本轮设计。语义/以图找使用独立本地检索模型，经用户启用后准备；模型/索引变化保留可用搜索和可解释覆盖状态。复用现有 Hybrid Asset Search Plan、Active Embedding Space、Canonical Embedding Result 和 ANN Search Index 术语及 ADR 0181–0184，不重复建模。
- 用户随后明确：语义检索覆盖中英文。模型选择、资格、质量对照和空间迁移验证包含中文/英文/中英混合查询及跨素材描述/标签语言找回；公开多语言声明或默认LLM翻译不能代替真实双语能力证据。

Q7–Q12 已确认的质量/输入不降级、同模型自动选择已验证加载方案和宽松许可策略保持；消费者范围由 Q15/Q17 明确增加检索，不增加图像生成。主 Agent 已将可采用机制、接口责任与验收收敛到新版底座草案，得到整体共享理解后再连续实施；本页没有新 ADR、产品修改或验收完成声明。
