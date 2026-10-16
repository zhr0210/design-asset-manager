# visual-ai：接口、状态与兼容细节

本页从模块原说明提炼技术契约，逐段身份见[映射](../../checkpoints/documentation-rebuild-20261015/module-migration.json)。当前入口/拥有者以[visual-ai](../visual-ai.md)和实际源码为准。

这些条款按其命名接口、schema/协议版本及平台条件适用；**旧“尚未接线/未运行/当时仅”等来源语句不是今日交付事实，也不要求恢复退休通道。** 旧数值的具体适用版本需核对当前实现；不能从摘要放宽数据/权限/取消保证。来源冲突按已确认的新契约精确替代范围处理。原始日期和验收全文保留在before.zip及历史模块快照，当前资格仅归CURRENT-STATE。

## 详细机制

<a id="p-003"></a>

以下为带日期的模块演进记录；Provider 限制见 ../ai-gateway/PROVIDER-MATRIX.md。

<a id="p-008"></a>

内部可注入`provider`与`clock`，用于通过正式Controller/真实临时Host测试行为。
`clock.scheduleTimeout`返回取消计时的函数；不创建Provider私有时限。
保留原内部`transport`整体替身入口，其显式设置优先于`provider`；生产装配不设置两者。
公共IPC、四字段输出、schema、UI与`visual-ai-v1`存储语义未变化，未启用tags-only。
新增验证入口：`node scripts/run-electron-node-test.mjs scripts/visual-ai-provider.integration.test.ts`。
它以生成素材/临时SQLite和注入Provider验证完整提交、人工保护、一次重试、
共同deadline、owner/取消/关开零晚写及通知失败保留成功；不运行真实模型或正式UI。

<a id="p-009"></a>

正式入口为 Library Inspector、卡片及原生卡片的 `VisualAiPanel`，通过
`visual-ai:*` IPC 调用本模块；旧全局 AI Worker/反推 aliases 不重新接线。
模块负责动作确认、批次、取消和有界 OpenAI-compatible 视觉 HTTP 请求。
不启动 Runtime，不下载权重，不自动选择其他 provider。

<a id="p-010"></a>

`prepare` 只读取当前库所选 1–8 个素材的受控预览，冻结 JPEG 字节、SHA、
服务配置、模型与 Library identity/generation。预览转为白底 RGB，最长边1024。
用户确认前无网络请求；五分钟单次 receipt 绑定发起窗口，原生卡片仅能分析
当前素材。服务配置变化、卡片撤销或 Library 切换使确认失效。

<a id="p-011"></a>

`run` 首先在 held Active Library lease 中显式启用 additive schema v2，然后
执行最多两个批次。每个素材含重试共享最多120秒、每次响应最多512000字节；拒绝重定向和无效
结构。请求前复核 Asset revision/preview，写入事务再次复核，取消阻止后续
提交。已有提交不会因为通知失败变成失败。手工描述始终优先，标签先成为
suggestion，用户逐项接受才增加 confirmed relation。历史视觉OCR证据保持可读；当前文字识别由专用OCR入口完成，其投影支持词法找回；
提示词可读取展示与词法搜索，采用为创作草稿仍由用户显式追加。未实现 embedding/语义搜索或图像编辑。

<a id="p-012"></a>

新库仍为v1。首次确认执行创建 `visual_ai_evidence` 与索引并升到v2；
v3持久下载库已包含此结构，AI enable不降级，读写与摘要投影兼容已知v2–v9；专用OCR从v8可用。
v1–v9均按精确schema打开。旧版应用不支持较新结构，不能把它描述为
可随意降级。证据包含模型、输入范围、版本和受限输出，无图片字节、密钥或
原件路径。未读取/升级真实用户库。

<a id="p-013"></a>

验证：`test-visual-ai-intake-integration` 使用生成图片、临时库和loopback
合成HTTP服务覆盖传输、撤销、配置变化、手工保护、标签接受与v2重开。
Electron E2E覆盖正式窄Preload及原生卡片流程；合成响应不证明真实模型质量。

<a id="p-014"></a>

Main按本批素材ID读取元数据，执行每项前再单项复核，不为1–8张图构造整库列表。
确认页根据当前schema说明证据保存：v1提示按需升级v2，已有v2/v3/v4保持其版本。
这不改变素材外发确认、provider选择或模型能力证据的边界。

<a id="p-016"></a>

本地真实推理验收准备见 `docs/product/LOCAL-AI-EVALUATION-20260920.md`。
`test-local-visual-ai.ts`默认只生成测试图；显式批准模型执行后才调用loopback服务。
Llama视觉探测现在验证左右颜色而不接受任意非空文字，但仍不能代替模型质量评估。

<a id="p-019"></a>

`vision-response.ts`兼容完整JSON、代码块、单对象说明文字和文本content分块；
拒绝截断、缺字段、歧义多对象及不合约输出，不采纳旧接口的残缺字段成功语义。
错误消息区分输出长度、格式、超时、权限、地址/模型、请求容量与限流，不透出服务原文。
`visual-ai-v1`现有存储契约保持不变；本轮仅调整内部请求和预览策略。

<a id="p-020"></a>

验证入口：`node scripts/run-ts-test.mjs scripts/visual-ai-transport.test.ts`、
`npm run test-visual-ai-intake-integration`、
`node scripts/run-electron-node-test.mjs scripts/asset-ocr-storage.test.ts`。
9月23日合成服务验证通过不等于真实模型质量通过，当时真实8图及原8B模型尚未用本轮代码复测。
见 `docs/product/VISUAL-AI-BACKEND-HARDENING-20260923.md`。

<a id="p-022"></a>

C02B：共享面板已接独立标签任务保存/读取入口，详见[independent-tags](../../../src/main/independent-tags/README.md)。它不执行推理，不改变本模块四字段输出。v9旧能力兼容已用生成夹具/临时Host验证；不等于新标签writer已启用。

<a id="p-023"></a>

C03（最终验收待完成）：正式Main向综合与独立标签controller注入同一个VisualAdmission，所有视觉预览使用读前有界检查和独立codec进程。综合1536→3072及四字段输出保持；v10经同一Host标签代次/current规则，未持有效claim的旧直写拒绝。单份HTTP截止与review TTL区分，发送后的未知网络结局持久化为outcome-unknown；未发送时的排队超时不是远端未知。discard-review立即释放冻结材料，owner关闭也撤销尚在准备中的操作。更完整的范围与限制见independent-tags README和C03报告。

<a id="p-025"></a>

The exact live maintenance hold may reserve a bounded private backup permit after all active preparation/request occupancy settles. Other barriers, resource danger, revoked holds and UNKNOWN Pi occupancy still refuse. The Windows resource adapter first reads actual OS memory and accounts through this same ledger; a fixed helper allowance is not an independently qualified native memory limit. No production backup/model grant is added. See [current handoff](../../handoff/WINDOWS-BACKUP-LIFECYCLE-20261004.md).
