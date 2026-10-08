# 当前：WC01 owned H进程重启 / retention tracer（2026-10-05，VALIDATED_TRACER / STOP）

本批仅 owned 合成 H进程重启/retention：原operation/scope/canonical payload/digest/result与delivery ACK意图在副作用前写有界append journal，H实际退出/新PID+UUID恢复，A唯一SQLite writer保持。恢复只精确核对原receipt，missing/不匹配保持unknown并关闭通知推进；不盲重发、不重推理、不自动grant；历史success/receipt不降级。监督方保有head/length与对象身份，不能证明supervisor冷启动antirollback或断电耐久。

最终run-02 16PASS/0FAIL/0cancel、5脚本syntaxPASS；32H（30ready/2故意loadfail）与29A全部known child/stdio退出、reader0/uncertainfalse；QR03持久reservation1但actualstub0，其余15case各actualstub1，重启后delta0。QR01保持同一个A而H换PID，其余有效case重建A。14有效fixture pairs非递归清理，2损坏pairs保留；run-01 2PASS/14FAIL及16pairs原样保留，18retainedpairs共94对象副本已封存，不自动清理Temp。首轮JSON字段顺序误报immutable变化已修复为22固定字段逐值严格比较。

baseline3344records/3331existing对前批sealed275b70169c45826aa9f39db86ee9a7d113576984零drift；73前批证据/666产品inputs/14actualoutputs重验。本批9工作区文件，候选3338existing；原index/generated/非scopeWIP与TASK/CURRENT历史正文原字节保持。安全初审4finding保留、静态followup修复；最终Spec/Standards两轴绑定9SHA/tree/diff，见终态anchor。

产品build仍dam-4c583238a11c002d，无新build；合成H/A Windowsx64 10.0.26200/Electron30.5.1/Node20.16.0/ABI123/SQLite3.53.1；产品Runtime最后2026-10-04，当前app NOT_OBSERVED。产品tests/typecheck/build/Pi/Computer Use NOT_RUN；strongWindowsbackup拒绝、EBUSY UNKNOWN、Router BUDGET_UNSATISFIABLE、Esc BLOCKED_UX_ACCEPTANCE及TASK历史23missinglinks FAIL继续保留。正式H ledger/Adapter/publicschema/OS/resource/source/VFS/真实profile未修改，productionQualified/restoreAllowed/namespaceMetadataQualified/formalAdapterWired=false。

尚未验证supervisor+H冷启动持久anchor、append到witness间故障、actualstub后resultsave前故障、callbacktimeout（本批只静态）、proxy/exit/log超限、whole-lifetime资源/Job/hardRSS/nativephysicalclose/断电/namespace/restore、真实域与86方法/所有reader迁移、正式UI路径。下一建议仅先只读盘点正式Adapter剩余准入项并收敛实施队列；未自动授权。VALIDATED_TRACER / STOP，nextBatchAuthorized=false。

恢复：[CURRENT-STATE](docs/handoff/CURRENT-STATE.md)→[交接](docs/handoff/WINDOWS-CONTROL-RESTART-TRACER-20261005.md)；本机.scratch/windows-control-restart-20261005/terminal-anchor.json与evidence-manifest-final.json。

# 历史：WC01 owned 合成 effect / outbox tracer（2026-10-05，VALIDATED_TRACER / STOP）

本批仅 owned 合成 effect-commit/outbox：单计数 stub result 后，result/effect/attempt succeeded/原 scope 不可变协议 receipt/outbox 同一同步 MAIN transaction；COMMIT 或 delivery ACK 丢失保持 unknown，精确核对原 operation；通知允许重投且不重跑 stub，finish 不降级 succeeded。正式产品/publicschema/Host/Adapter/Broker/OS/真实库未改。

最终 run-02：20 PASS/0 FAIL/0 cancel；20 case 各 stub total1，后续 replay/recovery delta0（不是模型执行证据）；20 fixture/26 A known child与stdio close、reader0/uncertainfalse、20 owned 非递归清理；20正常 fixture close 与6工程停止分列。run-01原证据和源码保留，run-02增加独立结果digest/关联断言和A suspended通知拒绝后通过；若后续复核要求修订，以最终anchor所选run为准。4脚本syntax PASS，安全规划静态PASS；终审两轴绑定8文件/tree/diff，见终态anchor。

baseline3337path records/3325existing对前批sealed2110d1d89a60e8b5ed061e94e4badb25fe2b0edb零漂移；87前批证据、666产品inputs、14actualoutputs SHA重验。本批8修改文件、3331existing候选；原index/rootgenerated/非scope WIP与历史正文原字节保持。

actual产品build仍 dam-4c583238a11c002d（无新build）；合成H/A Windowsx64 10.0.26200 / Electron30.5.1 / Node20.16.0 / ABI123 / SQLite3.53.1。产品Runtime最后2026-10-04，当前app NOT_OBSERVED。产品tests/typecheck/build/Pi/Computer Use NOT_RUN；强Windows backup继续拒绝，EBUSY UNKNOWN、Router BUDGET_UNSATISFIABLE、Esc BLOCKED_UX_ACCEPTANCE、TASK历史23missinglinks FAIL保留。

通知ACK协议receipt是本合成设计，不冒充真实域现行为。真实tag normalized tags-only max8、combined max30、ordinary void publish与recovery await(eventId)不同；storage-unknown映射、真实finish/outbox迁移、H restart持久恢复、86方法/所有reader、Original/source/VFS/protectedcatalog/loader/whole-lifetime/Job/hardRSS/断电/restore仍未完成。productionQualified/restoreAllowed/namespaceMetadataQualified/formalAdapterWired=false。下一建议仅bounded owned H restart恢复/原operation与结果及delivery ACK持久证据纵切，未自动授权。VALIDATED_TRACER / STOP，nextBatchAuthorized=false。

恢复：[CURRENT-STATE](docs/handoff/CURRENT-STATE.md)→[交接](docs/handoff/WINDOWS-CONTROL-EFFECT-TRACER-20261005.md)；本机.scratch/windows-control-effect-20261005/terminal-anchor.json与evidence-manifest-final.json。

# 历史：WC01 合成 quiescence / claim-sent tracer（2026-10-05，VALIDATED_TRACER / STOP）

本批owned合成quiescence/claim-sent：work→download→local hold→awaited A fence→dependent；独立cycle/maintenance/shutdown、resume与grant分离；claim/sent ACK丢失不开始stub，fresh原receipt只历史核对。真实产品/publicschema/Host/Adapter/Broker/OS身份权限/真实库不变。

首run-01 18PASS/run-02 19PASS和Spec原NEEDS_REVISION保留；增加admission逐步/微任务实际调用点检查/QC19后，最终run-03 19PASS/0FAIL/0cancel，QC01/QC02各1次本地计数stub、17负向全0；19fixture/25A known child/stdio exit、reader0/uncertainfalse，19owned非递归清理；19正常fixtureclose与6工程停止分列，不称ordinary appquit/native物理/断电资格。callback timeout已实验，其余case/global/outer/log/post-stop超限仅静态。

新baseline3331records/3319existing对上一sealed9cc3a992eefc4c8af5ccaf89471cc228b9c59448零drift，48前批证据/666产品inputs/14actualoutputs重验；实际8scope/候选3325existing，原index/generated/非scopeWIP保持。安全review原clarification保留、有限envelope修订后独立follow-up静态PASS；最终两轴绑定tree/diff/8文件SHA见终态anchor。

实际产品build仍dam-4c583238a11c002d；本批合成H/A Windowsx64 10.0.26200/Electron30.5.1/Node20.16.0/ABI123/SQLite3.53.1；产品Runtime最后2026-10-04，当前app未观测。产品tests/typecheck/build/Pi/模型/Provider/CU NOT_RUN；强backup拒绝、EBUSY UNKNOWN、Router BUDGET_UNSATISFIABLE、Esc BLOCKED_UX_ACCEPTANCE、TASK历史23missinglinks FAIL保持。

max1合成attempt不是真实OCR/tag域验收；effectcommit/finish/outbox、Hrestart持久恢复、86方法与OS/source/loader/whole-lifetime/restore未完成。productionQualified/restoreAllowed/namespaceMetadataQualified/formalAdapterWired=false。无真实数据/模型/账号/下载/安装/Provider、stage/commit/push；下一建议owned合成effect-commit/outbox，未自动授权。VALIDATED_TRACER / STOP，nextBatchAuthorized=false。

恢复点：[CURRENT-STATE](docs/handoff/CURRENT-STATE.md)→[交接](docs/handoff/WINDOWS-CONTROL-CLAIM-TRACER-20261005.md)；Remote本机.scratch/windows-control-claim-20261005/terminal-anchor.json与evidence-manifest-final.json。完成后STOP。

# 历史：WC01 合成 H facade / catalog-reference tracer（2026-10-05，VALIDATED_TRACER / STOP）

- 最新用户批准上一兼容设计建议；实际8文件：4test-only脚本、tracer说明/交接、CURRENT-STATE与本恢复点。无正式Host/Adapter/Broker/public契约/schema/OS安装身份权限或真实库变化。
- baseline3325records/3313existing对前sealed9f18957c298a88acf7b3406473b114f54d6c2ee4零drift；29前批evidence/666inputs/14actualoutputs SHA重验，原index/generated/全部非scopeWIP保持。无真实库/素材/账号/凭据/RuntimeDB/模型/Provider/下载/安装或stage/commit/push。
- 最终run-03 17PASS/0fail/0cancel；17fixture/23A全部已知child/stdio退出、reader0/uncertainfalse，17owned非递归清理。17正常fixtureclose/exit0、6工程停止分列；前run-01/02/03原源码/log/results保留，不称普通appquit、native关闭或断电资格。
- optional expectedCaption/COALESCE、同MAINreceipt、固定ref/raw拒绝、H epoch/issuedscope、独立hold/shutdownsticky、awaited revoke、fresh原receipt核对/旧ID执行拒绝、lostACK/错误receipt/live malformed保稿已限定验证；H-memory/resourceflag/same-user双root不证明真实profile/OS资格或全86方法。
- 新tracerRuntime Electron30.5.1/Node20.16.0/ABI123/SQLite3.53.1；actual产品build仍dam-4c583238a11c002d，产品Runtime最后2026-10-04、当前app未观测。产品build/tests/Pi/CU NOT_RUN；强backup/EBUSY UNKNOWN/Router预算FAIL/UXblock/历史23missinglinks FAIL保持。
- 终态：[CURRENT-STATE](docs/handoff/CURRENT-STATE.md)→[交接](docs/handoff/WINDOWS-CONTROL-FACADE-TRACER-20261005.md)；Remote本机.scratch/windows-control-facade-20261005/terminal-anchor.json、evidence-manifest-final.json、最终run与两路review。productionQualified/restoreAllowed/namespaceMetadataQualified/formalAdapterWired=false，nextBatchAuthorized=false。下一建议owned合成quiescence/claim兼容纵切，未自动执行，STOP。

# 历史：WC01 合成双进程协议 tracer（2026-10-05，VALIDATED_TRACER / STOP）

- 用户批准上一批owned合成protocol tracer建议；实际8文件：4test-only脚本、tracer说明、交接、CURRENT-STATE与本恢复点。没有正式Host/Adapter/Broker/公共schema/OS身份权限或真实库迁移。
- baseline3317records/3305existing对上批sealed 7698e2b2c5dfd07643d16624ad5ad69bcf9d07ec零drift；上一28证据与666inputs/14actualoutputs SHA保持。原index/generated/无关WIP保持，无真实库/素材/账号/模型/Provider/下载/安装或stage/commit/push。
- run-01 11PASS保留；新增child退出记录后run-02 11PASS/0fail/0cancel，10fixture/13A全部已知exit/stdio close、reader0、非递归owned清理。note/effect/同MAINreceipt、COMMIT两cut、revoke ACK/unknown及旧ID拒绝限定证实；sameuser不证明B2强隔离。
- 本批合成H/A Runtime Electron30.5.1/Node20.16.0/ABI123/SQLite3.53.1；实际产品build仍dam-4c583238a11c002d。rawtree/源码/输出/review身份见本机anchor，root旧generated不当当前build。CU/正式用户路径/产品build/Pi未执行；历史EBUSY UNKNOWN/Router/UXblock保留。
- 终态：[CURRENT-STATE](docs/handoff/CURRENT-STATE.md)→[交接](docs/handoff/WINDOWS-CONTROL-PROTOCOL-TRACER-20261005.md)；Remote入口.scratch/windows-control-protocol-20261005/terminal-anchor.json、evidence-manifest-final.json、run-02、两路final review。productionQualified/restoreAllowed=false，nextBatchAuthorized=false。下一建议兼容设计收敛，不自动Adapter/OS/真实库，STOP。

