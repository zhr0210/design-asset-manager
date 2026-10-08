# WC01 合成双进程 Control Store 协议 tracer

2026-10-05（Asia/Shanghai）。用户批准上一批建议：一个固定合成 domain transaction、同 MAIN receipt、COMMIT 前后 ACK 丢失、结果查询及有 ACK 的撤权顺序。本批为 **Validated Tracer**；不实施正式 Host/Broker/Adapter、产品 schema/layout/manifest、OS identity/token/ACL/service/account/install 或真实库迁移。productionQualified/restoreAllowed/namespaceMetadataQualified/formalAdapterWired=false。

前置：[迁移设计](WINDOWS-CONTROL-STORE-MIGRATION-DESIGN-20261005.md)，完整范围/结果/身份：[交接](../handoff/WINDOWS-CONTROL-PROTOCOL-TRACER-20261005.md)。原设计的86方法/22族和18项future矩阵不是本批全部实现清单；不把本tracer通过升级为B2生产隔离。

## 实际入口与合成范围

命令：`node scripts/run-electron-node-test.mjs scripts/control-store-protocol.tracer.test.mjs`。复用现有仓库 launcher 和 native better-sqlite3，不重编ABI、不安装依赖、不运行产品Host、Browser、Pi、模型或Provider。外层shell Node启动器不是H/A Runtime。

- H：Electron Node测试父进程，通过实际stdio发命名动作，保留本地发送门。`scripts/fixtures/control-store-protocol-client.tracer.mjs`创建fixture、spawn一个A、收集退出并做限定readonly核验。
- A：同一个已安装Electron executable的子进程，ELECTRON_RUN_AS_NODE=1。`control-store-protocol.tracer.mjs`独占该fixture的SQLite writer；没有产品代码调用方或公共IPC接线。
- wire：`control-store-protocol-wire.tracer.mjs`提供有限JSON line profile和decoder；不新增src/shared协议类型。
- 测试：`scripts/control-store-protocol.tracer.test.mjs`跨真实进程/stdio/SQLite验证行为；私有IPC只用于故障切入通知，不作为业务ACK、提交或rollback证明。

fixture仅新建real os.tmpdir()的`dam-control-protocol-*`子目录，H以create-only写owner marker，将bootstrap nonce只交给该A；协议不接原始路径、SQL、DDL、callback或进程命令。A核对marker、realpath、已知单链接regular files，只有固定`control.sqlite`。这些是同用户协作fixture检查，不能阻止same-user替换、祖先DELETE_CHILD、既有writer/mapping、代码注入或能力窃取。

## 固定schema与事务

仅fixture schema v1：`fixture_identity`绑定合成bootstrap digest，`fixture_note`为id=1的备注/revision/effects，`fixture_receipts`以operation_id唯一。没有产品Library schema、outbox、claim、备份或模型数据。

`commitNote({expectedRevision,text})`在同一A-owned `BEGIN IMMEDIATE`/`COMMIT`中检查receipt、容量和revision，更新备注与effects，插入A推导canonical payload digest和结果receipt。正常完整事务无await。私有before-COMMIT切入在显式事务已写、未COMMIT时暂停A；不是在better-sqlite3 callback内await RPC，也不是正式产品允许长期持有事务的方案。

相同live operationId和payload返回原receipt，不再产生effect；不同payload拒绝。CAS冲突及容量满在确认rollback后只对本次事务报告verified-no-effect。其他拒绝不默认断言旧operation无effect。operationId必须属于当前A instance；重启后新session可查询旧receipt，但**无论旧receipt是否存在，都拒绝执行旧ID**。missing receipt保持unknown，不据此自动重试、改称未保存或恢复grant。

SQLite DELETE journal、synchronous FULL、实际重启回读证明本测试的进程中断结果；不证明断电、设备flush、directory durability、Windows backup/source/namespace资格或restoreAllowed。

## 协议与撤权

严格v1、major/features、action-specific字段、类型和递增channel sequence。固定hello、attach、commitNote、inspectOperation、readNote、revoke、close；capability绑定fresh instance/session/permissionEpoch，不记录nonce/session。错误、业务提交结果、receipt、远端撤权ACK、SQLite close与父进程exit分开核对。

