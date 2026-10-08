# Windows 备份：source / snapshot / executable 威胁边界

2026-10-04，WC01 已批准的释放归因与威胁边界批。本文描述当前源码、受控合成证据和候选策略；**不接正式 Adapter，不赋予生产、恢复、任意 writer 隔离或 loader 资格**。`productionQualified=false`、`restoreAllowed=false` 继续成立。OS 权限、独立身份 broker、Runtime 安装或分发变更均不在本批实施范围。

## 对象与资格词义

必须分别判断这三个对象；同一 SHA 不会使它们取得相同 authority。

| 对象 | 当前职责与可变性 | 可以证明什么 | 不能据此证明什么 |
| --- | --- | --- | --- |
| mutable Active Library source | Host 持独占业务 lease 的实际 SQLite MAIN；业务事务本来需要写它 | 特定观察或 I/O 时点的 file object、schema、字节、metadata 与已记录事务 | 整个观察区间没有外部 writer；查询结果来自当前磁盘；任意库外 writer 无法篡改 |
| owned serialized snapshot | `serialize()` 的有界内存镜像；完整 verifier 用 readonly 内存 SQLite 检查身份、schema、journal、FK | 指定镜像内容符合捕获的 declaration/generation/schema/digest；内存数据库与随后源写入分离 | caller Buffer 永久只读；磁盘备份或 helper 进程不可变；源生成镜像时已隔离外部 writer |
| stored backup / executable image | helper 创建并保留的 target file，或实际 loader 按 pathname 打开的 DLL/managed executable | 具体持有期的 handle/同句柄内容与有限重验；已测 access tuple 的 sharing 拒绝 | 释放后存储不可变；attribute/FSCTL 全部被阻止；loader 执行前完整原子防护、依赖闭包或安装信任 |

本文的 **content-verified** 是一次完整内容检查；**detected/refused** 是已观察变更后拒绝；**owned-memory-copy** 是当前 readonly SQLite 对输入内容的独立副本。只有在明确 threat principal、完整 lifetime、已有 handles/sections、所有可变 authority 和实际 consumer 后，才能讨论 **interval immutable** 或 **writer isolated**。这些更强资格目前均未取得。

## 当前真实调用链

- `scripts/fixtures/windows-backup-journal-vfs.c` 的私有 named VFS 在 MAIN open 前保留 no-reparse 组件，并绑定 delegated WIN32 MAIN handle；source 保留 `FILE_SHARE_READ | FILE_SHARE_WRITE`。实际 read/write/truncate/sync/size/lock/fetch/SIZE_HINT 在相关操作前检查 source 身份、single-link、表示方式；journal 用相对 `FILE_CREATE` 和同句柄 I/O/delete。它是 Validated Tracer，未设为全局 default、未由正式 Host 注册。metadata 检查与下一 OS 操作之间仍有窗口。
- `scripts/fixtures/windows-backup-vfs-extension.c` 的 legacy actual-MAIN evidence 同样允许 WRITE share；查询实际 MAIN handle、duplicate 和 retained source，完整 hash 前后检查 leaf 身份/metadata。它不会拦截所有实际 I/O，祖先不是每次完整重验。`windows-backup-source.internal.ts` 的比较还检查 connection snapshot 和 written 等字段；不能把相同 digest 等同于通过完整比较。
- `library-backup-snapshot.internal.ts` 已有 `verifyLibraryBackupSnapshot`：镜像限制 1 MiB，SHA 匹配捕获期望，用 readonly/query_only/事务/memory database 检查完整控制内容、数据 schema 和 FK。无须另写放宽版本的 checker。它不证明存储、process 或 source race 资格，正式 Windows backup composition 仍拒绝。
- 私有 lifecycle 在生成镜像前预留现有资源许可，传输镜像给已准备 helper；`source-hold` 的 source 读句柄也是 shareREAD+WRITE。helper 新目标由同句柄写入、flush、hash/readback，HELD 到 source transaction finish 决定和物理进程退出。其 target 数据共享拒绝只作用于持有期；attribute 访问不受同样的 sharing 限制，释放后的文件没有永久不可变资格。
- `windows-backup-native-load.ts` 的 guardian 用 GENERIC_READ/shareREAD/noDELETE 逐组件持有、同句柄 SHA，duplicates 转移 Host，独立 Host verifier 后才调用 pathname loader。finish 再次检查不能撤销已经运行的 DLL initialization/函数注册。managed target 的 creation/module/dependency 资格也仍 false。安全首 load、资源准备、OS PowerShell/CLR bootstrap 和已安装 runtime 必须分列。
- 私有 `writeWindowsBackupCommitMarker` 在相同 DDL/业务事务写 settled journal；readonly source inspector 回读当前实际源才报告 `recorded-commit`。`finished` 状态只是 `commit-claimed`。该 marker 在独占 Host authority 条件下描述当前记录事实，不能认证任意库外 writer；恢复检查仍不授予写入或 restore 权限。

