# B2 Control Store 迁移清单与最小兼容协议草案

2026-10-05（Asia/Shanghai），WC01 已批准的下一设计批。**Target Architecture / DESIGN_COMPLETE / STOP**。本批只盘点当前 writer/reader/transaction、定义兼容草案和后续验收；不实现协议类型、Broker、OS 身份/权限、schema、安装或正式 Adapter。productionQualified/restoreAllowed/namespaceMetadataQualified/formalAdapterWired=false。方案与待决项不构成实施授权。

前置：[authority 主体/对象/lifetime 设计](WINDOWS-BACKUP-AUTHORITY-DESIGN-20261005.md)。本批事实和身份：[交接](../handoff/WINDOWS-CONTROL-STORE-MIGRATION-20261005.md)。上一批材料经 SHA 核对，当前代码再次读取；压缩包、旧 generated 和历史 PASS 不替代当前调用链。

## 1. 结论与迁移边界

B2 需要把 **全部 Active Control Store 物理 SQLite opener、DDL、读写事务、触发器、提交记录和恢复检查** 移到独立 authority A。Main H 保留业务权限、选择器、客户端范围、Provider/Runtime/资源判定、窗口与结果同步。H 不能保留另一份可写连接或绕到 global DB；新 A 不是给现有 `prepareBackup` 增加一个进程的 Adapter。

当前有86个 `ActiveLibraryHost` 方法。第3节逐一归入22族，覆盖公开和Main-only方法；bootstrap、两个瞬态只读 opener、锁 SQLite、schema helper、隐式 trigger 和 open reconciliation 在第2/4节补齐。静态发现扫描401个 `src/main` 源文件、101个 lexical matches，只是检索索引：`.prepare()` 也可能是业务准备动作，不能把数量当完整 SQL 或实接证明。完整方法映射与源码 SHA 在本批 `inventory-coverage.json` / `source-access-index.json`；细粒度调用与行号保存在本机三份 analysis。

当前实接分三类：正式 Host 持有的业务连接；同源创建/open/lock/validator helpers（有的文件名含 tracer，仍被正式调用）；未正式接线的 Windows backup qualification 模块。旧 global DB、App Storage、Connected/Eagle、Legacy readonly 和模型存储不迁入 B2。

## 2. 当前 opener、layout 与 authority 分配

| 当前入口 / 源码 | 当前事实 | B2 必须替换/保留的职责 |
| --- | --- | --- |
| `src/main/active-library-runtime.ts:10–23`；`library-lifecycle/active-library-host.ts:210–259` | Main 的真实目录/文件选择器，creation plan/review；未以原始客户端路径直接开库。 | H仍决定被批准的目标；A只接注册的 selection/catalog reference。选择一个路径不是授予 A 任意 privileged open。 |
| `library-lifecycle/library-materialization.internal.ts:46–124` | 新目录/claim、manifest、空业务DB、身份DDL与独立lockDB；随后另开连接做data schema bootstrap。不是一个囊括文件与所有初始化的SQL事务。 | A-owned creation/bootstrap状态机及可核对对象清单；保留missing/empty、create-only、异常恢复和失败原件。不能给旧库收紧ACL冒充新建保护。 |
| `library-lifecycle/library-open-inspection.tracer.ts:91–152` | open tracer自己开一份瞬态readonly业务DB并检查schema/identity/sidecars；还有legacy DB只读分类。 | active物理reader由A持有；legacy分类单列，不授权真实旧库迁移。 |
| `library-lifecycle/active-library-host.ts:620–655` | Host再开一份瞬态readonly检查，取得lease后于:644开persistent writer，FK/schema检查，open reconciliation，fresh notebookSession。 | 两份readonly opener与writer均迁移/退役，不只迁业务`.run()`。A-derived物理对象/epoch不能用manifest声明或H路径替代。 |
| `library-lifecycle/active-library-session.ts:118–151,185–208,310–366` | supplied connection被私有binding持有，再注入capture persistence；scope/lease与角色路径检查。 | 换成opaque A session与固定事务动作，不序列化Database、Statement、callback或lease closure。 |
| `library-lifecycle/exclusive-library-lock.tracer.ts:19,62–90,130–176` | 另一个`exclusive-library-lock.sqlite`；BEGIN IMMEDIATE协作排他，非MAIN任意writer隔离。 | A owns lock/lease物理对象，是否保留当前锁格式需决定；业务lease与OS权限分别验收。 |
| `library-lifecycle/active-library-host.ts:174–208,275–295` | `run`保持/重验lease并跟踪inFlight，不使所有操作互斥；lifecycleTail和mutationTail各自串行。当前close先drain→release lock→close business DB。 | 拟A close先停止admission、settle/reconcile、关闭business连接及已知引用，再释放对应session/exclusion证据；这是拟议顺序改变，不能当当前事实。 |
| `library-lifecycle/library-materialization.internal.ts:217–257`；`library-backup-snapshot.internal.ts` | readonly验证、内存expected-schema构建；Windows source/commit/recovery在private qualification链。 | 复用完整schema/FK/identity检查。`:memory:` schema builder不算第二个active文件writer；验证闭包仍需绑定native/source身份。Windows tracer不变成正式backend。 |

