结论：可以统一调度策略，但不应把模型语义选择、实际分配器所有权和取消确认合成一个权限；“收到取消 ACK 即归还全部资源”不可接受。

该工作区的依据：

- `docs/adr/0492-host-resource-coordination-keeps-runtime-allocators-owned.md` 明确采用 Host Governor＋Runtime Adapter；状态是 **Proposed，整体设计待确认**，不能当作已实现。
- `docs/product/LOCAL-AI-RESOURCE-COORDINATION.md:37–40`：Host 管准入、设备、优先级、驻留与冻结计划；Adapter 管模型句柄、分配器和真实回收；业务执行器与结果 Host 保留取消、修订、事务、审计和未知核对。
- 同文 `:9–11、69`：调度只能在同模型、同精度的已验证加载计划间选择；不能擅自换 checkpoint、量化、输入覆盖、结果标准或转云。
- 同文 `:46–67`：allocator cache、预算承诺、物理可用量、未确认释放分别记账；未确认释放继续占用，超时不归零。

当前实现已有可复用的真实释放保护：`src/main/services/ai-runtime/managed-vision-runtime.ts:238–275` 发 SIGTERM 后等待所拥有进程的关闭；`:506–522` 以进程/stdio `close` 为物理退出证据并释放 resident。取消信号被接受不是释放条件。`src/main/local-ai-resources/resource-governor.ts:31、415–446` 也区分全局账本与 runtime 实际释放权，并有 unconfirmed 状态。

建议修订为：

1. 一个 Host Governor 统一准入、排队、公平性、压力和驻留策略。
2. 执行前冻结模型、精度、配方、语义限制与 owner/执行代次；仅调整已验证的放置计划。
3. 将 **取消已受理 → 执行已停止 → 资源已回收 → 结果已核对** 分开。ACK 只推进第一步。
4. 未启动的排队请求可以直接撤销未兑现的预约；已加载/执行资源必须由对应 Adapter 给出匹配 owner/代次的新鲜回收证据，或确认整个自有实例退出，再核销对应账目。
5. 超时、迟到 ACK、旧进程消息和失联保持 stopping/unconfirmed；禁止据此准入下一项重任务。取消后仍保留结果提交未知状态的核对。

主要风险是提前清账后新旧任务同时占用，引发 OOM；以及调度器代替用户降级模型、错误释放共享驻留、取消后误报结果未提交。

本次仅检查指定工作区文本与源码；未修改、联网或运行任何应用、模型、服务，未验证实际资源释放效果。
