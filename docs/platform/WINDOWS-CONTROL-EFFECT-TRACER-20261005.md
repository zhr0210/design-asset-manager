# WC01 Windows owned 合成 effect / outbox tracer（2026-10-05）

本批状态 **VALIDATED_TRACER**，用户批准前批下一建议，仅以下8文件增量。此文以重新核对的当前源码为事实；旧包内摘要/历史PASS不作当前实现证据。无真实profile/库/素材/账号/凭据/Runtime DB、模型/Provider/下载/安装。正式契约/schema/Adapter与产品用户路径未修改。

## 当前源码差异与最小调整

当前 tag-execution-storage先authorize，再canonical tags digest，历史receipt lookup先于abort/live claim；tags-only最多8，trim与NFKC/lower去重保留首拼写，combined最多30且有historical-only路径。真实Host同步MAIN包含evidence/current/execution succeeded/不可变domain receipt/outbox，COMMIT后移除claim。finish只接受running live claim，不能降级成功。当前controller response后storage reject仍映射failed/cancelled，storage-unknown适配留后续。普通publish为void changed(scope)，recovery才await changed(eventId)再ACK；当前ACK仅delivered更新，无本合成ACK协议receipt。source改变可保留历史receipt而非current。源码SHA见本机test-planning/current-source-audit/source-access-index。

因此不机械迁移旧补丁。本批选择max1 bounded result string、私有五表identity/attempt/receipts/effect/outbox，明确排除真实tags/combined/public seam。原scope协议receipt与真实domain receipt是不同概念。本批resultDigest=SHA256(result UTF8)，payloadDigest=SHA256(canonical JSON)，effectId/eventId/operationId/claimToken各独立。无await处于SQLite transaction内。

## before / after 与权限

before仅有claim/sent及计数stub，effect commit/finish/outbox尚为未验证目标。after新增真实stdio/SQLite合成证明：单stub结果后result/effect/succeeded/原scope receipt/outbox同MAIN提交；COMMIT未知不否认成功、不盲重发结果、不重推理。effect receipt历史deliveredfalse保持不变；投递ACK另有协议receipt并与delivered更新同事务。重复callback允许；不宣称exactly-once。H操作ledger在内存，H重启持久恢复仍未验证。

A唯一writer；H所有已知A退出且uncertainfalse后才readonly。fixed v4 refs/owner/layout、同用户双逻辑root不是OS隔离/protectedcatalog。fresh inspection固定通知subset无推理grant，可read/ACK；A suspended或H hold/shutdown/fence/resource/unknown均阻止通知。revoked业务grant永不自动恢复。finish仅当前capability的同A live claim instance/session/token，允许epoch已fence后的协调，只接failed/cancelled/paused/outcome-unknown，无succeeded目标、不能降级success，无generic bypass。

## 有限矩阵（最终所选 run-02）

| ID | 操作与实际结果 | 状态 |
| --- | --- | --- |
| QE01 | 单 result atomic成功；投递ACK后原effect receipt不变 | PASS |
| QE02 | 同ID replay与不同payload冲突；不新增effect/event/stub | PASS |
| QE03 | COMMIT前工程停止；result保留1次、missing receipt仍unknown | PASS |
| QE04 | COMMIT后丢ACK；fresh精确历史核对+epoch0通知、不续推理 | PASS |
| QE05 | late effect ACK跨epoch；历史成功，不推进新scope | PASS |
| QE06 | payloadDigest不匹配回执；fail-closed+fresh原回执 | PASS |
| QE07 | 缺少resultDigest的语义malformed receipt；fail-closed+fresh原回执 | PASS |
| QE08 | callback throw保留pending，重投callback不重推理 | PASS |
| QE09 | callback1000ms timeout；late settle不后台ACK | PASS |
| QE10 | delivery ACK COMMIT前停止；pending不能证明原ACK outcome | PASS |
| QE11 | delivery ACK COMMIT后丢ACK；empty list不解unknown，原receipt才解 | PASS |
| QE12 | late delivery ACK跨epoch；仅历史delivered | PASS |
| QE13 | callback await期间maintenance hold；不旧ACK，release后重投 | PASS |
| QE14 | callback await期间epoch invalidation；不ACK/不恢复grant | PASS |
| QE15 | queued通知入口立即hold；callback调用0 | PASS |
| QE16 | 并发flush单flight；相同/新ID ACK均不重复effect | PASS |
| QE17 | 四种finish不降级success；无succeeded target；A suspended拒绝通知 | PASS |
| QE18 | 合法same-A fenced finish后late effect拒绝 | PASS |
| QE19 | result后先revoke拒绝effect；resource恢复不恢复grant | PASS |
| QE20 | COMMIT后revoke保留成功；固定inspection通知可ACK，无新推理grant | PASS |

