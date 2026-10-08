# Windows backup target protocol — release / source-loader boundary

2026-10-04 WC01 当前私有合成批。首次 rename EBUSY 归因、既有 writer 与 source/snapshot/executable 权限分别判断；不接正式 Adapter，不实施 preparation-resource/bootstrap-distribution 或 OS broker/ACL。productionQualified/restoreAllowed/namespaceMetadataQualified=false，正式 Windows 仍 backup/status/DDL 前拒绝。实际结果与身份以 [当前交接](../handoff/WINDOWS-BACKUP-BOUNDARY-20261004.md) 为准。

[威胁边界与候选策略](WINDOWS-BACKUP-THREAT-BOUNDARY.md) 区分 mutable source、经完整 verifier 验证的有界 owned-memory snapshot、存储备份与实际 loaded image。source 合法事务允许写入；固定镜像可与后来事务分离，但 caller Buffer 可变。既有 RW handle 可改后返还使 endpoint SHA 相同，完整 source evidence 的 written 仍变化并拒绝；READONLY 不撤销已有权限。现有 identity/metadata/connection、UNKNOWN 与业务权限门均保留，不用 immutable=1、复制、rename 或最后 hash 替代隔离。

释放反馈环只记各样本第一次 rename，不加等待或 retry 放宽断言。新增 retained owned guardian PROCESS 和仅当前 Host PSS 诊断须报告绑定/释放 UNKNOWN；PSS 在首次 rename 后取样。本机 File 条目缺少名称，单靠具名零匹配的正控制失败保留；补充查询只 duplicate 当前 Host 的 captured File handle、过滤 DISK、只读元数据并一次关闭新 duplicate。匹配零仅限定这次成功查询的 capture 后 duplicate 对象；数字可能复用、untyped/query-unavailable 和更早失败时点均未覆盖，不能排除外部、section 或 filter owner。原三次 EBUSY 和本批当前源码复现并列，不以未复现或 Node close 宣称全 HANDLE 已释放。

两条策略均为 Target Architecture：协作 Host authority + owned-memory snapshot，或独立 OS principal 的受保护 source/namespace/loader。前者不能悄然缩小原安全目标取得生产资格；后者需另批明确批准 broker/token/ACL/native/public seam。当前 private commit/recovery 仍只按既有契约分类，restoreAllowed=false。

---

# 历史：Windows backup target protocol — metadata / FSCTL qualification

2026-10-04 WC01 私有合成资格。正式 Adapter 未接，生产 Windows 仍 backup/status/DDL 前拒绝；productionQualified/restoreAllowed/namespaceMetadataQualified=false。完整当前矩阵与身份见 [本批交接](../handoff/WINDOWS-BACKUP-METADATA-20261004.md)。

sharing 不能阻止所有 attribute/extended attribute access；SPARSE/REPARSE、COMPRESSION、ZERO_DATA 的 access tuple 分别测量。新 adversary 仅限自有临时 NTFS 根，逐组件 no-reparse，同句柄身份/metadata，属性句柄无额外 reader/hash UNKNOWN；文件≤1MiB、一次write/zero≤4096bytes、64 live sessions、每path≤64components。未知close不重试数字，保持count/全局poison；真实kernel fault仍NOT_RUN。

当前私有 named VFS source/journal与 legacy actual MAIN evidence 排除 sparse/compressed；actual delegated MAIN 的 read/write/truncate/sync/size/lock/fetch/SIZE_HINT 前重验身份和资格。pre-pin/registration→MAIN/source I/O/live journal COMMIT均有真实检测拒绝；不是原子metadata保护。外部既有writer实际可写、cached SQL返回旧值、DLL先load后metadata变更再receipt拒绝、managedtarget在HELD可变属性，均保留反例。DLL pin late pathname hardlink EBUSY有unpinned正控制，不能套用journal反例。

三次立即ancestor rename EBUSY原失败保留，原断言重跑与稍后物理rename只证明各自时点；UNKNOWN_RELEASE_TIMING_OR_OWNER未闭合，未加retry。bootstrap/dependency/distribution/guardian准备预算、全metadata race、managedexe、hardRSS/dirsync/断电和kernel/MAINclose资格继续PARTIAL。正式Host/全局URI/恢复权限不新增。以下旧协议按历史来源保存。

---

# 历史：Windows backup target protocol — safe load / journal pathname

2026-10-04，WC01 私有合成 qualification。本批不接正式 Adapter；生产 Windows 仍 backup/status/DDL 前拒绝，productionQualified=false、restoreAllowed=false。当前验证与身份见 [本批交接](../handoff/WINDOWS-BACKUP-PATH-20261004.md)。

