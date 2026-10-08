# WC01 合成双进程协议 tracer 终态交接

2026-10-05（Asia/Shanghai），批准上一批推荐的owned合成双进程protocol tracer。**VALIDATED_TRACER / STOP**；productionQualified/restoreAllowed/namespaceMetadataQualified/formalAdapterWired=false，nextBatchAuthorized=false。没有正式产品/Broker/OS权限/Adapter或真实库迁移。

## 实际文件与before / after

| 文件 | 改动 |
| --- | --- |
| `scripts/fixtures/control-store-protocol.tracer.mjs` | 新增A子进程：固定fixture schema、唯一writer、同事务domain+receipt、epoch/权限/容量拒绝、私有cut。 |
| `scripts/fixtures/control-store-protocol-wire.tracer.mjs` | 新增有界JSON line编码/解码，属于test-only协议。 |
| `scripts/fixtures/control-store-protocol-client.tracer.mjs` | 新增H test parent，stdio、即时发送门、ACK/exit/readonly核验和owned非递归清理。 |
| `scripts/control-store-protocol.tracer.test.mjs` | 新增11项跨进程合成验收，含before/after-COMMIT和revoke ACK-loss。 |
| [tracer说明与矩阵](../platform/WINDOWS-CONTROL-PROTOCOL-TRACER-20261005.md) | 范围、schema、进程/ABI、profile、结果和限制。 |
| 本交接 | 当前身份、验证、失败与Remote终态入口。 |
| [CURRENT-STATE](CURRENT-STATE.md)、`TASK.md` | 添加本批状态/恢复点，历史正文保留；原设计批不再是最新执行记录。 |

before：同事务receipt/ACK/revoke仅为Target Architecture。after：test-only的一个备注事务通过真实stdio/SQLite证实domain/effect/receipt一起提交，ACK丢失不盲重写，restart旧ID始终拒绝，H立即关门且A有ACK的撤权顺序成立。**正式产品行为未改变**；Windows backup资格拒绝、现有DDL/Library ownership/source/Provider/Runtime资源门保持。

## 验证与终态

- 当前起点与上一raw tree `7698e2b2c5dfd07643d16624ad5ad69bcf9d07ec`零漂移；baseline3317path records/3305既有文件；上一28证据、666产品输入/14既有实际产物SHA核验。
- 原run-01 11PASS；增加逐child退出记录后run-02 11PASS，失败0/cancel0/skip0。两个run各绑定其源码、launcher、命令、log SHA；原结果保留，不将run-01替代最终源码验证。
- 最终run为10个新建fixture、13次A启动，全部已知child退出/stdio close，parent readonly reader=0、uncertain=false，10fixture按已知文件非递归清理。COMMIT两cut和revoke cut的工程停止、超长帧拒绝退出与正常close分别记录；不能称工程kill为普通appquit或全部native physical close资格。
- 4个脚本syntax、最终raw tree/diff/文件范围、新文档链接/矩阵、历史状态与index/root generated/全部non-scope WIP校验；两路Standards/Spec独立复核分别绑定候选tree/diff/file SHA，见本批final JSON。首次整篇链接检查因TASK继承的历史报告缺失而FAIL；原异常保留prepare-first-failure.json，历史missing links继续单列FAIL，不修改历史正文、不补造报告、不算通过。
- 产品typecheck/build、正式Host/Adapter/备份/模型/Pi/Provider及Computer Use NOT_RUN。本批只有Electron Node合成Runtime，不启动产品客户端；前批Esc BLOCKED_UX_ACCEPTANCE保持，普通appquit/current running app identity NOT_RUN/NOT_OBSERVED。

私有cut没有业务ACK：before-COMMIT readonly/fresh A回读state0且无receipt，而协议仍返回unknown；after-COMMIT一次effect+receipt跨fresh A保持。旧ID无论receipt有无均拒绝。revoke ACK-loss只留下H关闭/未知，不以restart或资源恢复复活许可。回读不是外部设备断电或Windows source安全证明。