当前固定layout为selected root下`.dam/{library.sqlite,library.manifest.json,exclusive-library-lock.sqlite,required-previews,intake-staging}`，Originals另在root内。`library-layout.internal.ts:1–6`、`library-materialization.internal.ts:62–89`、Host`:621–625,692–696`固定重建路径。manifest只记录Control identity/schema和Originals relativePath，没有独立protected locator（`library-manifest.tracer.ts:58–64,145–149`）。Session`:333–345`与`library-filesystem.tracer.ts:84–120`要求Control/Originals在同root、同device且角色不重叠。Windows source`:19–37`绑定control/library.sqlite。

**推荐继续设计catalog-backed protected physical Control Store root，与用户素材root区分。** 普通用户若仍有祖先DELETE_CHILD/rename/WRITE_DAC，单独保护`.dam`不足。另一方案是保护完整祖先lifetime，但不能顺带改变Originals/Library root ownership。两者都未采纳或实测；外置Control会改变manifest/layout/locator/open/role/volume/source/identity与路径投影的兼容seam，需要明确批准，不能在helper内偷偷替换路径。真实旧库保持原对象，不修改owner/ACL，不关闭陌生handle，不追溯认证旧内容。

## 3. 86个Host方法的迁移清单

以下方法名均来自当前契约；族不是新的public channel。A=拟议物理SQL/对象authority，H=现有业务Host。`R`读投影，`W`写，`D`DDL，`F`文件saga，`M`内存权。详细当前caller/SQL/group见本机`tag-ai-inventory.md`、`lifecycle-inventory.md`、`protocol-analysis.md`。表中的改动均未实施。