## 已证实反例及本批最小实验

上批 raw 矩阵见 [metadata 交接](../handoff/WINDOWS-BACKUP-METADATA-20261004.md)，源和 artifact 的原始 before/final 日志保留在对应本机 evidence。新测试 `scripts/windows-backup-immutable-source.test.ts` 仅打开自有临时合成 schema1 SQLite、已有编译工具和 probe；无真实素材、下载或 OS 权限修改。`immutable-source-v1` 和加入完整 source match 拒绝断言的 `immutable-source-v2` 均 **4 PASS / 0 FAIL**，当前最终运行身份以本批 handoff/anchor 为准。

| 实验 | 实际结果 | 安全含义 |
| --- | --- | --- |
| 完整 verifier 通过后，Host 合法写入 source | source SHA 与 journal 行数改变；已生成 image 与 readonly image database 保持旧内容，旧镜像仍能按原 expected 通过完整 verifier | 已有有界 copy seam 可用于检查固定镜像；source 是故意可变的，不应给 active source 加 `immutable` 声明 |
| readonly `new Database(image)` 打开后修改原 Buffer 中实际 SQLite cell | 原 Buffer SHA/新打开的 image 内容改变；先打开的 readonly 内存 DB 仍是旧内容，SQL 写入拒绝；原 expected digest 的完整 verifier 拒绝变更 Buffer | 当前 native deserialize 有独立内容副本；readonly 不冻结 caller Buffer，验证到传输之间的所有权仍需约束 |
| actual-MAIN pin 前已有 RW handle；两次 hash 之间修改实际 cell 再返还 | 中间磁盘 SHA 和 SQLite cell 改变；before/after SHA 与 object identity 相同，**written 不同、完整 source evidence 不同** | source WRITE sharing 不隔离已有 writer；相同有限 hash 不证明区间无修改。当前完整 comparison 会拒绝 written 变化，此实验不是绕过其安全门，也没有伪造/恢复 timestamp |
| 先授予 RW，再设置 READONLY attribute | 已有 writer 仍能写实际 SQLite cell；属性 handle 可撤销 READONLY；恢复原 bytes | 文件 READONLY attribute 是可撤销状态，不是已有权限的撤销或同用户攻击者隔离。未实验 DACL，不把此结果泛化为所有 ACL 行为 |

上批 readonly cached query 在 source sparse 后仍返回旧值；fresh source qualification 拒绝。缓存是 SQLite 已持有的页面，不代表实际 MAIN 新磁盘读取。source/journal 的 sparse/compressed 检测拒绝仍仅 operation-time detection。DLL metadata 在实际 load callback 后改变，final receipt 拒绝但函数已注册；这是 prevention 的反例。managed target 在 HELD 时可改 sparse/time、bytes 保持且进程完成；其 executable path 资格仍 false。

测试运行通过仓库 Electron Node runner，受测 Electron/Node/ABI 和 SQLite version/source ID 由实验内输出；外层 `run-check.mjs` 的 Node 版本另列。probe、actual-MAIN extension、helper/supervisor 是本地重新编译的 qualification artifacts，其源码、compiler/header 和实际 artifact SHA 随输出保留；它们不是产品 Runtime Package。产品 build 的 sourceDigest/666 输入与已有产物核验由本批 anchor 独立记录，本文件和测试存在或 PASS 不证明产生新的产品 build、Pi 执行或生产能力。

## 两条可行方向及取舍

下面均为 **Target Architecture 候选**，不是获批生产政策。本批可交付的是固定镜像验证和威胁模型证据，不通过缩小 threat model 将原安全门改绿。