## 当前身份

| 身份 | 证据 / 值 |
| --- | --- |
| HEAD / branch | b5cc954f90d248694aedc2d6ca1aa5188fa0aa11 / codex/windows-workspace-1001，无commit/push。 |
| 当前raw WIP/tracer闭包 | tree、3311当前文件及8个实际变化SHA见本批candidate-manifest/terminal-anchor；包括所有tracked/untracked，保留root旧generated，不冒充build。 |
| 实际产品build | 仍为dam-4c583238a11c002d，2026-10-04T07:17:49.145Z；actual candidate tree=d08a5dd8d01db054c2e4c173577ee5109035572c。sourceDigest=4c583238a11c002d03925b3e5a0d9cfdb879ef8c705a7b7331d7b18c6bb53bff；artifactDigest=aa23d1b4f766527cd9345333db3275cdb21215f2caa9fcdd2620ec4acef577ac，666inputs/14outputs。 |
| 本批tracer Runtime | 2026-10-05：Windowsx64 10.0.26200 / Electron30.5.1 / Node20.16.0 / ABI123 / NAPI9 / libuv1.46.0；H与13个A的runtime回执分列。外层harness Node25.7.0不是H/A。 |
| SQLite | tracer实际3.53.1；sourceId=2026-05-05 10:34:17 c88b22011a54b4f6fbd149e9f8e4de77658ce58143a1af0e3785e4e6475127e9；installed native SHA=258341bfff296ac7a779c1dfc35e0b781c18c1a1b9ec3406551dbb473b4fe359，无重编。 |
| 原index / root generated | SHA=250b713476614d1cfbd7073e80439a2fbc8612ea8ba7ac913786032c9c06bb76 / d227f4ee0bf43ce8ee65df87641ed832eea0ae33f88648c138d459be360c569d，原字节保持；actual build candidate generated=16df0552c4233672ce933e4cb08bc763e3f5c6cec3dd18bb9c5f34094ebca173。 |
| Pi / 产品进程 | Pi source Node24.21.0 / SDK0.99.1 / pin99e47ca53d91aa342d134125f1980106105e27186ef4f61640c3bc3b98c651c0，NOT_EXECUTED；产品Runtime最后实际观测仍2026-10-04，当前外部running app身份未观测。 |

## 未验证、失败队列与下一建议

本tracer同用户协作检查不证明B2 OS强隔离/Host意图。principal、catalog/layout/manifest、完整writer迁移、产品receipt schema/retention、loader/update/namespace、whole-lifetime资源/hardRSS/Job、所有physical object close、断电/恢复、真实库/模型/账号均未实施或获资格。PT11仅wire codec，不是live H malformed-response恢复；queue/backpressure、全部claim/outbox/paging/domain映射与正式RUX需另批。

原3次及当前3/72首次rename EBUSY owner/timing UNKNOWN保持；成功instrumentation/后时点PSS不能归因失败瞬间。Router BUDGET_UNSATISFIABLE、Windows备份缺口和历史UX block保留，不改断言、预算或安全门。无真实数据/账号/凭据/下载安装/Provider、reset/clean/stash/stage/commit/push/发布。

下一建议只做**兼容设计收敛**：明确真实Host异步caller/CAS/错误与unknown提示的映射，并收敛protected catalog、principal/provisioning、Host endpoint信任候选，形成具体可审阅接线与验收范围。该建议不自动授权正式Adapter、Broker、OS权限或真实库迁移。

Remote Desktop Commander：[CURRENT-STATE](CURRENT-STATE.md)→本交接→[tracer说明](../platform/WINDOWS-CONTROL-PROTOCOL-TRACER-20261005.md)；本机`.scratch/windows-control-protocol-20261005/terminal-anchor.json`→`evidence-manifest-final.json`→`candidate-manifest.json`、`incremental-review.diff`、run-02、两路final review。raw闭包、实际build、tracer Runtime和产品进程身份分别核对；STOP，nextBatchAuthorized=false。
