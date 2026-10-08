# Windows backup authority：主体、对象与生命周期设计

2026-10-05（Asia/Shanghai），WC01 已批准的设计批。状态：**Target Architecture / DESIGN_COMPLETE / STOP**，未采纳生产政策、未获 OS 资格、未实施 Broker、token、ACL、service、account、安装或正式 Adapter。`productionQualified=false`、`restoreAllowed=false`、`namespaceMetadataQualified=false`、`formalAdapterWired=false`。

## 1. 决策与范围

保留强 source writer 隔离目标，推荐继续评审 **B2：独立受保护 authority 拥有 Control Store 的全部物理写入与唯一 SQLite 事务**。B1 只能保护新 snapshot / 执行资源；A 只能提供协作 Host 下的固定镜像和检测。不能用 A/B1 悄悄缩小目标，再给当前 Windows backup 放行。

这是设计建议，不是 Accepted ADR。B2 改变当前 Main-owned connection、直接 SQL 调用和存储提交权威，是需要明确批准的架构、ownership 与公共兼容 seam 取舍。Main 继续决定业务动作、scope、用户许可、用户状态与结果同步；拟议 authority 才持有经过批准的物理对象、connection 和原子提交。真实旧库迁移、Original / Managed Copy / Eagle ownership、Full Library Backup、恢复写入及 macOS 均不在本批。

本批交付 threat contract、机制候选、窄接口、失败分类和受控测试计划。所有未来测试均 **NOT_RUN**；本批没有创建或修改 OS 身份、权限、对象保护策略或产品源码。当前实施事实仍来自 [2026-10-04 交接](../handoff/WINDOWS-BACKUP-BOUNDARY-20261004.md)，本批静态复核与终态见 [2026-10-05 交接](../handoff/WINDOWS-BACKUP-AUTHORITY-20261005.md)。

## 2. 当前源码与计划的差异

本轮重新核对实际 workspace，未把压缩包摘要、旧 ADR 的 current 段落或历史 PASS 当作本轮事实。代码和既有产物的 SHA 复核见本批 `current-source-audit.json`。

| seam | 当前真实行为 | 设计约束 |
| --- | --- | --- |
| 正式 composition | `active-library-host.ts:533–541` 使用默认 maintenance storage；`tag-intent-backup.ts:49–51` 在 win32 的 backup/status/DDL 前拒绝。 | 私有 Windows 模块和集成测试不是正式 Adapter。Windows NTFS volume qualification 支持基础 Library 路径，不授予 backup 权限。 |
| lease / connection | Main 持有 better-sqlite3 connection；业务 admission 关闭、drain、实际 lease 串行执行 maintenance。lock DB 的 BEGIN IMMEDIATE 约束协作 Host。 | 协作锁不隔离所有 kernel writer。B2 必须盘点并迁移所有 Control Store writer，不能只迁 maintenance 后仍让 Main raw-write。 |
| source / VFS | legacy actual MAIN binding、named journal VFS 与 helper source-hold 允许 WRITE share；相关 I/O 前检查 file / metadata / connection。 | 有限检查属检测，不提供整个区间的 arbitrary-writer isolation；check→IO 仍有窗口。不得机械移除 SHARE_WRITE 当作完整修复。 |
| snapshot / lifecycle | 实际顺序：reserve → createImage → runTarget(image) 传输 → HELD / 同句柄 native readback SHA → verifyImage(image,SHA) → ready。 | 当前没有“完整 verifier 后才传输”。未来若变更顺序须明确验证真实 cut；readonly 内存 DB 复制内容不冻结原 caller Buffer。 |
| complete verifier | `library-backup-snapshot.internal.ts` 验证原期望 SHA、身份/generation/schema、完整 control/data schema、FK、readonly/query_only 和真实内存事务，限 1 MiB。 | 复用完整 checker；固定镜像需要内部独占 ownership，不能改成宽松 schema / hash checker。 |
| commit | `host-schema-maintenance.internal.ts:90–110` 在同一事务内写 DDL/业务；若私有 qualification storage 提供可选 recordCommit，marker 也在该事务内写入，正式默认 storage 不产生 Windows marker。transaction 返回后先标 committed，再恢复设置/ACK；finally await finish。 | ACK / finish 失败不改判 rollback。B2 不允许本地事务与远端 marker 分裂。 |
| recovery | actual held MAIN 的 fresh readonly transaction 可读 current recorded-commit；finished 仍只是 commit-claimed。 | 能任意写全部存储的攻击者可构造 schema-valid marker；当前记录不是 writer-authentic provenance，restore 始终 false。 |
| loader / release | guardian 的 Node close、Supervisor retained PROCESS / Job 观察、Host PSS 各有不同覆盖；module 核验是实际地址对应 pathname。 | post-load hash/receipt 不能撤销已执行代码；PROCESS signaled 不证明每个普通 CloseHandle 返回成功。旧 release/destructor 部分关闭返回未检查，资格仍待补。 |

