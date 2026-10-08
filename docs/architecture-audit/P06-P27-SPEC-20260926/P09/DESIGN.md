# P09 RuntimeSupervisor（Proposed）

## 接口与生产范围
supervisor.ensureReady(profile,residencyPermit,scope)、invoke(handle,computePermit,inputGrant)、cancelSubscriber、requestUnload、reconcileOwned。Adapter能力声明start/stop/unload/cancel/probe的粒度和证明方法；不把Node utilityProcess用于任意Python二进制，Python沿受控spawn/stdin/stdout adapter。正式OCR是可借鉴边界；旧llama服务类并非已启用生产Supervisor，禁止恢复disabled通道。

## 三类所有权
| 类别 | 可执行动作 | 不可推定 |
| --- | --- | --- |
| dam-managed | 已批准安装位置/制品校验后由DAM启动的实例，可按生命周期启停 | 相同名称/PID/端口不等于同一实例 |
| user-managed | 用户配置后的限定请求、获批probe、声明可用取消 | 不终止服务、不擅改加载参数、不以显存不足强杀 |
| remote | 授权推理/查询，P14预算/unknown协议 | 不声称卸载/本地资源归还/免费取消 |

OwnershipRecord含随机instanceId、启动时间身份、可执行digest、受控启动配置digest、父子关系与认证challenge；路径在Main私有记录不进入IPC/日志。使用随机本地端点认证及来源校验，不只靠loopback。重启后以证据核对实例：身份无法证明→quarantined/suspect，不认领或杀掉。

## 生命周期与就绪证据
installed≠starting≠loaded≠capability-tested≠ready。安装hash正确只证明制品；probe模型列表只证明协议连通。ready需精确profile/input能力验证记录、当前健康、当前版本身份和有效许可；过去同别名ready不沿用至未知远端权重。
状态：absent→starting→loaded→verifying→ready→draining→unloading→stopped；加载失败/超时/身份变更→suspect/reconcile。卸载命令ACK不释放P08驻留，必须有进程退出或限定后端可核验卸载及占用下降证明。采样延迟/allocator缓存存在时保留承诺，禁止对外说显存已释放。
取消按subscriber处理：仍有有效任务则不全局abort；全部撤销后请求后端取消，但必须先fence提交。OCR现有fail会kill自己child并立即reject，未来ledger释放需等close/退出确认，不能把Promise rejected当进程已消失。

## 退出、缓存与重启风暴
关闭库先撤销P06材料grant/敏感输入缓存，再drain任务。共享非敏感模型权重驻留可按显式设备策略保留，库内容/KV缓存不得默认跨库保留。idle TTL和切换冷却是可调提案，不写死未经测量数字；连续启动失败进入有界退避/人工复核，不能自动无限重装/下载。
进程退出只关联自己的实例记录；PID复用、外部服务同端口、父进程已死但子进程在途分别核对。进程组终止仅对已证明全部属于DAM的组，绝不按进程名扫杀。SIGKILL/Windows job object策略须相应平台实测与授权测试进程。

## 验证和资料
本轮假Runtime谓词测试所有权、PID复用、ready链、卸载ACK但无释放、共享取消。未来T07/T10/T12/T24需真实获批托管测试进程验证启动认证/加载超时/进程树/退出/内存回落，Windows独立NOT_RUN。S01/S10/S11/S13/S19是包参考导航，未据滚动文档或旧类存在宣称已支持其新参数。
Proposed决定：实际实例证据高于进程名/标志；保留外部服务受控入口，不复用旧stopServer的全局forceStop与“显存已释放”文案。