| ID | 当前全部方法 | 当前读写、原子组与拟议分配 |
| --- | --- | --- |
| C01 | `inspect`, `prepareCreate`, `confirmCreate`, `open`, `reopen`, `close` | R/W/D/F/M。A owns全部opener/bootstrap/reconcile/close；H选择器、current readiness与切库业务。同步inspect只是H本地投影，断连须立即停止ready/admission，不冒充fresh DB/OS观察。 |
| C02 | `prepareAddAssets`, `dispatchAddAssets`, `inspectCapture` | R/W/F/M。H确认Copy与源选择；A owns batch accept/replay、candidate activation、Promotion及检查；见第4节多段saga，不能把batch完成当一个commit。 |
| C03 | `listAssets`, `searchAssets`, `readAssetContext`, `listTrash` | R。`active-library-asset-queries.ts:9–84`与Host`:343–363`，selected context≤500，list/search当前全量数组且search在H过滤。A固定coherent投影；不能默加分页截断。 |
| C04 | `listTags`, `searchTags`, `getTag`, `createTag`, `updateTag`, `createTagAlias`, `removeTagAlias`, `setTagParent` | R/W。`active-library-tag-metadata.ts:6–98`；alias+aliases缓存、parent relation+parent_id/cycle检查分别整事务迁入A。create/update当前单主SQL+前后reads，不夸成已存在统一CAS事务；expected字段和冲突语义保留。 |
| C05 | `addTagToAsset`, `removeTagFromAsset`, `batchAddTagsToAssets`, `batchRemoveTagsFromAssets`, `replaceTagForAssets`, `listAssetTags` | R/W。Host`:402–460`关系+asset更新时间+usage原子组；单remove删除该asset/tag全部relation，batch remove/replace只manual，不能统一成不同语义。A固定命名命令。 |
| C06 | `updateAssetCaption`, `resetAssetCaptionEdited` | W。Host`:461–475` caption optional expectedCaption CAS与user-edited flag；A保留用户修改优先，reset只由明确动作清编辑标记。 |
| C07 | `readPreview`, `readVisualSession`, `readVisualPreview`, `readManagedOriginal`, `measurePreviewColors` | R/F/M。Host`:364–395,589–593`；A选定当前metadata/source/revision，H按受控media grant读取/处理有限bytes并前后重验。Original reader Main-only，颜色测量不写DB；副本不变成Original。 |
| C08 | `readNotebook`, `saveNotebook` | R/W/D。`asset-notebook.ts:8–32` save在同txn查active/source/session/expected revision、显式allowUpgrade、DDL+upsert；read可读trash，write仅active。A whole transaction，保留冲突草稿。 |
| C09 | `readOrganization`, `writeOrganization` | R/W/D。`library-organization.ts:8–47`同txn查revision/member/folder约束、DDL、命令+revision++。folder move/delete是逻辑组织，不搬文件/删Asset。 |
| C10 | `readWorkSets`, `writeWorkSet`, `writeWorkLayout` | R/W/D。`work-sets.ts:9–38` set+ordered members+可选layout同txn；直接layout是独立single upsert。H窗口/device来源，A持久状态；删成员/set不删素材。 |
| C11 | `listIntakeRecovery`, `prepareIntakeRecovery`, `runIntakeRecovery` | R/W/F/M。Host`:297–325` binding-bound 5分钟receipt与显式重选源；`intake-recovery.ts:26–100`按精确state/source恢复。A计划/state，H source授权；activation/Promotion/variant completion多段。 |
| C12 | `prepareTrash`, `dispatchTrash`, `inspectTrash` | R/W。Host`:476,586–587`；`sqlite-asset-trash.adapter.ts:59–333` prepare在immediate txn含关系投影与plan；confirm lifecycle+immutable completed receipt同txn；restore revision check；inspect deferred txn。关系投影callback改A-local；不搬/删文件，receipt replay不读后来状态冒充原结果。 |
| C13 | `downloadJournal`, `importDownloadedImage`, `recoverDownloadedImage`, `saveImageVariant` | R/W/D/F。Host`:477–490,555–575`和managed-download/owned-image模块。A owns active intents/chunks/variant/metadata；H网络/codec/受控文件动作。下载来源不扩大权限；variant创建新Asset不改源。见第4节saga。 |
| C14 | `readTagIntentContext`, `readTagIntents`, `saveTagIntent`, `saveTagBatch`, `enableTagExecution` | R/W/D。`host-schema-maintenance.internal.ts:115–131,201–231`、tag intent/batch/schema；header+items/generation、DDL+seed/首写/可选private marker保持整txn；max8batch，forceRerun同requestId仍幂等，fresh request才新代次。 |
| C15 | `claimTagExecution`, `markTagExecutionSent`, `commitTagExecution`, `finishTagExecution`, `readTagExecutionRequest`, `readTagExecution` | R/W/M。Host`:493–511,523`与`tag-execution-storage.ts:47–140`；combined视觉history/caption条件更新+tag evidence/current+execution+effect receipt+outbox同外层txn。A owns live claim与持久attempt；claim不能由persisted row恢复为权限；mark-sent先于外部调用且不证明实际已发送。 |
| C16 | `readTagOutbox`, `ackTagOutbox`, `readTagRecovery`, `readTagEffectReceipt` | R/W。Host`:512–522`，pending LIMIT50，ACK单行；recovery reads≠reconcile writer。H通知，A receipts/outbox；至少一次delivery，eventId去重，ACK丢失不重跑推理。 |
| C17 | `readTagDecisionContext`, `decideTag` | R/W/D。maintenance`:177–198`、`tag-decision-storage.ts:7–35`；确认manual relation/tag/usage，拒绝family/content-specific事实，相关v11升级/decision可选marker同txn，不覆盖用户确认。 |
| C18 | `readBackgroundAnalysis`, `configureBackgroundAnalysis`, `changeBackgroundIntent` | R/W/D。maintenance`:157–174`、`background-analysis-storage.ts:9–38` policy/capability+revision与DDL原子；pause/resume/cancel显式状态。当前dispatchAvailable=false，不因配置/迁移自动模型执行或backfill。 |
| C19 | `readBackgroundOcr`, `configureBackgroundOcr`, `revokeBackgroundOcr`, `claimBackgroundOcr`, `markBackgroundOcrSent`, `commitBackgroundOcr`, `finishBackgroundOcr` | R/W/D/M。Host`:525–549`、maintenance`:134–154`与background-ocr-storage；choice审计非grant，grant绑定permission/runtime/session/intent。OCR evidence/state+attempt effect receipt同txn。同步H revoke+有ACK的A fence；UNKNOWN保留claim/资源。 |
| C20 | `readOcr`, `commitOcr`, `correctOcr` | R/W/D。Host`:594–596`、`ocr/ocr-storage.ts:8–32`自管txn，结果enable v8+evidence/state；correction evidence/revision/text≤16000或null。当前不走maintenance backup；同源result replacement保留edited_text，异源已编辑拒绝。 |
| C21 | `enableVisualAi`, `saveVisualAiEvidence`, `listVisualAiEvidence`, `confirmVisualAiTag` | R/W/D。Host`:524,577–585`、visual-ai-storage`:8–59`，旧schema视觉storage自管txn；v10 direct result/legacy confirm拒绝，combined走C15。A只实现仍允许的固定旧schema动作，不恢复第二条writer。 |
| C22 | `holdBusinessAdmission` | M。H即时本地token/独立release closure，不能序列化Symbol/function。A额外quiesce/drain fence；release资源/某个cycle不释放别的cycle或恢复撤销业务权。 |

