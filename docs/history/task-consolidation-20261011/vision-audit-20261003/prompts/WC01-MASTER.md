# WC01主提示词｜当前Windows基线与能力隔离收敛

MODE=IMPLEMENT 仅在用户明确批准“执行WC01”后有效；否则只读核查。仓库：`G:\antigravity\Design Asset Manager 1001`。

你是本批实施者。先读当前AGENTS、TASK顶部、`docs/handoff/CURRENT-STATE.md`、当前双客户端规格的必要条款，以及本包03/05和对应源码。当前用户明确批准的ADR0491优先于旧计划对客户端形态的限制；但原件、权限、真实账号/模型、CU与数据保护不降低。

## 唯一目标

交付一个可回溯的当前Windows收敛候选，并修复“未支持视觉codec导致OCR/生成探测共享准入永久暂停”。统一current状态与候选/命令闭包，保留失败和后续资格门。不重做Pi、RUX、DP01或23票全部实现。

## 顺序

严格按本包03的W01→W02→W03→W04→W05→W06。
- W01先核对当前改动，不以报告hash覆盖后续修改。
- W02先保留原生产反例，再区分capability-unavailable和resource-unsafe；UNKNOWN占用不提前释放。
- W03只做受控平台分发/构建闭包，默认不下载，默认入口不使用test override。
- W04只归一本批涉及的文档与当前状态，不整体搬迁/重写全部历史。
- W05按具体影响处理失败，不能删断言、改golden阈值或忽略当前产品错误。
- W06在最终候选验证/复核/交接；结束STOP。

## 必须保留

唯一Electron Host、命名Client接口、Desktop/Browser同一产品、Origin/CSRF/角色检查、原始素材与用户内容、显式schema升级、同效回执/未知提交、单一业务重试、资源UNKNOWN、生产Provider限制、后台OCR qualification仍为空（本批不认证Runtime）。

## 绝对不要顺带做

不得读取真实素材/凭据/浏览器登录状态或模型文件；不得启动真实模型、调用付费API、下载依赖或权重；不得升级用户库、发布、推送、改branch；不得reset/clean/stash/add .；不得删除`.scratch`/AIModels或未归属WIP；不得通过直接移除Mac资格限制让Windows图像通道显示可用。

没有当前权限的动作只阻塞依赖部分。不要将“请优化”当成真实账号和数据操作授权。

## 验证

复用原测试runner，明确测试环境。真实HTTP、临时SQLite、组件、Browser CU和native CU各自独立。Browser使用可见控件真实动作；禁止route/hash/IPC/Store代办用户步骤。缺工具记录BLOCKED_UX_ACCEPTANCE，不伪造完成。

源代码变化后受影响证据重新验证。脚本返回0但没有目标断言不算通过；父runner返回0不覆盖子命令失败。本次审阅发现context:check实际exit3，请核对最终候选而非照抄历史693/693 PASS。

同批切片适用验收完成后自动继续，不逐步问“继续吗”。同问题最多三轮有证据修复；无新证据时做最小复现/独立审查，不扩大范围无限试错。会话中断保存精确检查点，不能把未知进程写成已退出。

## 最终交付

一份简明报告 + file-scope/before-after/patch + source/platform-artifact manifest + 各命令原始输出/exit/环境 + 失败队列 + 复核 + current入口。明确哪些是真实Windows前置，哪些只是负向隔离测试。不要递归附带所有旧ZIP。

最终结论允许PARTIAL但不得含糊；`nextBatchAuthorized=false`，不自动进入真实账号或后续Governor。
