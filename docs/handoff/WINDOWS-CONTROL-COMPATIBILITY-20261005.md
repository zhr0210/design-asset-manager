# WC01 Windows Control Store 兼容设计交接

2026-10-05（Asia/Shanghai）。最新“批准下一步”完成[上一批建议](WINDOWS-CONTROL-PROTOCOL-TRACER-20261005.md)的设计收敛。**DESIGN_COMPLETE / STOP**；productionQualified/restoreAllowed/namespaceMetadataQualified/formalAdapterWired=false，nextBatchAuthorized=false。本批仅文档，不采纳生产政策、不接正式Adapter/Broker、不实施OS身份或真实库迁移。

## 实际修改与before / after

| 文件 | 本批实际影响 |
| --- | --- |
| [兼容设计](../platform/WINDOWS-CONTROL-COMPATIBILITY-DESIGN-20261005.md) | 当前Main同步caller与async/fence映射、每域CAS/unknown/提示缺口、catalog/双root/ownership、P1+C★+T2条件候选、接线seam与20项future验收。 |
| 本交接 | 范围、验证、身份、失败队列和Remote终态入口。 |
| [CURRENT-STATE](CURRENT-STATE.md) | prepend当前设计入口，前tracer标题标上一实际批，旧正文原字节保留。 |

before：同步facade、协议receipt与信任候选分散，未明确nonready不失效receipt/picker、post-commit lease错误及protected staging hardlink的兼容问题。after：明确H即时本地门+awaited A fence、草稿保留、已提交/未知/资源独立、普通material publication与protected metadata分离，提出具体最小tracer范围。**产品行为与安全门不变；当前UI提示缺口没有修复。** TASK保持上一实际tracer恢复点；源码/公共契约/schema/产品脚本未修改。

## 实际验证与限制

- 起点与前raw tree `38e77dc8fb7ef48903d8a5c2a310c7c29abd5ce0`零漂移；baseline3319path records/3311existing files。重新核对44个上一批evidence、666产品inputs、14既有actualoutputs、installed Electron/SQLite native摘要；均静态内容核对，未启动Runtime。
- 三路只读分析覆盖caller、CAS/错误、catalog/principal/endpoint，源锚点与SHA保存在本批scratch。401个Main文件、101 lexical match文件、86个Host方法仅discovery，不证明完整运行writer闭包。
- 本批检查仅新增/调整三文档的encoding/local links、20个唯一future ID/NOT_RUN、当前源码锚点与差异、raw候选/diff/范围、全部非scope WIP与TASK/index/generated保持。Standards/Spec独立复核绑定raw baseline、候选tree、三文件SHA和diff；最终结果见两路final JSON与terminal anchor。
- 产品测试/typecheck/build、tracer重跑、Runtime/Pi/模型/Provider、Browser/Desktop/Computer Use **NOT_RUN**。本批无可执行代码或用户界面修改，20项future验收全部NOT_RUN；static/review不是行为/OS/UX PASS。Esc BLOCKED_UX_ACCEPTANCE未解除。

上批run-02 11PASS /10fixture/13A已退出/reader0是2026-10-05的一个合成note+receipt协议证据，未重跑且不算本批PASS。PT11仍只codec，非live H错误响应恢复；same-user tracer不提供B2 principal/source/namespace/loader/whole-lifetime资源/断电/正式Adapter资格。

## 当前源码 / build / Runtime身份

