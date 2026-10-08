# WC01 Windows metadata / FSCTL / existing handle qualification

2026-10-04；已批准的实施、限定验证与交接完成，整体 **PARTIAL / STOP**。范围仅受控合成 NTFS source/journal/managed executable 的 metadata、FSCTL 与既有句柄竞争。正式 Adapter 未接；productionQualified、restoreAllowed、namespaceMetadataQualified 仍 false；nextBatchAuthorized=false。

已重新核 3289 既有源码与上批 sealed tree `c5317220443bee3c233c0c74f26deb5e8e474265` 零漂移；新 baseline 3300 path records。历史证据 135 文件 SHA 核验只证明起点，不继承旧 PASS。只使用自有临时文件/SQLite/进程与已安装编译器；无真实数据/模型/账号/凭据/Provider、下载安装、raw-volume/admin 绕过或 Git stage/commit/push/发布。真实 index、root generated 和无关 WIP 保留。

## 实际修改文件

相对本批冻结 baseline 实际 15 文件。精确原字节、before/after SHA、raw patch、反向恢复及 candidate 闭包见本机 `file-scope.json`、`incremental-review.diff`、`closure-verification.json`。

| 文件 | 变化 |
| --- | --- |
| `scripts/fixtures/windows-backup-metadata-probe.cpp` | 新受控 adversary：逐组件 no-reparse、同句柄属性/身份/hash、有限 FSCTL、相对 rename、UNKNOWN close 闭门；External 所有权顺序与句柄接管前分配修复 |
| `scripts/fixtures/windows-backup-metadata-probe.ts` | 窄测试接口、首 load receipt、属性句柄 hash UNKNOWN 与 close 分类 |
| `scripts/windows-backup-metadata-probe.test.ts` | 10 项真实正负控制，含同句柄 reparse 清除/sentinel/64 session 上限 |
| `scripts/windows-backup-artifact-metadata.test.ts` | 10 项 DLL/managed target 既有 RW/DELETE/attributes 与加载时点矩阵 |
| `scripts/windows-backup-source-metadata.test.ts` | 13 项 source/journal/actual VFS 时点矩阵；保留 writer/cache 反例 |
| `scripts/fixtures/windows-backup-journal-vfs.c` | source/journal 拒绝 sparse/compressed；实际 MAIN I/O 前重验 delegated handle |
| `scripts/fixtures/windows-backup-vfs-extension.c` | 实际 MAIN evidence 排除 sparse/compressed，hash 前后 current MAIN/duplicate/retained leaf 属性重验；祖先仅初始 no-reparse/pin |
| `scripts/run-electron-node-test.mjs` | 新 source 测试加入既有隔离 URI whitelist，正式全局 URI 不开放 |
| `.codeindex/tests-map.json` | 三项新测试命令 |
| `docs/platform/WINDOWS-BACKUP-TARGET-PROTOCOL.md` | 当前资格、反例与 release 未知；旧协议标历史 |
| `src/main/library-lifecycle/README.md` | 当前资格/交接入口，旧证据保留日期 |
| `src/main/independent-tags/README.md` | 同上，生产 Windows 仍写入前拒绝 |
| `TASK.md` | 本请求状态/验证/恢复点 |
| `docs/handoff/CURRENT-STATE.md` | 唯一当前投影 |
| 本文件 | 终态交接 |

## Before / after 与源码调整

Microsoft CreateFileW 明确 attribute/extended attribute access 不受 sharing flag 的同样限制；各 FSCTL 的 access tuple 不同。不能将 shareREAD/noDELETE 当全 metadata 独占。原 before 10 格反例/固定源码保留，after 仅作最小私有拒绝修复；不改变公共 schema/IPC、正式 composition 或安全门。

