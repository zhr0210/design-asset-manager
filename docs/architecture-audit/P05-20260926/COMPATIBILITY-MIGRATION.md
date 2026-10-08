# schema、兼容入口与回退

P02为迁移权威方案，P04为结果/覆盖权威方案；本目录MIGRATION-ADDENDUM只是待登记提案。不分配v9，不执行DDL，不改既有v1–v8精确profile。

拟增量是库内analysis request/batch/job/attempt/physical/outbox/checkpoint；复用P04的slot/Evidence/Overlay及原人工/确认关系。实际表合并、索引、迁移号、备份容量和保留期需源码评审及合成测试后定，不用未来表清单填空壳。

迁移前：P02 inspection与一致备份、停新分析准入、撤销旧receipt、drain视觉/OCR和Host在途提交；迁移后验证旧证据/用户状态/库身份不变。旧内存任务没有持久请求范围/授权，不自动伪造historical succeeded Job；历史Evidence按P04兼容读取即可。

旧visual-ai/asset-ocr入口保留原response与窗口权限，通过Adapter委托新的Journal/Host单写。P03单次Provider边界负责实际HTTP，P05协调重试/attempt身份，必须保持旧两次截断重试上限/共同deadline和无静默fallback。未经独立配方授权，不能把旧综合成功定义改成部分成功。

旧UI若只支持旧job state，waiting/paused可投影queued但必须有原因字段或走新能力入口；remote_outcome_unknown不能伪装failed后自动retry。新独立能力结果按P04新summary返回，不拼假综合Evidence；需要additive契约/直接调用方同步，属待批准公共seam。

下载Journal保持原trigger、Range、transfer epoch、空间配额、文件发布及Promotion恢复；P05不接管该状态机。共享最多是Host生命周期协调和通用错误分类，不能把下载字节checkpoint当模型token checkpoint。

实际Managed库仍是DELETE模式；SQLite WAL有额外sidecar和checkpoint语义，不能把应用Journal当切换WAL的理由；WAL文件与数据库需保持一致，不能只搬主文件作为恢复依据。[S23](https://www.sqlite.org/wal.html) 本阶段不改变存储模式，实际SQLite版本/断电行为未验收。

回退分层：

1. 新写未启用：停新准入，保留独立设计文件；业务无变化。
2. 新写已启用：暂停新claim，撤销token，drain短事务；保留未完成意图、Evidence、Outbox、回执及用户覆盖。可停调度器但不能清Journal“修复”。
3. 应用版本回退：只能用理解目标schema的兼容版本读取/维护新状态；旧二进制拒写新schema，不降低user_version。
4. 数据恢复：按P02一致备份评审并披露后续用户编辑损失；git回退不恢复用户数据库，已外发和已产生费用也不能撤销。

P04“重开新generation”语句在本阶段补充为“新Host session/lease，旧libraryGeneration可相同”；保留原文作为历史提案，实施者以本阶段精确字段说明和T07同generation测试作为修订项。本阶段没有更改现有公共generation含义。
