# P13 自适应策略、路由与公平（Proposed ADR）

## 状态与调节
PolicySnapshot={state,reasonCodes,observedSampleId,policyVersion,nextDecisionAt}；状态busy/balanced/idle/pressure/thermal-or-battery/unknown。压力/过热/关键未知立即降低新准入，恢复需连续稳定样本和冷却窗口；仅无键鼠输入不能判idle。电池策略可节流而非一律禁用，参数由用户策略指定；没有温度信息保持unknown，不凭空normal。已有不可取消调用先fence新任务，记录仍在途资源，不能反复杀起。
参考测试使用两次稳定样本作为合成参数，不是生产默认。配置包含enter/exit不同阈值、最短驻留、切换冷却、aging上限与后台fair-share；数值待P25指定硬件基准及用户审核。

## 模型路由
先过滤capability、版本化质量基准、license/平台ready、Input/EgressGrant、Profile匹配，再由P08验证资源，最后按estimatedLatency/switchPeak/驻留复用成本排序。手动固定是选择约束，不是越权令牌；不可行返回等待与明确原因，未经同意不改模型/输入/云端。自动模型切换只在任务边界产生新attempt配置，不在流式输出中换服务。
WorkloadAdmission.submit(intent,priority,deadline,resourceVector)用于后续通用负载，但下载/Capture依然负责自己的文件/恢复状态机；资源调度不能重放领域操作。

## 公平和饥饿
用户交互保留一部分计算/线程余量，后台按能力轮转配额；优先级+有界aging控制长期等待，模型局部性仅相同公平等级内排序，不得永远压过老OCR。一次只取有界候选集，无需扫描全部队列。大批高级任务按小quantum回队；取消释放排队位置，不能靠重新入队重置aging获利。资源不足的高优任务不占部分池阻塞所有可运行小任务，同时设置fair-share上限避免其永久饥饿。

## 验证与接手
本轮参考模型测试快速压力降级/缓慢恢复、unknown、质量/授权过滤、固定模型等待、aging战胜局部性。未来T09/T10/T11/T12/T22/T23需外部应用负载阶跃、热/电源轨迹、不可取消后端和双驻留峰值，并与无后台基线比较交互P95、swap、吞吐；未运行不承诺“永不卡顿”。
拟改新策略端口及P05调度消费者，不直接恢复旧Python队列。S04/S05/S09/S10/S12/S20为机制参考，已读P07官方范围可沿用；不添加新的未验证Runtime默认参数。