| 对象/时点 | Before | After 与限定 |
| --- | --- | --- |
| source pre-pin sparse/compressed | FSCTL 成功，named VFS 接受 | 变更仍可能成功，注册/实际 MAIN open 在 source SQL 前拒绝 |
| source pin 后 sparse/compressed | UPDATE/COMMIT 可继续 | 实际 MAIN read/write/truncate/sync/size/lock/fetch/SIZE_HINT 重验后拒绝；仅 operation-time detection |
| live journal sparse | 属性句柄可变更，COMMIT 接受 | COMMIT 拒绝，保留 residual journal，不删 hot journal 制造成功 |
| legacy actual MAIN source evidence | pre-pin/recheck 接受 sparse | evidence 拒绝 sparse/compressed，完整 hash 前后 current MAIN/duplicate/retained leaf 属性核验；祖先初始 no-reparse/pin，晚期完整重验未闭合 |
| source 既有 RW/attributes | WRITE sharing 下外部 byte writer 可写 | 仍共存/实际写，known counterexample，未宣称任意 writer isolation |
| readonly cached query | 缓存可返回旧值 | 仍可返回旧值，fresh qualification 拒绝当前 sparse source；缓存不是 disk qualification |
| source DELETE / 非空 `.dam` reparse | sharing 拒 DELETE，reparse error145 | 限定 OS/API/access tuple，不泛化全 reparse 防护 |
| DLL 既有 RW/DELETE / attributes | sharing 不能证明完整资格 | RW/DELETE 在 loader 前拒绝；attributes pin 后 sparse 可变，Host recheck 在 actual load 前拒绝 |
| DLL actual load callback 后属性 | 已 load 后可变 | final receipt 拒绝，但函数已注册；prevention counterexample |
| DLL timestamp / pathname hardlink | 需按 guard tuple 核对 | time 可变且 bytes 相同；pinned link EBUSY，unpinned 成功；不能套用 journal 的 link 结果 |
| managed target RW/DELETE / attributes | pin 不等于 executable 资格 | 前两者 creation 前拒绝；attributes 在 actual HELD 可 sparse/time 变，bytes 不变且完成，managedExecutablePathLaunchQualified=false |

属性句柄不暗开 data-reader：fullHash=null、NO_READ_DATA_ACCESS、contentChanged=null；read/RW 控制才有同句柄全 SHA。sparse/compression 控制保持 bytes，zero-data 实际改变 bytes。文件 ≤1MiB、一次 write/zero ≤4096 bytes、最多 64 live sessions、每 path ≤64 components，**不是 64 total handles**。自有 MountPoint 必须同句柄清除后才清理，sentinel 不变。真实 kernel CloseHandle 故障未运行；UNKNOWN poison 是保守实现，不冒充故障资格。

## 验证、独立复核与保留失败

最终选定 9 个测试文件共 **98 PASS / 1 FAIL**：probe10、source/journal metadata13、artifact metadata9PASS/1FAIL、native load13、journal24、actual VFS10、native maintenance integration6、helper9、production refusal4。均为仓库 Electron runner 与合成范围；源码/DLL/compiler/native/header/load identity 随矩阵记录。探针修复后33项受影响验证已重新编译复测为32PASS/1FAIL；旧99/0仅属更早探针源码，不当当前全绿。typecheck、ownership/context、产品输入/actual artifact 核验详情见 `verification-final.json`。

最终仍有释放验收失败，保留原日志：

- probe 初跑9/1：Win32 relative rename error87。改相同 retained parent 的 NtSetInformationFile 后原正控制断言通过；不将 error87 误认 pin 防护。
- artifact 初跑9/1：新夹具误把 journal late hardlink 结果套给 DLL；实测 EBUSY 与 unpinned successful control 校正为精确 tuple，生产断言/门不变。
- native-load 首回归12/1、artifact-v2 9/1与最终artifact-terminal 9/1：关闭/子进程结束后立即 ancestor rename EBUSY。此前原源码/断言复跑13/13与10/10只归相应时点；最小reserve修复后该失败再次发生，不再刷绿。失败自有目录稍后 rename/返还及 hash 不变不抹掉立即失败。原因仍 **UNKNOWN_RELEASE_TIMING_OR_OWNER**；不归因并发、Windows、AV或确定泄漏，稳定释放资格未闭合，不加 retry 掩盖原断言。
- Router `BUDGET_UNSATISFIABLE` 保留；不扩预算/降断言。历史正向升级、codec 前提、golden 失败只按旧来源追溯，本批不改判。