## 4. 容易遗漏的writer、事务和文件事实

1. **全部schema链**：v1 bootstrap及v2 visual、v3 download、v4 intake/variant、v5 notebook、v6 organization、v7 worksets、v8 OCR、v9 intents、v10 execution、v11 decision、v12 background、v13 OCR permission均在closure。v9 helper会折叠早期DDL（`independent-tags/tag-intent.schema.ts:49–61`）。v2–8 standalone路径不都走backup；未来统一资格策略属于另审行为/兼容变化，不能误称当前已统一或随意绕过当前v9+backup拒绝。
2. **隐式writer**：`background-analysis.schema.ts:27–36` AFTER INSERT asset_lifecycle enrollment在Promotion事务内；不能拆成异步RPC。Host`:652`的`reconcileTagExecutions`在open ready前写running→paused或outcome-unknown，见`tag-recovery-storage.ts:7–12`；这是open writer，不是readTagRecovery副作用。
3. **claims与SQL**：当前tag claim的Map在transaction callback里改变，不受SQLite rollback保障。拟A在持久claim commit成功后才交付opaque capability，明确claim ACK丢失和新session reconciliation；最大32tag claims、background OCR1 live claim等现有界限保留。
4. **Capture真实多段**：accept整batch requests+candidate txn → 文件copy/staging/no-overwrite hardlink → activate txn → preview文件 → Promotion单txn assets+candidate+promotion_link+lifecycle（含trigger）。Complete只验证已promoted，不做最终batch写；Candidate仍不是Asset。任何RPC或ledger都不能把文件copy与SQL变成同一个atomic medium。
5. **owned import/download额外段**：owned-image stage与variant intent前后独立；Promotion后assets metadata和variant completed是单独语句。download importing→owned capture→completed也在Promotion外；append先chunk文件sync/验证，再CAS committed_bytes+chunk row同txn。cleanup先unlink再删row；失败可留下文件或缺文件row。必须分别分类，不以一份receipt宣称端到端原子。
6. **当前cleanup限定**：Capture的`safeRemoveInsideRoot`（`capture-gateway.ts:310–322`→`platform/filesystem-guard.ts:77–85`）只保证resolved containment后recursive fs.rm，不是exact-owned-object cleanup资格。B2未来必须限定具体已认证对象/最终目标、保留unknown replacement；本批记录差异，不修源码、不执行清理。
7. **Journal不是万能saga**：当前`library_operation_journal` open只接受settled；Windows private commit marker是其writer，Capture/Trash/download不已使用它作为通用saga ledger。新protocol receipt/file checkpoint/retention需要schema方案审批，不能把现有128-row settled门改成自动清空或随意pending。
8. **epoch不是generation**：generation存于Control身份；notebookSession每次open新建。A instance/channel/session/store/lease epoch分别绑定实际lifetime，不擅改persisted generation定义。所有domain revision保留各自数值/opaque类型和冲突次序。

