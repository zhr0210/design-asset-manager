# P02｜统一能力查询与迁移编排

状态：Proposed / SPEC。统一的是能力事实与编排入口，不是把所有数据域合为一个数据库。

## 1. 边界和最小接口

```text
原有业务入口及确认流程
  → Active Library Host（唯一Managed连接/lease/lifecycle）
    → SchemaGovernance（内部模块，不对Renderer暴露DB）
      ├─ inspect：识别域、身份、版本、精确profile与能力
      ├─ plan：计算缺失登记链和升级/备份审阅信息
      └─ execute：消费新鲜内部确认，备份验证→同步迁移/领域写→核验
         ├─ 编译期Profile / Migration Registry
         ├─ 受控Backup Adapter
         └─ 已有能力的领域存储实现
```

这是接口语义示意，未创建源码模块：

```text
inspect(boundLibrary) -> SchemaSnapshot
plan(snapshot, approvedProductIntentKind) -> NoOp | ReviewPlan | Blocked
execute(freshHostOwnedReceipt, frozenDomainIntent) -> VerifiedResult | Waiting | Failed | OutcomeUnknown
```

`boundLibrary`、receipt与domainIntent是Host内部约束，不是可序列化给Renderer/Worker的连接或通用callback。调用方不能提交任意SQL或sourceVersion/targetVersion。执行的领域命令来自既有允许的闭集，不接受调用方传函数绕过检查。

## 2. 能力判定

SchemaSnapshot包含：domain、library identity及本次generation（内部）、observedVersion、profileId、精确结构检查结果、schema-capability投影、阻塞原因。公开摘要只暴露必要状态；schema已具备不能合并为`canWrite=true`或模型ready。

- 当前库必须通过控制身份、application_id、已知版本及DDL/列/索引/FK/trigger结构验证。
- 已知精确profile内：能力present或upgrade-required；不需要升级则NoOp，不备份、不写DDL。
- 版本更高且未知：unsupported；无版本/非法/结构与版本不符：recovery-required。
- 域错误：wrong-domain；Legacy：read-only-domain；Eagle/App不能进入Managed registry。
- 权限、库关闭、模型缺失、空间不足是不同维度，不由schema存在性替代。

F02这类读取实现遗漏必须作为operational caveat保留，不能用中央矩阵“理论可读”盖过当前分支缺口。集中后也要真实运行对应业务路径才能去掉caveat。

## 3. 登记内容与计划

`MIGRATION-REGISTRY.proposed.json`定义7个稳定逻辑ID：v1→v2直到v7→v8。每项记录domain、from/to、能力、源码与定义digest、前后条件、对象增量、seed、业务事务归属、备份与文件边界。

当前definitionDigest是登记数据和所引用源码摘要的哈希，不是已执行数据库schema的签名；运行时精确profile签名需要后续临时库生成与锁定。改变一个已登记定义必须变化其定义revision/digest，不复用同ID悄悄改含义。

示例：v3保存笔记，计划只含v3→v4、v4→v5；v8分析操作只检查已有视觉证据能力，无DDL。新库仍按当前设计创建v1。

ReviewPlan应披露：触发的业务动作、源/目标版本、附带补齐的结构、旧软件限制、是否需要DB备份、文件覆盖范围、预计空间（若没有可靠计算则unknown）、不涉及其他能力执行。默认备份保留策略、配额、位置尚未批准，不能内置臆测值。

## 4. 确认与并发时序

```text
inspect / plan（读）
  → 用户明确确认原业务升级动作
  → Host撤止新写准入并收敛之前的inFlight/写序列
  → 验证库/lease/profile/定义digest和待提交领域命令仍匹配
  → 记录本机迁移尝试（不含永久授权）
  → Backup API完成 + 备份验证/受控发布
  → 再查库状态、内容写epoch与外部修改证据
  → 同步DB事务：源profile再验 → 缺失DDL链 → 首条业务写（如适用）→ 后验 → commit
  → 后提交核验 + 结束操作记录
  → 解除准入阻塞，返回已确认结果
```

Host不能在自己已登记的普通`run`任务内部等待包含自己的全部inFlight，避免自等待。拟议做法是从生命周期协调通道进入schema操作：先停止新准入，快照并等待先前的任务，随后在仍持有的同一lease下运行迁移段。当前Host还没有这个完整迁移入口，实施时必须专门验证关闭/取消/并发，不直接把`close()`当作备份前置（它会释放连接和lease）。