20 case各stub total1，任何后续故障/replay/recovery delta0；post-result负向不能套用上批stub全零标签。QE01/QE02/QE04/QE06/QE07等明确核对真实表及原回执；正常结果digest由测试独立SHA计算。QE15验证queued入口hold，actual microtask invocation的check另静态核对；不宣称专用切点测试过该更细间隙。late cuts串行暂停A，未声称A可并行处理远端fence。QE09是实际callback timeout；其他工程cap超限未注入。

固定命令：node scripts/run-electron-node-test.mjs scripts/control-store-effect.tracer.test.mjs；Electron ABI123启动，未重编better-sqlite3。每run源码SHA/log/results/exit保留，测试不读取真实数据。原run-01与后续run保持分列；最终run以anchor为准。

## 预算、退出及限制

A heap64MiB/frame8192/pending8/receipt16/page4096/max256/ACK与cut/exit5000ms；H ops16/holds8/events128/notification attempts16；callback1000ms/case12000ms/Hrun90000ms/outer150000ms/poststop5000ms/log256KiB；每run≤20fixture/≤32A（实际20/26）。shellfalse/windowsHide、受限env，不treekill。outer仅停止own launcher，stdio未结算在5000ms后UNKNOWN、retain，不推出后代已退出。实际26 known A/stdio exit、reader0，20正常fixture close/exit0与6engineering stop分列。未知/失败fixture保留；只检查exact owned原对象/marker/single-link及目录allowlist后非递归删除，无批量清理。

这些工程预算不等于whole-lifetime/hardRSS/Job/native物理close/断电耐久/namespace/restore/resource资格。hello RSS起点范围46305280–49147904bytes，只测startup。receipt16容量guard存在，本矩阵至多5receipt，耗尽未运行。callback timeout潜在继续运行已明确不后台ACK，合成迟延promise可手动settle，无取消真实服务证明。

## 验证、失败队列与恢复

20PASS、4脚本syntaxPASS；独立安全plan静态PASS。最终Spec/Standards两路静态审查绑定8文件/tree/diff SHA，报告/修订历史见scratch。product tests/typecheck/build/Runtime/Pi/Browser/Desktop/Computer Use NOT_RUN；当前产品app NOT_OBSERVED，Esc仍BLOCKED_UX_ACCEPTANCE。正式A outage/错误文案/native dirty-window/CAS typedcode未修复；Windows强backup拒绝、EBUSY owner/timing UNKNOWN、Router预算不可满足、TASK历史23missinglinks FAIL继续保留，新增prefix链接检查不改历史结论。

[终态交接](../handoff/WINDOWS-CONTROL-EFFECT-TRACER-20261005.md)与[CURRENT-STATE](../handoff/CURRENT-STATE.md)为恢复入口。本机.scratch/windows-control-effect-20261005/terminal-anchor.json绑定candidate/tree/reviews/manifest/run，区分当前raw WIP、actual build、合成A与历史产品Runtime。productionQualified/restoreAllowed/namespaceMetadataQualified/formalAdapterWired=false。**STOP；nextBatchAuthorized=false**。
