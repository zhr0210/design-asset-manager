# WC01 owned H进程重启 / retention 终态交接

2026-10-05 Asia/Shanghai。**VALIDATED_TRACER / STOP**；nextBatchAuthorized=false。

## 实际9文件

| 文件 | 本批行为 |
| --- | --- |
| scripts/fixtures/control-store-restart-profile.tracer.mjs | 新固定state/op/limits私有合成形状。 |
| scripts/fixtures/control-store-restart-ledger.tracer.mjs | 新有界append链、original object/history/receipt与supervisor witness校验。 |
| scripts/fixtures/control-store-restart-host.tracer.mjs | 新实际Hworker，意图/result/ACK日志顺序及inspection-only重启恢复。 |
| scripts/fixtures/control-store-restart-client.tracer.mjs | 新supervisor，全部directchildren、fixedproxy、exactsettlement/cleanup及受控fault。 |
| scripts/control-store-restart.tracer.test.mjs | 新QR01–16有限矩阵与每run证据。 |
| [平台说明](../platform/WINDOWS-CONTROL-RESTART-TRACER-20261005.md)、本交接 | 当前差异、before/after、矩阵、资格与恢复。 |
| [CURRENT-STATE](CURRENT-STATE.md)、TASK.md | 新恢复点；旧首标题日期化，其后历史正文原字节保留。 |

本批仅 owned 合成 H进程重启/retention：原operation/scope/canonical payload/digest/result与delivery ACK意图在副作用前写有界append journal，H实际退出/新PID+UUID恢复，A唯一SQLite writer保持。恢复只精确核对原receipt，missing/不匹配保持unknown并关闭通知推进；不盲重发、不重推理、不自动grant；历史success/receipt不降级。监督方保有head/length与对象身份，不能证明supervisor冷启动antirollback或断电耐久。

最终run-02 16PASS/0FAIL/0cancel、5脚本syntaxPASS；32H（30ready/2故意loadfail）与29A全部known child/stdio退出、reader0/uncertainfalse；QR03持久reservation1但actualstub0，其余15case各actualstub1，重启后delta0。QR01保持同一个A而H换PID，其余有效case重建A。14有效fixture pairs非递归清理，2损坏pairs保留；run-01 2PASS/14FAIL及16pairs原样保留，18retainedpairs共94对象副本已封存，不自动清理Temp。首轮JSON字段顺序误报immutable变化已修复为22固定字段逐值严格比较。

baseline3344records/3331existing对前批sealed275b70169c45826aa9f39db86ee9a7d113576984零drift；73前批证据/666产品inputs/14actualoutputs重验。本批9工作区文件，候选3338existing；原index/generated/非scopeWIP与TASK/CURRENT历史正文原字节保持。安全初审4finding保留、静态followup修复；最终Spec/Standards两轴绑定9SHA/tree/diff，见终态anchor。

产品build仍dam-4c583238a11c002d，无新build；合成H/A Windowsx64 10.0.26200/Electron30.5.1/Node20.16.0/ABI123/SQLite3.53.1；产品Runtime最后2026-10-04，当前app NOT_OBSERVED。产品tests/typecheck/build/Pi/Computer Use NOT_RUN；strongWindowsbackup拒绝、EBUSY UNKNOWN、Router BUDGET_UNSATISFIABLE、Esc BLOCKED_UX_ACCEPTANCE及TASK历史23missinglinks FAIL继续保留。正式H ledger/Adapter/publicschema/OS/resource/source/VFS/真实profile未修改，productionQualified/restoreAllowed/namespaceMetadataQualified/formalAdapterWired=false。

尚未验证supervisor+H冷启动持久anchor、append到witness间故障、actualstub后resultsave前故障、callbacktimeout（本批只静态）、proxy/exit/log超限、whole-lifetime资源/Job/hardRSS/nativephysicalclose/断电/namespace/restore、真实域与86方法/所有reader迁移、正式UI路径。下一建议仅先只读盘点正式Adapter剩余准入项并收敛实施队列；未自动授权。VALIDATED_TRACER / STOP，nextBatchAuthorized=false。