受 backup gate 影响的是需要升级的具体 maintenance：tag intents <9、execution 9→10、tag decision <11、background analysis <12、OCR permission 12→13。无需升级的已实现 Windows 基础业务不能被描述成全部拒绝。当前最高 Managed schema=13。

## 3. Threat contract

两个目标分别验收：**禁止 raw bypass**（不受信任进程不能任意改受保护源/备份/代码/namespace），以及 **业务请求授权**（连接 endpoint 不等于可以请求任意合法动作）。保护文件或认证 SID/PID 不自动证明真实用户意图。

### 主体

| 代号 | 定义 / 本批状态 | 需要证明的边界 |
| --- | --- | --- |
| H | 当前可信 Main，拥有业务授权；B2 中拟成为存储请求者。 | sender、session、generation、revision、revocation、用户授权仍逐动作验证。当前 H 实际 process DACL/token 未读取，不能断言 same-user 必可注入，也不能断言已受保护。 |
| U | 与 H 同登录用户的普通、无关进程，非 H 内部代码。 | 用实际 token/SID、groups、integrity、privileges 和每项 granted access 区分，进程名称不构成身份。 |
| E | 保护声明之前已取得可写 file handle、metadata/security/delete handle 或 writable section/view 的 U。 | 后改 ACL/READONLY/关闭一个 handle 不作旧权撤销证据；已有引用生命周期独立记录。 |
| C | 不受信任 consumer/client，可与 U 同身份。 | 最多获得有界只读结果/副本，不获得 raw SQL、任意路径、可写句柄或 authority token。 |
| A | 拟议独立受信任存储 authority，尚未选择/创建 OS 身份。 | 与普通用户隔离的对象 owner、token、process/thread/pipe/section/Job rights 及最小业务协议；不同 SID 本身不足。 |
| B | 明示信任的 OS/bootstrap/安装与更新闭包。 | 来源、实际执行身份、版本/epoch、保护 namespace 与 dependencies 在首代码执行前成立；新 DLL 不能先执行来认证自己。 |
| X | admin/SYSTEM/kernel/offline/raw-volume、恶意 H/A 进程内代码。 | 本方案的普通 U raw-writer 隔离不覆盖这些攻击。扩大边界需新设计和授权，不提权来补测试。 |

**尚未解决的授权信任**：若 U 能读取/修改 H memory、窃取 session capability 或替换 H 的可执行依赖，则仅认证 H 的 SID/PID/hash 无法排除合法 verb 的伪装请求。必须另行选择可信授权表面/能力交付与 Host/process/code 保护，或显式限定 Host compromise 不在保证内。该取舍未采纳，不能在设计中把“可信 H”当已证明的本机事实。FILE ACL 不代替 process security；即使不授 VM_WRITE，DUP_HANDLE 等权利也需独立分析。

### 对象

| 对象 | 内容 | B2 authority / lifetime 目标 |
| --- | --- | --- |
| O1 | mutable MAIN / Control Store | A 唯一物理 writer / connection；正常命名业务事务仍可写，不叫永久 immutable。 |
| O2 | journal / wal / shm / lock 槽位 | A 创建和使用，保持 DELETE profile、拒绝不允许的 attach/WAL/hot sidecar；锁语义与 OS 隔离分别成立。 |
| O3 | captured Buffer、native verifier copy、transfer copy | A 内部唯一 ownership，所有副本入预算；验证到消费结束无不受信任可写 alias。 |
| O4 | stored target、binding/backing/verified/finished | 新建、从未向 U/C 暴露 writer；创建/写/flush/readback/封存/留存/重启后读取各有 epoch。 |
| O5 | executable / DLL / NAPI / managed assembly 与依赖 | B 的受保护安装闭包及实际 OS loader consumer；禁止 user-writable Temp bootstrap 提升为生产信任。 |
| O6 | drive 到 control/backup/install 的 ancestors、namespace、security descriptors | 从可信根起逐对象验证 owner、inheritance、DELETE_CHILD/rename/reparse/WRITE_DAC/WRITE_OWNER；leaf pin 不代替 ancestor 保护。 |
| O7 | H/A/guardian/worker process、thread、Job、pipes、tokens、ledger | 明确创建、inheritance allowlist、资源预许可、实际进程实例与每个已知能力的释放责任。 |