| 方向 | source / snapshot 处理 | loader 处理 | 条件、成本与新增 seam |
| --- | --- | --- | --- |
| A：明确 Host authority 的协作边界，复用 owned-memory snapshot | 保留 mutable source 正常事务、lease、精确 native source/metadata/space 重验；固定 bounded image 的 exclusive ownership，直接对 owned copy 做既有完整 verifier，持有可信 target 到事务及实际 release。异常、冲突、UNKNOWN 拒绝；外部任意 writer 隔离不成立 | 保留当前有限 guard 作为准备 tracer；loader 使用获准安装、来源可核的 artifact/dependency closure，不能仅凭临时 pathname+SHA 放行 | 避免重复实现 checker，适用于明确只保护应用内并发和可检测环境漂移的前提。需要单独确认这种产品/安全 threat boundary 是否满足需求，以及 production composition、native lifetime、prepared resource/distribution seam；本批不采用该前提给生产 grant |
| B：建立 OS 可执行的独立写入 authority，提供真正受保护的 source/snapshot/artifact | 用不同受信任 principal 的 broker 拥有新建源/目标及 namespace；非 broker 身份不能 data-write、write-attributes、WRITE_DAC/WRITE_OWNER 或替换祖先。active source 的 SQLite 写入仅经 authority；新 target 在未暴露 writer 时创建，撤出写入阶段后保持受保护只读 backing/handle，consumer 用明确 handle-backed或owned-memory image。已有 handles/sections 与崩溃恢复纳入 lifetime proof | 受保护安装根、固定 loader/dependency policy 和 process/module identity；加载前所有变更 authority 已被排除，实际加载 image 与认证对象绑定；禁止任意临时内容重命名进安装根来取得信任 | 可以论证非 broker principal 的强隔离，但需要 OS broker/token/ACL、native VFS/adopt-handle或image backing、新 Host 请求/响应契约、ownership/migration、安装签名与资源全生命周期资格。它改变受信任运行边界和公共兼容 seam，须另批明确批准；当前未创建账号、ACL/service、安装包或执行此方案 |

A 与 B 可以在不同权限等级配合使用：内存副本限制 verifier 读的是哪些 bytes，OS authority 约束谁能产生/更改 backing。前者不能替代后者。B 也不自动证明瞬间断电、恶意 kernel/admin、同 principal 的任意 process memory 注入或未审核插件；应单独列出对象和 principal。若 broker 仍把可写 handle、可写 mapping 或 WRITE_DAC/WRITE_OWNER 交给 consumer，它不能声称撤权。现有 source WRITE sharing 也不能靠稍后打开另一个 read handle 追溯撤销既有写权限。

### 不作为隔离替代物

- SQLite `immutable=1` 是调用方声明 backing 已不可变，从而影响锁和变化检测；它不使文件不可变。对 active DB 声明 immutable 会与合法 Host 写入冲突，不实施、不借此消除缓存或重验失败。
- NTFS READONLY、内容寻址文件名、复制到自有普通目录、rename、相同 hash、最后写入时间或 finish/status signature 都不能独自排除同用户可变 authority。自签状态或存在于同一可写文件树的 secret 也不能升级 commit 证明。
- 把本用户设为 owner，再配置“只读”DACL，不能无条件宣称同用户攻击防护；owner/WRITE_DAC/WRITE_OWNER、已有 handles、mapping、继承与 namespace 都需独立评估。未获批准不改真实目录 ACL，不使用 admin/raw-volume 绕过。
- DLL/EXE 代码已执行后才检测 metadata/digest 变化，只能报告迟到拒绝；不能把 unload、错误 receipt 或再次 hash 当作执行副作用从未发生。path/handle 和 module identity 都需明确，不能自行实现手工 PE mapper 替代受审核 OS loader。

## 本批规则与后续队列

本批采用的是 **对象分离、限定 copy 证明、明确反例和默认拒绝**。source 全 identity/metadata/connection 检查继续保留；readonly inspector、commit/recovery 契约、资源 UNKNOWN 与 production refusal 不放宽。没有引入不可变文件 API、自动 DACL 配置或新 loader。

下一次方案选择应先回答需要隔离哪一个 principal、哪一个 object、哪段 lifetime，以及是否需要对任意库外 writer 保证；现有文档不能替代该安全取舍的批准。若坚持强 writer/loader 隔离，按 B 准备可审阅的 native/OS seam 与 controlled test design，再申请其具体实施范围。仅选择 A 的应用内 authority 范围也必须证明原产品安全目标仍满足，不凭本批测试自动缩减目标。

仍待资格：有限重验到 I/O/load 间 race、实际既有 writable mappings/sections、metadata/祖先完整可变 authority、snapshot transfer ownership、真实 kernel/MAIN close failure、物理 release owner 归因、准备资源及分发/安装闭包、目录 durability/断电。正式 Adapter、restore 与真实库继续关闭。Computer Use 本批私有实验未运行；此前 UI 的未验收状态由当前 handoff 单列，测试 PASS 不覆盖它。
