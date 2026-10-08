# WC01 Windows Control Store 兼容设计收敛

2026-10-05（Asia/Shanghai）。最新“批准下一步”对应[上一协议 tracer 交接](../handoff/WINDOWS-CONTROL-PROTOCOL-TRACER-20261005.md)的兼容设计建议。本批交付 **Target Architecture / DESIGN_COMPLETE / STOP**，不实施正式 Adapter、Broker、产品或 tracer 代码、公共类型/schema、catalog/layout、OS 身份/token/ACL/service/account/install。本文不是生产政策采纳或下一批授权。

H 指 Electron Local Host，A 指拟议独立 Control Store authority，C 指现有 Desktop/本机 Browser 客户端。当前正式产品仍由 Main 打开 Active Library SQLite；A 仅在上一批 owned 合成双进程 tracer 中存在。`productionQualified`、`restoreAllowed`、`namespaceMetadataQualified`、`formalAdapterWired` 均 false。

## 1. 当前证据与旧设计差异

以当前真实源码重新核对；压缩包摘要、旧源码指针、历史 PASS 均不替代当前调用链。上批 raw tree `38e77dc8fb7ef48903d8a5c2a310c7c29abd5ce0` 与本批起点零漂移；44 个上批证据、666 产品 inputs、14 既有 actual outputs SHA 重验。本机 `.scratch/windows-control-compatibility-20261005/` 保存原字节 baseline、三个并行只读分析及静态 discovery。401 个 Main 文件/101 个 lexical match 文件/86 个 Host 方法是导航集合，不是运行时 writer 或权限闭包证明。

保留[86 方法/22 族迁移清单与协议](WINDOWS-CONTROL-STORE-MIGRATION-DESIGN-20261005.md)和[authority 候选](WINDOWS-BACKUP-AUTHORITY-DESIGN-20261005.md)的产品目标、安全不变量。以下差异替代其涉及的简略表述，未涉及部分仍按原来源与证据等级理解。

| 当前源码事实 | 必要设计调整 |
| --- | --- |
| `workspace-transport.ts:6`、`workspace-client.ts:301–320`：公共命名 Library API 已为 Promise；Main contract 的 inspect/revoke/hold 仍同步。 | 不批量改 Public/Renderer async；优先拆 Main 的本地同步门与必须等待 A 的协调结果。 |
| `active-library-host.ts:158–170`：inspect 实际检查 lease，失败降 recovery-required，保留 identity/generation。 | 未来 H 缓存只能是本地投影，不声称实时 lease 验证；断连即时 nonready，再由 A 对每次操作核验。 |
| `index.ts:185–188`：review receipt/picker generation 仅 identity:generation。 | nonready 不会自行失效 Map；增加独立 H authority/session epoch 或显式 revoke，不篡改持久 Library generation。 |
| `exclusive-library-lock.tracer.ts:233–260`：操作后还会检查 lease。 | 后置 throw 不能证明未 COMMIT；区分提交结果与状态/通知/资源确认。 |
| `index.ts:196–200`、`native-open-dialog.ts:36–60`：当前默认先共享页面选择器，再 native fallback。 | 名称不能当 native picker/可信人类意图；H selection 不给 A privileged raw-open。 |
| 当前 manifest v1 exact 字段不含 locator；布局同 root/同 device，staging 位于 Control。 | catalog/外置 Control 需新版本布局及完整 caller 适配，不给旧 v1 添字段、删除断言或自动迁移。 |
| `capture-gateway.ts:264–327`：ordinary staging create-only、digest 检查、hardlink no-overwrite 发布，随后 SQL。 | 外置 protected staging 不能直接沿用；跨卷不可 link，同卷也共享对象/ACL。文件/SQL保持分段 saga。 |

## 2. Main 兼容 facade：小接口、两种权威

保留现有 C→H 命名业务动作、Promise、sender/card/role/owner/Browser CSRF 与 envelope。C 不直连 A，Browser 不新增 LAN 或多用户入口。A 内执行完整 SQLite handler/事务、scope/CAS/source/claim/receipt；不得在 better-sqlite3 的同步 transaction callback 中 await RPC，也不暴露 SQL、绝对路径、caller-controlled coordination boolean。

目标内部 seam 分为三项，均未实现：

