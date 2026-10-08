# Journal、claim与commit接口

Main内部接口提案，未注册IPC/SQL。Renderer只表达入队/暂停/取消/恢复意图，不能传任意SQL、claimEpoch、token或可信完成标志；Worker仅返回有界不可信结果。

## 接口与返回语义

| 操作 | 入参（示意） | 返回 / 原子边界 |
| --- | --- | --- |
| enqueueAnalysis | 当前受审scope、clientRequestId、intentDigest、素材/能力、reuse-valid或force-rerun、策略版本 | batch/jobs稳定回执；去重+代次+Job+订阅同事务；不触发推理 |
| claimReady | Host私有会话上下文、jobId、expectedJobRevision、解析后Profile/Input引用 | granted(ticket) / waiting(reasons) / conflict；claim递增+attempt行+Job running同事务 |
| recordDispatch | ticket集合、physicalId、冻结目标/预算预留引用 | dispatch-intent持久提交后才允许发送；不等于已确知服务收到 |
| finishAttempt | 当前ticket、有界结果或脱敏失败分类 | 完整性/每能力validator后进入commit或持久失败/等待/unknown；不能直接标succeeded |
| commitCapability | ticket、已由Host核验的candidate及semanticEffectDigest | committed(receipt) / already-committed(receipt) / stale / conflict；详见下文 |
| cancelOrPause | 当前scope、requestId、batch或job范围、expectedRevision | 订阅/claim撤销与状态CAS；不删除Evidence；cancel提交不能撤销既有成功 |
| recoverOpen | 新Host会话、已通过P02 inspection的连接、恢复policy引用 | 分页恢复计划/等待项；默认不推理/发网络 |
| readJournal | 当前授权库scope、bounded游标/过滤 | 状态投影和恢复原因，不返回token/路径/原始回复 |

所有变更使用Host持有的唯一库连接；同步SQL事务内部不await模型、网络、文件或UI。流程跨异步边界后重核会话/claim，不将长推理包在写事务中。

## claim的唯一权威

沿用P04 `analysis_capability_state` 的requestGeneration/activeAttemptId/claimEpoch。Job保存自己所属代次与revision，Attempt保存领取时的epoch快照；这些是引用/快照，不能独立递增另一份计数器。

持lease事务读取Job及P04 slot：Job为ready、代次仍最新、无有效active claim，CAS expectedJobRevision与slot revision；递增claimEpoch、创建attempt、更新slot与Job为running。两个claim竞争只有一个成功。完成/失败/取消在对应事务释放activeAttemptId，但epoch不回退。safe integer溢出fail closed。

`attemptToken`是每次claim生成的不可预测短时凭据，仅Host执行边界持有，记录在当前进程的私有registry；不落任务JSON、不返回Renderer、不写诊断。持久attemptId/epoch/hostSessionId不是授权token。重启registry为空，自然不能接受旧token；恢复必须新claim。

当前leaseIdentity每次acquire新建；建议Host内部新增hostSessionId（每次成功open生成）或以该leaseIdentity绑定分析会话，保持现有libraryGeneration含义。检查tuple：libraryId、libraryGeneration、当前binding/hostSessionId、lease held、jobId、attemptId、requestGeneration、claimEpoch、内容/输入身份、取消状态。记录在DB里的旧sessionId不能重新加载为有效registry。

不按heartbeat超时直接偷claim；Host要先撤销旧token、递增fence，并判断物理调用是否仍在途。已发送但远端未知走unknown，本地进程活性未知等待资源核对；不能用超时等同可以无成本重试。

## 单事务提交

```text
Host持有效库权限
  BEGIN synchronous transaction
    再核scope/lease/session；按效果键查已提交回执
    有回执：digest相同返回原回执；不同CONFLICT（不重写）
    无回执：检查Job/slot/attempt/token/内容/取消/升级授权
    追加P04 Evidence（或绑定已存在的可复用有效Evidence）
    按P04选择器更新current，保留Overlay与旧有效证据
    将实际存在的Attempt及Job置succeeded（reuse-valid没有伪造Attempt），写Evidence引用/效果digest
    追加唯一Outbox事件与库级单调eventSeq
  COMMIT
  提交后通知/投影唤醒；异常不反转成功
```

效果键建议 `(jobId,requestGeneration)`，成功Job最多一个效果；Attempt ID记录执行来源，不能将它单独作为允许同Job多次成功的唯一键。P04原attempt效果键继续用于冲突查证，P05增加Job成功唯一约束。相同效果不同payload拒绝；digest范围包括来源/值/质量/冻结配置，不含生成时间、token或新随机Evidence ID。

先查已提交回执仍需当前scope授权；已成功Job即使active claim已清理也可返回原回执，不能要求重新获得推理许可。无回执的旧attempt不能因为“曾成功发HTTP”进入提交。失去lease后调用方不确定commit是否完成时，返回需核对的提交状态，重开由数据库事实判定；不得立即再次推理。

多能力共享physical按Job逐个事务提交，并关联同一physicalId；最后一个Job处理后才汇总physical状态。每能力成功的原子性不是整个批次原子性。

有效但quality held的结果按P04可保留为历史；Job记录失败/需复核质量状态而非宣称常用能力成功。本提案用failed_final + QUALITY_HELD + evidenceRef，Evidence/该终态/Outbox亦在同事务；旧current保留。未来若要专用needs-review状态须版本化，不静默映射succeeded。

## 最小存储提案

analysis_requests（client去重/回执）、analysis_batches与analysis_batch_jobs（订阅）、analysis_jobs、analysis_attempts、analysis_invocations与analysis_invocation_attempts（物理共享）、analysis_outbox、analysis_consumer_checkpoints。复用P04Evidence/slot/Overlay，不复制第二套素材或标签。表名/DDL/版本待P02审阅，不实际创建。

关键约束：requestId唯一且immutable digest；同能力代次唯一Job；每Job唯一成功receipt；每attempt至多一physical；事件(effectKey,eventKind)唯一；checkpoint按consumerId/version/indexGeneration隔离。查询索引围绕state/nextEligibleAt/id、Job引用、eventSeq；页大小与保留期待规模实测，不能默认无限加载或自动清日志。

恢复和Outbox需要的数据都在同一Managed库SQLite事务域；App DB只保留无素材正文的设备设置。不承诺与外部成本账单、模型服务或文件发布天然原子。

恢复取回模式的ticket明确mode=reconcile-result，只能校验指定原physical完整结果，禁止调用Provider推理端点；正常ticket为mode=execute。reuse-valid则用独立Host事务将已有有效引用、Job成功和Outbox绑定，不伪造Attempt/耗时/模型执行。