## 5. 明确排除的数据库与路径

`src/main/db/index.ts`没有active dispatch。11个非测试direct getDatabase consumer为旧`ipc/{asset,ai-worker,path-governance}.ipc.ts`、`services/{asset,asset-tag,tag,tag-search,ai-client,ai-task,color-palette}.service.ts`、`services/text-detection/qwen-vl-text-box-provider.ts`；旧registrars没有在current index/Main composition接线。path-migration executor的global setter/reopen与测试/mock另列。不能把global getter改指A而暗中恢复旧channel。Active facade仍拒绝assets:delete/path迁移/prompt reverse。

正式App Storage database用于download history/device/OCR Runtime配置（`index.ts:351–354,572,578`、`app-storage/app-storage.ts`）；active managed_download_intents/chunks却在Library Control Store，二者不得合并。Connected/Eagle独立index/journal、LegacyReadOnlyWorkspace显式readonly旧DB、Model Library/Runtime数据、Pi/provider/credentials、workspace drafts与真实窗口均不迁入A。shared `db/schema.ts`只共享DDL声明，不是global connection dispatch。Source SQL/文件声明被读取不代表实际库、模型或进程已读取/运行。

## 6. 最小兼容Interface草案（私有、未实现）

Renderer→preload与Browser→Main继续使用现有命名业务动作、sender/card/owner/CSRF权限链；C不能直接接A。H内部用一个有限domain dispatcher代替raw Database，各事务handler在A-local实现。接口包含类型、顺序、状态、错误、限额与信任前提；不是一个generic SQL proxy。

### 协商与session