1. **本地同步投影和 admission**：保留 inspect/matches/generation callback/hold closure 的同步使用；明确为 H 已知状态。A 断连/实例变化/无效回复时，先即时关闭依赖该库的业务门、推进 H 内存 epoch、失效 receipts/picker/native intent/media scope，再异步求证。保留 identity/generation 与草稿恢复资料，不能清 null 冒充新库或已解决。普通 App/Runtime/无关能力不被全局冻结。
2. **异步业务 hop**：A 每次核对实际 instance/session/store/library generation、固定 purpose、权限及域 CAS；H 收到结果再比本地 epoch，晚到的旧 scope 结果不贴新库标签、不恢复授权。H snapshot 不是 A 的准入证据。
3. **显式 awaited coordinator**：本地 revoke/hold 立即有效，但仅 A applied ACK 才证明远端 fence 已生效。Main 私有 awaited fence/close/resume 协调与现同步 facade 分离；dependent caller 等待或拒绝，不藏在 `void rpc().catch(...)` 后继续执行。Symbol token/release closure不跨 wire。

| 实际调用方 / 锚点 | 保持 | 最小目标变化 / unknown 路径 |
| --- | --- | --- |
| `local-host/active-library-commands.ts:91,99–119,275–276` | public inspect/envelope、preview 与 list scope；完整 assets array。 | awaited A result 绑定 scope，前置 H snapshot不能标记另一代结果；不顺带分页/截断。 |
| `index.ts:159–166,185–200`；`command-receipts.ts:11,24–39`；`file-selection.ts:16,49,79` | transition review、purpose/owner/TTL、Main-held path Map。 | H epoch 先推进/显式失效，旧 review/selection 不能跨断连恢复；apply 在副作用前再 await A 核对。 |
| `index.ts:350`；`workspace-drafts.ts:11,157–177` | 独立 profile JSON、原 library scope、writer/sequence、输入/base/archive。 | readiness/epoch 另门控 reclaim；不自动清稿、重发、修改 Library generation；草稿保存不变成 domain receipt。 |
| `index.ts:378–394,429–434` | Browser media 与 Desktop protocol 前后 scope 检查。 | 返回字节绑定 A session 与 H epoch；晚回复拒绝，不自动恢复 media grant。 |
| `asset-card-controller.ts:31–55`；`work-window-controller.ts:13–65` | native sender/成员/窗口权威在 H，布局 drain、dirty 内容。 | 短时 A 不可读不得当确定失效销毁 dirty 窗口；write outcome 与 refresh 分开，await 后再比本地 epoch。 |
| `ocr-controller.ts:29–133`；`visual-ai-controller.ts:40–182`；tag execution/batch controller | H 进程/资源/cancel/job epoch；当前域 claim/sent/commit/finish。 | A storage unknown 单独映射，不当推理或物理退出 unknown；不释放 UNKNOWN 资源、不再次推理。 |
| managed-download、image-tools、ai-acceptance、background-analysis、tag-decision controller | 既有 HTTP/source/Runtime/模型权限与资源门。 | storage hop 精确 scope；下载/import 是 saga，不能重复网络/import“修复”ACK；maintenance resume 须已知 A state/fence。 |
| `index.ts:603–604`；tag execution/recovery notification | UI刷新不是提交权威，不撤销已提交 effect。 | 回执核对先于保存断言；异步 callback 改造同步其直接 caller。当前普通 tag publish void 且无 eventId，不宣称已完整去重。 |

这里是集中同步依赖映射；全部 writer/read-only opener、bootstrap/lazy DDL/trigger/reconcile/lock/backup 移交仍按前批清单逐族证明，不能以同步 facade 适配替代其闭包。

## 3. 撤权、暂停、切库与退出的顺序

当前 `library-quiescence.ts:85–146`：确认 discard → visual hold/owner invalidate → **work-window drain → managed-download drain → business hold** → AI/OCR drains → intent/card invalidate；did-change 在 finally 释放本 cycle；shutdown 有独立 hold。`readVisualSession` 是当前有限 suspended coordination。close 当前先 drain，再 release lock，再 database.close；它不是未来物理关闭安全证明。

目标保留前两类 drain 在 business hold 之前，它们需要现有写操作。随后 H business token 即时生效，await A quiesce applied ACK，再按明确允许的 finish/session-inspect verb 收敛。A 在线性化点区分 commit先于revoke（核对 committed）与 revoke先于commit（拒绝）。不把任意 caller boolean 传给 A 来绕过暂停门。

