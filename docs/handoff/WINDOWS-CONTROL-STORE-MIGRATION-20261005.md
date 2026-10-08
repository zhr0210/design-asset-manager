# WC01 B2 Control Store 迁移清单 / 协议设计交接

2026-10-05（Asia/Shanghai）。批准范围：上一批建议的writer/reader/transaction迁移清单、最小兼容协议、Host endpoint trust与principal/provisioning选项。**DESIGN_COMPLETE / STOP**，均为Target Architecture；productionQualified/restoreAllowed/namespaceMetadataQualified/formalAdapterWired=false，nextBatchAuthorized=false。没有协议/Broker/schema/OS权限或正式接线实现。

## 实际修改与before / after

| 文件 | 本批内容 |
| --- | --- |
| [迁移清单与协议草案](../platform/WINDOWS-CONTROL-STORE-MIGRATION-DESIGN-20261005.md) | 新增86个Host方法/22族、所有opener及DDL/trigger/reconcile、事务与文件流程、排除数据库、协商/session/envelope/receipt/撤权/分页/outbox、P/T选项及18项未来验收。 |
| 本交接 | 新增当前事实、身份/限制、独立复核与Remote终态入口。 |
| [CURRENT-STATE](CURRENT-STATE.md) | 添加本批设计入口，保留上一批设计和2026-10-04实际执行来源。 |

before：B2目标及主体/lifetime已定义，但全部caller/transaction迁移与协议未展开。after：明确当前唯一persistent业务writer、两份open阶段readonly opener、独立lockDB、86方法、bootstrap、隐式trigger和open reconciliation；各原子组完整迁入A，文件与SQL保持多段恢复，H保留业务授权。具体OS principal/provisioning、protectedcatalog/layout/schema/endpoint trust仍待决，未采纳生产政策。

**产品实际行为未改变。** 正式Windows backup仍在backup/status/DDL前拒绝；v2–8 standalone DDL并非全部走maintenance，清单不把它们误报为已统一backup。当前close为drain→release lock→close business DB；拟A close顺序另列。当前Capture cleanup只有path containment+recursive fs.rm，不能报exact-object资格，本批仅记录。没有真实库/素材/模型/账号/凭据/Provider、下载/安装/OS实验；TASK、root generated、index与无关WIP保持，无stage/commit/push。

## 验证与未运行项

| 项目 | 实际状态与证据 |
| --- | --- |
| 当前源码/身份 | 对上一批raw tree零drift；3303既有文件/3311baseline path records；666产品inputs、14既有actual outputs和24个上一设计批evidence文件SHA重验。 |
| 静态发现 / 人工清单 | 401个src/main源文件、101 lexical matches仅作发现；当前契约86方法恰好归22族。3份独立分析核对各caller/transaction/role和global DB排除；不能用检索数量证明Runtime行为。 |
| 文档与闭包检查 | 相对链接、86方法唯一覆盖、18 future ID、source事实、历史状态保持、incremental rawdiff/tree、全部non-scope WIP/index/generated/TASK保持；见inventory-coverage.json、document-verification.json、closure-verification.json。 |
| Independent Standards / Spec | 结果和绑定tree/rawdiff/file SHA见本批standards-review-final.json、spec-review-final.json；只复核设计，不取得OS/Native/Runtime/UX资格。 |
| 产品测试/build/Runtime/Pi | NOT_RUN，无本批产品build。18项protocol兼容场景和前批33项future矩阵均未执行；不将旧44PASS重报为本批PASS。 |
| Computer Use | NOT_RUN，未改界面或正式用户路径；前批用户Esc的BLOCKED_UX_ACCEPTANCE保持，正式接线后另按RUX验收。 |
| 本批harness初次失败 | setup-baseline以Windows绝对路径import导致ERR_UNSUPPORTED_ESM_URL_SCHEME，改为pathToFileURL后baseline成功；原失败分类保留setup-first-failure.json。未修改产品/断言/安全门。 |

静态文件read/hash与文档检查不证明当前应用进程、实际OS隔离、physical release、loaded image、durability或真实用户意图。未启动测试Host/model/authority；外部既有running app identity未观测。

## 当前源码、build与Runtime身份