### 生命周期

T0：首 preparation allocation/bootstrap 前；T1：新对象首次安全描述符/继承及任何 writer 暴露前；T2：source open/qualification；T3：serialize、transfer、readback、complete verifier 的各真实 cut；T4：ready/HELD 到 DDL；T5：actual COMMIT 到 ACK/finished；T6：close 请求到 kernel PROCESS signaled、Job empty、pending I/O settled、所有已知引用释放；T7：新 owned process readonly restart inspection；T8：留存到下次消费/恢复许可决策。

O1 正常业务写入不被禁止到 T8。O3 固定镜像保证只覆盖其声明的 capture→consumer lifetime；O4/O5 若宣称留存安全，则不能在 T6 解锁后停止资格论证。首次 allocation、首 load 与释放后读取均不能落在声明空隙中。

## 4. A / B1 / B2 比较与建议

| 方案 | 可以论证的目标 | 缺口 | 决策状态 |
| --- | --- | --- | --- |
| A：协作 Host + owned-memory snapshot | 现有业务 lease、完整 snapshot、同事务 marker、有限 source 检测与资源 settlement；改进内部 byte ownership。 | arbitrary same-user writer、metadata/namespace、Host compromise、首次 loader/依赖和释放后保护不成立。 | 仅备选。若要降级产品承诺须明确决定；未获得生产资格。 |
| B1：独立新 snapshot/artifact authority | 新建 O3/O4/O5/O6/O7 从创建起隔离特定 U/C 权限，可作有限子范围。 | 当前 user-owned MAIN、Host capture、source marker 与客户端意图仍不可信。 | 不能替代强 source 隔离；本批未实施。 |
| B2：独立 Control Store authority | 从新库创建起，O1/O2 与 snapshot、marker、storage namespace 全部由 A 持有并原子提交；U/C 无 raw bypass。 | 全 writer/reader/lease/协议迁移、H endpoint 信任、安装更新、准备资源、release 与 durability 均须另验。 | 推荐作为保留强目标的 Target Architecture，尚未选择具体 OS principal / provisioning。 |

最小风险起点是**全新合成 Control Store**，从创建前就不向 U 暴露 writer。真实旧库接纳是单独 inspection/copy/ownership migration：不能靠收紧旧 DACL、rename 到保护目录或扫描全系统句柄撤销历史能力；也不能追溯认证旧内容。若源在复制期缺乏可信隔离，只能声明导入 bytes 的结构/身份检查，不能声称历史无篡改。当前对象和原件不改 owner，不强关陌生进程句柄。

## 5. 拟议 native / OS 设计

A 应是预安装的小 native authority，固定必要业务、SQLite/verifier 与受保护依赖闭包；是否静态链接、服务 SID/virtual identity/账号、安装权限和更新策略仍为待定项，不提供可直接执行的 SDDL 或 provisioning 脚本。减少动态代码面有利于审阅，但不消除 OS/CRT/API-set 等依赖。

O1/O2/O4/O5/O6 在 T1 即由受信任独立 owner 和明确安全描述符创建；不能先在 user-owned Temp 生成再靠移动推导权限。目录和 child file 分别检查，创建/更新 inheritance 有明确政策。排除 U 的 data/append/truncate、attributes/EA、reparse/sparse/compression/zero-data、DELETE/DELETE_CHILD、WRITE_DAC/WRITE_OWNER，以及可转授这些能力的 owner/groups/privileges。实际可行性须由后续未提权正控制与反例测试证明；本批没有取得这些保证。

authority process/thread/token/section/Job/pipe 是独立 securable objects：排除 U/C 可改 memory、remote-thread、duplicate 能力、security/token 控制；handle 不随继承泄漏。测试先限 descriptor / handle-open，不实际注入代码。Host 接收只读结果不接可写 file/section/process/Job/token handles；任何必要 duplicate 必须绑定准确 process instance、来源对象和降权结果，数字 handle 不作可信输入。