`background-ocr-controller.ts` 的 Runtime change/invalidate/revoke/suspendAndDrain 现有多处同步调用；`host-schema-maintenance.internal.ts:61,134–154` configure 先 revoke/epoch fencing 再 backup/事务。迁移时本地权限立即 false，explicit revoke/suspendAndDrain 必须 await A fence；Runtime callback 可立即关门，但 configure/claim/sent/commit/close 等依赖 pending fence，ACK未知不继续。持久 enabled choice、resource恢复、fresh session均不复活 live grant。

did-change/failure finally 可释放自身本地 token，却不能因此移除远端 unknown barrier。恢复需 fresh A handshake、schema/session/已知提交结果与 fence 核对；如需 resume protocol，还须 applied ACK。两个 cycle、maintenance、shutdown token 独立计数，release一个不释放其他 hold。只限依赖 A 的业务权；资源 UNKNOWN 另账，业务撤销不可被资源许可恢复。

close 分开记录 admission closure、business drain、commit outcome、SQLite/句柄 closure、owned A 进程和 stdio/Job settlement。fail-fast Promise.all 完成/失败不能证明全部 physical process退出；工程 kill、Node close、readonly读回均不升级为 ordinary app quit/断电/whole-lifetime资格。

## 4. 结果与用户提示矩阵

当前结果异质：Library `{success,value,error,code}`，OCR/tag 常为 `{ok,value,error}`，Client 部分 unwrap；不能统一 truthiness。`active-library-commands.ts:68–74` 会把非 HostError（含 AssetTrashError）泛化；`local-dam-server.ts` HTTP200 仍可携带业务 false；1024 invocation window不是 durable receipt。Browser 的 fetch/403/COMMAND_RECEIPT_UNKNOWN/损坏回执会生成 WorkspaceConnectionError，其他 error 不全有同分类；Desktop IPC 也不能假定与 Browser 一致。

内部 H↔A 候选语义如下，不是新增公共 union/type。固定 path-free 文案由可信 Host mapping 选择，不外泄 OS/SQL 原文、路径、账号、payload。

| 结果 | 所需证据 | 目标行为与提示 |
| --- | --- | --- |
| 本次未准入 | H发送前拒绝，或A明确这次fresh请求未执行；不推断同ID旧请求无effect。 | “当前操作未执行”；保留input/base；重新发起仍走现有授权/CAS。 |
| verified-no-effect / CAS冲突 | 精确请求的 handler未提交且rollback已知，没有混入旧已提交ID。 | 精确冲突/无效/容量分类；保留草稿，可明确读对照/采用baseline，不自动改revision重发。 |
| committed-known | 同MAIN effect+canonical receipt已COMMIT，匹配operation/payload/store/epoch的结果已获知。 | “此次内容已保存；刷新/通知暂不可用”；仅clean已提交输入版本，后续键入仍dirty；只读刷新，不重写/重推理。 |
| commit-unknown | 已发送或可能执行，ACK/匹配receipt未确认；missing/corrupt/unmatched receipt不证明rollback。 | “操作结果尚未确认；输入保留，请核对保存结果，勿重复提交”；保留原ID/payload/base，不隐式新ID。 |
| resource-unknown（正交） | Helper/模型进程、句柄、锁、RSS/Job释放未确认。 | 暂停相关资源动作且继续保守占账；可与committed-known并存，不恢复业务grant。 |

scope过期、session撤销、能力unsupported、recovery-required和CAS冲突保持独立；拒绝新的授权动作不否定已提交历史。receipt query 用新实例的有限 inspection 授权检查原 request reference，不能恢复旧 execution capability；旧 instance ID不可重新执行。回读当前同文本/同revision不能证明该operation提交；历史receipt不证明当前asset lifecycle或用户grant。产品跨H重启的原ID/输入保留、容量/retention与核对入口尚需另审，不能称现profile草稿已有此协议。

**A断开而H在线**是新的存储authority故障维度。当前 Browser SSE reconnect 只因 C↔H 连接变化读取snapshots/reconcilers；不能自动覆盖该维度。未来需 Main→两客户端业务authority状态/unknown投影与关闭依赖写门；单snapshot校准不解除某operation的unknown。当前 Browser无domain写自动重试；profile草稿flush重试是独立机制，不能据此重发domain。

## 5. 每域CAS、claim与outbox不能同质化

