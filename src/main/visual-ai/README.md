2026-09-30 Provider收尾：正常模型选择与prepare现在排除明确不可执行的Pi/Legacy订阅组合；Gateway/Worker再次校验准入。API与旧兼容路径保留、Host写入权不变。当前支持边界见../ai-gateway/PROVIDER-MATRIX.md。

2026-09-30 更新：Main 正式装配现在注入统一连接服务；显式 Pi 连接通过固定独立 Node/Pi Worker 执行，旧连接仍使用 HTTP Provider。任务默认模型、用量证据和单独确认的本机结果外部细化已接线。独立标签通过既有 Tag Controller 与 Host，视觉四字段输出不变。详见 [连接网关](../ai-gateway/README.md)。本轮使用生成图、真实临时 Host 和正式 Electron 的自有服务验证；真实模型/API/订阅、操作系统凭据库、Windows与安装包未验收。以下日期段保留各次原始实现背景。

# Visual AI

2026-09-27：任务01内部Provider抽取已接线。默认调用链为
`VisualAiController → runVisionRequest → openAiVisionProvider.invokeOnce → parseVisionOutput → Host`。
`runVisionRequest`独占1536→3072截断重试策略；Provider每次只发一个HTTP请求、
读取不超过512000字节的响应，不重试、不解析能力字段、不接触资料库。
Controller继续为每素材创建唯一计时器和取消信号，重试共享剩余时限。
Main组合根未增加配置：未注入依赖时使用上述HTTP Provider与系统时钟。

内部可注入`provider`与`clock`，用于通过正式Controller/真实临时Host测试行为。
`clock.scheduleTimeout`返回取消计时的函数；不创建Provider私有时限。
保留原内部`transport`整体替身入口，其显式设置优先于`provider`；生产装配不设置两者。
公共IPC、四字段输出、schema、UI与`visual-ai-v1`存储语义未变化，未启用tags-only。
新增验证入口：`node scripts/run-electron-node-test.mjs scripts/visual-ai-provider.integration.test.ts`。
它以生成素材/临时SQLite和注入Provider验证完整提交、人工保护、一次重试、
共同deadline、owner/取消/关开零晚写及通知失败保留成功；不运行真实模型或正式UI。

正式入口为 Library Inspector、卡片及原生卡片的 `VisualAiPanel`，通过
`visual-ai:*` IPC 调用本模块；旧全局 AI Worker/反推 aliases 不重新接线。
模块负责动作确认、批次、取消和有界 OpenAI-compatible 视觉 HTTP 请求。
不启动 Runtime，不下载权重，不自动选择其他 provider。

`prepare` 只读取当前库所选 1–8 个素材的受控预览，冻结 JPEG 字节、SHA、
服务配置、模型与 Library identity/generation。预览转为白底 RGB，最长边1024。
用户确认前无网络请求；五分钟单次 receipt 绑定发起窗口，原生卡片仅能分析
当前素材。服务配置变化、卡片撤销或 Library 切换使确认失效。

`run` 首先在 held Active Library lease 中显式启用 additive schema v2，然后
执行最多两个批次。每个素材含重试共享最多120秒、每次响应最多512000字节；拒绝重定向和无效
结构。请求前复核 Asset revision/preview，写入事务再次复核，取消阻止后续
提交。已有提交不会因为通知失败变成失败。手工描述始终优先，标签先成为
suggestion，用户逐项接受才增加 confirmed relation。历史视觉OCR证据保持可读；当前文字识别由专用OCR入口完成，其投影支持词法找回；
提示词可读取展示与词法搜索，采用为创作草稿仍由用户显式追加。未实现 embedding/语义搜索或图像编辑。

新库仍为v1。首次确认执行创建 `visual_ai_evidence` 与索引并升到v2；
v3持久下载库已包含此结构，AI enable不降级，读写与摘要投影兼容已知v2–v9；专用OCR从v8可用。
v1–v9均按精确schema打开。旧版应用不支持较新结构，不能把它描述为
可随意降级。证据包含模型、输入范围、版本和受限输出，无图片字节、密钥或
原件路径。未读取/升级真实用户库。

验证：`test-visual-ai-download-integration` 使用生成图片、临时库和loopback
合成HTTP服务覆盖传输、撤销、配置变化、手工保护、标签接受与v2重开。
Electron E2E覆盖正式窄Preload及原生卡片流程；合成响应不证明真实模型质量。