标准 OS loader 启动固定受保护 executable。依赖 policy 包含 normal/delay imports、loaded-module list、SxS/API sets/Known DLLs、CWD/PATH/environment/config、plugins/SQLite extension 与更新 epoch。绝对主 DLL 路径、签名、leaf SHA、`SetDefaultDllDirectories` 或 load 后 module pathname 均不是完整闭包证明。`LoadLibraryExW.hFile` 必须 NULL，不能把 guardian file handle 直接塞进它；DATAFILE_EXCLUSIVE 不是 executable loader 替代品，不采用手工 PE mapper。

首代码执行前必须建立可信 bootstrap、安装 epoch、保护 namespace/对象及可接受的真实 loader 选择。实际 process image/module/assembly 与认证 closure 的绑定仍须 native 证据；无法取得时只报告 `modulePathObserved`，`nativeLoadedIdentity=UNKNOWN`。后验发现拒绝只属 DETECT_REFUSE，记录 initializer/注册已执行，不能 unload 后宣称 PREVENT。

## 6. 小接口、事务与状态机（仅设计）

客户端仍表达现有命名业务意图。Main 先校验 sender/session/generation/revision/allowUpgrade、用户许可与 revocation epoch；关闭 admission、drain 并保持业务 lease。resource permit 与 business grant 独立，恢复资源许可不恢复已撤销业务权。

拟议 Main→A interface 只有固定 domain operations，没有任意 SQL/path/digest/loader path/cmd/env、JS callback 或 caller 提供的 committed boolean。Library reference 由 A 注册并导出实际对象 identity，不信任 caller pathname 作证据。以下名称未加入类型或 API：

| 动作 | 输入 / authority 行为 | 结果与限制 |
| --- | --- | --- |
| prepareMaintenance | 内部 Library reference、named intent、期望 revision/schema、当前授权 epoch、固定 growth/resource profile。A 自行绑定 source/library/generation 与内部 operation。 | 不透明 session/operation capability；只能在本 operation 使用，不跨 restart/generation/revocation 重放。 |
| executeMaintenance | 仍有效的 operation；A 内部固定 domain handler 完成最后 source/space/许可检查。 | 同一 A-owned connection / transaction 执行 DDL、业务写与 marker。返回 committed / refused-before-commit / commit-observation-unknown；不把“recordCommit 被调用”当 COMMIT。 |
| cancel / settle | cancel 撤销未提交业务许可；settle 等待原 operation 的物理终态。 | actual commit 不因取消/ACK丢失回滚；unknown release 保留 ledger，不能重新 prepare 冒充新干净 operation。 |
| inspectRecovery | 已授权 Library session、可信 capture binding、A fresh readonly actual source。 | snapshot 分类、current recorded commit、ack/physical-release 各自状态；无 restore、repair、overwrite 或 migration 权。 |

B1 可在将来私有适配 `PreparedHostBackup`；B2 不可把远端 marker 接成当前本地事务之外的可选 callback。当前 Main 直接 write() seam 必须提升为固定领域事务，全部 writer/reader 盘点后另批审阅。schema/marker 若要加入 authority epoch 或可信 log，是额外公共 schema/ownership 决定。

拟议顺序：T0 准备许可与可信安装核验 → T1 新对象/权限成立 → T2 A source connection 与业务 lease → T3 有界独占 image、完整 verifier、同一 bytes 的写/flush/readback → T4 target held/预提交重新检查 → T5 同事务 commit，先记实际 DB 结果再 ACK → T6 finish/每项 physical close/Job/I/O settlement → T7 fresh readonly inspection → T8 retention。

这里选择“完整 verifier 先于 target 传输”为**拟议改变**；当前顺序见第2节。若仍使用当前先传输后 verifier，必须由 A 独占 image，全程预算覆盖，并在未验证前禁止 DDL/发布；测试需按真实 cut 实施，不混报。

Snapshot 内部完成写阶段、flush/readback、所有 RW handle/view 收敛后，才给只读 consumer 或发布封存状态；未知关闭进入 UNKNOWN。authority 可在写阶段持有唯一 writer，不能交付 reader 后保留未声明 writer。完整 checker 验证同一 byte sequence 与 A-derived declaration；SQLite readonly/native copy、Buffer 类型 readonly/freeze 不代替 ownership。