| 域 / 当前锚点 | 当前约束 | 迁移义务 |
| --- | --- | --- |
| caption；Host:462–470 | optional expectedCaption，COALESCE比较；未传baseline维持现契约，无通用receipt。 | 不静默加/减CAS；新receipt/typed conflict需schema/public批准。 |
| notebook；asset-notebook.ts:22–34 | session/sourceRef/expectedRevision，lazy v5 whole txn。 | 笔记、revision与receipt在A同txn；用户继续输入不清除。 |
| organization；library-organization.ts:20–50 | whole organization revision，关系验证与v6 txn。 | 未知create不新ID重复建folder；冲突不能反证上次结果。 |
| workset；work-sets.ts:20–39 | save/delete revision，members/optional layout同txn；direct layout是LWW upsert。 | 不把layout静默改CAS；create未知不重复建set。 |
| manual OCR；ocr-storage.ts:12–34 | revision/evidence/source、v8 whole txn，用户编辑优先。 | physical exit、storage outcome、permission独立；不改用户edited状态。 |
| background OCR；background-ocr-storage.ts:31–64 | live grant/runtime/session/claim；1 claim；commit先session/abort再succeeded replay。 | 精确保留abort顺序与digest replay；unknown claim不推理，revoke不复活。 |
| tag；tag-execution-storage.ts:47–96 | max32/NOT_SENT；matching effect receipt在abort前；effect/current/evidence/execution/receipt/outbox同txn。 | 保留域差异；不能套OCR顺序或把history当current。 |
| Trash；sqlite-asset-trash.adapter.ts:181–201,272–281 | completed immutable plan历史回执；revision/seq/relations digest；restore仅原范围幂等。 | restore后confirm receipt仍历史；current另读，不扩成全域receipt。 |
| profile drafts；workspace-drafts.ts:58–71,99–135 | H profile writer/sequence、pending flush和archive。 | 与domain commit分开；domain成功后的draft-remove失败不撤销effect，也不删除后续编辑。 |

claim ACK丢失：不重新claim新ID、不执行Provider/Runtime，先精确status。mark-sent ACK丢失：不开始推理，A sent marker不是真实contact/process start证据。已获推理response后commit ACK丢失：保留结果/operation，进入storage unknown，不走现 `sent && !completedResponse` 的推理unknown分支、不以finish报告未保存/重新推理；finish不得降级succeeded。

当前 tag-only publish是 `void changed(scope)` 然后await ACK，无eventId；recovery flush才await changed(scope,assetId,eventId)+ACK，当前没有durable多consumer cursor/恰好一次render。未来outbox是可重投通知与业务effect分离；publish/ACK失败保留待发、不重推理。协议receipt、domain receipt、outbox event、Browser invocation和草稿sequence是不同凭据。

## 6. 当前可定位缺口与未来迁移缺口

本批只静态核对，未重现用户操作；以下**未修复/Computer Use NOT_RUN**，不得写成已经丢稿或已通过体验验收。

| 队列 | 当前源码路径 / 事实 | 后续具体目标 |
| --- | --- | --- |
| Q01 当前提示缺口 | `Library.tsx:260–274` success后loadAssets失败、connection未知、Host错误均提示“描述未保存…取消编辑…重试”。 | 拆保存与refresh阶段，保留草稿/unknown；不诱导取消或盲重发。 |
| Q02 当前提示缺口 | `asset.store.ts:409–430` dispatch后refresh失败/unknown泛化“未移到回收站”；Canvas恢复catch也泛化。 | 历史receipt与current分列，unknown不称未移动；保留typed域错误。 |
| Q03 当前结果兼容缺口 | organization/workset hook丢code；native保存/布局写后assertCurrent/publish/changed可失败；refreshEntry读取错误由refresh捕获并销毁窗口，不向write caller抛该读取错误。 | 保留typedCAS；迁RPC前区分暂时不可读/确定失效，dirty窗口与saved反馈不混。 |
| Q04 未来迁移缺口 | 当前tag/visual用推理sent/response判unknown，background revoke同步。 | 增加storage outcome与awaited fence；禁止把void facade当A已应用。 |
| Q05 未来迁移缺口 | H在线/A离线、receipt/picker未含epoch、无通用domain receipt/status。 | H epoch/依赖门/两客户端状态及有限核对契约一起设计与验收。 |