| 动作 | 拟议输入 | A事实 / 必须拒绝 |
| --- | --- | --- |
| hello | protocol major/minor range、mandatory feature集合、H instance nonce、role、限额期望 | 返回协商版本、fresh A instance/channel epoch、固定feature/schema范围、limits profile、identity的证据等级。major/mandatory不兼容拒绝；leaf SHA/PID不提升nativeLoadedIdentity。无local/global fallback、自动安装或自动升级。 |
| attachLibrary | 已批准catalog/selection reference；expected identity/generation仅作比较 | A解析protected对象、actual schema/source/lease，发session capability与store epoch。当前原始目录不能直接作为privileged pathname参数；旧库接纳/新layout/provisioning另批。 |
| invokeDomain | 固定verb/version、session、operationId、per-domain payload/preconditions、业务许可purpose/epoch | A在本地固定handler重新检查scope/identity/schema/revision/lease/grant并执行完整事务。不接SQL、DDL字符串、外部path/digest作权威、JS callback、process/token/Job handle、loader cmd/env。 |
| inspectOperation / readProjection | 当前授权session、旧operation reference或固定read verb | 返回有限当前facts/receipt/projection，不能把历史receipt恢复为执行grant；无absence⇒no-effect推论。 |
| revoke / quiesce / cancel / close / settle | 精确session/epoch/operation/fence | 分别返回A已应用的撤权/排空、actual commit outcome与physical settlement；不能把kill、Node close、receipt或disconnect等同release。 |

拟议common envelope：`protocolVersion/featureVersion`、`authorityInstance/channelEpoch/sessionCapability`、稳定`operationId`、connection-local `sequence/revocationEpoch`、library identity/generation/schema比较、固定`verb`、typed expected revisions/A-issued source reference、purpose-bound business permission、deadline/cancellation reference。A自己derive canonical payload digest/source/store identity，不接受H自报committed。能力不进log/文档/持久化恢复；requestId只是幂等键不是权限。

payload limits首先复用当前domain validators（8batch、500context、20/50records、16000correction等），全部frame/copy/materialization需执行前resource permit。统一frame/total/retention生产profile尚未合格；未知拒绝，不借1MiB backup image上限声称所有projection已有1MiB限额。后续synthetic tracer可设明确更小profile，但不得据此改变正式list语义。

### 事务、receipt与幂等

拟state：received→admitted→prepared→transaction-running→committed→settling→released；另有verified-no-effect/verified-rollback、commit-known+settlement-unknown、commit-observation-unknown。response分列DB outcome、ACK、domain result/receipt、source/schema/epoch、backup/resource/physical settlement、安全错误类别。不能用一个success boolean掩盖多个轴。

所有成功write的protocol receipt必须与该domain write/revisions/相关outbox/maintenance marker在**同一A-owned SQLite transaction**。A COMMIT返回即记committed，ACK/设置/finish失败不改rollback。若新增`authority_operation_receipts`，需要schema/版本/容量/retention审批；它目前不存在。单独另一数据库的log或postcommit marker不证明同事务提交。不改现有settled journal，也不偷偷将128容量门放宽。

相同operationId+scope+canonical payload只能返回pending/已授权receipt，不重复effect；不同payload冲突。expired或retired session不执行旧请求；新授权只允许有限receipt inspection，不能复活旧claim。retention到期必须以epoch floor/tombstone或明确旧请求拒绝保持replay安全，容量未知/满不能自动purge或自动重执行。只存必要effect identity/revisions，结果按当前权限重新投影，避免持久化敏感完整payload。

目前已有domain idempotence不被重写：tag intent/batch、tag effect、background OCR、Trash receipt各按现有canonicalization/replay规则；tag effect先查stored receipt再检查abort，background OCR先abort再查succeeded，次序不同。统一write handler不能抹平它们。manual OCR尚无generic operation receipt；新增receipt是未来设计变化，不能称其当前可安全盲重试。

### 撤权、claims和同步兼容

H的`inspect()`、`holdBusinessAdmission()`、`revokeBackgroundOcr():void`继续作为即时本地门；H先停止发送/写准入，再按序请求A fence，并在内部依赖点等待ACK。A在自己的sequencer线性化cancel/revoke/COMMIT：A已应用撤权后禁止新的相关commit；若COMMIT先赢则报告已提交。H void返回不等于A已撤权，ACK未知期间不恢复admission。绝不在better-sqlite3同步transaction callback里await RPC。

