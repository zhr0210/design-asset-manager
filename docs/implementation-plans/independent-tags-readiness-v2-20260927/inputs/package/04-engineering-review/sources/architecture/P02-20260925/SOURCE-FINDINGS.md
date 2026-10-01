# P02｜源码发现与验证限制

以下条目来自当前源码阅读；没有打开任何SQLite，未将静态发现写成运行测试FAIL/PASS。

## F01：重复的版本判定是真实存在的

enable函数、读取投影、control inspection、materialization expected-schema选择各自枚举版本。入口包括`visual-ai-storage.ts`、`download-journal.schema.ts`、`intake-recovery.schema.ts`、notebook/organization/work-set schema与读写实现、`ocr.schema.ts`、`active-library-asset-queries.ts`。

影响：每次新增版本需同步多处。集中查询是合理迁移目标，但不能通过粗暴改成`version >= n`取消当前未知结构拒绝规则。也不能仅靠存在某张表判断升级完成。

## F02：v8副本意图读取分支遗漏

精确证据：

- `src/main/library-lifecycle/image-variant-intents.ts` `readVariantIntent`在版本不属于[4,5,6,7]时直接返回undefined。
- 同文件`recordVariantIntent`先调用支持v8的`enableIntakeRecoveryStorage`，再用此reader判断旧意图；`completeVariantIntent`本身无上述白名单。
- `intake-recovery.ts/listIntakeRecovery`的副本列表允许v8；`variant()`随后调用`readVariantIntent`，无结果时拒绝恢复。
- `owned-image-intake.ts`在记录/完成副本时复用该模块。

可从分支推导：v8待恢复记录可能被列出，但准备恢复会因reader提前返回被拒绝；重复登记尚未有Asset的pending意图可能失去旧行判定而触发主键冲突。未宣称所有v8副本保存失败，也未证明用户数据已经损坏。

本轮只记录，未修复。设计夹具M20/M21明确区分当前分支行为与批准修复后的期望。P00/旧测试中关于v8兼容的宽泛陈述，不能代替这个新发现的针对性验证。

## F03：Eagle独立索引的版本拒绝发生在DDL之后

`external-connected-library.schema.ts/initializeExternalConnectedLibrarySchema`先执行一组CREATE TABLE IF NOT EXISTS，再读取user_version并拒绝非0/1；`external-connected-library.ts/createExternalConnectedLibrary`直接调用它，所读调用段没有包围整段初始化的外层事务。

影响：未知高版本且缺某个表的合成index，可能在抛unsupported前已有结构写入；已有表完整时不能仅凭这一点断言发生了变更。本轮未执行该场景，也未连真实Eagle。未来必须先识别域和版本，再在该域自己的受控事务里创建/演进；不能把Managed的良好拒绝规则笼统归给所有域。

## F04：当前库是DELETE模式，不是WAL

`initializeLibraryControlStore`设DELETE/FULL；`inspectLibraryControlStore`要求DELETE；`openReadonlyLibraryDatabase`拒绝-journal/-wal/-shm并限定darwin。S23用于解释为什么不能丢弃WAL或只拷活动主文件，不用于暗示本项目现在已经采用WAL。

普通开启遇到sidecar会拒绝，不自动修复。设计的崩溃恢复必须承认这一限制，不能声称“重开会自动回滚所有情况”。授权恢复工具是后续边界，不在P02实现。

## F05：尚未看到统一迁移前备份路径

本次读取的Host/schema/managed-download/app-storage路径没有统一的“检查→计划→备份验证→迁移→后验”协调器，也未见这些启用调用中使用backup API。这个结论限定所读调用链，不是全仓库不存在任何备份代码的证明。

## F06：首次写事务不能被集中化拆断

下载create、笔记、组织、工作集和OCR把DDL与首条业务数据放在外层事务中；图片副本在已发布staging后将DDL和意图写入事务。视觉v2特例是在确认run时先启用schema，不与模型结果跨网络组成一笔事务。P02设计按每个能力分别保留，不统一改成模型成功后才升级，也不把所有升级提前到prepare/read。

## F07：历史证据不覆盖本轮新矩阵

已有聚焦测试包含版本、升级确认、回滚和v8保持等断言；脚本存在及旧报告“通过”不证明64组能力矩阵、跨全部故障点、迁移备份和F02/F03已运行。本轮全部SQLite/迁移/备份行为为NOT_RUN。

实际锁文件为better-sqlite3 12.10.0；本轮未启动原生模块，嵌入SQLite的实际运行版本、文件系统持久性、Windows兼容和签名包均未验证。