Notebook、Inspector描述、OCR编辑已有较具体的草稿/冲突保护，仍需验证上游未知结果映射和已commit后refresh失败。公共typed error/result/query/通知如改变，同步Host/facade/IPC/preload/Browser/client及直接UI调用方，不能只靠长期解析error.message实现协议。

## 7. Catalog、布局与material publication候选

优先继续审阅 **C★：A独立protected physical root + A-owned catalog + 新库版本化layout + 不可信material hint**，未采纳为产品政策。仅保护用户root下`.dam` leaf不能控制祖先DELETE_CHILD/rename/owner/WRITE_DAC、既有write/section handles；保护全素材祖先又可能改变Originals ownership，不能隐式实施。

A-private resolver消费opaque registered store reference，catalog记录deployment/profile epoch、Control/library identity、lineage/instance/generation/schema/layout、actual protected object/parent、material登记与资格scope。catalog数据、journal、祖先、代码/loader/授权均在保护闭包，catalog row自身不提供OS隔离。拒绝H/manifest/path/hash/SID作为authority事实；没有“register任意路径再高权open”的旁路。material path只为关联/ordinary H受限文件操作；A新增读取material须另审具体object与降权/transfer范围。

H仍用共享产品选择器并freeze owner/client/selection/use/transition，ordinary authority create-only新material root。hint/reference不为bearer capability、不泄漏可写Control路径；A重新解析自身catalog并验证主体/profile/对象，篡改或另一profile→拒绝/重选/recovery，不切换另一库或自动登记。H recent path/name/ref、userData UUID/build digest不是bootstrap根。无catalog/重装/跨机不自动扫盘重建、安装service或回退旧raw writer。

当前v1 exact manifest不能添locator；新layout/reader-level/portable语义、Control/Original/staging/preview角色、所有opener/路径/资格/cleanup必须另批同步。现Windows VFS source固定control/library.sqlite；目标由A真实resolver绑定actual consumer/object与事务，H自报SHA/路径不能证明source。v1旧库保持，不读取、迁移、复制到保护root、改owner/ACL或关闭旧handles。

**首兼容候选分开protected metadata与ordinary material**：A DB/lock/catalog/snapshot/receipt在受保护根；H publication staging与Originals在同一registered qualified material volume，维持create-only、digest、no-overwrite和单链接有限读取。protect catalog不认证material字节/祖先。不能默认系统盘Control与另一盘Originals仍兼容hardlink；更不能从protected staging link到user Original，同卷的hardlink仍同一file/ACL，给U写权会失隔离，保留A owner又可能改变Original ownership。

若未来需要A输出bytes，以有界transfer生成独立ordinary对象再在material卷发布，不给H whole-A-root writer；transfer本批未实现。每卷A protected root可作条件候选，但必须来自独立合格祖先，不能在U可变目录下自动provision，也不能把protected-stage→Original link当安全结论。metadata root与material root分别做volume/resource/source/lifetime资格；material staging→Original跨卷直接拒绝，不自动Copy fallback。preview位置/预算/读权限需与新role一同决定，当前不挪目录。

new catalog注册、MAIN create、material/manifest/files提交是明确saga/checkpoints，不能称跨库/跨介质一个SQLtxn。catalog含授权critical state时须先明确epoch/tombstone与崩溃恢复；domain/effect/receipt同MAIN transaction。任一方缺失/替换/partial creation保持对象、草稿、unknown并关依赖门，不自动cleanup陌生对象、recreate catalog或恢复旧capability。

## 8. Principal、provisioning与H endpoint信任

优先研究组合 **P1 + C★ + T2**，只是review排序。P1预安装小native A/独立服务身份；不默认LocalSystem、固定SID/SDDL或免admin。P2专用账号保留备选，含密码/生命周期成本；P3同用户restricted/AppContainer/提升进程不能单独证明独立owner、旧能力撤销与完整ancestor/H隔离。

T2要求受保护H安装与依赖、bootstrap/actual loader、运行中memory/token/handle/channel、scope-purpose能力交付；protected executable不自动保护运行进程。SID/PID/creation-time/exe path/build hash、nonce、清env、BrowserCSRF、Electron sender只提供各自有限观察，不能证明可信H或人类意图。当前tracer的same-user协作协议不升级为强B2。

