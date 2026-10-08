# WC01 Windows owned H进程重启 / retention tracer

2026-10-05 Asia/Shanghai。**VALIDATED_TRACER**；本批只获准前批推荐的bounded owned合成重启纵切。共9文件增量；源码重新核对，旧包摘要/历史PASS不作当前事实。正式产品/public seam、OS权限、真实profile/库/素材/账号/凭据/Runtime DB、模型/Provider/下载/安装均未涉及。

## 当前源码与设计差异

真实tag recovery只在新lease ready前把running+NOT_SENT收敛paused、其余running→outcome-unknown；succeeded/receipt不降级，running+receipt矛盾拒绝。正式H plans/jobs/claims/outcome均内存，没有本批新ledger；正式ACK仅更新delivered，ordinary publish void changed(scope)，recovery await changed(eventId)+ACK。真实tags canonical/max8、combined30、source/current与历史receipt区别保持；来源SHA与只读盘点见scratch test-planning.md/source-access-index.json。本批合成ACK protocol receipt不冒充现domain契约。旧effect fixture的connect仍同一H对象，不能证明进程重启。

因此新H为独立Electron Node子进程；外层supervisor直接持有所有A/H与channel，H没有后代、没有SQLite或原始路径RPC，只通过固定private proxy调用旧effect A。A、其schema/refsv4/loader均保持原字节。新增ledger目录dam-control-restart-*，与dam-control-effect-*分别有ownermarker。此结构是同用户合成合作进程，不是OS安全隔离或正式架构准入。

## before / after 与日志不变量

before原operation/result/ACK仅在同一H对象内存；after在claim/sent/effect/ACK发出前持久pending intent，原ID+scope+canonical payload/digest/attempt与result受全字段验证和append链约束，实际H退出/newPID+UUID后读取。独立resultDigest是UTF8 SHA，payloadDigest仍canonicalJSON SHA。历史committed receipt不修改、不降级；live回包与SQLite查询字段顺序不同，比较全部22固定字段的值，保留精确shape与scope。已知历史receipt无法再次证实时保留不可变数据但关闭进度gate，不用currentrow或emptyoutbox推断。

先保存inference reservation，再调用计数stub，先保存result再分配effect意图；reservation不是推理证据，reserved但无result不重跑。result但无effectID只恢复数据，不自动补提。新H每次inspection-only，初始empty-ledger H只能显式run获得一次grant；parent也拒绝fresh grant/stub/neweffect，仅固定通知ACKsubset可用。revoke先记日志再发fence；H/A重启不恢复推理权限。通知允许at-least-once；unknown原ACK阻止重投，callback throw可重投但不推理，无exactly-once声明。

ledger full exact snapshot JSONL，revision/hash/previous连续、state/operation/receipt/history/owner/object身份全部验证；上限32revision/524288bytes/单snapshot16384。fsync后同字节重读确认，再parent核对head/length后继续。supervisor保有全prefix witness与原对象身份；有效旧prefix rollback也拒绝。append已写但witness未确认的缝隙failclosed/retain，未测试该切点。**这仅证明受控H进程退出/重启；supervisor witness为内存，不证明H+supervisor冷启动antirollback、OScrash或断电耐久。** 不重命名/compact/evict/按age删除unknown。容量在stub/result/effect/ACK/callback前预留全部所需save数；满32record保持历史，callback前拒绝。

## 有限矩阵（run-02）