提交事实、ACK、target/status、资源释放四轴分开。before-commit 拒绝不提交；after-commit ACK丢失仍 committed；finished 只代表声明。malformed/missing/mismatched status 不反推 trusted binding。任意 writer 尚未隔离时，只能报告 `recorded-current / commit-claimed / unproven`，不得授 writer-authentic provenance。恢复永不自动覆盖 source。

## 7. 资源、物理释放与失败分类

现有初始界限保留：image≤1 MiB，12 copies，helper256 MiB/Main64 MiB，OS free reserve=max(512 MiB,total×10%)；named MAIN≤5 MiB、journal≤2 MiB、128 transactions；probe≤64 sessions、每 path≤64 components、单写/zero≤4096 bytes。新准备阶段、nativecopy、启动/pipe/验证/settlement均需 allocation/执行前许可，不能用当前 target permit 宣称覆盖 compiler/guardian/first load。

128 MiB/process、256 MiB/Job 是已有 tracer 的 private commit hard limit；RSS 只为 postexit high-water。不存在 hardRSS 资格。新 A 常驻或新进程必须单独核算预算、第一条代码前创建约束及整个 lifetime，不借历史 Job receipt放行。

| 分类 | 判定 / 后果 |
| --- | --- |
| PREVENT | 具有具体权限的攻击者在声明 cut 尝试，effect 前拒绝，且无保护正控制有效；覆盖只能限指定 principal/right/object/lifetime。 |
| DETECT_REFUSE | effect 已发生，后续可信检查拒绝；保留已写 bytes/已执行代码和副作用，不升级为预防。 |
| COPY | 独立固定副本与随后 source/caller mutation 分离；不能授 source interval immutable 或磁盘留存资格。 |
| UNKNOWN / UNSUPPORTED / INVALID_CONTROL | 缺观察、无权限、未触达 cut、正控制失败、API 不可用、close不确认；默认拒绝/占账，不把无复现当 PASS。 |
| COMMIT_OBSERVATION_UNKNOWN / ACK_UNCERTAIN | 无法确认 actual commit，或已 commit但 ACK未知；不得重复写事务或自动 rollback/restore。 |
| RELEASE_UNKNOWN | cancel/kill/Node close/status 不算物理释放；保留原 operation/ledger。每个 CloseHandle 结果和已知 view/reference分别观察，一次关闭不重试旧数字。 |

旧3次 EBUSY及当前3/72首次 rename EBUSY、name-only正控制失败、scanner工程中止、observer初始环境失败均保留。48 instrumented成功、guardian signaled与稍后 Host PSS不能归因失败瞬间，也不排除外部/section/filter owner。未来不得加 first-rename前 sleep/retry、删除失败或降低断言来清队列。ordinary app quit、真实 kernel-close fault、目录/断电均未取得资格。

## 8. 受控测试计划（33项，全部 NOT_RUN）

E0=既有 owned-synthetic seam 的未来回归；N=需批准具体新 bounded native fixture/API；S=需明确批准指定 principal/token/ACL/Broker/安装或公共 seam；D=需专用 VM/volume/设备与 restart/power授权。矩阵不是执行授权，多个标签须同时满足。完整操作细节和预算见本机 `testplan-analysis.md`；以下是可独立审阅的验收摘要。

每 case 冻结 source/tree/WIP、actual native/SQLite/bootstrap 身份；仅全新 owned临时NTFS、合成 schema1，无真实库/Runtime SQLite/模型/账号。正控制先行；记录实际 SID/token、requested/granted access、share/disposition、64位对象 identity、cut ack、first effect、native error、consumer结果、cleanup与终态。所有 read/write/link/rename/cleanup 最终目标必须在批准根内。无权限不提权；bounded race零失败不证明全部 interleavings；故障注入不称真实 kernel fault。