对已证明trusted H可保留现C→H业务权限；A认证H实例/purpose不把H声明“用户已批准”当独立人类证据。若威胁含H失陷，T2不能单靠固定verb证明input真实。**T3**由独立trusted consent表面冻结/显示payload并绑定one-use scope/source/revision/purpose/epoch，是未决架构分支；需产品成本/可信display-input和RUX评审，不本批添加dialog。T2未证明时保留阻塞或审T3，不能降为T1协作前提刷绿。

| 生命周期 | 必须具体审议与测量的边界（均NOT_RUN） |
| --- | --- |
| install/bootstrap | 安装权限/主体/保护根在首次执行与创建前成立；固定代码/dependency/catalog/profile/protocol，不从CWD/PATH/env/Renderer/网络取exec；当前NSIS不是A service安装证明。 |
| start/session | actual process instance/token/owner/Job/pipe/section/inherited/DUP_HANDLE权利与双方bootstrap，fresh epoch；无持久capability自动恢复。 |
| update | 停new admission→ACK quiesce→核对commit/settlement→新loader closure→advance安装/protocol/catalog epoch；partial update/rollback保持unknown，不重执行旧ID。 |
| stop/crash/restart | 连接/I/O、DB/handles、process/Job分轴；资源释放与业务授权分离，fresh有限status不复活grant。 |
| repair/uninstall | 保留用户materials/Originals与未决metadata；删除另批具体范围，repair不因catalog缺失信任旧DB/扫盘。 |
| 缺权限/安装缺失 | 明确该能力unavailable；无自动提权/安装或writer fallback，不冻结无关能力。 |

尚欠安装/维护成本、profile/session/用户切换、A/H actual ownership及权限、loader/namespace/lifetime测量、H资料读取路径、跨机metadata产品语义。本文没有可执行OS provisioning脚本或生产承诺。

## 9. 接线顺序与审批 seam

未来最小顺序：私有H outcome/epoch/fence seam → 有限catalog reference解析/拒绝模型 → 一个现有CAS意图与unknown核对 → claim/sent/outbox → 全部writer/DDL/readonly/close闭包 → principal/source/namespace/loader/resource资格 → 正式公共契约/UI与用户路径验收。每层按实际证据等级交付；早期same-user synthetic通过不允许跳到正式Adapter。

另批必须明确的公共兼容seam：typed error/result/query/通知；manifest/layout/reader/portable；Library create/review/open/reopen；Control/source/VFS/资格scope；每域receipt/schema/capacity/retention；Capture/download文件/SQL恢复与cleanup；lock/close；Original/preview路径与读bytes权限。App Storage/settings/credentials不借此迁到A。UI修复使用共享展示组件并由主Agent按[UI/UX流程](../agents/ui-ux-acceptance.md)验收；本批无UI执行。

下一建议只做 **owned合成H facade / catalog-reference兼容tracer**：不接生产调用方、公共契约/schema；两个logical roots与固定registered ref、Main-shaped sync projection/epoch、本地token+awaited fence、单caption-shaped CAS输入/unknown result、草稿快照保持。利用现Electron Node ABI与临时新建fixture，不启动产品/模型/Provider/OS authority，不读取真实profile/库、不声称protected catalog。需显式批准该范围后才实施；范围应固定脚本/预算/cleanup/有限矩阵。正式Adapter、真实schema/public UI、P1/T2/OS实验仍另批。

## 10. 有限未来验收矩阵

以下全部 **NOT_RUN**；是后续必要目标的有限集合，不替代前批18项/authority33项或86方法迁移。本批static/review通过只证明文档一致性。