A owns live storage claims/grants，H只有不透明引用及本地业务cancel/resource state。claims在A restart/reopen/epoch变化时失效，DB audit choice/attempt不是bearer grant。open reconciliation保留NOT_SENT与sent/outcome-unknown差异。mark-sent ACK未知即外部执行权限不确定，先inspect，不通过重新调用Provider修复。Main外部推理权限、模型资格与资源共享ledger仍独立；A迁移不授权任何Provider/订阅/下载/模型运行。

通信断开/超时/truncated reply：H停write/send、保留草稿，按现有Browser reconciliation入口和当前授权session查actual operation结果。missing/corrupt/unmatched receipt保持unknown。只在明确no-effect/rollback、新source/revision和fresh许可下考虑显式retry；known committed仅查询receipt。通用failure若让旧caller自动重写或宣称“未保存”，不得静默映射；需审议现有error/unknown guidance兼容seam。

### reads、media和outbox

A固定读投影在需要一致性时使用coherent snapshot/derived revision。当前listAssets/listTags/full workcatalog不是公共分页；内部cursor需固定排序、snapshot/epoch/expiry、byte/item/copy预算，H只在许可预算内组装完整旧结果。mixed/stale pages拒绝/reconcile，不拼成假完整列表、不静默截断。新增public paging/error/limit需另审。资源不足不能冻结基础无模型产品的无关能力。

media单独保持asset/source/revision/preview/ownership条件与授权bytes；current assets中的paths需要未来projection/locator适配，不能给C raw privileged file reader。保护Control DB不自动认证外部或Managed Original/preview文件；未受保护文件最多检测/拒绝。若protected staging/preview与H codec拆进程，具体受限transfer/file-action grant由A产生并验证实际对象，H不能因SQL迁移获得整个protectedroot写权。

现有outbox LIMIT50、delivered单bit可保留；拟A read发session/page/event-bound ACK receipt，H先await通知后ACK。publication/ACK可重复，以eventId去重，未ACK保留pending。不能声称exactly-once UI呈现，也不重跑推理补通知。多consumer持久cursor是额外schema政策，当前没有。

## 7. H endpoint与OS principal/provisioning待决选项

| 项目 | 候选 / 明确限制 |
| --- | --- |
| P1 独立服务身份 | preinstalled native A、service identity/SID或virtual identity；owner/token/process/祖先完整权限证明。安装/SCM/升级/卸载/资源成本需具体批准，不以service名称或新SID自动成立。 |
| P2 独立专用账号 | 能明确分离owner，增加账号管理/秘密/安装成本；本批不创建/读取凭据。权限和process/namespace仍逐对象证明，非“有账号就合格”。 |
| P3 同用户restricted token/AppContainer/提升进程 | 可作有限防御研究；单独不证明独立owner、既有能力撤销或H/namespace保护，不能自动替代B2强目标；不提权试验。 |
| T1 协作可信H | 明示H/会话能力失陷排除，只论证U raw object isolation；不能借此缩减原目标取得生产资格。 |
| T2 保护H安装/启动/进程/channel | purpose-bound能力交付、阻止VM_READ/WRITE与DUP_HANDLE、完整loader closure；H身份仍不单独证明人类意图。具体OS机制/部署未选。 |
| T3 A拥有受信任consent表面 | 可讨论独立意图来源，须可信display/input、payload冻结、一用能力/replay绑定。产品成本和Main业务authority职责变化另审；本批不加UI或强制新提示。 |

本草案定义protocol，不默认采用P/T任一项。Main当前DACL/token/loader closure未测；SID/PID/hash、Electron sender与Browser CSRF都不证明H→A真实用户意图。无可信principal/bootstrap/endpoint/namespace证明时，protocol只可作synthetic Validated Tracer，不能claim B2生产隔离。强source目标保持，不通过T1语言降级刷绿。

## 8. 未来兼容验收清单（18项，全部 NOT_RUN）