# 历史：WC01 Windows release归因 / source-loader威胁边界（2026-10-04，PARTIAL / STOP）

- 本批批准范围已收敛：13实际文件，合成NTFS首次rename、owned guardian PROCESS/当前Host PSS诊断、source/snapshot/executable边界与A/B候选策略；不接正式Adapter、资源/分发或OS broker/ACL实施。productionQualified/restoreAllowed=false，nextBatchAuthorized=false。
- baseline3306records/3295existing对上批sealed a22987b4ccfaca3965d3f2f16e6fcc3df524d74d无漂移；130历史证据SHA核验只证明起点。原index/WIP/rootgenerated保持，无真实数据/模型/账号/凭据/Provider/下载安装或stage/commit/push。
- 本批3/72首次EBUSY与原三次并列，owner/timing仍UNKNOWN；两instrument矩阵各24成功及后时点PSS不归因原失败。最终选定8命令/6测试文件44PASS，原name-only控制失败、scanner工程中止、child cache环境2FAIL及错误tsconfig调用保留；最小诊断修复复测，不retry/放断言。
- candidate tsc/context701/701与666产品输入/14actualoutputs逐SHA通过；沿用build dam-4c583238a11c002d，root旧generated/index/WIP保持。Router BUDGET_UNSATISFIABLE保留；独立两轴精确tree签收、raw/reverse闭包与runtime分列见本机anchor，不移用历史PASS。
- CU NOT_RUN，前批Esc仍BLOCKED_UX_ACCEPTANCE；精确owned诊断Host工程停止不是普通quit，终态进程/旧64869为0。最新文件/before-after/验证/身份/限制/下一建议及Remote入口：[本批交接](docs/handoff/WINDOWS-BACKUP-BOUNDARY-20261004.md)，本机.scratch/windows-backup-boundary-20261004/terminal-anchor.json及evidence-manifest-final.json。STOP，不自动下一阶段。

# 历史：WC01 Windows metadata / FSCTL / 既有句柄资格（2026-10-04，PARTIAL / STOP）

- 最新用户批准上一批建议；范围内15实际文件、合成矩阵/私有最小拒绝修复、必要验证/文档/独立两轴复核已收敛。不自动Adapter、准备资源或分发下一阶段，nextBatchAuthorized=false。
- 新baseline3300路径/3289既有源码与上批sealed c5317220443bee3c233c0c74f26deb5e8e474265无漂移；原index/WIP/rootgenerated保持。只已有工具，无真实数据/模型/账号/Provider、下载安装或Git提交。
- 最终选定9文件98PASS/1FAIL；source/journal sparse/compressed及actual MAIN/evidence拒绝；既有writer/cache/DLL/managedexe反例保留。native-load12/1、artifact-v2及terminal9/1立即rename EBUSY原失败及先前原断言复跑13/13、10/10并列；旧99/0仅归旧probe源码。UNKNOWN_RELEASE_TIMING_OR_OWNER未闭合，不再刷绿、未加retry或降低门槛。candidate typecheck/ownership/666输入+14actualoutputs与两轴签收见anchor，Router预算失败保留。
- HEAD b5cc954f90d248694aedc2d6ca1aa5188fa0aa11/codex/windows-workspace-1001；沿用verified actualbuild dam-4c583238a11c002d/sourceDigest4c583238a11c002d03925b3e5a0d9cfdb879ef8c705a7b7331d7b18c6bb53bff；WIP/rawcandidate/currentruntime分列。无stage/commit/push。
- 本批CU NOT_RUN，前批Esc仍BLOCKED_UX_ACCEPTANCE。productionQualified/restoreAllowed=false，正式Windows写入前拒绝；完整实际文件/before-after/未验证/下一建议与Remote入口：[本批交接](docs/handoff/WINDOWS-BACKUP-METADATA-20261004.md)。本机.scratch/windows-backup-metadata-20261004/terminal-anchor.json、evidence-manifest-final.json；STOP。

# 历史：WC01 Windows safe-load / journal pathname（2026-10-04，PARTIAL / STOP）

- 最新用户批准上一批建议；22实际文件的私有合成纵切、适用验证/文档/独立两轴复核完成。正式Adapter未接，生产门关闭，productionQualified/restoreAllowed=false，nextBatchAuthorized=false。
- guarded首load/Host句柄独立SHA/UNKNOWN释放、命名VFS journal FILE_CREATE/同句柄删除、实际maintenance+同事务marker/readonly proof；最终138聚焦PASS，typecheck/701-of-701 ownership/666产品输入+14既有artifacts核对PASS。Router BUDGET_UNSATISFIABLE保留，无断言/门槛降低。
- HEAD b5cc954f90d248694aedc2d6ca1aa5188fa0aa11 / codex/windows-workspace-1001；沿用actual build dam-4c583238a11c002d/sourceDigest4c583238a11c002d03925b3e5a0d9cfdb879ef8c705a7b7331d7b18c6bb53bff。当前WIP/tree/review与完整runtime签本机anchor，root旧generated/index/无关WIP保持；无stage/commit/push。
- 本批CU NOT_RUN，前批Esc中断仍BLOCKED_UX_ACCEPTANCE；metadata/FSCTL、bootstrap依赖/分发、guardian准备Job/预算、managedexe、hardRSS/dirsync/断电及kernelclosefault仍PARTIAL。下一建议补这些资格边界，再考虑Adapter；本批后STOP。
- 当前投影：[CURRENT-STATE](docs/handoff/CURRENT-STATE.md)；完整文件/行为/验证/缺口/身份/后续：[本批交接](docs/handoff/WINDOWS-BACKUP-PATH-20261004.md)。Remote锚点 .scratch/windows-backup-path-20261004/terminal-anchor.json、evidence-manifest-final.json；此前证据只归历史。

# 历史：WC01 Windows helper / VFS / commit proof（2026-10-04，PARTIAL / STOP）

- 最新用户批准helper资源、SQLite VFS源身份与同事务commit证明。合成证明链已验证；整体生产资格仍PARTIAL，Windows生产门关闭，正式Adapter未接线，nextBatchAuthorized=false。
- 实际25文件；144聚焦PASS +2独立FSCTL实验限定PASS；candidate typecheck/build/ownership PASS；独立两轴固定源码及终态增量签收见本机review证据。Router BUDGET_UNSATISFIABLE FAIL保留，未调预算/断言。
- helper原子出生入限额Job、完整kernel峰值及UNKNOWN物理release占账；VFS main file-object provenance；private recordCommit同DDL/业务事务journal marker与readonly当前源recorded-commit。pathname load/source journal/hardRSS/分发/断电资格未闭合，restoreAllowed/productionQualified=false。
- build dam-4c583238a11c002d/sourceDigest4c583238a11c002d03925b3e5a0d9cfdb879ef8c705a7b7331d7b18c6bb53bff（666输入）；HEAD b5cc954f90d248694aedc2d6ca1aa5188fa0aa11/codex/windows-workspace-1001。原index/WIP/root generated原字节保留，actual generated封入独立candidate tree。
- 本批Computer Use NOT_RUN；前批Esc中断仍BLOCKED_UX_ACCEPTANCE。旧自有Host12284精确核对后工程停止，exit4294967295，64869关闭，不能算正常quit。无真实库/模型/账号/凭据/下载/安装/Provider、stage/commit/push。
- 当前投影：[CURRENT-STATE](docs/handoff/CURRENT-STATE.md)；完整文件/before-after/验证/身份/队列/限制：[本批交接](docs/handoff/WINDOWS-BACKUP-PROOF-20261004.md)。Remote锚点`.scratch/windows-backup-proof-20261004/terminal-anchor.json`、`evidence-manifest-final.json`。STOP；下一批建议先做安全加载/source journal资格，再考虑具体正式Adapter，不自动续接。
# 历史：WC01 Windows备份源与恢复续批（2026-10-04，PARTIAL / CU_INTERRUPTED）

- 用户批准续接下一批；新增private retained source/space与bound recovery、precompiled helper Job/target postexit资源证据。生产Windows仍写入前拒绝，不改公共schema/journal/IPC，无真实数据/模型/账号/Provider、无stage/commit/push。
- 聚焦验证已执行；候选构建、独立复核和本build适用CU进行中，历史PASS不移用。当前证据.scratch/windows-backup-recovery-20261004，详情[本批交接](docs/handoff/WINDOWS-BACKUP-RECOVERY-20261004.md)。

# 历史：WC01 Windows备份生命周期续批（2026-10-04，PARTIAL / STOP）

- 用户批准上一批建议；同句柄完整快照 verifier、真实 OS/共享 ledger RAM permit、私有 finish/actual close、分段 flush/status/中断重启与 native 内容 retrieval 已在合成范围实施。Windows 生产仍 TAG_INTENT_BACKUP_UNSUPPORTED；无真实数据/模型/账号/Provider、无 stage/commit/push。
- 聚焦79 PASS；原 admission 8PASS/2FAIL（旧 codec 不可用前提），原正向生产升级及 Router 失败保留；candidate typecheck/build PASS。两轴独立终审Standards PASS/0未修复，Spec合成PASS/0可行动错误、生产资格PARTIAL；候选闭包/rawblob/反向22文件/index/WIP核验PASS。
- WBL-D01 fresh profile 仅普通 Desktop 初始页观察；用户物理 Esc 停止 Computer Use，Browser/业务路径 NOT_RUN，BLOCKED_UX_ACCEPTANCE。此后零 CU 输入；仅核对精确自有PID/profile后结束 Host37320，exit4294967295，不能算正常quit。旧 WNT-D01 不归本build。
- build dam-1bce53aac9b0f46d/sourceDigest1bce53aac9b0f46d350a4a6c1b8f4642f24904c9625fa4ad3481f4600f94e6af（663产品输入）；HEAD b5cc954f90d248694aedc2d6ca1aa5188fa0aa11/codex/windows-workspace-1001。原index/WIP/root generated保留，actual generated封入独立tree。
- helper峰值/硬限、全生产source/space重验、status/source commit恢复资格、正式 Adapter/composition及本build业务CU仍缺，保持生产门关闭。
- 当前：[CURRENT-STATE](docs/handoff/CURRENT-STATE.md)；完整文件/before-after/验证/身份/队列：[本批交接](docs/handoff/WINDOWS-BACKUP-LIFECYCLE-20261004.md)。Remote锚点 .scratch/windows-backup-lifecycle-20261004/terminal-anchor.json 与 evidence-manifest-final.json。本批STOP，nextBatchAuthorized=false。

# 历史：WC01 Windows原生安全目标续批（2026-10-04，PARTIAL / STOP）