| ID | 目标 | 证据要求 / 状态 |
| --- | --- | --- |
| CA01 | H同步projection、receipt/picker/transition/native/media epoch即时失效；旧scope回复不贴新库。 | owned caller-shaped tracer，再真实调用方；NOT_RUN |
| CA02 | draft保留identity/generation/input/base/writer/sequence，A outage不reclaim/自动save；后续输入仍dirty。 | tracer + 产品profile/CU另批；NOT_RUN |
| CA03 | work/download drain在hold前；多token/shutdown独立，lost quiesce/resume ACK不开门。 | coordinator夹具与真实caller；NOT_RUN |
| CA04 | revoke/configure/commit竞争按A fence线性化；Runtime callback即时关门，resource恢复不grant。 | A txn+controller受控测试；NOT_RUN |
| CA05 | claim或mark-sent ACK丢失零推理；NOT_SENT/max32/1claim/abort顺序保留。 | 真实域handler+stub推理，不真实模型；NOT_RUN |
| CA06 | 同MAIN effect/receipt，COMMIT前后lostACK、missing/corrupt/unmatched receipt、旧ID拒绝/new inspection。 | 每域受控handler，不以synthetic note代替；NOT_RUN |
| CA07 | committed后leaseinvalid/notify/refresh/draft-remove失败仍报已存，后续输入保留。 | 分阶段结果 + 用户路径；NOT_RUN |
| CA08 | caption可选baseline、notebook/source/revision、organization/workset txn与layout LWW差异。 | 真实CAS/rollback/lazyDDL/backup门；NOT_RUN |
| CA09 | Trash历史confirm/restore有限幂等、current另读；manualOCR用户编辑优先。 | 域handler+UI受控数据；NOT_RUN |
| CA10 | 推理unknown、storageunknown、resourceunknown三轴；outbox通知重投不推理。 | controller/outbox/资源矩阵；NOT_RUN |
| CA11 | Desktop/Browser异质envelope及403/409/损坏JSON；H在线A离线两端依赖门，脱敏。 | 正式transport/error/state桥接；NOT_RUN |
| CA12 | native work窗口暂不可读保dirty，不自动destroy；确定失效与显式关闭另验。 | native真实用户路径；NOT_RUN |
| CA13 | raw path/未注册ref/伪manifest/另一profile/过期selection不privileged open。 | synthetic ref拒绝仅协议；OS catalog另验；NOT_RUN |
| CA14 | 旧v1不添字段不迁移，新高版本旧reader拒绝；registration/store/material部分失败saga。 | owned版本/checkpoint夹具；NOT_RUN |
| CA15 | metadata/material分别资格，material同卷create-only/no-overwrite；拒绝cross-volume link/ protected对象ACL泄露。 | 文件链路与native OS分层，不改Original owner；NOT_RUN |
| CA16 | catalog/source/ancestor/owner/DELETE_CHILD/旧write-section能力/lifetime。 | 明确OS/principal范围获批后的真实反例；NOT_RUN |
| CA17 | P1 install/start/update/partial bootstrap/stop/repair/uninstall与实际loader/process/channel。 | bounded native/OS资格，非mock；NOT_RUN |
| CA18 | T2 H实际保护/能力交付与H失陷边界，无法证明转T3决策，不降T1。 | 具体威胁/actual-object证据+产品取舍；NOT_RUN |
| CA19 | 86方法/opener/DDL/trigger/reconcile/read-only/close迁移，无旧writer/global fallback。 | 完整真实连接闭包与回归；NOT_RUN |
| CA20 | 普通启动/可见入口、unknown核对/CAS/draft/重开、失败恢复、重复快速保存。 | Browser优先、系统行为Desktop补齐，受控profile/版本/截图；不能完成BLOCKED_UX_ACCEPTANCE；NOT_RUN |

## 11. 当前身份、失败与STOP

HEAD `b5cc954f90d248694aedc2d6ca1aa5188fa0aa11` / branch `codex/windows-workspace-1001`；本批当前raw tree/3文件diff/SHA绑定本机terminal-anchor，独立于actualbuild。实际产品build仍 `dam-4c583238a11c002d`，candidate tree `d08a5dd8d01db054c2e4c173577ee5109035572c`；没有新build。上一2026-10-05 tracer Electron30.5.1/Node20.16.0/ABI123/SQLite3.53.1 observation未重跑；产品Runtime最后实际观察仍2026-10-04，当前running app未观测；Pi source Node24.21.0/SDK0.99.1/pin99e47ca5…仍NOT_EXECUTED。

Windows强backup门、EBUSY原3次与3/72 owner/timing UNKNOWN、Router BUDGET_UNSATISFIABLE、Esc BLOCKED_UX_ACCEPTANCE、TASK历史23 missing links FAIL保留。没有降低门槛、删除失败测试或补造历史报告。本批不运行产品tests/Runtime/CU/模型，不更新TASK，不访问真实库/素材/账号/凭据/Runtime DB，不stage/commit/push/发布。

before为分散的协议/候选与同步facade概述；after为当前caller/CAS/unknown、双root/ownership、P/T候选及可审阅接线范围。**产品行为没有变化，当前缺口仍未修复。** [交接](../handoff/WINDOWS-CONTROL-COMPATIBILITY-20261005.md)给出完整身份和Remote锚点。`nextBatchAuthorized=false`，完成本批后STOP。