| ID | 必需验收 / 当前状态 |
| --- | --- |
| MP01 | 86方法及bootstrap/readonly/lock/schema/trigger/open reconcile闭包；正式H不再raw打开A MAIN，不借global getter旁路。NOT_RUN |
| MP02 | protocol/feature/schema mismatch、未知mandatory字段、oversized输入执行前拒绝，无自动fallback/upgrade。NOT_RUN |
| MP03 | authority/channel/store/session/lease epoch与library/generation/revision/source comparison；旧capability/replay/ref绑定拒绝。NOT_RUN |
| MP04 | complete txn group与same-MAIN protocol receipt，COMMIT前/后失联；无新effect retry，missing不推no-effect。NOT_RUN |
| MP05 | DDL+first-write、trigger enrollment、nested combined/OCR group、same txn marker不拆RPC；v2–8 policy差异明确批准。NOT_RUN |
| MP06 | local即时gate、A revoke ACK fence、concurrentcancel/commit、close/drain/reconnect；void不作远端生效证明。NOT_RUN |
| MP07 | claim commit后交付、claimACK丢失、NOT_SENT/sent、A/H restart不恢复grant、未知external outcome不再发Provider。NOT_RUN |
| MP08 | tag/OCR/Trash各现有幂等次序、sameID-differentpayload、forceRerun、expiredretention拒绝，不自动purge。NOT_RUN |
| MP09 | outbox publish/ACK丢失、duplicateevent/issued-page-ack membership；保留至少一次与delivered语义。NOT_RUN |
| MP10 | current完整list、stable bounded snapshot pages、mixed/stalepage、resourceunknown、公共返回/error兼容不截断。NOT_RUN |
| MP11 | notebook/OCR用户编辑、caption CAS、manual vs batchremove、confirm/reject、organization/workset关系保留。NOT_RUN |
| MP12 | Capture各checkpoint失败/replay、Original不变、Candidate未Promotion不当Asset、trigger同txn。NOT_RUN |
| MP13 | download chunk文件↔SQL分段、orphan计账、metadata/intent finalization、cleanup缺失/unknown对象保留；无端到端atomic假称。NOT_RUN |
| MP14 | current .dam vs protectedcatalog locator/manifest/layout/native source/readonlyreader binding；祖先DELETE_CHILD与旧handles反例，真实旧库不触碰。NOT_RUN |
| MP15 | file-action/preview codec transfer预算和权限，只给具体object，不给H整个A root writer；path-only cleanup不升级资格。NOT_RUN |
| MP16 | prepared/held/commit-known settlement-unknown各轴、全部knownphysicalclose/Job/I/O释放，资源恢复不恢复业务权。NOT_RUN |
| MP17 | P/T主体、安装/更新/actual loader/namespace权限和scope真实区分；普通sameuser protocol成功不算B2强隔离。NOT_RUN |
| MP18 | error/unknown guidance、断连重读、草稿保留和实际客户端交互；正式接线后按RUX浏览器/桌面另验。NOT_RUN |

这些场景不替代前批33项native/OS矩阵或durability测试。未来纯合成protocol tracer可验证MP02–13部分结构/时序；P/token/ACL/service/install、新native/真实库/publicschema/正式Adapter、durability和CU各需对应具体授权和资格。当前3/72首次EBUSY与旧失败、UNKNOWN accounting、Router BUDGET_UNSATISFIABLE和历史UX block保持。

## 9. 后续最小切片与STOP

建议下一批：**不接正式产品的受控合成双进程protocol tracer**，只使用全新owned合成Control Store，验证一个固定domain transaction+同事务operation receipt、COMMIT前后ACK丢失、查询结果与有ACK撤权顺序；同用户隔离仅证明协议，不声称独立principal/B2隔离。先给出明确fixture schema、进程/bootstrap/ABI、资源与cleanup限额、允许命令和验收。该建议尚未执行/自动授权。

生产P/T选择、protectedcatalog/layout/manifest及全部writer迁移仍需后续架构批准；真实旧库迁移/Original mutation/Provider和发布不在此链条自动获权。本批独立复核完成后停止，保留当前源码/失败/安全门，不commit/push。