首次 NAPI/DLL load 在 Runtime permit 前准备。安装的 OS PowerShell/CLR 是显式 bootstrap 信任根；captured Reflection.Emit 脚本不用 Add-Type 或新 DLL 自证。guardian 持有逐组件 GENERIC_READ/shareREAD/noDELETE handles，同句柄 SHA，绑定真实父 Host 的 PID/exe/creation time，把全部 handles duplicate 到 Host 后才 READY。新 NAPI 独立核对 Host pin 的 file-object/完整 SHA 与实际 module pathname。成功后 Host 先关闭已知 duplicates，guardian 收到 HOST_CLOSED 后重验及物理退出；未知或部分 close 不重试旧数字，不凭 receipt 假定释放。EXLOCK 会拒 loader 读，不能作为首加载实现。

源 SQLite 采用唯一 private named VFS，从 source open 前资格检查并绑定实际 main WIN32 handle。所有 journal/wal/shm 预存槽位（空文件也包括）拒绝；不删除或恢复 hot journal。MAIN_JOURNAL 相对 pinned parent 以 NtCreateFile FILE_CREATE/no-reparse 创建；xRead/write/truncate/sync 持同一 handle，xClose 继续 retain，xDelete 只在该 file object 上 FileDispositionInfo，消除 stock OPEN_ALWAYS 与 close→pathname DeleteFile 槽位窗口。命名 VFS 永不设成 default；SQLITE_USE_URI=1 只由 whitelist runner 设置在自有新 Electron 测试进程首次 import 之前。

源初始 ≤1MiB，main 写入/增长 ≤5MiB，journal ≤2MiB，session ≤128 次事务；超出拒绝，不分配无限空间。journal/source link、reparse 与 ancestor 身份在相关操作重验。晚期 CreateHardLink 可成功；后续提交拒绝的实测只能证明检测/拒绝，不能证明任意外部 metadata writer race 被原子隔离。全部 FSCTL/metadata 路径、依赖分发闭包、guardian startup 原子 Job 及生产资源预算、硬 RSS、目录/断电 durability 均未闭合，全部生产资格继续 false。

实际 Host maintenance 的 lease、schema1→12、同事务 backup-proof marker、取消/DDL回滚/ACK丢失/源变化/RAM拒绝与命名 VFS 结合验证；readonly 当前源 recorded-commit 回读独立于 finished 声明。它们是 Validated Tracer，不增加正式 Host 的恢复/写入权限。以下历史记录保留来源与当时限制。

---

# 历史：Windows backup target protocol — helper / VFS / commit proof

2026-10-04 WC01：合成 helper 在创建时原子进入限额 Job，覆盖 CLR startup 与 receipt 后 tail；retained process/job handles 在 actual exit、Job empty、pending input I/O 结算后读取 kernel 高水位。128 MiB/process、256 MiB/job 是 private commit 硬限；RSS 仅完整 postexit 峰值，`rssHardLimited=false`。UNKNOWN 同步抛错或异步拒绝均保留共享 ledger，独立 physical-release 事实才释放。

隔离 extension 以 `SQLITE_FCNTL_WIN32_GET_HANDLE` 查询当前 main VFS file object；readonly duplicate 只核验身份，完整 SHA 来自独立 retained no-reparse source handle，避免改变 SQLite file pointer。serialize 前、native source binding、DDL 前与 readonly 恢复事务重验身份/metadata/完整字节/NTFS/空间。单 main 可带 SQLite 自有空 temp，非空 temp/attach 拒绝。

私有 `recordCommit` 在同一 DDL/业务事务写 existing settled journal 的 `backup-proof:v1:<binding SHA>:<image SHA>:<target schema>`，失败原子回滚。当前 source readonly/query_only/FULL/DELETE、真实 VFS 与完整 schema/journal 回读才返回 `recorded-commit`；finished status 仍只 `commit-claimed`。它是独占 Host authority 下当前源的记录事实，不是对任意库外 writer 的密码学证明。

生产 Windows 仍写入前拒绝，`productionQualified=false`、`restoreAllowed=false`。managed artifacts 的 no-reparse/single-link/同句柄 SHA 与 no-delete pin 不等于 pathname 安全执行；`managedExecutablePathLaunchQualified=false`、`supervisorModuleLoadQualified=false`。NAPI/DLL pathname load TOCTOU、source journal pathname 全生命周期、分发包、硬 RSS 与断电资格未闭合。合成通过不授权正式 Adapter/composition。

当前验证、身份、独立审阅、失败队列与 STOP 锚点见 [本批交接](../handoff/WINDOWS-BACKUP-PROOF-20261004.md)。以下为历史 source/recovery 协议：

---

# 历史：Windows backup target protocol — source and recovery tracer

