只读核对结果：应从统一的 [AI能力与执行](docs/subsystems/ai-system.md) 按阶段排查；旧 `ai-analysis.md`、`ocr.md`、`ai-runtime.md` 已是兼容跳转。取消后的资源占用不能直接定性为泄漏：请求取消、结果提交、物理进程退出、模型驻留回收是不同状态。

当前链路：

1. 正式详情基础分析／设置后台规则 → Main 命名 IPC。
2. `background-analysis-controller.ts` 获取 Host 后台 claim，调用 `basic-analysis-controller.ts:377` 的 `runBackground`，登记请求并绑定后台 claim。
3. 按能力分发：标签复用独立标签 executor；OCR 复用 OCR controller；短描述走基础分析 provider。
4. 冻结素材／预览／配置 → 共享资源准入 → 准备模型 → 持久化 sent → 实际调用。
5. 验证响应 → Host claim-fenced 事务保存证据、current、receipt/outbox → GUI 回读。
6. 取消通过 `AbortSignal` 向下传递；子进程真实 close 后才能归还占用。已提交结果保留，迟到结果不得覆盖人工修正或新 current。

建议按以下次序安排：

| 优先项 | 具体核对 | 判断依据 |
|---|---|---|
| P0：确定实际入口 | 是统一后台基础分析，还是旧 `background-ocr` lane；取消的是当前任务还是关闭持续规则 | `background-analysis-controller.ts:133-182` 每次 work 完成会重新 enqueue；取消单项与停后台策略不能混淆 |
| P1：取消传播 | 从策略／owner／关库事件追到 `workAbort`、标签 job、OCR preparation/active abort | 标签 `tag-execution-controller.ts:119-125`；OCR `ocr-controller.ts:80-126` |
| P1：实际退出 | 对齐 cancel、SIGTERM、升级终止、ChildProcess close、release 时间 | OCR 实际进程拥有者是 `src/main/ocr/local-ocr-process.ts`，不是 `ocr-runtime.ts` 本身 |
| P1：资源归还 | 分清 material/request permit、准备保护、模型驻留；检查 release 是否绑真实 close | OCR `ocr-controller.ts:38-44,94-97,120-124` 明确保留 UNKNOWN 占用；标签 settle 与 material release 见 `tag-execution-controller.ts:110-118` |
| P2：保存与恢复 | 取消与 commit 竞争、sent 后无响应、人工修正、新旧 session/current | 取消不回滚已线性化提交；UNKNOWN 不得直接当未执行重试 |
| P2：界面反馈 | 展示“已请求取消／等待退出／退出未知／已释放”，避免一个 cancelled 隐藏资源事实 | 需同时核对 UI 实际消费者与 Host/runtime 状态 |

首轮最小证据应按同一 requestId/attemptId、库 session、owner、runtime/launch 身份串联：发起 → claim → admitted → sent → cancel → response/close → commit/finish → permit release。同时记录“新后台 attempt 是否在取消后再次出现”，区分重调度和旧进程未退出。

可选聚焦测试入口：`background-ocr.integration.test.ts`、`tag-batch.integration.test.ts`、独立标签 execution/admission 测试、OCR controller/process 测试。先查 `package.json` 与 `.codeindex/tests-map.json` 的当前对应项，不必起步就跑整套 `ci:test-runtime-safety`。

限制：仅阅读指定工作区；未改文件、未联网、未运行应用／模型／服务或测试。以上是排查方案，尚未证实泄漏或任何具体根因。
