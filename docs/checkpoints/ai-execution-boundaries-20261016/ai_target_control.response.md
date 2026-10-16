建议统一“连接与任务管理”，按控制权分开“模型驻留与显存释放”。HTTP 只是协议，不能作为控制权依据。

| 目标 | DAM职责 | 任务结束时 |
|---|---|---|
| DAM自有本地Runtime | Host统一准入与预算，Runtime拥有模型实例、allocator和实际回收 | 释放本任务执行租约；无活动使用者后按驻留策略回收，由实际退出/Runtime证据确认 |
| 用户独立运行的Ollama | 连接、请求、客户端并发及经许可的服务管理能力 | 默认只结束请求；只有服务支持且用户明确允许，才请求卸载指定模型；不能杀共享服务或承诺全部显存归零 |
| 云API | 目的地、凭据、外发许可、配额、费用、请求与结果状态 | 清理本机准备资源/请求槽；取消请求不能证明远端已停算、显存释放或不计费 |

当前副本的证据：

- `docs/subsystems/ai-system.md:25–53` 已确认三类目标与模型选择、任务调度、驻留管理、资源准入四项职责；文中明确它们尚未统一成完整新API。
- `src/main/services/ai-runtime/providers/external-http-runtime.provider.ts:80–94` 的 `start/stop` 只改内存状态；`stop()`成功没有卸载Ollama模型或停止服务的证据。
- `src/main/services/ai-runtime/managed-vision-runtime.ts:263` 把实际close作为释放条件；`:761`已有只释放空闲实例的路径。
- `src/main/local-ai-resources/resource-governor.ts:389`附近驻留账本支持 `markUnconfirmed()`；释放执行permit与释放驻留并非同一动作。
- ADR 0173为本地全局Governor目标；ADR 0492仍为Proposed，不能把全部offload/回收方案算作已批准或实现。

接口方案可让统一任务层固定目标/模型绑定，并调用 `invoke/cancel`；另设可选 `residencyControl` 能力，声明控制范围、共享/独占属性、可观察终态和卸载动作。终态应区分“任务完成”“释放已请求”“已确认释放”“无法确认”“不支持”，不要用一个 `stopped` 覆盖。

若需求是“每批结束立即释放”，应作为受管模型或获授权本机服务的驻留策略；执行顺序为：本批结束 → 等待同模型其他使用者结束 → 请求回收 → 确认证据。共享Ollama无法仅靠DAM内部引用计数证明其他应用没有使用；须保留该限制。Ollama具体卸载端点、字段与版本兼容性本次未联网核实，不能作为已验证实现规格。

全程仅查看指定工作区，未修改、联网或运行应用/模型/服务。
