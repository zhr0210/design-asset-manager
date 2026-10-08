# ADR提案：Host内持久意图、唯一claim与原子结果效果

状态Proposed，2026-09-26；仓库编号待分配。R11；DAM-A005/A006/A007；T06/T07/T08/T13。P02/P04待审，续行SPEC不等于ADR Accepted。

问题：当前分析任务只存内存，保存结果与内存完成/通知分步；持久化不能复制旧权限，更不能依赖每次重开都会变化的libraryGeneration。下载Journal已有领域专用恢复能力，但不能直接替代AI队列。

提案：库内request/batch/job/attempt/physical分离，认领使用P04单一slot和新会话token；在一个Host事务内提交Evidence/current、Job/Attempt结果、幂等回执与Outbox。执行允许重试，数据库效果唯一；网络调用与费用不承诺exactly-once。

替代方案：继续内存Job不能恢复；全局App队列会混入素材权威和闭库写权限；直接复用下载Journal会引入不适用的字节传输/文件恢复状态。采用库内局部Journal，成本是schema演进与旧API适配必须同批验证。

关键取舍：结果提交已成功时通知失败不回滚；dispatch-intent与外发无法原子时保守unknown；选择token只在Host内存有效，DB快照只做审计；重开后同generation也必须拒旧claim。大文件/下载/资源调度仍各自领域负责。

待决：DDL号/索引/配额/保留、恢复默认policy、Provider查询与去重保证、P14预算存储、P08/P09资源许可。实施须明确seam变更授权及足够隔离验证；本轮无代码/模型/真实库放行。

验收与回退见VALIDATION-PLAN、RECOVERY-AND-AUTHORITY、COMPATIBILITY-MIGRATION；不能通过删未完成任务或旧Evidence消除恢复错误。