## 身份与验证入口

| 身份 | 证据 |
| --- | --- |
| HEAD / branch | b5cc954f90d248694aedc2d6ca1aa5188fa0aa11 / codex/windows-workspace-1001；无stage/commit/push。 |
| 当前raw source | candidate-manifest/terminal-anchor的tree，3338existing全tracked/untracked非ignored，9before/afterSHA。 |
| actual产品build | dam-4c583238a11c002d / built2026-10-04T07:17:49.145Z；actualtree d08a5dd8d01db054c2e4c173577ee5109035572c；sourceDigest4c583238a11c002d03925b3e5a0d9cfdb879ef8c705a7b7331d7b18c6bb53bff；artifactDigestaa23d1b4f766527cd9345333db3275cdb21215f2caa9fcdd2620ec4acef577ac；666inputs/14outputs重验，无新build。 |
| 本批合成supervisor/H/A | Windowsx64 10.0.26200 / Electron30.5.1 / Node20.16.0 / ABI123 / NAPI9 / libuv1.46.0；SQLite3.53.1/sourceId2026-05-05 10:34:17 c88b22011a54b4f6fbd149e9f8e4de77658ce58143a1af0e3785e4e6475127e9；nativeSHA258341bfff296ac7a779c1dfc35e0b781c18c1a1b9ec3406551dbb473b4fe359，未重编。 |
| index/generated | indexSHA250b713476614d1cfbd7073e80439a2fbc8612ea8ba7ac913786032c9c06bb76；rootgeneratedd227f4ee0bf43ce8ee65df87641ed832eea0ae33f88648c138d459be360c569d；actualgenerated16df0552c4233672ce933e4cb08bc763e3f5c6cec3dd18bb9c5f34094ebca173；保持分列。 |
| Pi / 当前产品app | Pi Node24.21.0/SDK0.99.1/pin99e47ca53d91aa342d134125f1980106105e27186ef4f61640c3bc3b98c651c0 NOT_EXECUTED；产品最后Runtime2026-10-04，本批app NOT_OBSERVED；outerNode25.7.0仅launcher。 |

独立Spec/Standards最后绑定9文件、tree、diffSHA，最终结果见anchor；run-01/02原源码副本与94retained对象均可逐SHA检查。14清理/2保留是finalrun数量，全部历史共18pairs保留。工程stop/受控Hcut不是普通appquit/OScrash/nativephysicalclose。Computer Use NOT_RUN，未解除已有UX阻塞。

## 下一建议及Remote Desktop Commander终态锚点

下一建议先只读盘点正式Adapter剩余准入项：所有真实writer/reader与86方法、error/storageunknown/lease/recovery映射、资源整个生命周期、source/VFS/ownership、protectedcatalog/loader/channel、coldstart持久witness/retention和用户路径，按当前源码给出最小实施队列。此建议不自动授权正式接线或真实数据读取；下一批未批准。

[CURRENT-STATE](CURRENT-STATE.md)→本交接→[矩阵](../platform/WINDOWS-CONTROL-RESTART-TRACER-20261005.md)。本机.scratch/windows-control-restart-20261005/terminal-anchor.json→evidence-manifest-final.json→terminal-verification/candidate-manifest/incremental-review.diff/tracer-verification/run-02/两轴final报告。retained-fixture-manifest列仅owned合成basename与封存副本，禁止自动清理。先重验anchor/manifest、tree/9SHA、原index/generated，再区分raw WIP与actualbuild/历史产品Runtime；不凭generated旧身份宣称当前app。

formalAdapterWired/productionQualified/restoreAllowed/namespaceMetadataQualified=false。无reset/clean/stash/覆盖无关WIP/真实数据/模型/Provider/下载/安装/OS权限变化/commit/push/发布。**完成即STOP**。