| 身份 | 值 / 来源 |
| --- | --- |
| HEAD / branch | b5cc954f90d248694aedc2d6ca1aa5188fa0aa11 / codex/windows-workspace-1001，本批只读核对。 |
| 当前raw WIP/doc闭包 | tree与3305当前文件逐项SHA见本批candidate-manifest.json/terminal-anchor.json；包含tracked/untracked与WIP，使用保持的root旧generated，不冒充新build。 |
| 上一设计raw tree | f7a36644623dc950040b171e8fc7f69b4fa574d4；anchor SHA=c5eecb9cbfb90dfca39e0de37f71f7a2e27df94995c101e869d9d7e749428364，manifest SHA=933fd16b4e866587acb402ac276d30e31f07c52988f71525374b7a03169ee9cd。 |
| 实际build candidate tree | d08a5dd8d01db054c2e4c173577ee5109035572c，actualbuild=dam-4c583238a11c002d，builtAt=2026-10-04T07:17:49.145Z。 |
| sourceDigest / artifactDigest | 4c583238a11c002d03925b3e5a0d9cfdb879ef8c705a7b7331d7b18c6bb53bff / aa23d1b4f766527cd9345333db3275cdb21215f2caa9fcdd2620ec4acef577ac；666inputs/14outputs。 |
| actual index / root generated SHA | 250b713476614d1cfbd7073e80439a2fbc8612ea8ba7ac913786032c9c06bb76 / d227f4ee0bf43ce8ee65df87641ed832eea0ae33f88648c138d459be360c569d，保持。actual build candidate generated=16df0552c4233672ce933e4cb08bc763e3f5c6cec3dd18bb9c5f34094ebca173，非root当前值。 |
| Runtime最后观测 | 2026-10-04 Windowsx64 10.0.26200 / Electron30.5.1 / Node20.16.0 / ABI123 / NAPI9 / libuv1.46.0；本批仅重验installed Electron package=30.5.1，不新执行Runtime。 |
| SQLite最后运行 / 当前native | 3.53.1；sourceId=2026-05-05 10:34:17 c88b22011a54b4f6fbd149e9f8e4de77658ce58143a1af0e3785e4e6475127e9；native SHA=258341bfff296ac7a779c1dfc35e0b781c18c1a1b9ec3406551dbb473b4fe359静态重验。 |
| Pi | source Node24.21.0 / SDK0.99.1 / pin99e47ca53d91aa342d134125f1980106105e27186ef4f61640c3bc3b98c651c0；NOT_EXECUTED。本批evidence harness Node25.7.0不冒充产品Node。 |

## 当前限制与下一批

- source/namespace强隔离、旧handle/mapping/owner/祖先权限、protectedcatalog/layout/manifest/source binding、完整writer搬迁与protocol receipt schema均未实施或获资格。Main业务scope与A物理authority移交仍需具体兼容/ownership批准。
- SID/PID、独立principal、Browser CSRF不证明H真实用户意图；P1–3/T1–3只是候选。准备/firstload/dependency/update资源与nativeLoadedIdentity、所有physical close/hardRSS、留存/目录/断电、恢复写入、真实旧库均未验证。
- 原3次与当前3/72首次rename EBUSY owner/timing UNKNOWN，instrumented成功及稍后PSS不归因失败时点；失败日志和原断言保持。Router BUDGET_UNSATISFIABLE和历史UX block不清除。
- 草案要求same-MAIN同事务receipt、ACK未知不盲重写、A revoke fence、至少一次outbox、完整list不截断；这些是待验收要求，不是已交付运行证明。

建议下一批只做 **不接正式产品的owned合成双进程protocol tracer**：一个固定domain事务+同事务operation receipt、COMMIT前后ACK丢失、查询结果与ACK撤权顺序。先明确fixture schema、bootstrap/ABI、资源/cleanup限额与命令；same-user tracer不证明B2隔离。该建议未执行，不自动进入OS身份/ACL/token/service/install、正式Adapter或真实库迁移。

Remote Desktop Commander快速接手：[CURRENT-STATE](CURRENT-STATE.md)→本交接→[设计](../platform/WINDOWS-CONTROL-STORE-MIGRATION-DESIGN-20261005.md)；本机 `.scratch/windows-control-store-migration-20261005/terminal-anchor.json`→`evidence-manifest-final.json`→`candidate-manifest.json` / `incremental-review.diff` / `inventory-coverage.json` / 两路review。三份analysis在同一证据根。历史运行另在`.scratch/windows-backup-boundary-20261004/`，不要据旧generated/PASS判断当前应用。STOP。