独立 Standards 与 Spec 分别核固定 baseline→current raw diff、candidate tree 和最终证据；无未修复已确认可行动源码缺陷，完整生产与稳定释放验收仍 PARTIAL。主 Agent 自查不代替两轴复核。

**Computer Use：本批 NOT_RUN。** 只改私有资格/文档，无正式 UI/Adapter 新接线，不自动启动 Host。参考文档浏览不算产品 CU；前批用户物理 Esc 仍 BLOCKED_UX_ACCEPTANCE，旧 Browser/Desktop 结果不移给本批。

## 当前源码 / build / runtime

- HEAD `b5cc954f90d248694aedc2d6ca1aa5188fa0aa11`，branch `codex/windows-workspace-1001`。全 current WIP/untracked 纳入隔离候选；精确终态 tree、raw diff SHA 和 source files 数在 anchor，不自动 commit。
- 沿用 actual build `dam-4c583238a11c002d`，sourceDigest `4c583238a11c002d03925b3e5a0d9cfdb879ef8c705a7b7331d7b18c6bb53bff`，666 product inputs；14 prior outputs 全部重新逐 SHA 核验复制到隔离 candidate，artifactDigest `aa23d1b4f766527cd9345333db3275cdb21215f2caa9fcdd2620ec4acef577ac`。本批无 product source 行为变化/新产品 build；测试 native 编译产物另列，不能冒充正式 Runtime package。
- Electron30.5.1 / Node20.16.0 / ABI123 / NAPI9 / libuv1.46.0，Windows x64 10.0.26200。外层 Node25.7.0/ABI141 另列，不加载 better-sqlite3。
- SQLite3.53.1，sourceId `2026-05-05 10:34:17 c88b22011a54b4f6fbd149e9f8e4de77658ce58143a1af0e3785e4e6475127e9`；native SHA `258341bfff296ac7a779c1dfc35e0b781c18c1a1b9ec3406551dbb473b4fe359`。
- Pi source Node24.21.0/SDK0.99.1，pin `99e47ca53d91aa342d134125f1980106105e27186ef4f61640c3bc3b98c651c0`，本批未执行。root 旧 generated 与 candidate actual generated 分列，root 不证明当前进程。

## 尚未验证与下一批建议

任意外部 writer、metadata/FSCTL→operation check race、cached result、DLL load 前后 mutation、managed executable 完整 launch/module/依赖/所有 ancestors 未闭合。legacy evidence 只重验 current MAIN/duplicate/retained leaf；祖先只有初始 no-reparse/pin，晚期完整重验未闭合。C# target 全 metadata、真实 kernel/MAIN close/reclaim/cross-addon fault NOT_RUN。bootstrap 信任根、guardian preparation 原子 Job/全生命预算、分发依赖/签名、hard RSS、目录 sync/断电、真实库/安装包/Mac 实机未验证；formal Adapter/restore 不放行。

建议下一批先明确 metadata/既有 writer 的威胁边界与 immutable source/loader 策略，并用受控合成实验归因立即释放 EBUSY；保留默认拒绝，再安排 preparation-resource/bootstrap-distribution 闭包，最后考虑正式 Adapter。建议未自动授权，不在本批展开。

## Remote Desktop Commander 终态入口

先读本文件与 [CURRENT-STATE](CURRENT-STATE.md)，再核本机 `.scratch/windows-backup-metadata-20261004/terminal-anchor.json`、`evidence-manifest-final.json` 及 SHA。anchor 指向 candidate tree、source/build/runtime、9 文件最终测试、原失败、两轴复核、scope/reverse-copy/index/WIP 与 process/listener 终态。owned guardian/helper/Host 与旧64869端口见 `process-final.json`，不按历史 PID 操作。

本批 STOP；不凭旧 PASS、ADR、界面或 receipt 启动下一阶段或给真实数据/生产 grant。