2026-10-04 WC01 当前续批：retained source file完整64位identity/hash/NTFS同卷空间与connection重验；captured operation/source/image binding进入immutable状态文件，同句柄只读恢复分类；预编译helper target运行前受Job128MiB/process、256MiB/job commit限额，actual exit后读kernel完整target峰值。

生产Windows仍在备份/status/DDL前拒绝，productionQualified=false。launcher前段/终态全RSS、SQLite VFS来源身份及source transaction commit独立证明尚缺。恢复只分类interrupted/cancelled/commit-claimed，restoreAllowed=false；没有自动恢复、删除或写权限。

范围、实测限制与身份见 [本批交接](../handoff/WINDOWS-BACKUP-RECOVERY-20261004.md)。下面原生命周期与原生目标协议为历史，仅归原批：

---

# 历史：Windows backup target protocol — lifecycle qualification

2026-10-04；WC01 当批已完成同句柄完整 SQLite 快照验证、真实 OS/共享 ledger RAM permit、私有 finish 到实际 close、分段状态/flush/中断重启及内容 retrieval 合成验证。生产 Windows 当时仍在备份/status/DDL 前拒绝，productionQualified=false。

serialize 前限定 1 MiB、12 copies+256 MiB helper+64 MiB Main，占账至 native child close；系统余量 max(512 MiB,10% total)，其他 hold/UNKNOWN 不绕过。256 MiB 未有全峰值/硬限证明。Serialized inspector 要求单 main/空 file、readonly/query_only/真实事务/memory，共用完整内容检查；文件入口仍只接受 DELETE。

Host private prepared backup 的 finish(committed) 在 actual lease/admissionClosed 下等待；事务返回即标 committed，ACK/设置恢复失败不改判回滚，finish 失败隔离。测试 helper 先不可覆盖 backing-up 状态并向上 flush，再写/同句柄 hash/readback、verified 状态/向上 flush，明确 0/1 才写 finished 并 flush。EOF 保持 interrupted；finished 仅 Main 声明，不是独立事务证明。

故障覆盖 backing/file/verified/operation/parent/control、finish status/operation/parent/control，HELD 超时 actual close；重启拒绝重复操作且不覆盖。Native retrieval 逐组件 no-reparse/read-only target/同句柄 hash，altered bytes 与 reparse 拒绝；尚未绑定 status 与 source commit 的完整恢复资格。全生产源 identity/stat/space 重验、helper/runtime 资格和正式组合仍待完成，不安装、不 raw-volume/admin flush、不宣称断电认证。

见 [本批交接](../handoff/WINDOWS-BACKUP-LIFECYCLE-20261004.md)。以下为上一批原始协议与证据，标记为历史；其中“当前”仅归原批，不再描述本批。

---

# 历史：Windows schema backup 目标接入协议

2026-10-04；WC01 已授权原生目标 / SQLite 接入资格批。
这是 Target Architecture 与受限 Validated Tracer 的记录。生产 Windows
`prepareTagIntentBackup` 仍在备份/status/DDL 前拒绝；没有正式 NTFS 成功备份。

## 当前源码与最小调整

此前 EXLOCK 方案已被属性句柄设置 junction 的反例否定。Main 的独占 Library
lease 只能防应用内竞争，不能防外部文件系统操作。重复 lstat、sentinel、
`O_NOFOLLOW` 或 SQLite `backup(target pathname)` 不提供原子目标保护。

本次采用 Windows `NtCreateFile`：保留从 drive 到控制目录的逐组件句柄；
每次只传单个组件，以 RootDirectory 相对打开/创建，使用 OBJ_DONT_REPARSE、
FILE_OPEN_REPARSE_POINT、明确文件/目录选项和 create-only disposition。
目录不共享 delete，目标不共享读写。既有同名项拒绝，不覆盖。句柄检查排除
reparse，目标需单 link。测试只允许 `dam-native-target-*` 自有临时树。

真实空目录在持有期间被改成 junction 后，目标创建返回 C0000280，零 target
字节、零 hash、零 flush，外部合成 sentinel 不变。最初预期“写后检测置换”
与实际不符；现断言更严格的写前拒绝，保留首次失败。

为避免 SQLite 再按 pathname 打开可信目标，候选由实际持有的 SQLite connection
`serialize()` 输出有界镜像，由原生句柄写入及同句柄 hash/readback。当前测试
限 1 MiB；在 serialize 前按 page_count × page_size 校验上限及预留测试预算。
测试预算覆盖镜像的多个副本与固定 helper 余量，但不是生产资源资格。

另一个实际差异：`new Database(buffer, {readonly:true})` 的 journal_mode=memory。
生产 `inspectLibraryControlStore` 要求 delete、query_only 和事务；按正确事务
调用仍拒绝 Buffer。测试保留该拒绝，再在 helper 退出后对自有目标做现有
readonly inspector 检查。后者只验证合成 retrieval，不能替代生产同句柄
完整库身份/代际/schema 验证。检查器未放宽。