- 用户批准原生目标方案、原子no-reparse创建、SQLite接入/持久化资格与资格解释恢复；本批交接后停止，nextBatchAuthorized=false。
- Test-owned NtCreateFile/retained handles/同句柄SQLite镜像tracer完成5+4项；真实junction在写前C0000280拒绝。生产backup/Host维护源码保持基线，生产Windows仍TAG_INTENT_BACKUP_UNSUPPORTED。Buffer inspector资格未解决，未绕安全门。
- 正式后台拒绝提示明确无提交、手工编辑可用；自动轮询不再抹操作错误，显式恢复与原scope/epoch/revision保留。聚焦50 PASS；原集成5pass/10fail/1cancel及router BUDGET_UNSATISFIABLE FAIL保留。candidate typecheck/build/context694/694 PASS。
- WNT-D01正式Browser/Windows实际picker创建Copy、计划取消/重复拒绝/轮询恢复、描述保护及关开、About/正常quit限定PASS，Host48744 exit0、窗口/端口关闭。readonly schema1、2active assets、edited=1、无后台schema/备份、Copy hash和DB核验字节保持。底部菜单裁切FAIL，使用设置正式菜单完成收尾；完整UX PARTIAL。
- 新build dam-46fc882dff980814 / sourceDigest46fc882dff9808140fb12212f46755043c2c2a20f0109424d271cecd498c50d0、659输入；HEAD b5cc954f90d248694aedc2d6ca1aa5188fa0aa11；当前全WIP/untracked候选闭包、root旧generated与真实index保留，无stage/commit/push。
- 两轴独立终审完成：Standards PASS（0未修复发现），timeout挂起已修复复测；Spec PARTIAL（3类资格缺口，0新增可行动实现错误/范围扩张），见review-final。真正RAM/same-handle完整SQLite verifier/private生命周期及完整durability/restart/retrieval未完成，不能生产放行。
- 当前投影：[CURRENT-STATE](docs/handoff/CURRENT-STATE.md)；实际文件/before-after/验证/CU/身份/后续：[本批交接](docs/handoff/WINDOWS-NATIVE-BACKUP-20261004.md)。Remote入口.scratch/windows-native-backup-20261004/terminal-anchor.json、evidence-manifest-final.json。本批后STOP，不自动下一批。

# 历史：Windows NTFS安全备份 / Desktop续批（2026-10-04，PARTIAL / STOP）

- 最新用户批准上一批建议：安全NTFS Adapter论证/合成对抗/原正向断言/受控Desktop。未扩展Router或WC阶段；本批已停止，下一批未授权。
- EXLOCK下属性句柄仍可将空目录改成junction；NOFOLLOW=0。两轴复核拒绝启用，生产backup/Host源码保持起点字节，零新增生产能力；不绕过备份/Runtime/资源资格。
- 新反例4/4、生产拒绝4/4、维护30/30 PASS；原正向集成5pass/10fail/1cancel（16触达，后续未运行）保留。根context因未跟踪来源拒绝；临时index候选context PASS（694/694 owned），相关Router原测试仍FAIL：BUDGET_UNSATISFIABLE，未扩预算。
- 新鲜合成Desktop首次启动已可操作；创建/双图Copy/计划取消与拒绝/描述关开及双客户端回读/About/正常quit见CU矩阵。计划拒绝只显示通用重试提示，未说明备份资格，UX仍PARTIAL；Browser首连异常后普通刷新恢复，单列。
- 产品输入与已构建产物逐字节核验一致，沿用实际build dam-66a3d34ea3bbf6ce / sourceDigest66a3d34ea3bbf6ce0f9c6bf6677c92aa4ed784bb1baf9c2584474c2a6592b33b（659输入），本批不重新构建。HEAD b5cc954f90d248694aedc2d6ca1aa5188fa0aa11；旧root generated不代表该build，原WIP/index语义保留。
- 唯一当前投影：[CURRENT-STATE](docs/handoff/CURRENT-STATE.md)；完整文件、限制、两轴复核、队列和Remote终态入口：[本批交接](docs/handoff/WINDOWS-BACKUP-20261004.md)。最终Spec完成，最终Standards因工具风险过滤中断两次，BLOCKED_REVIEW；主Agent自查不替代。本机 .scratch/windows-backup-20261004/terminal-anchor.json 与 evidence-manifest-final.json。

# 历史：Windows codec / NTFS 资格纵切（2026-10-04，PARTIAL / STOP）

- Windows精确codec资格已交付；NTFS生产备份仍BLOCKED，在写备份/DDL前拒绝。危险publisher已撤回，独立复核P1关闭，不降低安全门。
- 聚焦77项PASS；candidate typecheck/build/ownership PASS；router保留BUDGET_UNSATISFIABLE。当前生产升级集成16项触达：5pass/10fail/1cancel，失败归Windows备份资格缺口/夹具barrier，未改断言。
- 正式Browser已核对PNG/JPEG准备/取消、备份拒绝、普通描述保存关开、About与正常退出；Desktop无可目标窗口，BLOCKED_UX_ACCEPTANCE。自有fixture计数0，无真实模型/库/账号；无commit/push。
- build dam-66a3d34ea3bbf6ce / sourceDigest66a3d34ea3bbf6ce0f9c6bf6677c92aa4ed784bb1baf9c2584474c2a6592b33b；HEAD b5cc954f90d248694aedc2d6ca1aa5188fa0aa11，原WIP保留，root旧generated不代表本build。
- 恢复入口：[终态交接](docs/handoff/WINDOWS-QUALIFICATION-20261003.md)；本机证据 .scratch/windows-qualification-20261003/terminal-anchor.json 与manifest。下一批未授权，停止。

# 历史：WC01 Windows 收敛终态（2026-10-03，PARTIAL / STOP）

- 本轮仅用户批准WC01；W01→W06已执行。F01已修复：Windows视觉codec拒绝不再冻结共享OCR/Pi准入；真实资源危险熔断、UNKNOWN实际release、撤权与原资格门保留。
- 实际候选 build dam-4e1a5ae7b2c7b5eb，sourceDigest 4e1a5ae7b2c7b5ebe341c2d88f9c79b522bcb8d54dc3fd1d88f86e0ed44e4205，657输入；HEAD b5cc954f90d248694aedc2d6ca1aa5188fa0aa11 / codex/windows-workspace-1001。原archive部分LF→CRLF，已测候选实际字节重新冻结；root raw产品digest decf4bf2fb7151beb3d2cf86cde19e2c93633cdf15f4d4ea97a03b5e5b4ac9fa分列，产品文本等价。旧root generated WIP保留，实际构建在独立candidate。
- Windows Pi Node24.21.0/SDK0.99.1，正式release/Main pin99e47ca53d91aa342d134125f1980106105e27186ef4f61640c3bc3b98c651c0；LF字节契约、默认offline-plan及默认生产资源5/5通过，无下载/安装/真实推理。
- 17选定命令15通过/2失败；F01 10/10、Pi negative17/17、OCR生命周期17/17、quiescence11/11、临时真实SQLite schema30/30及禁用32通道通过；typecheck/build/context ownership通过。Windows codec3例FAIL及router BUDGET_UNSATISFIABLE保留，不放宽资格/预算/断言。
- 正式Browser合成CU：普通AI入口、临时库Copy、视觉资格说明、其后Pi探测、专用OCR审查→1/1→重载重开、About身份及正常quit限定PASS。设置探测自身冲突和Inspector错误位置仍有UX缺口。Desktop两次无可确认受控窗口，BLOCKED_UX_ACCEPTANCE；Browser Host/fixture exit0，Desktop残留合成进程定向停止、launcher exit1。
- 无真实库/账号/模型/凭据访问，无commit/push/发布。Windows生产codec、backup、后台OCR资格、真实AI、签名安装和Mac实机NOT_RUN。完整UX及双客户端总承诺仍PARTIAL；历史f44/golden失败不转成当前PASS。
- 唯一当前入口：[CURRENT-STATE](docs/handoff/CURRENT-STATE.md)；本批文件/before-after/验证/独立复核/后续及Remote锚点：[WC01终态](docs/handoff/WC01-20261003.md)。本机.scratch/wc01-20261003保留manifest、before/after、仅本轮patch、原日志/exit/环境、失败队列、CU、review-final和terminal-anchor；普通checkout不含原始证据。
- STOP；nextBatchAuthorized=false。下一批建议Windows codec+NTFS schema备份资格纵切；治理预算与UX另列，不自动延续旧队列。

# 历史：正式本机双客户端实施检查点（2026-10-03，部分交付）

- 2026-10-03最终受影响候选f8e/source658、treeeadec070…f59b，277选择文件；
  独立typecheck/build+7文件PASS。Root正式IAB实际丢成功回执/底层重发拒绝/权威回读、
  SSE断流点击保存拒绝/保输入/重连后手动保存重开、640深浅提示布局、2411长备注
  逐字读取、960/1280About、关库取消准确Root407恢复/关开7素材2草稿/正常quit全部
  限定PASS。Host89241 exit0/proxy53723 exit0；viewport还原，测试标签已关闭。
- 6a9正式合成OCR picker/peer同步/审查取消确认/1/1识别/双端修订冲突采用保存重开
  及复制PASS；当前profile与原receipt一致，原Root407+Notebook2草稿保留。6a9回执
  误报FAIL保留；114加X-DAM-Invocation准入，真实HTTP隔离红→绿及正式故障复测PASS。
  114菜单遮挡FAIL、f6c提示遮挡FAIL分列，f8e已复测修复。见实施矩阵E41–E46。
- 两轴增量审查（重发及CSS）：Standards0违规/0可操作smell，Spec0确认错误/0范围
  扩张；当时列出的故障/布局证据缺口已由后续Root限定补验，完整验收仍PARTIAL。
  历史f44完整suite113/22+28syntax、原golden1.097186%FAIL、默认Pi0/5FAIL和router
  无关AI断言FAIL不改判；fixture5/5和独立复跑不替代分发/安装包或真实模型。
- 未覆盖完整业务逐项/缩放/所有草稿故障矩阵；原生工具无表面为BLOCKED_UX_ACCEPTANCE，
  真实模型/账号/连接库/安装包NOT_RUN。提交当前分支的实施检查点，不push、不关闭
  Issue；无关schema/AI evidence/Pi seal等WIP排除。最终源码/报告绑定入口：
  .scratch/local-dual-client/final-checkpoint-20261003.json，证据本体不提交。

- 最新用户显式调用 implement，按已确认的 LOCAL-DUAL-CLIENT-SPEC 完整实施；
  23项草稿作为排序参考，不将本次实施指令写成逐票发布批准。子Issue仍未发布，
  父Issue #23未改变。不能因首轮入口可运行而宣称完整等价完成。
- 已接线：正式 Shared Client、唯一 Electron Host 与正式共享 Renderer；Desktop IPC
  和回环 HTTP/SSE 进入同一处理器及原素材库 authority queue，旧 electronAPI alias
  已移除。页面选择、媒体及操作 receipt 按客户端、用途和素材库代际校验。
- 已接线：每 profile 单 Host、双入口、一次性 launch、HttpOnly/SameSite session、
  Origin/CSRF/命令与角色检查；正常关闭界面保活，明确退出检查全体参与者。
  profile 内设置/草稿独立持久化；描述、提示词、OCR、笔记和工作集恢复保留原基线，
  并发写入采用 CAS，重连完成快照校准前阻止写入，通知失败不回滚已提交内容。
- 页面内选择会话归owner和library代际，浏览/确认/目录创建在Host检查；开发限制
  合成根及链接。仍只验证合成数据，不扩大到真实用户目录、模型或认证。
- 工作集卡片现打开复用正式 WorkReferencePanel 的页面工作区；支持排序、颜色、
  草稿返回重开、另存和显式冲突采用。scoped 桌面窗口 list/control 不暴露 token，
  dirty close 保留窗口，全局审查与逐窗检查互斥。原生系统效果仍未验收。
- 实测问题已修复：工作集恢复后 Add intent 被吞、clean 旧草稿被自动清除、另存后
  X 关闭的源草稿错误保留 loaded 标记；下载入库 Windows fsync EPERM 改为独占
  创建句柄同步并保留碰撞路径的身份/摘要验证。相关隔离回归通过。
- Pi 完整封印校验改为最多 16 路并行、大文件分块哈希，仍检查全部文件且等待所有
  在途检查后才返回/拒绝。新增 14/14、原 Pi 5/5 通过，不改变超时或准入。
- 之前完整工作树 typecheck/build通过：dam-793ad575ac817ce3，sourceCount655；
  此为未提交WIP身份。综合安全套件111个隔离文件PASS/19FAIL，28个syntax PASS，
  1个指定AI case PASS；159个唯一检查/181次执行。历史88PASS/33FAIL保留追溯。
  平台资格、Windows持久目录fsync、SQLite置换、POSIX夹具和golden失败单列。