Main按本批素材ID读取元数据，执行每项前再单项复核，不为1–8张图构造整库列表。
确认页根据当前schema说明证据保存：v1提示按需升级v2，已有v2/v3/v4保持其版本。
这不改变素材外发确认、provider选择或模型能力证据的边界。

2026-09-20：素材查询提供可选 VisualAiSummary，取同revision/preview的最新有效完整结果；
当前建议标签与确认标签分开，派生AI文件夹不写成员表。证据列表与确认操作也检查preview。
详见 `docs/product/AI-DISCOVERY-20260920.md`。单模型输出质量和真实设备性能不由合成测试证明。


本地真实推理验收准备见 `docs/product/LOCAL-AI-EVALUATION-20260920.md`。
`test-local-visual-ai.ts`默认只生成测试图；显式批准模型执行后才调用loopback服务。
Llama视觉探测现在验证左右颜色而不接受任意非空文字，但仍不能代替模型质量评估。

此前真实Qwen2B生成图评估已完成两轮：3/4与4/4结构成功，但实验仍有无字图OCR幻觉，
不以此宣布模型产品质量通过。实验提示未部署；保留finish_reason=length的截断拒绝与明确错误反馈。
专用OCR/Florence/RAM/WD/CLIP现状见 `docs/product/BASELINE-AI-INVENTORY-20260920.md`。

2026-09-23：根据新旧provider对照，正式请求采用中文设计提示和紧凑输出，
要求中文描述/标签、英文提示词，最多8个标签，`ocrText`为空，文字识别由专用OCR完成。
现有输出字段/存储契约仍兼容最多30标签及历史OCR；提示语言/数量要求不是模型质量保证。
借鉴旧接口的1024预览上限和1536→3072 token有界重试，但保留JPEG85、温度0.2，
不声称完整复制旧参数。仅截断或未闭合JSON触发一次重试，重试进一步缩短输出要求，
使用相同图片、模型、服务和共同超时。确认页披露重试；不会扩增Runtime上下文、
启动服务、切换provider，HTTP错误与已闭合但无效结果不重试。

`vision-response.ts`兼容完整JSON、代码块、单对象说明文字和文本content分块；
拒绝截断、缺字段、歧义多对象及不合约输出，不采纳旧接口的残缺字段成功语义。
错误消息区分输出长度、格式、超时、权限、地址/模型、请求容量与限流，不透出服务原文。
`visual-ai-v1`现有存储契约保持不变；本轮仅调整内部请求和预览策略。

验证入口：`node scripts/run-ts-test.mjs scripts/visual-ai-transport.test.ts`、
`npm run test-visual-ai-download-integration`、
`node scripts/run-electron-node-test.mjs scripts/asset-ocr-storage.test.ts`。
9月23日合成服务验证通过不等于真实模型质量通过，当时真实8图及原8B模型尚未用本轮代码复测。
见 `docs/product/VISUAL-AI-BACKEND-HARDENING-20260923.md`。

2026-09-24真实复测完成：新transport在授权8图上，2B的4096/8192上下文均8/8完整，
均3份重试；新下载校验的官方8B Q4_K_M在8192上下文上analyze/reverse各8/8首次完整、
零重试，每份8个中文标签。两个模型的生成素材正式Electron真实推理/OCR联动各17环节通过。
8B更慢，仍有场景/用途推断；结构与数据链路通过不等于事实质量放行。
未改正式provider配置，未写真实用户库，测试服务已停，私有临时预览及原文已清理。
具体口径、耗时、下载完整性修复与脱敏证据见
`docs/product/QWEN3-VL-REAL-COMPARISON-20260924.md`。

C02B：共享面板已接独立标签任务保存/读取入口，详见[independent-tags](../independent-tags/README.md)。它不执行推理，不改变本模块四字段输出。v9旧能力兼容已用生成夹具/临时Host验证；不等于新标签writer已启用。

C03（最终验收待完成）：正式Main向综合与独立标签controller注入同一个VisualAdmission，所有视觉预览使用读前有界检查和独立codec进程。综合1536→3072及四字段输出保持；v10经同一Host标签代次/current规则，未持有效claim的旧直写拒绝。单份HTTP截止与review TTL区分，发送后的未知网络结局持久化为outcome-unknown；未发送时的排队超时不是远端未知。discard-review立即释放冻结材料，owner关闭也撤销尚在准备中的操作。更完整的范围与限制见independent-tags README和C03报告。