| ID | 操作与实际结果 | 状态 |
| --- | --- | --- |
| QR01 | 只重启真实H，A scope保持；原effect/receipt全字段一致；inspection通知 | PASS |
| QR02 | result已保存但尚无effectID；恢复数据，不自动send/stub | PASS |
| QR03 | reservation已存、尚未实际stub；actual0，恢复拒绝重新推理 | PASS |
| QR04 | effect intent已存但未send；sameID missing仍unknown | PASS |
| QR05 | COMMIT reply后本地receipt未save；恢复原ID精确历史 | PASS |
| QR06 | A COMMIT前stop+H重启；result1、sameID unknown | PASS |
| QR07 | A COMMIT后丢ACK+H重启；原ID历史成功，不重推理 | PASS |
| QR08 | 真实callback throw、跨H重启允许callback重投、stub不重跑 | PASS |
| QR09 | ACK意图已存但未send；恢复后不以新ID重通知/ACK | PASS |
| QR10 | ACK reply后receipt未save；emptyoutbox不消unknown，原receipt才证明 | PASS |
| QR11 | ACK COMMIT前stop+H重启；sameID unknown/pending | PASS |
| QR12 | ACK COMMIT后丢reply+H重启；sameID delivered历史 | PASS |
| QR13 | revoke持久；missing/错误digest/不可用inspection关闭推进；恢复不grant | PASS |
| QR14 | 真实H load拒绝损坏；parent纯文件检查拒绝replacement；retain | PASS |
| QR15 | 真实H load拒绝partialtail；parent纯文件检查拒绝validprefixrollback/missing；retain | PASS |
| QR16 | 32revision满容量不evict；重启完整保留，callback前容量拒绝 | PASS |

32H starts，30ready/2故意loadfail；29A starts，25正常fixture close+4工程stop；H24正常close/6受控cut/2loadfail。全known child+stdio退出、reader0。QR01仅H重启保留sameA，其他有效case同时轮换A。15case actualstub1、QR03 actualstub0而reservation1；所有重启/recovery/通知delta0。missing/replaced/validrollback为parent纯文件检查，corrupt/partialtail为实际H load拒绝，不混报。32revision exhaustion已实际验证；notification cap4/operation8及frame/timeout超限仅静态，callbackthrow实际执行，callbacktimeout本批未运行。

固定命令 node scripts/run-electron-node-test.mjs scripts/control-store-restart.tracer.test.mjs。12个direct/support source每run开始前原字节副本、before/afterSHA、log/results/exit分列保留；Electron ABI123，未重编native。run-01 2PASS/14FAIL由回执key顺序误判；run-02严格全字段比较后16PASS/0FAIL/0cancel。原失败证据不删除。14有效pairs非递归清理，2负向pairs保留；run-01全部16pairs保留，合计18pairs/36roots及94对象只读副本见retained-fixture-manifest。禁止自动清理这些Temp残留，不以保留来宣称恢复/restore资格。

## 预算与未验证

H heap64MiB/IPC32768/pending2/RPC5000ms；ledgerops8/revision32/notification attempts4；callback1000/case15000/Hrun90000/outer150000/poststop5000/log256KiB。每run16fixtures/≤32H≤32A，单fixture≤4H≤4A。所有A/H是supervisor的直接child，无treekill；global proxyPending/uncertain禁止新启动，旧RPC未收敛不能只凭Hclose继续。owner/root/marker/ledger originalinode/singlelink/canonicalpath与终态完整head/content核对后allowlist非递归cleanup；UNKNOWN/失败/变化retain。现有outer停止只作用launcher，超时stdio/后代UNKNOWN；wholelifetime/Job/hardRSS/物理close未资格。A startup RSS 46264320–49483776bytes只起点。

实际stub已执行而result未save的fault、append→witnessgap、supervisor同时重启、真实profile retention/授权、runtime/resource/timeouts未验证；本批不宣称全部helper资源资格、SQLite VFS源绑定、正式Adapter/86方法/reader/DDL/trigger/reconcile/close迁移。产品tests/typecheck/build/Pi/Browser/Desktop/ComputerUse NOT_RUN。Esc BLOCKED_UX_ACCEPTANCE保持，strongWindowsbackup仍拒绝；EBUSY UNKNOWN/Router BUDGET_UNSATISFIABLE/TASK历史23missinglinks FAIL不改标签。

[终态交接](../handoff/WINDOWS-CONTROL-RESTART-TRACER-20261005.md)→本机.scratch/windows-control-restart-20261005/terminal-anchor.json；独立Spec/Standards最终tree/diff/9SHA绑定见anchor；原安全repair报告及sourceboundfollowup保留，不以安全计划PASS冒充运行资格。productionQualified/restoreAllowed/namespaceMetadataQualified/formalAdapterWired=false；**STOP，nextBatchAuthorized=false**。
