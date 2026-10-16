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

## 职责与状态权威

连接/模型/执行资源归App Host，结果及人工内容最终归当前Library事务。GUI只表达能力意图与反馈，搜索系统拥有索引/查询；向量生成可使用AI执行资源，不把所有查询当生成推理。

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

先按任务读阶段/适用契约和README，从最小相关回归按消费者扩大；普通界面发起→实际推理→内容质量/证据→Host保存回读→适用取消/重开分列。仅目录/probe/JSON正确不能证明用户功能。新增约束/索引按[三层行为验收](../../CONTRIBUTING.md#document-retrieval-validation)；实际身份/限制见[CURRENT-STATE](../handoff/CURRENT-STATE.md)，步骤见[真实验收](../agents/ui-ux-acceptance.md)。