备份期间可暂停DAM写入，以得到稳定的迁移前基线。记录本进程mutation epoch，并结合连接的外部修改观测（例如data_version）判断备份之后是否有变化；这些信号不是跨进程持久授权。取得写事务后再次验证。发现任何不一致就使计划失效，不直接套用旧备份/旧receipt。

## 5. 各能力保留的事务边界

| 能力 | 迁移与业务结合 | 不得改成 |
| --- | --- | --- |
| 视觉v2 | 已确认run时schema独立事务；随后推理 | 一笔跨网络长事务，或普通prepare直接升级 |
| 持久下载v3 | 版本链+第一条download intent同事务 | 升级成功却没有意图而假装创建成功 |
| 副本v4 | 已核验staging后，版本链+variant intent同事务 | 把先前文件创建说成DB回滚会自动撤销 |
| 笔记v5 | 版本链+首保存同事务 | 提前升级、后续笔记失败仍声称原语义不变 |
| 组织v6 | 版本链+状态seed+命令同事务 | 只创建表不写singleton，再让读调用失败 |
| 工作集v7 | 版本链+集合内容及显式布局同事务 | 被动geometry保存时悄悄升级 |
| OCRv8 | 有效结果与scope/revision复核后，版本链+结果同事务 | 模型失败、只读或取消时升级 |

已有enable helper使用嵌套transaction。未来集中后可先保留其受控嵌套行为，确保最外层仍包含整个缺失链和原领域首写；不能每一级单独commit。不得在同步transaction回调await备份、hash、文件读取或模型请求。

备份成功不意味着迁移成功。事务成功但通知失败仍保持成功事实；无法证明commit结果时进入OutcomeUnknown，先核对，不自动执行同一业务命令。领域幂等性由现有稳定身份/约束保证，migration ID不能代替业务幂等键。

## 6. 恢复检查点与不新增v9的记录方式

编译期登记无需改库。迁移尝试记录若获准，可保存在受控App-owned操作记录空间，与库身份/备份凭据关联；不含用户正文/图片，不作为素材权威，也不保存跨会话可复用grant。

拟议状态：planned → authorized → quiescing → backup-writing → backup-verified → db-applying → db-committed → verified。失败可能为cancelled-before-commit、rollback-confirmed、outcome-unknown、recovery-required。状态是核对线索，不是提交证明。

记录文件与库DB没有跨文件原子事务：db-committed日志没落盘但实际DB已变时，恢复必须查精确目标profile和原领域receipt/结果；若不能确认则保留未知。不能因日志还在db-applying就恢复旧备份或重做首写。

重启后要重新验证Library身份/文件归属/lease，原receipt与内存grant全部失效。source profile仍是旧版时，重新生成计划/备份并确认；target profile完整时核对是否已有业务结果；出现热sidecar或损坏时不进入普通迁移。没有历史迁移记录的现有合法v1–v8库继续按已知profile验证，不能因此强制“补跑所有迁移”。

App记录保存位置、权限、配额/清理与最小字段仍是待批准细节。不得为方便记进度向当前v8新增表，也不得把已有`library_operation_journal`的settled约束偷偷改为任意JSON任务表。

## 7. 拟改边界与渐进顺序

1. 先引入Host内部已知profile/能力查询与registry投影，复用既有精确检查器；只替换少数枚举调用，保持普通读零目标库写。
2. 针对F02建立v8副本恢复夹具，针对F03建立独立Eagle高版本零写夹具。只有获准IMPLEMENT才修复。
3. 选一个不跨文件的大体量计算的首次写（如笔记/组织）接入备份与协调；保留原入口和数据事务，验证失败再重开。
4. 然后覆盖下载/副本/OCR的各自边界；不统一提前schema启用时机。
5. 所有读写路径才逐步改用集中能力查询；旧helper可成为内部委托适配，不按名字批量删除。

拟涉文件：`library-open-control-store.internal.ts`、`library-materialization.internal.ts`、Host内部协调、各*.schema.ts/读取分支以及新的内部registry/backup adapter。现行IPC/DTO/数据格式不在P02 SPEC改动。备份/恢复显著行为与公共兼容seam在实际实施前仍需明确范围批准。