H先关发送门再发送revoke；A按自己的单序列应用revoke/commit。commit先被处理则结果保留；revoke先应用则后续commit（包括测试绕过H门）拒绝。只有applied ACK才记远端撤权已知；ACK丢失时H保持closed/unknown，没有resume或自动重试。资源许可、业务许可与新进程实例不互相复活。

三个故障点在测试bootstrap选定，不属于业务payload：before-commit、after-commit、after-revoke。A发私有cut通知后停业务ACK；H定向停止自己spawn的child，等待exit/stdio close，再开fresh A核对当前receipt/state。cut通知只定位实验时点；实际SQL回读才证明对应domain/receipt状态。

## 有界profile与清理

frame（包括newline）≤8192 bytes，queued/pending≤8，text≤256 UTF-8 bytes，receipt≤128且满时拒绝不purge；SQLite page=4096/max_page_count=256，限制合成DB页数。child V8 old-space参数64MiB，start/request/cut/exit deadline为10秒，只同时持有一个A。stdout/stderr/pending均有结构限额；hello RSS/heap只是瞬时观测，不是峰值、hardRSS、Job或共享ledger生产资格。

H等待全部已知child的close并关闭自己的readonly reader后才清理；重验原root identity、marker和全部已知regular-file对象，逐个unlink及rmdir，不递归删除。未知对象、链接、root改变、未确认exit、reader close失败或测试失败均保留。该检查有同用户path/TOCTOU限制，不宣称native exact-object authority；本批不修或调用正式Capture cleanup。

## 验收矩阵

| ID | 实际路径与结果 |
| --- | --- |
| PT01 | 正常事务，domain/effect/receipt一致，close ACK+child exit0后readonly核验。PASS |
| PT02 | sameID/payload replay仅一次；payload mismatch、CAS冲突不写，缺receipt仍unknown。PASS |
| PT03 | before-COMMIT中断：domain与receipt均未提交；fresh session查询unknown，旧ID重执行拒绝，state不变。PASS |
| PT04 | after-COMMIT丢ACK：fresh A读取一次effect与匹配receipt，旧ID不再执行。PASS |
| PT05 | H立即关门、等待revoke ACK；A拒绝绕过H门的后写入。PASS |
| PT06 | commit排在revoke前保留结果；后写入拒绝。PASS |
| PT07 | revoke已应用但ACK丢失，H继续closed/unknown；restart不恢复旧operation/session。PASS |
| PT08 | v/fields/sequence/instance/session/permission epoch拒绝，domain不变。PASS |
| PT09 | 128receipt满拒绝新写，不purge；已有receipt仍可重放，无追加effect。PASS |
| PT10 | 实际stdio超长帧使A拒绝并退出；domain不变。PASS |
| PT11 | response-shaped codec检查fragmented UTF-8、malformed/truncated/oversize的单次关闭。PASS，仅codec；非live H错误响应恢复验收。 |

原run-01 11PASS保持；补充逐child退出记录后run-02 11PASS。最终绑定源码/命令/输出SHA见本机证据根`.scratch/windows-control-protocol-20261005/`，不把旧源码run替代新源码run。不为绿修改原Windows失败、Router预算、产品安全门或断言。

## 限制与停止点

没有B2独立principal、保护catalog/layout、完整86方法迁移、正式caller、备份或公共schema资格。未测实际Job/hardRSS/whole-lifetime共享资源、loader identity、kernel/全部file-object release、namespace、断电、真实库/模型/账号/Provider、完整claim/outbox/paging或live H malformed-response恢复。11项只证明此固定tracer。

Computer Use NOT_RUN：没有界面或正式用户路径变化，前批Esc BLOCKED_UX_ACCEPTANCE保持。实际产品build与当前运行app身份另列；tracer Runtime不证明当前产品进程。

下一建议先做**设计**：将tracer协议与真实Host调用方的异步迁移/CAS/错误提示对应，并收敛protected catalog、principal/provisioning和Host endpoint信任的可审阅兼容方案。下一批未自动授权；不因为此tracer成功直接实施Adapter、Broker、OS权限或真实库迁移。本批独立复核和终态证据完成后STOP。
