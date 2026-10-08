# WC01 合成 quiescence / claim-sent 兼容 tracer

2026-10-05（Asia/Shanghai）。最新用户批准[上一批交接](../handoff/WINDOWS-CONTROL-FACADE-TRACER-20261005.md)的下一建议。本批为 **Validated Tracer / STOP**：独立 test-only 模块，有限 work/download drain→local hold→awaited A fence、独立 maintenance/shutdown、claim/mark-sent 丢 ACK 时零 stub 推理。正式产品、公共契约/schema、Host/Adapter/Broker、OS安装身份权限和真实数据不变。

## 当前源码与计划调整

重新核对真实源码，保留[兼容设计](WINDOWS-CONTROL-COMPATIBILITY-DESIGN-20261005.md)§3/§5目标；旧摘要不替代当前事实。`src/main/library-quiescence.ts:85–146` 已有 work→download→同步 business hold→AI/OCR drain，尚无独立 A ACK。现 did-change/finally 与 shutdown resume choreography 保持，本批没有修复正式调用方。`background-ocr-storage.ts` 最多1 claim，tag storage最多32；两域 abort/replay次序不同。当前 controllers已 await claim/sent 后才推理，但未实现未来 H/A storage-unknown 映射。tag普通 publish是void changed，recovery才await eventId callback/ACK，不能称通知恰好一次。

最小调整：单个 **max1 合成 attempt**，不导入真实OCR/tag controller/schema、不将其容量或replay同质化。仅验证协议和私有coordinator，真正域迁移及outbox/effectcommit另批。源码差异和有限规划保存在本机scratch/test-planning.md。

## 模块、事务与H行为

新增 `scripts/fixtures/control-store-claim-profile.tracer.mjs`（固定ref/limits/payload/receipt）、`control-store-claim.tracer.mjs`（A唯一writer）、`control-store-claim-client.tracer.mjs`（H/owned fixture）、`scripts/control-store-claim.tracer.test.mjs`（QC01–19）。没有产品import；旧facade/protocol脚本原字节保持。复用既有wire与profile纯validation，不把test类型作为公共契约。

每fixture新建Temp下 `dam-control-claim-*`，owner marker、control/store.sqlite、material/binding.json。两个logical roots同用户同父目录，不是protected catalog或OS principal。A固定resolver，不接路径/SQL/自动register/caller coordination boolean。格式3仅合成identity、单attempt、最多16receipt；实际max1只会自然产生至多2receipt，**容量耗尽分支未运行**。

claim和mark-sent分别在同步MAIN transaction中更新attempt和完整原scope/canonical digest receipt；COMMIT后ACK。claimed=1/sent=2是 **存储transition计数**，不是contact或推理次数。same-ID/same-payload只历史replay，改payload拒绝不能反证旧effect；fresh instance只能精确历史inspection，旧operation ID/claim token/session/permission epoch不执行。missing receipt仍unknown。无法用当前row或sent marker证明模型接触。

H在入口、每个前置callback实际调用点及每await之后检查open admission和epoch/abort；关闭门立即拒绝，不启动下一drain/fence。H serial awaited work/download callback在自身hold前运行；取独立cycle/maintenance/shutdown token后即时关门，再await匹配的A quiesce applied ACK，之后才启动dependent drain callback。两项前置drain只是受控callback/门投影，没有验收正式workset保存或download saga。callback失败不跳过顺序；finally最多释放自身token。quiesce/resume每次撤grant和推进permission epoch，resume ACK只解除已知暂停，**显式authorize仍另行必需**。shutdown/revoke sticky，fence/result UNKNOWN和合成resource flag独立；release、资源恢复、fresh attach或历史receipt均不自动授权。

H runStub先收精确claim receipt，再收精确sent receipt，每await后重验epoch/admission/abort，最后只增加 **本进程计数器**。没有创建模型/helper/network/service/Provider；正常两场景各1次计数，17个负向场景全0。claim或sent已发送但丢ACK/mismatch进入storage unknown；不新ID重claim、不开始stub，不以“推理unknown”或verified失败取代。fresh inspection证明原DB事实，不继续旧pipeline；显式新grant后持久attempt仍busy，不能重复推理。H记录仅内存，不证明H重启持久恢复。

## 有限验收矩阵

首run-01 18PASS、run-02 19PASS及原NEEDS_REVISION报告保留。独立Spec指出coordinate缺少admission检查及boundedDrain微任务调用间隙；补入口/每前置await/实际调用点检查和QC19排队后立即hold断言后，选定run-03 19PASS/0FAIL/0cancel。源码/command/log/results SHA见本机tracer-verification与终态anchor；不移用首run或上一批PASS。

