# 源码核查与设计纠正

本轮只读取相关源码/测试和文档；下表不等于运行复现。源文件摘要见evidence/SOURCE-INVENTORY.json。

| ID | 已核实事实 / symbol | 设计含义 |
| --- | --- | --- |
| F01 | visual-ai-controller.ts的plans/jobs为Map；取消用AbortController；OCR只有内存plans/active；源码未在这些路径持久保存分析任务 | 证据能重开读取不等于任务能恢复；新Journal不能宣称已经存在 |
| F02 | visual-ai完成后先Host保存，再置内存completed和通知；通知异常吞掉。OCR同样在commitOcr成功后通知 | 保留提交后通知失败不反转成功的优点；需补任务/Outbox与Evidence的同事务事实 |
| F03 | ActiveLibraryHost:run经runWhileHeld并登记inFlight；close置quiescing、等待inFlight、release lock、close DB | 关闭防线已有；新Journal不能在Host已quiescing后再调用普通run写“已暂停”，也不能在被等待的操作里等待自身close |
| F04 | index.ts:shutdownCoordinator先drain工作窗，再invalidate视觉/OCR/图片工具，drain下载，最后Host.close；切库onAuthorityWillChange也撤销控制器 | invalidate撤销内存任务；不能由队列持久化反向恢复旧receipt/token |
| F05 | openDirectory从inspectLibraryControlStore读取store.generation，直接写入binding/state；该值来自library_control_identity.library_generation | **重开不保证generation更新**。P04“重开新generation”只能是目标描述，不能作为已实现防线。P05以新Host会话和实际leaseIdentity补齐 |
| F06 | exclusive-library-lock.tracer.ts:createAcquiredLock每次生成leaseIdentity；Host每次open又生成notebookSession；OCR依赖其sessionToken；active-library-host.test.ts的generation改变场景显式改合成表 | 当前确有新的lease/会话身份，但不能用那个测试证明普通reopen自动递增库generation。只读源码发现，无越权运行复现结论 |
| F07 | downloadJournal由Host serialRun持lease调用；意图immutable trigger，revision/transfer_epoch/offset CAS；块文件先写并fsync再事务关联；恢复使用新review | 可借鉴不可变意图/CAS/重审，不复制Range/块文件/Promotion状态到推理队列；两域保留各自恢复语义 |
| F08 | initializeLibraryControlStore明确DELETE/FULL；inspection要求delete与精确已知v1–v8；readonly opener拒绝恢复sidecar | P05应用级Journal不等于SQLite WAL。不能为了“持久队列”直接改WAL或删除sidecar |
| F09 | P04提出analysis_capability_state单一requestGeneration/claim；现行源码尚未实现 | P05只接手同一行的认领语义，Job表不能再维护一个独立递增claim权威 |

P04术语纠正交接（不覆盖原文件）：其activeLeaseGeneration在实现前应拆清为持久libraryGeneration与每次open新建hostSessionId/leaseIdentity。旧generation不变的重开必须纳入T07；不能只测人为修改generation。P04的主规则“旧ticket不得复活”保留。

锁文件：better-sqlite3 12.10.0、Electron30.5.1、Ajv6.15.0；未加载native模块，当前实际SQLite运行版本未知。相关README包含历史验收描述，只用来导航；现行源代码与本轮执行证据分别记录。

当前没有在所读正式分析路径看到持久Job+Evidence+Outbox的同事务提交、远端outcome_unknown或账单核对。不能从旧Worker或下载Journal推定这些能力已交付。