| ID | 对象 / 场景 / cut | 验收上限 / 授权 |
| --- | --- | --- |
| SC01 | O1后续正常事务与O3旧镜像 | 旧镜像完整检查通过且源合法写成功，只授COPY。E0 |
| SC02 | caller Buffer在传输前/中、readback后-verifier前、ready后变更 | native copy分离；原 expected拒绝改变；未来transfer消费同一owned bytes。E0；新ownership N/公共seam S |
| SC03 | E已有RW在两hash间改cell再返还 | endpoint SHA可同，完整written/source比较拒绝，DETECT_REFUSE；非bypass。E0 |
| SC04 | E已有writable section，关闭file保留view | 有效正控制，旧view不假定撤权；strong资格须T1前不发权/拒绝backing。N+S |
| SC05 | COW view | view可变但backing不变，只授COW/COPY，不混成raw writer。N |
| SC06 | capture时改变两个数据页/change→restore | 实际capture cut与完整checker；strong需effect前隔离，当前无coherence强资格。N+S |
| SC07 | U/C新write/append/truncate/mapping，H命名事务 | U effect前拒绝且合法事务成功；具体right/object/lifetime。N+S |
| MD01 | attribute/EA/sparse/compression/zero/reparse逐tuple | 各操作真实所需access；后检测只DETECT_REFUSE，未测EA不报覆盖。E0/N+S |
| MD02 | owner/WRITE_DAC/WRITE_OWNER/继承自授write | 同owner只读正控制与独立owner策略区分，不提权。N+S |
| MD03 | E此前metadata/security/delete handle | 后ACL不作撤旧能力保证；记录grant和关闭lifetime。N+S |
| MD04 | 空parent、非空、HELD后ancestor变更 | 原root-relative拒绝/sentinel无副作用；strong覆盖创建前窗口。E0；新N+S |
| MD05 | link/rename/replace/delete/ADS/同名异对象，T1–T8 | retained object与path各核对；释放后也需保护，未测ADS=N。E0/N+S |
| MD06 | MAINopen前journal碰撞、xClose→xDelete置换、late link | create-only/同对象delete按原断言，残留保留；不删hot journal。E0 |
| MD07 | metadata check→实际I/O/load窗口，立即返还 | effect成功推翻原子PREVENT；endpoint相等不抹反例。N+S |
| LD01 | T0 bootstrap/expectation/Temp替代 | 未知B在首native执行前拒绝，load未调用且无初始化副作用。E0+S |
| LD02 | artifact已有RW/DELETE/section | existing pin拒绝保持；section不类推；真实load-called独立观察。E0+N+S |
| LD03 | afterPin/preload与load后late metadata | 前后cut分开；load后注册/初始化保留，只DETECT_REFUSE。E0 |
| LD04 | synthetic dependency/search碰撞、delay/SxS/env | bad依赖首次执行前拒绝；actual closure每项证据，无全机policy修改。N+S |
| LD05 | 认证object A后loader按同path选B | 首effect前阻止或真实consumer绑定；pathname不授loaded identity。N+S |
| LD06 | guardian死亡/wrongHostcreation/duplicate错配 | pin可能仍在，finish/release UNKNOWN仍拒绝；一次cleanup。E0+S |
| LD07 | U/C对A process/thread/dup/security/token rights | 只handle-open/descriptor，合法IPC正控制；不注入代码。N+S |
| RS01 | T0 compiler/guardian/CLR/firstload/verifier/copy资源 | 每phase执行前独立permit；超界零业务写，准备资格不借target。N+S |
| RS02 | Job startup/tail压力、RSS | commit hardlimit与postexit RSS分开，不相加非同时峰值。E0；新policy S |
| RS03 | revoke/cancel+blockedpipe/killrequest | ledger到exactPROCESS/Job/I/O终态；资源恢复不恢复grant。E0 |
| RS04 | 首pin拒绝→一次close→一次first rename，随后PSS | first failure保留，瞬间和后快照分开，未归因仍UNKNOWN。E0 |
| RS05 | unknown/partialclose、observerthrow/thenable | poison/计数保留、不重试旧handle、新prepare拒绝；注入非真实fault。E0；新hooks N |
| CM01 | same txn DDL/业务/marker，actualbefore/aftercommit crash | freshreadonly当前记录；hotjournal只读拒绝，processcrash非断电。E0 |
| CM02 | COMMIT后ACK/finish/status/guardian失败，cancel/rollback | commit、ACK、backup、release四轴；未commit不因finished升级。E0 |
| CM03 | selfconsistent伪status/image/marker，或删记录 | schema-valid writer记录仍非authentic；expected来自可信capture，restore=false。E0；strong S |
| CM04 | restart/replay/旧generation/目标schema错误 | classification分开，拒绝repair/replay/overwrite/restore。E0；正式seam S |
| DU01 | 各file/operation/parent/control flush fault / processcrash | mandatoryfailure拒绝；实际fresh内容分类，不称powerdurable。E0 |
| DU02 | 专用VM正常restart与abruptVMpower分别列 | 只授具体环境restart证据，hostcache/hardware limits披露。D |
| DU03 | 独立可丢失storage真实powercut | 指定hardware/cache/cut/冷读及namespace；非日用设备/真实库。D+明确设备和破坏性授权 |