## 合成协议与执行证据

| 路径 | 真实覆盖 | 限定 |
| --- | --- | --- |
| native-target | 单组件创建、hash/readback、file→operation→parent flush；junction 与同名项拒绝；operation flush 故障；child 超时实际 close | 5 项；不含真实 Host 或生产资格 |
| native-integration | 正式 Host 创建临时库后关闭；相同真实 lock authority/SQLite connection 绑定维护模块 | 私有 storage seam，不是正式 Host production composition |
| maintenance 正常 | schema1→12、禁用计划保存；helper 的目标/目录句柄与测试预算持有到事务结束 | 不启用 OCR/provider/模型 |
| maintenance 取消 | 目标验证后撤销，业务 check 在 DDL 前拒绝；源 schema1 | helper 退出后才释放测试预算 |
| DDL failure | 实际进入 afterDdl 切点，事务回滚、源 schema1；备份保留旧 schema1 | 不把早期平台拒绝算 fault-cut 覆盖 |
| RAM denial | serialize 前拒绝，零序列化、零 helper、零备份目录 | 合成预算，不是 VisualAdmission |

hold 模式创建新的 schema-backups 父目录和 operation；目标 file、不可覆盖的
status-verified.json file、operation、parent、control 按顺序 flush，再发送
HELD hash。Main 测试继续保有真实 lease，目标句柄及目录句柄保持到 Main 发出
finish byte。helper close 才确认全部句柄释放。测试实测另一 lock acquire=busy、
parent rename 拒绝。取消/失败均要求 helper close，不能把 kill 请求当释放。

Standards 独立复核实际复现了 child timeout 后等待未完成 whileHeld callback 的
挂起。共享 harness 现以 close receipt 为终点，超时/未完成 callback 单独拒绝，
不在 child 退出后无限 await callback。新增故障测试必须先触达 HELD，再核对
超时后目标可读、parent 可 rename，证明释放发生在 Promise 拒绝之前。

status 的 phase 是 `tracer-target-verified`，productionQualified=false，只声明
镜像目标；不声明 schema 事务成功或生产可恢复。取消留下该不可变目标事实，
同时最终 receipt 为 CANCELLED_WHILE_HELD。未删除备份来制造成功。

## 生产接入必须同时满足的门槛

1. 精确 Windows/NTFS/native/SQLite/source 身份，持有实际 Active Library 连接、
   lease 与整条路径证据；文件系统资格不可由测试钩子授予。
2. 生产 Main 在 serialize 前获得真正 RAM lease，覆盖 Main、SQLite verifier、
   pipe/native/helper 所有副本与进程开销；资源 UNKNOWN 仍占账。现有 OCR/Pi
   许可不能改作备份许可，也不能清除已有视觉 hold 来绕过准入。
3. 同句柄快照完整验证库 identity/generation/schema，解决 Buffer 检查契约，
   不放宽当前 pathname inspector。源页数/大小、identity、mtime/data_version
   及空间增长门在备份后和 DDL 前重验。
4. Main 保有可信目标、祖先与业务资格直到 source recheck、空间检查、DDL/commit
   完成。当前 prepareBackup 返回 pageCap 的私有协议不足以表达异步 finish/
   cancellation/child close；生产接入前必须补全生命周期，不能提前释放 helper。
5. 新父目录 metadata 的向上 flush、持久 backing-up/verified/interrupted 状态，
   分段失败及取消、重复启动恢复、retrieval 的身份与完整性均须独立验证。
   当前只覆盖一次 synthetic operation flush fault 和受限目标状态。
6. 原正向升级及原 fault-cut 套件必须真实触达目标切点。测试 RAM/lease 及
   synthetic success 不能赋予正式 Windows backup capability。

不采用 raw-volume/admin flush，不安装 native dependency 或下载软件/模型。
调用 flush 成功不等于物理断电认证；本批没有断电、真实库、分发包或 macOS 实验。

## 用户可见行为

后台计划保存遇到 TAG_INTENT_BACKUP_UNSUPPORTED，明确告知当前环境未通过安全
备份验证、计划未保存、资料库未升级、现有素材与手工编辑可用。普通自动状态
轮询保留该操作失败；显式重新读取、新动作、scope/session 改变或关库才清除。
只读状态故障优先显示，成功回读不抹掉操作失败。公共 IPC/schema 未改变。

验证入口：scripts/windows-native-backup-target.test.ts、
scripts/windows-native-backup-integration.test.ts、scripts/background-analysis-message.test.ts
及 scripts/background-analysis-ui.test.mjs。最新结果、CU、审查及身份见
[本批交接](../handoff/WINDOWS-NATIVE-BACKUP-20261004.md)。
