# P08 资源账本与许可（Proposed）

## 现状/边界与接口
P05提供任务与claim，P07提供可信物理池；二者未生产实施。旧batch_size/队列阈值不等于内存调度。ResourceLedger在Main单一串行决策点维护，无SQL/素材读取权限：acquire(requestVector,profileEstimate,snapshotRevision)->granted(permit)或waiting(reasons)；releaseCompute、markSuspect、confirmResidencyReleased均幂等。
请求向量包含RAM/每实际GPU池bytes、线程、compute slots、磁盘临时量；池别名先由P07归并。全部约束一次比较再写账，禁止先占RAM再等GPU死锁。估计必须来自模型/量化/输入尺寸/上下文/Profile基准，上置信界+安全量；缺数据只允许获批小基准或等待，不能猜固定GB为已测。

## 预算公式与不重复扣减
每池T容量，用户reserve ratio r∈[0,1]，独立安全量S>0；DAM总目标 B=max(0,(1-r)T-S)，与平台进程预算/系统pressure阈值取严。r=0仍保留S；r=1禁止新增后台模型，不把基础UI内存驱逐。
账本总承诺C=驻留峰值+计算增量+未核对suspect；已计入OS读数的observed portion O不能再全量扣两次。新增x须同时满足 C+x≤DAM可分配预算，且 x+max(0,C-O)≤当前系统可用headroom减安全量；O只有进程/池归属可靠时认可，未知重叠保守按未覆盖预留。实际估计升高立即更新debt并停新准入，不能把已使用内存凭空回收。
统一池CPU/GPU只算一次；多个GPU申请要逐池满足；DXGI预算绑定实际Worker实例。模型切换若双驻留峰值不满足就先卸旧并确认，再加载新；手动固定不绕过预算。

## 状态与公平
ResidencyPermit：reserved→loading→resident→unloading→released；超时/失联→suspect→reconcile，只有观察到进程退出/已验证卸载与占用释放才released。ComputePermit：reserved→active→draining→released；任务完成仅释放compute增量。重复release不使计数变负，旧permitId不能释放新加载。
公平候选顺序由P13决定，ledger仅原子准入；等待取消移除排队意图不影响现有holders。预算缩小时暂停新增并按安全边界收敛，不强杀用户应用。P07 sample过期不提高并发。

## 验证与回退
本轮可执行规格账本重放竞争RAM/GPU、失败全回滚、重复释放、suspect不释放、卸载确认及0/100%预算。该模型不模拟OS分配，不证明真实进程释放。未来T09/T10/T11需并发任务假Runtime、迟到sample、加载峰值和预算动态减小测试，真实GPU另验。
局部ADR提案：单ledger、向量原子准入、驻留/计算双许可；参数阈值/保留设置待审。S05/S09/S12来自包索引；P07已核对DXGI语义，本轮不宣称API已接入。回退只停准入保留账本，不回到无限并发旧队列。