执行顺序建议：先E0反例与cut核对；再N的section/mapping、security/process与实际loader microtracer；再S的新建全合成authority prototype；最后D环境资格。失败或未知只暂停依赖部分，不能缩小原目标刷绿。正式Adapter、真实库迁移和恢复各自另批，不因矩阵数量或review通过自动授权。

## 9. Microsoft primary-source 与论证限度

公开正文于2026-10-05只读核验；短引语支持API事实，设计推论和本机资格分开。未下载保存HTML或运行示例。完整核验记录在本批 `options-analysis.md`；一个旧 security-descriptor URL 返回404，未据此伪造引用。

| 来源 | 短引语 / 支持事实 | 设计推论与限制 |
| --- | --- | --- |
| [CreateFileW](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew) | “Access requests to attributes or extended attributes are not affected by this flag.” | share0不是所有metadata拒绝；具体FSCTL/access仍逐项测。 |
| 同上 | 不含SHARE_WRITE且已有write access/file mapping with write access时“the function fails”。 | no-write-sharing可能根本无法取得pin；不能自动撤既有writer，SQLite兼容性未测。 |
| [Owner of a New Object](https://learn.microsoft.com/en-us/windows/win32/secauthz/owner-of-a-new-object) | “An object's owner implicitly has WRITE_DAC access to the object.” | 普通同owner只读ACL不能无条件强隔离；未选择/测试OWNER_RIGHTS例外，不声称所有例外必失败。 |
| [File security and access rights](https://learn.microsoft.com/en-us/windows/win32/fileio/file-security-and-access-rights) | default descriptor仅newly created，不在renamed/moved时赋予；parent descriptor不直接控制child access。 | rename进保护root不赋予新descriptor；leaf和ancestor/继承分别设计。 |
| [SetSecurityInfo](https://learn.microsoft.com/en-us/windows/win32/api/aclapi/nf-aclapi-setsecurityinfo) | inheritable ACE可传播到existing children。 | 具体传播/例外须验证；不以此证明已有handle/section撤权。 |
| [Requesting Access Rights](https://learn.microsoft.com/en-us/windows/win32/secauthz/requesting-access-rights-to-an-object) / [File-mapping security](https://learn.microsoft.com/en-us/windows/win32/memory/file-mapping-security-and-access-rights) | opened handle有access rights；mapping有独立descriptor，FILE_MAP_WRITE允许read/write view。 | 本轮未取得任意ACL更新撤销旧mapping的官方保证，保守分列已有能力并未来实测。 |
| [Process Security and Access Rights](https://learn.microsoft.com/en-us/windows/win32/procthread/process-security-and-access-rights) | process default ACL来自creator token；DUP_HANDLE可duplicate目标pseudo handle。 | file ACL不保护process；实际Host/A rights未测，不断言same-user必然获得所有权限。 |
| [ACL-based Access Control](https://learn.microsoft.com/en-us/windows/win32/secauthz/acl-based-access-control) | private server的descriptor/功能关联“it is up to the protected server to maintain the association”。 | peer认证不代替业务授权，也不提供本产品可信用户意图。 |
| [LoadLibraryExW](https://learn.microsoft.com/en-us/windows/win32/api/libloaderapi/nf-libloaderapi-loadlibraryexw) | hFile reserved，“It must be NULL.”；DATAFILE映射非executable DLL。 | 不能直接adopt认证handle来load；实际loader绑定仍待论证。 |
| [DLL search order](https://learn.microsoft.com/en-us/windows/win32/dlls/dynamic-link-library-search-order) | 依赖按module names搜索，即使首DLL指定full path。 | 固定leaf不固定closure；首执行前保护与实际consumer分别验收。 |

## 10. 后续队列与停止条件

下一批建议仍在设计范围：**B2全部Control Store writer/reader/transaction迁移清单与最小兼容协议草案**，同时明确H endpoint信任前提和principal/provisioning可选项，给出可批准的N/S具体操作、owned合成根和验收边界。此项尚未授权，不能从本文自动实施。

之后才考虑经批准的N microtracer及全新合成S prototype。release owner/timing、首次bootstrap与完整准备资源、受保护安装/更新、namespace留存、commit provenance、durability和UX保持独立队列。B2目标不改变用户素材、Original、AI授权、Provider或无模型基础产品可用性。本批完成设计和独立复核后停止。