| ID | 实际覆盖 | 结果 |
| --- | --- | --- |
| QC01 | 匹配claim/sent同MAIN回执先于一次stub；再次claim busy不重复。 | PASS |
| QC02 | work/download在hold前、dependent在ACK后；release/resume不grant，显式grant才新执行。 | PASS |
| QC03 | 已知work/download失败不取hold、不发fence、不执行dependent。 | PASS |
| QC04 | download callback deadline退休epoch；晚settle不推进dependent。 | PASS |
| QC05 | live delayed quiesce ACK期间即时关门、dependent为0；匹配ACK后才drain。 | PASS |
| QC06 | 两cycle/maintenance/shutdown token独立、重复release幂等、shutdown不复活。 | PASS |
| QC07 | applied quiesce丢ACK，finally/resource/fresh attach不grant、不dependent。 | PASS |
| QC08 | applied resume丢ACK，fresh inspection/resource恢复仍fence UNKNOWN。 | PASS |
| QC09 | before-claim COMMIT工程停止；idle无receipt但查询仍UNKNOWN/不重发。 | PASS |
| QC10 | after-claim丢ACK；fresh原receipt核对、历史token拒绝、zero stub/sent。 | PASS |
| QC11 | after-sent丢ACK；sent marker不证明contact、zero stub、核对不续跑。 | PASS |
| QC12 | delayed claim ACK跨H epoch仅历史；并发第二run busy、无sent。 | PASS |
| QC13 | delayed sent ACK跨epoch不启动stub，DB sent事实保留。 | PASS |
| QC14 | delayed sent期间abort；zero stub，known sent不当rollback。 | PASS |
| QC15 | live sent receipt错digest关闭H，fresh真实receipt核对，不stub。 | PASS |
| QC16 | revoke即时关门；资源恢复和maintenance release不恢复grant。 | PASS |
| QC17 | raw boolean/path拒绝、exact replay只1effect、改payload/错token/旧claim epoch拒绝。 | PASS |
| QC18 | claim前abort不发送；pending claim期间hold阻止sent，release不重复claim。 | PASS |
| QC19 | inspection-only/已有hold/resourceUNKNOWN/排队后立即hold/前置callback中新hold或资源关闭时不继续drain/fence。 | PASS |

private late cuts串行暂停A dispatch；不代表已覆盖A在pending delayed claim ACK时并行处理quiesce。原20项完整产品/OS验收均NOT_RUN。claim/sent unknown仅存储轴；真实推理response后effect commit、finish不能降级succeeded、outbox重投/ACK和资源physical UNKNOWN仍未实施。

## 执行边界、退出与证据

前置独立review指出callback/outer stdio无限wait风险，原NEEDS_PLAN_CLARIFICATION报告保留；修订后独立follow-up静态PASS。H callback1000ms、case12000ms、H run90000ms、outer150000ms/post-stop5000ms；实时log256KiB。超限只停止exact owned对象、保留UNKNOWN，不递归kill或cleanup陌生数据。QC04实验callback deadline；case/global/outer/log/post-stop超限分支仅静态检查，**未实验资格**。测试前仅新增终态H投影记录，不改变已审envelope。

实际19新fixture/25A全部child与stdio close已知、reader0、uncertain=false；19正常fixture close ACK/exit0、6精确工程停止分列。19fixture非递归移除。原owner/binding/store对象、realpath/lstat/单链接/bounded marker/已知leaf先核对，陌生/替换/UNKNOWN retain。没有namespace/cleanup攻击实验、native物理close、Job/hardRSS/whole-lifetime/断电/restore资格，工程停止不称普通appquit。

A heap64MiB；frame8192/pending8；receipt16；page4096/max256；ACK/cut/exit5000ms；H operations16/holds8/events128。25次启动RSS范围46,272,512–48,918,528 bytes，只是startup snapshots。实际H/A Windowsx64 10.0.26200 / Electron30.5.1 / Node20.16.0 / ABI123 / SQLite3.53.1；outer Node25.7.0另列。

## before / after与终点

before为设计及caption facade证明，未验证quiescence/claim。after为实际stdio/SQLite合成协议证明：drain顺序/匹配fence、原claim/sent receipt、unknown核对和zero stub路径。**正式产品行为未变**。无真实素材库/profile/素材/账号/凭据/RuntimeDB访问、模型/Provider/下载/安装、stage/commit/push或WIP覆盖。

实际产品build仍dam-4c583238a11c002d，产品Runtime最后2026-10-04，当前app未观测。产品tests/typecheck/build/Pi/模型/Provider/Computer Use NOT_RUN；强backup拒绝、EBUSY owner/timing UNKNOWN、Router BUDGET_UNSATISFIABLE、Esc BLOCKED_UX_ACCEPTANCE、TASK历史23missinglinks FAIL保留。productionQualified/restoreAllowed/namespaceMetadataQualified/formalAdapterWired=false。八文件范围、两路独立复核、身份与Remote入口见[终态交接](../handoff/WINDOWS-CONTROL-CLAIM-TRACER-20261005.md)。完成后STOP，下一批未自动授权。