- 本轮修复设置晚读/晚保存覆盖、审查确认期间过期、断连提示不可操作和越界路径
  拒绝前跟随链接；新增/复跑隔离回归通过。Browser草稿放弃与工作集切换改为页面
  内确认，取消/Escape保留输入；恢复6/6、工作集参考14/14及目标切换回归通过。
- 受控Host通过793正常菜单审查1草稿/保留并退出，session55273 exit0；当前已停止。
  之前工程停止只用于重建，不算正常退出CU。receipt位于
  .scratch/local-dual-client/controlled-launch.json；restart-controlled.mjs
  只恢复同一合成profile和登记服务，未动真实数据。
- Luna/high 旧4d正式 Browser CU通过描述冲突恢复/保存重开、双参考工作集、便签、
  色板及文件夹；Root通过下载入库、派生图片保存重开、Trash恢复、OCR修订重启读取，
  b70双tab设置同步/冲突显式采用及Luna工作集/标签；2f6恢复工作集保存重开、描述
  恢复取消通过。2f6旧JS确认卡住IAB后，主会话新标签实际交互已恢复。
  Luna旧/fresh namespace仍无法访问IAB，本轮后续由Root补验并单列工具阻塞。
  793 Root通过页面弃稿cancel/Escape/confirm、保存内容不变、Settings两tab冲突
  compare/adopt/save/刷新读取与恢复原偏好、other-tab dirty阻止关库中文说明、
  关库取消准确草稿重开、close/reopen6素材/1草稿、scoped窗口命令/状态反馈，
  正常quit后的冻结与可访问底部指导。报告cu-final-793-root/REPORT.md；不算原生效果。
  原gallery golden仍FAIL（1.097186% > 0.5%），未改阈值或基准；真实模型NOT_RUN，
  原生BLOCKED_UX_ACCEPTANCE。两轴review：已审查规范0项未解决，Spec仍PARTIAL。
- 选择性提交候选独立导出并验证：dam-e1d747797c875d55/source656，typecheck/build
  PASS，30个聚焦文件latest PASS。首轮29/1的启动器环境失败及unset环境复跑PASS
  保留；证据index-candidate-results/final-results.json。候选包含必要quiescence/
  Renderer session及Windows前置，排除schema/AI evidence提取和Pi平台封印WIP；
  retained IPC测试恢复11条对应旧实现断言。793 CU不归给该独立候选；后续实际候选CU及修复结果如下。
- 继续候选普通CU发现e1刷新冻结FAIL：Library普通设置读抢占Shell required读。
  Store现让普通读等待当前最新required完成后重新读取，保持后required/save失效、
  failure拒绝及identity清理；3协调回归实际红→绿，13/13和相关4文件复测PASS。
  候选新build dam-7b5b809ee122a97f/source656，typecheck/build PASS。root普通IAB
  About/已有库打开2图/刷新可操作、modal目标切换cancel/Escape保输入/confirm切目标
  且A/B保存内容不变、页面弃稿、Settings双tab比较/采用/保存/刷新/恢复偏好、
  关库取消精确草稿重开及close/reopen2图+1草稿、正常quit→session51027 exit0通过。
  当前Host已停止。e1工程停止exit1不算正常quit。指定Luna因线程上限无法启动，
  此轮由root补做；报告cu-candidate-e1-root与cu-candidate-7b-root，不归给Luna。
- 治理context:check PASS 691/691；Windows npm launcher修复、Desktop Shell窄必读
  及AL-01旧基线搬移保持安全约束/全文件预算。router完整测试仍在无关AI Runtime
  第588行失败，未改断言/阈值或纳入前轮AI提取。工作树未重新build，793只属旧记录。
  .scratch报告/截图/日志是本机保留的未提交证据，clean checkout不会自动拥有。
- 续接Spec复核补齐草稿动作序号：文档writer握手/Host高水位、删除与跨owner
  恢复放弃保护，旧v1恢复兼容。Renderer在动作时编号，握手共享屏障，失败重试
  保留同writer/原序号与未送达输入。新候选dam-070c96dd52503e41/source656
  typecheck/build PASS；11相关文件最新PASS，transition首轮Electron MockTimers
  内部失败及普通Node原启动器4/4重跑PASS分别保留。Luna/high已成功启动，正在
  受控IAB验证；新Host session42746正常菜单退出exit0。恢复/刷新/保存重开及
  关库取消/保留重开通过；Recovery确认弃稿后本地副本残留为070c FAIL，已隔离
  复现并修复，尚待新构建复测。安装入口/启动早到意图及标签冲突复核也在补齐。详见E33。
- 当时未完成（后续故障/相关尺寸长内容补验见顶部E43–E45）：完整尺寸缩放、安装包双入口
  及必要原生专项；综合suite失败仍保留。76故事/23票/264共享命令/277总登记已有矩阵；
  查 docs/product/LOCAL-DUAL-CLIENT-IMPLEMENTATION.md，不将代码接线视作全体验收。
  本轮增量和必要前置作为实施检查点选择性提交，无push；保留原先
  无关WIP。实施前快照在 .scratch/local-dual-client/implementation-baseline。

- 续接候选407/source657已typecheck/build、15文件latestPASS（首错Node runner失败单列）。
  Root正式CU确认弃稿后同document/reload不复活、Tag冲突采用保存peer重读、长备注与
  正常quit→session24195exit0；About恢复未开editor为FAIL，实际1280尺寸override未生效。
  070c/Luna弃稿FAIL、407/Root入口FAIL保留。Root报告cu-recovery-tag-407-root/REPORT.md。
- 已修复About恢复effect顺序、合法空Tag颜色误报dirty及startup无提示/不能恢复；
  新独立efda/source657 typecheck/build、16聚焦文件PASS；Tag两项实际红→绿，Library真实
  React3/3（初红日志由CLI输出重建、绿直接tee）。Luna/high IAB工具现可用，正式复测中。
  文件夹/色板Organization冲突刷新仍固定旧基准的新Spec缺口正在修，不因checkpoint停工。

- efda正式Luna/high CU已完成限定恢复/弃稿/双tabTag冲突保存重开及quit指导；Root确认
  session27420 exit0。12PNG已独立核对，首次恢复/Escape/弃稿/reload只有inline/AX，
  不把后续PNG补作未保存的帧。efda16文件PASS与历史407/070cFAIL分别保留，见E35。
- Organization5/5、Backend/Pi/Task16/16、OCR晚correct4/4与NotebookSession4/4已进入
  ff01/source658，typecheck/build+10文件PASS；ff01没启动Host，不能绑定efdaCU（E36）。
- 相邻Spec复核又捕获并修复保存前旧读取退回已保存配置/OCR、Pi重复初始意图与Focus
  合并时未完成标注/新输入丢失；真实组件固定源码红→绿：配置24/24、OCR9/9、
  Focus7/7，Module4/4。required失效仍阻Browser写，合并期间锁住标注与导航，
  未完成文字/便签先完成或取消，冲突副本与原权限不变。
- 新独立候选f44/source658/tree8e381…0830、266选择文件，typecheck/build及12相关文件
  全PASS（E37）。已普通启动同一登记合成profile，Hostsession72002；Luna/high正式
  IAB已About核对并执行新/未覆盖路径。完整selected合成安全suite初跑完成：135个
  隔离文件113PASS/22FAIL，另28个语法PASS，零timeout；原结果不改写。19既有失败、
  transitions Electron MockTimers、motion同步时序和Pi分发前置缺失分别已只读核对。
  新build运行期间不覆盖export或产品bundle；旧候选与完整WIP111/19/golden记录不动。
- 独立新导出tree2526c44…38df产品输入摘要与f44完全相同。motion仅修测试等待和同帧
  采样，保持全部断言，原Electron runnerPASS；transitions普通Node runner4/4PASS。
  context:check693/693PASS。Pi Windows生成seal/prep四份旧WIP继续排除；只用既有
  已核验Windowsfixture与实际f44Host（保留完整校验）做5项loopback协议PASS，不替代
  默认候选bundle的0/5FAIL或安装包NOT_RUN。无需新增下载、安装、封装或模型授权。

## 前轮：实施任务拆分（待发布批准）

- 用户在规格 Issue #23 发布后显式调用 to-tickets。本轮先交付23项可评审
  草稿，待用户批准粒度/真实依赖/合并拆分后按依赖顺序发布；不开始产品代码。
- 拆分评审 docs/product/LOCAL-DUAL-CLIENT-TICKETS.md；逐票正文在
  .scratch/local-dual-client/issues。采用一个兼容expand prefactor、完整业务
  迁移批次、contract及Browser/原生分开验收，不新建纯HTTP或纯UI横向任务。
- T08描述编辑为持久草稿首个完整闭环；笔记/工作集/OCR各自采用。账号可在
  双入口后并行，设置无需等素材入库，全局审查复用稳定登记协议，原生专项
  只依赖受影响能力，不被全部Browser完工阻塞。
- 已验证23个模板、76故事均有归属、38条直接边无循环/传递冗余、正文无实现
  路径及私有信息、评审相对链接和空白格式通过。GitHub原生blocked-by只读
  接口可用，批准后用于子票间阻塞；正文仅引用父Issue，不建立会改父Issue的关系。
- 尚未创建子Issue、修改/关闭父Issue或运行产品/CU；父规格仍是发布后的正文。
- 草稿复核已澄清：冷访问已退出Host的HTTP地址不保证DAM恢复页；contract及
  最终验收不再要求保留废弃兼容层。综合Browser验收按真实路径组汇集有效证据，
  复测最终构建受影响项，不把76故事机械变成重复操作。

## 已完成：规格与 Issue 发布

- 最新请求放弃并删除 MeshCentral；采用同一套 UI、同一个本地后端的
  Desktop / Browser 双客户端，由 Codex 内置浏览器操作和验证。用户显式
  调用 grill-with-docs，完成设计访谈；随后回复“我觉得没问题”确认完整设计，
  并调用 to-spec。前轮完成完整规格与 ready-for-agent Issue，未开始产品代码实施。
- Q1 已确定 Browser 为用户也能日常使用的正式本机客户端；Q2 已选择 DAM
  页面内文件/目录选择；Q3 已确认业务由浏览器验收，系统行为单独验收。
  Q4–Q7 已确认双入口/明确退出、完整本机选择器且开发目录隔离、允许两端
  同时编辑并提醒冲突、本轮只做现有正式功能等价。Q8 已选择本机暂存草稿、
  重新进入提示恢复；Host 尚未收到的最后输入不保证恢复。Q9 完整共识已确认。
- 完整设计已确认，ADR0491 已转 Accepted（Target Architecture，非交付证明）。
  可实施规格 docs/product/LOCAL-DUAL-CLIENT-SPEC.md 采用 to-spec 七节模板，
  包含76个用户故事及正式/原生/后台分层验收矩阵。
