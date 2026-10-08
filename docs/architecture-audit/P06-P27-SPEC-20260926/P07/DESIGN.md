# P07 TelemetryPort 与物理池（Proposed）

## 当前与接口
旧AiGpuMonitor调用Python工具并返回GpuStatus；错误伴随0占用只能解释为失败。旧clearGpuMemory执行脚本不是本设计资源回收保证。拟新增Main内TelemetryPort.sample(scope,now)->ResourceSnapshot，平台adapter提供sourceVersion/observedAtMonotonic/bootSession/validity/unknownReason。禁止采集素材正文或任意进程命令行。
字段分层：topology(poolId,kind,physicalBytes,sharedAliases)、systemPressure、deviceBudget、processUsage(pid,startIdentity,role)、power/thermal/idle及其独立validity。统一bytes；MB与MiB换算在adapter明确，整数范围/NaN/负值/used>total拒绝。不能用任一有效字段掩盖另一必需读数缺失。

## 拓扑与平台差异
Apple Silicon的CPU/GPU可共享物理内存，不能把RAM+GPU apparent total相加；poolId唯一表示物理容量，MLX allocator统计是子集而非另一块池。[S04](https://ml-explore.github.io/mlx/build/html/usage/unified_memory.html)（访问2026-09-26，页面0.32.2；不是全部Mac硬件）。Intel Mac必须独立识别，不按系统名推断统一池。
Windows按适配器稳定LUID/节点和local/non-local段建池；DXGI Budget/CurrentUsage为应用语义，Main查询不代表Worker预算，CurrentReservation不等于全设备free。[S09](https://learn.microsoft.com/en-us/windows/win32/api/dxgi1_4/ns-dxgi1_4-dxgi_query_video_memory_info)（访问2026-09-26，滚动API；无本机Windows验证）。多个GPU分池，shared system segment映回系统RAM，不能重复容量。
Electron powerMonitor可以提供部分电源/idle/thermal事件，但平台适用性不同，latest文档不能证明Electron30.5.1全部支持；按锁定版本和实际特性探测再接。[S20](https://www.electronjs.org/docs/latest/api/power-monitor)（访问2026-09-26）。S05/S07本轮只用包索引，未据此宣称Runtime或WindowsMLready。

| 平台 | 目标读数 | 当前证据/缺口 |
| --- | --- | --- |
| Apple Silicon | 物理池/pressure/Worker占用/Metal子集 | 官方机制+旧probe源码；实际新adapter NOT_RUN |
| Intel Mac | CPU池及实际GPU拓扑 | 未测试，不套统一内存 |
| Windows | RAM+各adapter段+Worker DXGI budget | API参考；Windows/EP包未取得运行证据 |
| 其他/权限不足 | known字段+unknown原因 | 禁止伪造温度/空闲 |

## 采样一致性与降级
每轮snapshot带单调clock/session/sampleId，跨源时间偏差需有界（具体间隔/stale阈值待测，不承诺默认值）。睡眠/重启/clock倒退使样本失效；PID复用必须startIdentity匹配，进程消失记gone而非猜测其显存已完全释放。不可将总量轮询误称OS硬预留。
P08只使用满足作用域和freshness的必需字段。temperature不支持不等于normal；可用其他压力信号保守执行，绝不因missing变快。采样失败按原因聚合，不高频刷日志。

## 合成轨迹与验收
可执行参考模型用假时钟验证stale/future/unit/negative/PID复用、同池别名去重、多池、冲突容量。真实平台adapter、睡眠/多GPU/后台开销/温度事件均NOT_RUN。未来T09/T11/T22/T24记录系统/驱动/API版本，不用GUI截图代替可重放轨迹。

## 决策与回退
Proposed：物理池唯一标识+范围化字段+unknown一等状态。取舍是保守拒绝不可靠余量；不恢复旧脚本自动清内存或任意进程管理。无需新增库schema；设备统计留App侧且不带素材内容。