| 身份 | 值与范围 |
| --- | --- |
| HEAD / branch | b5cc954f90d248694aedc2d6ca1aa5188fa0aa11 / codex/windows-workspace-1001，无stage/commit/push。 |
| 本批raw WIP闭包 | 当前tree、3313existing文件、3文件diff与SHA见本机candidate-manifest/terminal-anchor；包含tracked/untracked源码和命令，不把未跟踪输入排除于候选。 |
| actual产品build | dam-4c583238a11c002d，2026-10-04T07:17:49.145Z；actual candidate tree=d08a5dd8d01db054c2e4c173577ee5109035572c。sourceDigest=4c583238a11c002d03925b3e5a0d9cfdb879ef8c705a7b7331d7b18c6bb53bff；artifactDigest=aa23d1b4f766527cd9345333db3275cdb21215f2caa9fcdd2620ec4acef577ac。666inputs/14outputs，本批newProductBuild=false。 |
| 上一tracer Runtime | 2026-10-05 Windowsx64 10.0.26200 / Electron30.5.1 / Node20.16.0 / ABI123 / NAPI9 / libuv1.46.0 / SQLite3.53.1；只归上一合成H/A，未在本批执行。 |
| SQLite源与安装摘要 | sourceId=2026-05-05 10:34:17 c88b22011a54b4f6fbd149e9f8e4de77658ce58143a1af0e3785e4e6475127e9；native SHA=258341bfff296ac7a779c1dfc35e0b781c18c1a1b9ec3406551dbb473b4fe359。静态重验，不重编/不代替actual loader。 |
| 原index / root generated | SHA=250b713476614d1cfbd7073e80439a2fbc8612ea8ba7ac913786032c9c06bb76 / d227f4ee0bf43ce8ee65df87641ed832eea0ae33f88648c138d459be360c569d；actualbuild generated=16df0552c4233672ce933e4cb08bc763e3f5c6cec3dd18bb9c5f34094ebca173；全部保持。 |
| TASK | SHA=3434e48cf4ad1db4aee31e27b6cfbf756d1d43cf20c87ad7fbc5110efbe2bfdc，原字节保持，不将设计批覆盖实际恢复点。 |
| Pi / 产品进程 | Pi source Node24.21.0 / SDK0.99.1 / pin99e47ca53d91aa342d134125f1980106105e27186ef4f61640c3bc3b98c651c0，NOT_EXECUTED。产品Runtime最后实际观察2026-10-04；当前running app NOT_OBSERVED，本批Runtime NOT_RUN。 |
| evidence harness | Node25.7.0，仅本批文档/摘要/raw封存工具；不是产品或A Runtime。 |

## 当前失败、未验证项与下一批建议

当前静态可定位缺口：Library卡片描述catch会把保存后refresh失败/connection未知泛化“未保存/取消/重试”；Trash泛化“未移动”；organization/workset丢typed code，native refresh错误分类需在RPC前处理。本批只记录Q01–Q05，没有产品重现或修复。待实现H epoch/fence、domain receipt/status、H在线A离线桥接与保稿/核对UI。

强backup仍拒绝；原3次与3/72首次rename EBUSY owner/timing UNKNOWN、Router BUDGET_UNSATISFIABLE、Esc BLOCKED_UX_ACCEPTANCE、TASK历史23 missing links FAIL保持。本批链接检查只3docs，不重跑全TASK或补造缺失报告。真实principal/catalog/layout/loader/namespace/resource/跨卷/retention/断电、86方法迁移、旧库与真实模型均未资格；P1+C★+T2只是首审候选，T2不能证明则保留阻塞/审T3，不降T1。

下一建议：只实施**owned合成H facade/catalog-reference兼容tracer**，一个caption-shaped CAS意图、双logical root/registered-ref、sync projection与epoch、独立token/awaited fence、lostACK核对与草稿快照保留；现Electron Node合成临时fixture，无production/public契约/schema、OS authority或真实profile。脚本/资源预算/cleanup/有限矩阵须下一批固定，且仅证明协议兼容。正式Adapter、产品提示修复/public seam和OS资格仍另批。

无真实库/素材/账号/凭据/Runtime DB访问，无模型下载/运行或Provider开放，无reset/clean/stash/WIP覆盖/stage/commit/push/发布。完成本批后STOP，不自动进入上述建议。

## Remote Desktop Commander终态入口

[CURRENT-STATE](CURRENT-STATE.md) → 本交接 → [兼容设计](../platform/WINDOWS-CONTROL-COMPATIBILITY-DESIGN-20261005.md)。本机 `.scratch/windows-control-compatibility-20261005/terminal-anchor.json` → `evidence-manifest-final.json` → `candidate-manifest.json` / `incremental-review.diff` / `file-scope.json` / `document-verification.json` / `standards-review-final.json` / `spec-review-final.json`。

先按anchor/SHA核对当前rawtree，再分别核对actualbuild与历史tracer/productRuntime；TASK保留实际恢复点。目标/授权只来自最新用户批准，历史设计/矩阵/下一建议均不新增授权。`nextBatchAuthorized=false`，**STOP**。