- 已按用户显式调用的 to-spec 发布 [Issue #23](https://github.com/zhr0210/design-asset-manager/issues/23)，
  状态 OPEN、标签 ready-for-agent。独立 gh 读回验证远端正文与本地规格一致。
  七节模板、76条连续故事、相对链接、空白及发布内容检查通过；只做文档验证，
  未运行产品或 CU，不将本次规格交付表述为双客户端已实现。
- 只读规格复核已采纳：系统动作仅限正式接线与准入允许者；未交付原生文件交接
  不列本轮必需验收；补单素材卡片、派生图片保存、标签别名/层级、旧素材只读、
  收录恢复、连接库与模型Workspace现有摘要/设置/构建诊断。真实数据权限不扩大。
  后续 Browser CU 继续由用户指定 GPT-6 Luna/high 子智能体执行，主 Agent
  复核结果；不以构建/契约测试代替用户路径。
- MeshCentral 已清理：PTY2905/16331 的临时代理和服务停止，相关 Node/Agent
  进程已退出，127.0.0.1:64431 无监听，Root IAB 测试标签已关闭。
  本轮 scripts/meshcentral-test、dist-temp/meshcentral-lab、三个 receipt
  核验归属的 dam-meshcentral-test 合成根及唯一匹配下载代理已移到系统
  回收站；原目标均不存在。未清空回收站或删除其它测试夹具。
- 用户此前导入的 CurrentUser/Root 测试 CA 已按公钥 SHA256 精确核验并移除，
  验证精确匹配数为0；没有更改其它证书、产品依赖或真实数据。
  清理首个永久删除脚本被执行策略拒绝；改用可恢复删除完成文件清理。
  PowerShell证书provider移除失败后，certutil精确移除成功并独立核验。
- 主 Agent 及两名事实调查 Agent 只读核查 Host、Preload、Renderer、原生功能、
  AI 与退出链。普通 userData 并不能隔离固定路径的 SettingsService；新开发
  入口必须明确隔离所有 profile 数据。当前没有正式 Browser transport。
  模型安装/旧 Runtime 部分通道禁用，原生行为不能由网页提示证明。
- 访谈与候选设计见 docs/product/LOCAL-DUAL-CLIENT-DESIGN.md，术语已同步
  CONTEXT.md。本轮未启动正式 profile、访问真实库/模型/凭据、执行推理或
  修改公共契约；无暂存、提交、推送或无关 WIP 覆盖。
- 独立只读复核要求补充：工作窗口与主表面按角色授予不同能力；正常关主
  窗口在仍有工作窗口时会隐藏，全部原生窗口关闭才触发旧退出规则。浏览器
  恢复不能保证后端尚未接收的输入。缺原生工具时仍单列 BLOCKED_UX_ACCEPTANCE。

## 并行文档维护：UI/UX 验收规则同步（2026-10-02，已完成）

- 用户采纳侧边会话的协调建议；新增 [UI/UX 验收流程](docs/agents/ui-ux-acceptance.md)，
  提供用户任务、受控环境、操作与结果、关键帧证据、问题复测和分端结论模板。
- 根 AGENTS.md、DESIGN.md、换机指南、发布验收、双客户端设计验收段及 Renderer
  说明已统一引用；浏览器优先、桌面补齐，转用结果不能替代原端必需的验证。
- 验证：相关文档 `git diff --check` 与新增相对链接检查通过；新增流程及双客户端
  草稿无尾随空白或冲突标记。本次仅文档调整，未运行产品 Computer Use。
- 此记录只对应验收文档同步；上方双客户端设计待确认状态和历史测试结论保留。

# 历史：MeshCentral 本机浏览器试验结果（2026-10-02；已放弃并清理）

- 用户批准删除旧自建browser-mirror并试用开源MeshCentral；明确Codex
  内置浏览器、合成数据，最终指定虚拟“显示3”。旧架构队列不自动恢复。
- 旧scripts/browser-mirror八个草稿及两项连接记录已精确删除，旧夹具保留。
  官方meshcentral@1.2.5、node-windows@0.1.14、loadavg-windows@1.1.1
  隔离安装到Git忽略的dist-temp/meshcentral-lab，无产品依赖/IPC/schema、
  服务/开机项、防火墙或真实数据权限变化。
- 用户质疑测试为何必须登录，已改官方--nousers单用户模式，IAB实际
  进入免登录控制台。HTTPS保留校验，只绑定127.0.0.1:64431，user/agent
  限loopback，无HTTP redir/MPS/WebRTC/自更新/自动备份。模板禁止新账号。
- 用户手动信任精确测试CA并完整重启Codex后，实际IAB入口通过；没有自动
  信任导入、关闭TLS校验或绕过警告。public指纹及复用步骤见本轮README。
- 官方浏览器代理下载选择仅交互式Windows x86-64；签名Valid，自身-help
  明确connect为临时console agent。无install/fullinstall、终端、文件传输
  或注册表操作；只读确认无服务指向lab。
- 用户启用扩展后检测到DISPLAY3 1280×1024，Electron id2841568472。
  合成启动器支持显式非主屏ID，最大化/置顶；拒绝主屏和不明确候选。
  bootstrap位置记录不记为CU。产品Main摘要保持
  bef0454aeb2dcf229b5699bfd7cde0dbc9e23d91741209f87fa5f7dc84ff5a9e。
- Computer Use：Luna/high实际在自身IAB完成虚拟3连接、官方刷新、尺寸和
  合成首页核对；自己的标签不在用户当前IAB窗口同步。用户询问没看到
  连接后Root转到可见tab执行，Luna改为独立截图复核；不宣称子Agent完成
  全部路径。Root已在用户当前标签恢复已连接的虚拟3合成首页。
- Root实际鼠标从设置返回首页、点创建打开Windows原生选择器；快速
  路径输入出现不完整路径/不存在提示。画面有停滞/白块，后续键盘回执
  无法可靠确认；官方PNG、100%质量、中等帧率未解决观察的问题。
- 完整CU为BLOCKED_UX_ACCEPTANCE：建库NOT_COMPLETED，复制导入、中文、
  About/搜索NOT_RUN，稳定重连NOT_PASSED，正常界面退出NOT_VERIFIED。
  合成empty-library独立检查0项，源图片仍存在，不把选择器可见记为保存。
  没有确证组件根因，不修改MeshCentral源码或改用Chrome。
- 旧受控试验PID59776经精确exe/title/profile核对后停止作恢复，原夹具和
  receipt保留；此清理不记为正常退出。早期非合成画面未保存、未引用，
  输入关闭时停止。正式保存截图仅虚拟3合成DAM。
- 为回应用户查看连接的请求，当前保留干净合成预览：DAM PID9880，
  title受控屏幕验收、display3；server PID55168 / PTY16331（--nousers），
  agent PID44404 / PTY2905（connect）；Root IAB tab1已连接、canvas1280×1024，
  选中3、Input关闭、标为deliverable。只是可见预览，不宣称实时稳定通过。
- 证据：dist-temp/meshcentral-lab/cu-result.md、cu-result.json、
  server-receipt.json、validation.json，以及evidence/*.jpg。README/config/
  启动器已同步，node语法与配置解析检查通过。无暂存、提交、推送或无关
  WIP覆盖；先前55项摘要一致的历史证据保留，不把它泛化到新验证。

# 历史：Asset Workspace 展示会话内部重构（2026-10-02）

- 用户选择架构评审第四项，并确认按设计实施。集中“当前素材库画面”的
  检查、撤销和事件处理；修复旧检查启动后续刷新、旧悬浮卡片返回恢复画面、
  同 scope 重开后旧草稿回执影响新会话这三类问题。保持外观、草稿保存规则、
  Main/Preload/shared 公共契约、schema 与文件/数据库权限。
- Renderer 私有 `asset-workspace-session.internal.ts` 提供固定的
  `refresh(intent)` / `revoke()` / `receive(event)`；AppShell 持有稳定实例，
  Electron Adapter 连接原有 Store/草稿 owners，私有 Context 不增加 DOM。
  Library 观察 snapshot 并按撤销原因清理本地展示；Controls 不再取得原始
  ready 投影来自行决定后续刷新。View Store 增加私有 draft epoch。
- 保留切换后的两次检查、取消打开时只检查、事件种类各自刷新集合、Library
  挂载期间的 metadata 订阅。确认取消不清草稿和画面；确认放弃后才清笔记/OCR。
  当前检查失败清画面/素材但保留笔记/OCR，成功非 ready 不额外清 Asset Store。
  页面离开只取消其检查，合法的 Shell 卡片返回仍可继续；同 scope 普通刷新
  不撤销草稿，串行同步、flush/retry 和描述草稿算法保留。
- 新隔离 Module 23/23、草稿生命周期 5/5 通过；正式 AppShell + Library
  合成浏览器接线通过，包含旧事件忽略、当前事件刷新和关库后迟到返回拒绝。
  Asset Store、Notebook、description、canvas/return、navigation、discovery、
  tagging 与 CI 治理相关回归通过。最终 typecheck、直接 electron-vite 构建
  通过；未重新生成 buildId，当前 source/out SHA-256 单独记录。
- 正式 Main/Preload/Renderer startup 测试仍为 2/3：未开库导航和合成库
  创建/复制导入/检查/关闭通过；既有失败开库场景在 Acceptance prepare
  返回 ACCEPTANCE_OPERATION_FAILED，后续断言未覆盖。本轮不扩大修复。
- 实际 context:check 和 agent-context-router 因未 Git tracked 的测试路径
  报八条 MISSING_COMMAND_PATH（本轮两条，第三项 script/profile 六条）。
  同 validator 候选清单通过：658/658 owned、无 error/unowned/duplicate；
  不能代替实际 Git 清单检查通过，没有为检查而暂存或放宽守卫。
- 独立只读复核发现 route unsubscribe 曾使 pending Shell 返回失效，已修复
  并补同一 Interface 回归；最终局部复核无其他新增 finding。Renderer 与
  Canvas README 已同步；复核者未重跑应用，不将静态复核记为运行验证。
- Computer Use（GPT-6 Luna / high 子智能体）：独立受控 profile，经普通
  首页/About、原生 Windows 选择器创建库和复制导入、选择/专注/合成笔迹，
  草稿关库取消、确认关库与重新打开、退出继续编辑、最终正常退出均 PASS。
  主 Agent 独立复核精确 PID 39384 已不存在，shutdown-complete 内容精确为
  complete。About 旧 buildId 不代替本次构建指纹；测试 profile/evidence 保留。
- 工作集首次保存、多窗口恢复、悬浮窗口返回为 CU NOT_RUN：没有已有工作集，
  首次保存要求 v7 升级，本轮未保存/升级。Space 未打开独立 Quick Look；
  不把专注视图或后台卡片测试记为对应 CU 通过。真实库、账号、模型和安装未验收。
- 本地证据：`dist-temp/workspace-session-validation.md`、
  `dist-temp/workspace-session-build-evidence.json`、
  `dist-temp/workspace-session-cu-result.md`。40 个受保护文件摘要与第四项实施前
  一致，前三项与全部无关 WIP 保留；无暂存、提交或推送，未读取真实数据或外发。
  本次内部重构及限定验收完成。现有公共事件无新 token，不能识别同 scope
  重开后才送达的旧 wire event；不宣称所有事件歧义或全部 UX 验收已解决。

# 历史：Platform AI Branch 证据生命周期内部重构（2026-10-01）

- 用户选择架构评审第三项，并明确要求执行设计。集中 Python、ONNX、OCR、
  Llama 四类证据的记录、五分钟有效期、汇集和状态投影；保持公共 IPC、
  Preload、共享契约、Worker HTTP、mapper/projector 政策及错误语义。
- 新增 Main 私有 `platform-ai-branch-evidence.internal.ts`，固定 Interface 为
  `record(evidence)` / `readStatus(platformBranch, sources)`。两组保留 IPC 共用
  进程内实例；三个浅 store 和 IPC 内 ONNX cache 已删除，重复测试迁入新入口。
  Module 不创建 Runtime，也不拥有数据库、模型文件或网络执行权限。
- 保留五分钟精确边界、无效/未来时间和时钟回退、原对象引用、lane/请求 family
  分槽、完成顺序覆盖、失败返回覆盖及 throw 不记录。仅 Worker Promise rejection
  降为 null；两个 await checkpoint、读取顺序和各类时钟采样均保持原行为。
- 交付性质是保留实现的内部重构。正式 Main 不调用这两组旧 IPC，32 个 Runtime
  channel 仍返回 LIBRARY_FEATURE_DISABLED；没有恢复启动、扫描、安装或推理。
  现有 Asset OCR、Visual AI、Acceptance 与账号入口为其他独立链路。
- 隔离验证：新 Module 21/21、完整保留 IPC 配合合成 owners 6/6、正式 composition
  32 个旧 Runtime 通道拒绝均通过。readiness/projector、OCR/Llama 合成 transport、
  IPC 契约及 Host context 回归通过；最终 typecheck 和直接 electron-vite 构建通过。
  未重新生成 buildId；构建不能证明这组未正式接线的旧证据链已恢复。
- 既有回归限制保留：app-ipc-registration 的 broad 夹具缺少 21 个其他通道；
  branch-status-display 仍断言已被 alias 替代的旧页面；runtime-status-workflow
  对现有 12 个平台条件文件失败。本轮新增 module 不在该失败列表，未放宽守卫。
- context:check 和 agent-context-router 仍因三个新测试未 Git tracked 报六条
  MISSING_COMMAND_PATH。相同 validator 的候选清单验证通过（655/655 owned，
  无错误），不能代替实际 Git 清单检查通过；没有为检查而暂存文件。
- 独立只读复核未发现行为差异；Services 和局部 README 已同步。
- Computer Use（GPT-6 Luna / high 子智能体）：独立受控 profile 从普通首页，
  经原生控件检查 AI 工作区、后台资源、本地模型/OCR 和 About，正常退出均 PASS。
  主 Agent 复核精确 PID 不存在，合成 shutdown-complete 内容为 complete。
  About 的旧 buildId 不替代当前 source/out 摘要。旧 record→status 链路、
  Runtime 探测/启用和真实模型为 CU NOT_RUN；不以页面状态覆盖它们的验收。
- 本地证据：`dist-temp/platform-evidence-validation.md`、
  `dist-temp/platform-evidence-build-evidence.json`、
  `dist-temp/platform-evidence-cu-result.md`。仅合成数据，未访问真实库、素材、
  模型缓存或账号，未外发素材。29 个受保护文件摘要与第三项实施前一致；
  前两项及其他 WIP 保留，无暂存、提交或推送。本次限定交付完成。

# 历史：Host 私有 schema 维护内部重构（2026-10-01）

- 用户选择架构评审第二项并确认按推荐设计实施：集中五类维护路径及领域写入，
  保持公共 Host/IPC interface、schema 版本、OCR 同步撤权、标签幂等、错误语义
  和生产备份资格。仅用合成夹具，不访问真实库或扩大迁移权限。
- `host-schema-maintenance.internal.ts` 提供六个固定领域入口，集中 lifecycle
  排队、业务 holds 检查、维护准入、allSettled 在途排空、真实 runWhileHeld、
  原版本条件备份、growth cap/事务、领域 hooks/断言与必要 quarantine。
  Host 仍拥有 binding、连接、lease、业务 holds、claims 和队列；私有 storage
  Adapter 不进入公共 Host dependencies、barrel、Preload 或 IPC。
- 保留 intent/batch 当前 scope/content 校验后的幂等查找优先级、intent 特殊
  hook 顺序、execution 早返回、普通 decision 写入和 rejection-upgrade 分支。
  OCR 在任何排队前同步撤权，提交/ACK/epoch 成功后才授予内存许可；原错误
  透传、提交后回执不确定及 pragma 恢复失败封存保持原义。hooks 惰性读取。
- 最终隔离测试 `test-host-schema-maintenance` 30/30 通过：五类 DDL/commit/ACK
  故障、原生 SQLite pragma 恢复失败、批次回滚/回放、OCR epoch 与排队拒绝、
  备份等待期间失锁/过期/取消、维护准入和 close 排队。两项实际临时 Host 场景
  使用明确预建的合成支持 profile；其余升级使用合成 backup/lease Adapter，
  不代表生产备份资格或真实库迁移通过。
- Windows production 2/2、Active Library IPC/Session、Library Quiescence 11/11、
  最终 typecheck 和直接 electron-vite 构建通过。未运行 build-identity 生成，
  现有 buildId 不能单独证明本次构建；source/out 摘要见本地 evidence。
- 既有红灯保留：旧 Host bootstrap-loss 夹具在 Windows 返回
  library-operation-failed，错误码断言失败，后续断言未运行；架构守卫仍为
  Acceptance 的两项既有违规，无本次新增 finding。生产 Darwin/APFS/native
  upgrade 资格不变，未无界运行旧迁移套件或绕过 Windows 拒绝。
- 独立只读语义复核未发现回归，并补齐其建议的排队及 backup-await 测试。
  Library Lifecycle、Independent Tags、Background Analysis/OCR README 已同步。
- Computer Use（GPT-6 Luna / high 子智能体）：普通启动/About 受控身份、创建
  合成库、Windows 选择器复制导入生成图片、AI 后台页状态、关库重开和正常退出
  六项基本路径 PASS。About 显示受控测试，但旧 buildId 不代替 source/out 摘要。
  未开启后台计划、授予 OCR 或运行模型。受控窗口和精确 PID 已退出，合成
  evidence 的 shutdown-complete 内容为 complete；profile 与证据保留。
  五类维护配置/升级入口及真实库迁移均为 CU NOT_RUN，不以后台测试或可见
  状态覆盖这些验收。报告：`dist-temp/host-maintenance-cu-result.md`。
- 本地恢复证据：`dist-temp/host-maintenance-validation.md`、
  `dist-temp/host-maintenance-build-evidence.json` 和原生验收报告。仅源码及
  合成数据；真实库、账号、模型和安装包未验收。保留第一项及全部无关 WIP，
  无暂存、提交或推送。本次内部重构与限定验收已完成；下方历史不自动恢复任务。

# 历史：Library Quiescence 内部重构（2026-10-01）

- 用户选择架构评审第一项，确认“设计后实施”和三入口设计；保持现有公共
  IPC、schema、账号生命周期和交互语义。限定内部重构与文档已完成；原生基本
  路径已实测，About 可见核验的阻塞单独保留。
- `src/main/library-quiescence.ts` 集中 Library-Bound Work 的顺序、独立 holds
  与恢复条件；Main 接入 `onAuthorityWillChange / onAuthorityDidChange /
  drainForShutdown`。参与者惰性读取、IPC 串行化、fail-fast Promise.all、
  同步异常传播和 best-effort recovery flush 保持原行为。
- 切库保留 Main-owned OAuth，退出取消未提交登录并等待已提交凭据持久化。
  原生草稿确认、connected runtime/App storage 关闭和最终 quit 保留在 Main。
  未增加窗口恢复、完整一步切库或新的失败反馈，也未更改公共兼容 Seam。
- 实际隔离验证：模块 11/11、OCR 12/12、账号 9/9、新增 Acceptance 恢复
  4/4 与 Main 接线检查通过；Active Library Shutdown、typecheck、直接
  electron-vite 生产构建通过。绕过 build-identity 生成以保留已有 WIP，
  现有 buildId 不能单独作为本次构建身份。
- 相关回归限制：Acceptance 总计 5/10，旧视觉用例被现有 macOS arm64
  codec 资格挡住；Tag execution 0/30 被现有 macOS/APFS 备份资格挡住。
  正式 Main/Preload/Renderer 启动测试 2/3（未开库导航、生成库创建/导入/
  关闭通过）；失败开库用例在 Acceptance prepare 处失败，UI 接口返回
  ACCEPTANCE_OPERATION_FAILED，不能记为通过。
- 架构守卫仍有 HEAD 既有 Acceptance 两项违规，完整 HEAD 源码内存复核
  得到相同结果。本次新增 Main 违规已通过将纯编排 module 放 Main 根目录
  消除，未放宽守卫；新 module 的 Library/Capture/全局 DB 负向夹具均被拒绝。
  独立 diff 复核未发现编排行为不等价。
- Computer Use（GPT-6 Luna / high 子智能体）：从普通首页以原生控件及 Windows
  选择器完成创建合成库、复制导入生成图片、关库重开、取消图片选择、无效库
  失败后进入 AI 页面，以及正常退出；六项基本路径实测通过。退出后精确受控
  PID 已不存在，独立 profile 的 shutdown-complete 内容为 complete。
  仅操作 OS 临时目录合成数据；未登录、推理或发送素材。
- CU 身份证据为独立启动 receipt、精确 exe/PID、受控标题与合成操作。About
  菜单的 UIA 点击没有可用 bounds，未完成其可见 profile 核验，单列 BLOCKED；
  未以 IPC/DOM 或旧 buildId 代替该项 UI 证明，不声明全面 UX 验收通过。
  [原生报告](dist-temp/quiescence-cu-result.md)及当前 source/out 摘要
  `dist-temp/quiescence-build-evidence.json` 为本地恢复证据；合成 profile/evidence
  保留且受控实例已关闭。真实账号、真实库、模型推理与安装包未验收。
- 保留原工作区改动，不暂存、提交或推送。恢复点为本段及 Library Lifecycle
  README；以下记录只供追溯，不自动恢复历史任务。

# 历史：Windows 新目录恢复（2026-10-01）

- 用户要求从 GitHub 最新分支直接取得代码，在新目录恢复项目和必要依赖。
- 远端源：codex/full-project-20261001，107106cea9d4566b0fbf68dc2317825219dfb9de；
  本地编辑分支：codex/windows-workspace-1001。AGENTS.md 等源码从远端直接克隆。
- 用户确认仅补新分支缺少的关键功能和依赖，模型暂不复制。
  不导入旧 node_modules、任务账本或指南；依赖按新分支锁文件在 Windows 重建。
- 验证计划：源码完整性、依赖安装、类型与生产构建、原生 ABI 和 Pi 资源/协议检查。
  不读取真实资料库、凭据，不启动外部模型服务，不发布或推送。
- 源码预检完整，主依赖 482 个包、独立 Pi 依赖 85 个包已重新安装。
  Electron 30.5.1 / SQLite 12.10.0 / Sharp 0.34.5；Pi 0.99.1 / Node 24.21.0。
- 关键补入限定为 Windows NTFS 准入、只读数据库/开库/锁准入与 Sharp 文件
  句柄释放；来源及最小差异见 [恢复记录](docs/platform/WINDOWS_REHOST_20261001.md)。
  Pi 准备脚本在新源码中修复带空格的安装目录传递。
- Windows 生产素材库 2 项、Pi 实际进程协议 5 项、Active Library Session、
  typecheck、上下文/路径/文档检查已通过；修正后的完整 Pi 准备入口复跑成功，
  封印保持 11837 个文件。最终构建 dam-32498c70fecd2e37 通过。
- 本轮新目录与必需依赖恢复完成；远端 API 再次确认最新提交仍为 107106c。
  AGENTS.md、DESIGN.md、CONTEXT.md、根 README 及两份依赖锁与远端一致。
  无暂存、提交或推送；旧目录中的未完成工作保留，没有继续执行。
- 旧 Host bootstrap 故障夹具在 Windows 的错误码断言仍失败，未放宽断言。
  原生 UI、安装包、真实账号未验收；不安装可选 Python 推理环境。
- 后续请在 Codex 打开本新目录；当前聊天原有项目目录不会随克隆自动更换。

以下为 GitHub 原有交接记录，保留追溯；不自动恢复其中的任务和授权。

# 历史：跨主机继续开发的完整交接（2026-10-01）

用户要求尽量全部上传以交接另一台主机。完整可公开源码已在codex/full-project-20261001，现补充全部开发批次安全报告、RUX证据/删除回退来源、旧协作历史、合成视觉参考及跨平台恢复说明。由目标主机工程师从docs/REHOST.md、docs/handoff/CURRENT-STATE.md开始。历史任务不自动获得授权，不继续旧P队列。

当前主要未完成项是Computer Use和真实账号；旧Runtime源码策略红灯仍保留。新主机必须分别验证源码契约、界面集成、原生屏幕路径和用户辅助登录。依赖需目标平台重建，真实数据与账号不在Git中；此交接不授权模型下载/启动/真实库迁移/付费调用。

以下是先前快照与源机任务历史，只供追溯。

# Current Task

## GitHub完整源码快照（2026-10-01）

用户要求将完整项目上传GitHub并创建分支。目标仓库zhr0210/design-asset-manager，目标分支codex/full-project-20261001；包含当前工作区可公开源码，排除真实数据、依赖、模型和本地归档。来源是本地WIP，不仅最后RUX增量。源状态与排除边界见docs/agents/GITHUB-SNAPSHOT-20261001.md；远端推送状态由发布后的commit核对决定。

以下为实施/验收历史，保留当时范围；本地.ai-run/evidence未上传，不能从历史段落推定当前CU或真实账号通过。

# Current Task

## 有限交付 / 产品验收仍受阻：R00–R08 仓库、UX 与认证整合（2026-10-01）

用户批准本批连续实施。当前代码按唯一AI归属、导航别名、App账号生命周期与5删除/2测试支持迁移收口，buildId `dam-3c75658c506c8e70`。有限契约/SDK/临时Host/Renderer检查通过，Runtime全src平台分支源码断言仍失败，未绕过。认证/清理独立源码复核签收有限范围，没有独立重跑或真实账号证据。

Computer Use 原生工具可用，但同一Electron身份绑定个人实例，受控profile选择未确认；U01–U32全为BLOCKED，不能以selector集成补成通过。已请求用户退出之前个人测试软件，尚未确认；不操作个人实例。A01–A03真实账号NOT_RUN；没有真实凭据/资料库/模型读取、付费推理或素材外发。自建旧受控子进程已精确停止，临时profile保留。

当前run：`.ai-run/rux-auth-20261001-6a9cf104/FINAL-HANDOFF.json`；查看REPORT、REVIEW、SOURCE-MANIFEST、DELTA、CU-RUNS。增量包由START-HERE指引，包含必要before和差异，不覆盖整个WIP。原index/staged字节匹配基线，未提交/暂存；12批准原型保持原摘要。旧DP01报告仍是历史，不能当作当前验收。

STOP（仅本批有限代码交付，不表示用户全部问题已解决）；nextBatchAuthorized=false、automaticResume=false。恢复CU需先确认个人软件退出，重新普通启动受控实例并核对About构建身份；真实账号由用户本机厂商浏览器辅助、限定profile、仅认证不推理。不得自动恢复DP02或新增Provider。

## 已修复：软件首页与账号入口可用性（2026-10-01）

用户报告启动后停留创建库、交互无反馈且找不到AI控制台。确认未开库时底部全局菜单被隐藏，资料库面板可能遮挡顶部控件；失败开库进入recovery-required后AI连接/验收准入无法恢复。修复后未开库也显示菜单和顶部AI入口，四个目的地解释开库要求，搜索/素材动作明确不可用；失败开库只在shutdown idle恢复账号及生成计划服务，保留Host真实恢复状态、UNKNOWN资源保护与原文件。

3条正式Main/Preload/Renderer交互场景与18条OCR/验收生命周期回归通过，实际before/after Main回调证明idle恢复、shutdown不恢复；typecheck/build通过。测试仅用生成图片、临时Host与合成保险库，无真实账号、外发或模型。新回归为scripts/library-startup-navigation.e2e.test.mjs。用户软件已重新启动修复构建，经原生UI点击首页AI按钮并打开连接编辑表单；由用户继续配置和登录。未处理真实库的失败文件或迁移。

本次为新问题修复，不延续DP02。旧DP01报告/源码清单/完成指针保留历史，不能代表修改后的源码或全面软件可用；最近恢复点为本段及当前工作区。未提交、未暂存，原index/staged保持。

## 已完成受限范围：DP01 与受控 ChatGPT 登录入口（2026-09-30）

用户批准本批连续执行，并选择 ChatGPT 订阅登录。01A–01F 已完成：基线、后台 OCR 观察撤权、锚点 v2、生成图片验收、必要回归与独立复核。仅 ChatGPT 受控入口按用户最新批准开放；Google、Codex、Anthropic 订阅和 Copilot 保持限制。

196 项最终隔离行为测试通过；独立重跑81项为其中子集，另有 typecheck/build/PLAN_ONLY。源码679文件清单、45文件本批差异和原始红绿日志可查。原 index/staged 未变，未覆盖无关WIP。真实账号、模型、付费服务、Keychain、用户库、Windows及签名安装均 NOT_RUN；生产后台OCR资格仍空。

唯一完成指针：`.ai-run/LATEST.json`。终态：`.ai-run/dp01-baseline-and-acceptance-20260930-05b5bcba/FINAL-HANDOFF.json`。详细报告、源码、差异、测试与复核均在同一run目录；工程师交接包位于delivery/。

STOP；nextBatchAuthorized=false；automaticResume=false。读取旧活动记录或本完成入口不恢复队列，不自动进入DP02；真实账号由用户自行登录，素材外发仍逐动作授权。

## 已完成受限范围：Pi Provider准入与认证契约收尾（2026-09-30）

用户“按照包内规划提示继续”批准评审包有限实施。Main/Worker共享准入，明确关闭Google原生推理/订阅认证与Copilot未闭合路径；保留API与旧数据。稳定hostID、窄select契约、实际Codex SDK两分支的Worker/Main/React合成贯通、过期撤权、已知Anthropic订阅令牌API伪装拒绝已完成。

聚焦矩阵45、相关回归125、typecheck/build与独立最终30项通过；重新封印11829文件/2链接，未升级依赖。校验约1–3秒、约190MB读取，可取消且无缓存；真实disk-cold未测。

OpenAI注册/client/JWT与完整受控认证网络未实现，生产仍禁用；真实账号、模型、Keychain、Windows/签名安装均NOT_RUN。未读取真实资料库/凭据、启动模型、调用付费API、下载或发布；原WIP/index保护见报告。

- [最新报告](.ai-run/pi-provider-hardening-20260930/REPORT.md)
- [Provider矩阵](src/main/ai-gateway/PROVIDER-MATRIX.md)
- [独立复核](.ai-run/pi-provider-hardening-20260930/REVIEW-FINAL.md)
- [最终状态](.ai-run/pi-provider-hardening-20260930/FINAL-HANDOFF.json)
- [交接包](.ai-run/pi-provider-hardening-20260930/delivery/DAM-PI-PROVIDER-HARDENING-20260930.zip)

COMPLETED_RESTRICTED_SCOPE / STOP，nextBatchAuthorized=false；不自动进入真实账号或历史阶段。下方记录为历史，其广泛“适配接线”表述不覆盖本批实际准入限制。

## 已完成限定隔离范围：Pi统一模型接入（2026-09-30）

用户“开始执行”批准PI01–08，随后明确选择“先完成隔离验收，真实账号后续配置”。固定Pi0.99.1/独立Node24.21.0、加密凭据与补偿、正式模型配置/任务分配、视觉及独立标签、订阅认证适配、单独授权外部细化已接线。新增43项与相关130项回归、两个配置断言脚本、typecheck/build通过；独立复核修复五项问题后重跑资源2/Host7/旧认证目录1通过。

真实模型/API/订阅账号、OS Keychain、Windows/签名安装包未验收。未访问真实素材库、模型缓存或真实凭据，未启动真实模型或上传素材。本轮只安装批准的公开Pi/Node执行依赖，无提交/推送/发布。2715基线无缺失，授权修改有before；原staged diff摘要一致，index原始字节摘要不同且无法归因，详见保护记录。

- [实施报告](.ai-run/pi-integration-20260930/REPORT.md)
- [独立复核](.ai-run/pi-integration-20260930/REVIEW-FINAL.md)
- [最终状态](.ai-run/pi-integration-20260930/FINAL-HANDOFF.json)
- [源码交接包](.ai-run/pi-integration-20260930/delivery/DAM-PI-INTEGRATION-20260930.zip)

COMPLETED_ISOLATED_SCOPE / STOP，nextBatchAuthorized=false。真实账号按用户选择延期，不自动进入旧队列或真实资料库验收。下方旧记录仅作历史。

## 已完成：后台 OCR 单能力闭环（2026-09-29）

用户“继续下一轮”批准的限定批次已完成并独立签收。新增本次开库独立许可、显式v13执行存储、原子领取/幂等OCR回执、共享手动OCR资源门槛、发送前资格复核和保守中断恢复。sent/unknown跨会话不自动重领；Runtime变化撤销旧许可。生产qualification=null保持等待，B01开关仍只收集计划。

35项真实临时Host（含4个owned SIGKILL）、3项组件、2项正式后台OCR通过；旧17进程/12控制器/B01 19、标签30/13/22、资源10和存储/Host/关闭回归、正式手动OCR/B01各1通过，typecheck/build通过。独立复核重跑35并核验148份源码。真实模型/用户库/Windows未验收，未下载、安装或发布；原工作区与索引保留。

- [报告](.ai-run/background-ocr-20260929/REPORT.md)
- [最高优先级终态](.ai-run/background-ocr-20260929/FINAL-HANDOFF.json)
- [独立复核与原始重跑输出](.ai-run/background-ocr-20260929/REVIEW-FINAL.md)

本批COMPLETED/STOP，nextBatchAuthorized=false；不自动进入真实模型资格、caption或其他能力派发。下方旧批记录仅作历史。

## 已完成：OCR 子进程退出与资源/drain 边界（2026-09-29）

用户“继续下一轮”批准的限定批次完成并通过独立复核。取消/超时等待owned child close；无法确认时UNKNOWN仍占用资源；Main关库/退出等待OCR，迟到结果不保存，退出期间authority回调不能重开准入。未改变schema/公共IPC或B01开关含义。

17项进程、12项controller、19项B01集成、正式OCR与B01各1项及OCR存储/Host/契约/退出回归通过，typecheck/build通过。独立复核重跑17/12并核验134份源码。只使用生成素材、临时库及stdlib合成执行器，未重验真实RapidOCR/模型、真实用户库或Windows。原工作区及索引保留。

- [报告](.ai-run/ocr-exit-boundary-20260929/REPORT.md)
- [最高优先级终态](.ai-run/ocr-exit-boundary-20260929/FINAL-HANDOFF.json)
- [独立复核](.ai-run/ocr-exit-boundary-20260929/REVIEW-FINAL.md)

本批COMPLETED/STOP，nextBatchAuthorized=false；不自动进入caption、后台派发或全资源框架。下方旧批次记录仅作历史。

## 已完成：B01 后台分析意图与准入基础层（2026-09-29）

本轮“批准进入下一轮”已交付限定B01并独立签收：新入库默认tags/caption/OCR轻量持久意图，v12明确升级，无历史回填，等待原因、暂停/恢复/取消与Main/card权限。19项Host/controller、4政策、2真实组件、1正式Electron及8项相关回归通过，typecheck/build通过。1071基线仅17批准文件修改，索引/staged保持。

**尚未实现自动模型执行或全资源Governor**；生产dispatchAvailable=false，计划开关不授予未来推理/上传权限。独立caption、OCR物理exit drain、Runtime ownership/执行包络仍待后续；未操作真实库/模型/缓存、安装依赖或提交发布。

- [最高优先级终态](.ai-run/background-foundation-20260928/FINAL-HANDOFF.json)
- [B01报告](.ai-run/background-foundation-20260928/REPORT.md)
- [检查点](.ai-run/background-foundation-20260928/HANDOFF.md)

本批已停止，nextBatchAuthorized=false。下方旧批次记录仅作历史。

## 已完成：C07-S 增量收尾 F01–F03（2026-09-28）

用户“批准处理”的三项局部收尾已完成，独立源码审查通过。F01统一最近100终态句柄保留，活动任务与持久效果不删除；F02生命周期epoch与迟到receipt释放，实际组件红绿和正式页面可达性通过；F03提供最高优先级终态入口，nextBatchAuthorized=false，不自动恢复旧ACTIVE记录。
执行30、组件3、正式面板1、Provider9、批次12、恢复22、资源10及政策5项通过；typecheck/build和正式执行场景通过。原暂存/未暂存/未跟踪工作保留，无提交发布。真实模型/用户库/Windows/安装包未验收，历史原生等待仍未定位，其他后台进程UNKNOWN。

- [最高优先级终态](.ai-run/tags-hardening-20260928/FINAL-HANDOFF.json)
- [收尾报告](.ai-run/tags-hardening-20260928/REPORT.md)
- [检查点](.ai-run/tags-hardening-20260928/HANDOFF.md)

下方原批次完成记录保留为历史，不能由其旧授权自动启动新任务。

## 连续批次已完成：C01–C07-S（2026-09-27）

已在用户“运行无上限，委托独立复核”授权下完成本批，现已停止。
C02A/B、C03、C04、C05、C06及最终C07-S获独立只读审查通过；C01保留历史SELF_REVIEW对账标签。
新增独立标签意图/执行、唯一current、确认与同内容同族拒绝、1–8批次/force、显式安全恢复和Outbox重投。
C06恢复22项（含7个owned-process真实SIGKILL切点），相关12/25/13回归及最终15条风险检查通过。
正式Main/Preload/Renderer覆盖检索、AI分类、Main/card、批次与两次重启；仅生成数据和自有loopback。
最终100相关源摘要977d048219c9bf1a5d6759ebc8850d42652ab0555380aba248266f600e8a09d6；
2282基线文本无意外修改/缺失，原索引与staged diff保持。未暂存/提交/推送/发布。
交接ZIP833条目已独立核验，补丁独立重建100文件，含历史失败与限制；不是完整仓库，不自动覆盖原WIP。

- [最终汇报](.ai-run/independent-tags-20260927/C07-S/FINAL-REPORT.md)
- [交接包](.ai-run/independent-tags-20260927/delivery/DAM-INDEPENDENT-TAGS-IMPLEMENTATION-20260927.zip)
- [恢复与最终状态](.ai-run/independent-tags-20260927/HANDOFF.md)

没有进入C07-R真实模型、真实用户库、Windows或安装包/签名验收；未安装依赖或启动模型服务。
Standalone Electron RUN_AS_NODE历史原生等待仍未定位，失败保留；正式Electron Main另有通过证据。
controls=convention_only，没有常驻运行器、后台自动化或自动进入后续旧阶段。

## 已完成：首轮任务01 Provider内部抽取（2026-09-27）

用户确认开始实施，范围仅任务01。正式visual-ai综合分析/反推保留原公共IPC、
schema、UI、四字段结果及Host写入口。已抽取单次HTTP Provider，重试只由
runVisionRequest负责；1536→3072最多一次截断重试，仍共用控制器每素材时限。
新增内部provider/clock注入，默认生产组合继续使用兼容HTTP与系统时钟。

先运行既有基线均通过；新增Provider→真实临时Host测试在实现前失败、抽取后通过。
最终8项新集成、7组传输、既有视觉/下载临时库集成、OCR存储回归及typecheck通过。
覆盖900ms后重试只剩100ms、人工描述/OCR修订/确认标签保护、取消/owner撤销、
同generation重开旧响应零写入、通知失败保留已提交结果；使用生成素材与合成Provider。

未运行真实模型、正式GUI/打包/Windows或真实用户库测试。没有新tags-only能力、
任务持久化或新schema；未进入02A，未发布Issue、暂存、提交或推送。
用户既有修改保留；旧规格/评审文件不改写。实施与审查证据：
[任务01实施报告](docs/implementation-reports/task01-provider-extraction-20260927/TASK01-IMPLEMENTATION-REPORT.md)。

## 已完成：真实推理复测与获准下载 Qwen3-VL 8B（2026-09-24）

用户明确要求完成真实测试，批准下载Qwen3-VL 8B量化模型。选择官方Instruct
Q4_K_M与F16视觉投影，固定revision和两个SHA256，共6,186,814,624字节；
见 `docs/product/QWEN3-VL-8B-EVALUATION-20260924.manifest.json`。下载与完整性校验已完成，
文件保留在隔离评估目录；不等于正式应用已配置/激活该模型。
既有2B模型与投影已复核，b11057原始包重新下载校验并核对42个运行文件。

新代码+2B在8192上下文、seed42、本机Metal上完成4张生成图真实推理：4/4结构保存、
搜索/AI分类/工作集/关库重开通过，源哈希不变；约56.5秒，服务采样RSS峰值约3.57GiB。
4/4中文描述，但只有2/4标签集全中文，抽象图仍有场景推断，不放行模型质量。
报告与生成图保存在 `docs/product/evidence/qwen-comparison-20260924/`。
2B服务已停止，正式provider配置未修改。

已从上次精确测试调用记录恢复原8份文件清单，仅访问清单中的原文件，重建受限预览。
2B/8192真实8图已完成：8/8结构有效，中文描述与中文标签覆盖8/8，6/8遵守最多8标签；
3份截断重试，合计11次请求，中位数4.96秒，整批111.85秒，8份源哈希不变。
2B生成素材正式Electron联动17环节通过，两个视觉请求均完成，OCR/手工保护、
AI文件夹/提示词搜索、取消零晚写及重启恢复通过；报告已归档。
2B/4096同样8图也8/8通过，3份重试，中位数4.86秒，最终输出与8192逐字段一致。
8B主权重与视觉投影现已均通过固定SHA256。首次完整下载主权重SHA256失败，
逐段官方重新下载比对修复第3、22、31段后整文件通过；校验前没有加载模型。
本机恢复文件 `/tmp/dam-approved-qwen8b-state.json` 的verified为true。
8B生成四图4/4完成保存、搜索、AI分类、工作集与重开，约60.10秒，采样RSS约4.55GiB。
四组标签均中文，但抽象图仍有山峦/月亮的场景推断。
8B真实八图analyze为8/8首次完成，零重试，中文描述/标签、最多8标签均8/8，
单份中位数20.82秒，整批163.54秒；独立reverse同样8/8首次完成，零重试，
中位数19.01秒，整批155.07秒。8B正式Electron联动17环节通过，包括真实保存、
AI分类/提示词搜索、OCR/手工保护、真实取消零晚写及应用重启恢复。
不把2B结果替代8B验收。UI验收工具新增“本次两个视觉任务均完成”
断言，避免已有证据或保护检查通过掩盖推理失败；失败报告仍先保留。
8份原文件最终SHA256一致；临时私有预览、模型原文和路径manifest已清理。
本轮模型服务均已停止，18080端口关闭，正式provider配置未修改；没有外发素材。
typecheck、脚本语法与公共报告脱敏检查通过。未提交或暂存本轮/无关改动。
结构、语言约束和数据链路验收完成；真实设计的事实准确率、跨设备稳定性仍未量化，
保持AI建议语义，不放行默认无人确认自动分析。
[最终对比与证据](docs/product/QWEN3-VL-REAL-COMPARISON-20260924.md)。

## 已完成：新 AI 后端吸收旧接口经验的代码修复（2026-09-23）

用户要求继续完善新后端。已核对两份9月23日新旧对比记录与正式调用链，
修改 `visual-ai:*` 的内部预览/请求/解析/错误反馈；不恢复旧IPC，不改变公共契约或库schema。
正式请求采用1024/JPEG85受控预览、中文紧凑设计提示、专用OCR职责分离；
截断时同图片/模型/服务最多重试一次，1536→3072 token，共享原时限和取消信号。
兼容完整JSON的代码块、说明文字和文本content数组，继续拒绝残缺结果。
确认页披露重试与OCR入口，失败反馈区分超时、格式、权限、请求容量等。

验证：7组transport测试、正式控制器/临时库集成、OCR存储回归和typecheck通过。
覆盖重试单次保存、持续截断不覆盖、重试取消/超时零写入、1024尺寸、手工内容保护与OCR修订搜索。
所有输入/服务/库均为临时合成，无真实素材库或模型访问、无真实推理、无外发。
真实8份设计稿及用户原8B模型尚未用本轮代码复测，不据此放行默认自动分析。
[实现与验收记录](docs/product/VISUAL-AI-BACKEND-HARDENING-20260923.md)。

## 已完成：旧提示词反推provider隔离复现（2026-09-23）

用户指出原项目旧AI接口反推曾完整可用，并要求复现。当前活动库显式拒绝旧
`ai-worker:run-prompt-reverse`，旧IPC还写全局数据库；因此只在隔离环境调用旧
`LlamaOpenAIProvider.runPromptReverse`，不恢复旧IPC、不接触活动库。
沿用已授权8份设计稿与已校验的Qwen3-VL **2B**权重，本地服务使用旧默认中文提示、
1024像素PNG、温度0.6、1536/3072 token重试及8192上下文。8/8返回完整可解析JSON、
中文描述、英文提示词和中文标签；2份首次截断后重试完成。但标签中位数64.5，
结构成功不等于标签质量合格，也不能代表用户原Ollama/llama 8B模型。
边界对照将旧provider改为1280像素、4096上下文、温度0.2，2份均在重试后
仍截断于4096上下文；旧provider仍报告success并提取部分字段，新正式入口会拒绝残缺结果。
原8份文件哈希未变，本地服务已停止，临时原图与原始模型输出清理。
[脱敏复现记录](docs/product/LEGACY-PROMPT-REVERSE-REPRO-20260923.md)。

## 历史：用户授权8份设计稿的本地模型复测（2026-09-23）

用户允许使用1份PSD和7张图片复测已验证模型。本轮仅在权限受限的临时目录建立最长边1600像素的预览，
PSD只用合成图；8份原文件测试前后SHA-256一致。没有写入活动库/Eagle连接库、正式AI结果或provider配置，
没有向外部发送图片。原图、预览图及模型原文不入项目文档。

RapidOCR1.4.4：8/8执行成功，人工选取的33项可见文字锚点命中30项，其中R2的装饰小字仅1/4；
冷启动显著偏慢，重复调用约1.43秒。Florence-2：MPS 24/24任务完成，能概括部分主题，但对象标签多为笼统/重复类别且描述英文。
Qwen3-VL **2B＋llama.cpp**直连当前提示：1600预览仅1/8通过结构契约，5次截断、2次格式无效；
按当前正式预处理参数生成1280/JPEG85输入再测，仍1/8通过，但合格样本改变，其余7次截断。
定向诊断确认一次截断响应正好生成1800 token，未触及4096上下文上限。这不是旧Ollama 8B的测试，
也不是正式Electron入库8次失败。分离OCR并缩短输出的实验为8/8结构有效，
仍几乎全英文；纯中文约束定向3/3有中文描述/标签，但未覆盖余下5张，也未通过事实质量验收。
Qwen使用原有模型与投影文件，经固定SHA-256复核一致；模型服务已停止、18080端口关闭。

[完整脱敏验收记录](docs/product/LOCAL-AI-REAL-DESIGN-RETEST-20260923.md)。
当前结论：OCR可继续作为可修订专用证据；Florence对象标签和已测2B直连当前提示不放行默认中文自动分析。
没有修改正式提示/模型设置，RAM++/WD/CLIP仍未实测。

## 历史：生成图联合验收与Florence-2独立实测（2026-09-20至23）

当前用户要求继续本地AI测试验收。已复用此前获准Qwen/RapidOCR，在生成临时库完成真实Electron联动。
首次两次视觉分析成功，OCR/修订/手工描述保护、真实取消无晚写、进程重启恢复通过（17环节）。
复核时海报有一次有效结构校验失败；失败原样保留，软件未写入，OCR/用户内容仍保留。
Qwen仍主要输出英文并含冗余标签，所以数据边界通过不等于模型质量放行。
另用首次已保存真实结果验证了AI标签文件夹和反推提示词命中，零新推理、元数据未修改。

最终证据：成功轮KWQVXy、稳定性复核Q9MosU，已归档本轮产品记录。
模型服务已停止、18080端口关闭；未读取真实素材库，不改用户正式provider配置。

Florence-2 Large原生格式转换的固定revision/11个模型文件/25项wheel，共1,678,018,077字节，
用户于2026-09-23批准后已下载、逐文件复核、独立临时Python3.9离线安装。
禁用remote code与下载fallback，在生成6图上分别以CPU/MPS运行短描述、详细描述、对象检测；
两设备首轮均18/18无运行错误。对象检测初次被解析为空，定位到模型位置token之间的空白，
仅在评估器的对象检测解析前规范化后，两设备再各运行6/6，杯子/盆栽/笔记本检出，
但三圆抽象图误检为4个egg。纯白图描述产生笔记本等幻觉，输出为英文，
进程峰值RSS约4.36GiB（CPU）/4.66GiB（MPS）。因此离线执行通过，质量不放行默认分析；
旧Worker和正式素材库未接入，RAM++/WD/CLIP未下载或实测。

[本轮验收结论](docs/product/LOCAL-AI-ACCEPTANCE-20260920.md)
[Florence具体范围](docs/product/FLORENCE-EVALUATION-20260920.md)
Florence生成样本与CPU/MPS原始报告保存在 `docs/product/evidence/florence-20260923/`；
旧生成库临时恢复点已过期，持久证据见上述产品记录；Florence生成夹具和本机已校验模型的临时运行环境
仍可用于已授权范围内的复核，但临时目录可能被系统清理，不能当作正式安装状态。
未暂存/提交或改动无关代码；没有自动开始RAM/WD/CLIP下载或插件工作。


