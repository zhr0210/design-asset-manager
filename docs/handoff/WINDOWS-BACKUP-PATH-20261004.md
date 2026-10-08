# WC01 Windows safe-load / journal pathname 终态

2026-10-04，PARTIAL / STOP。用户批准上一批建议；本批完成已授权的私有合成纵切、适用验证及独立复核，不自动接正式 Adapter。productionQualified=false、restoreAllowed=false、nextBatchAuthorized=false。仅自有合成数据/进程与机器已有编译器；无下载/安装、真实库/模型/账号/凭据、Provider、stage/commit/push/发布。原 index、非本批 WIP 与 root generated 保持。

实际源码优先于旧计划。重新核对的 3280 个原文件与上批 sealed candidate 无漂移，baseline 3287 路径包括缺失记录。历史证据仅作起点；本批测试和身份重新绑定当前字节。当前候选闭包包含全部 tracked/untracked 源码，最终 tree、文件 SHA、review SHA 由本机 terminal-anchor / candidate-manifest 签收；HEAD 不代表 WIP。

## 实际修改文件（22）

| 文件 | 本批修改 |
| --- | --- |
| scripts/fixtures/windows-backup-native-load.ts | 有限 guardian preparation、Host transfer、同步 loader、deadline 和 UNKNOWN 回收边界 |
| scripts/fixtures/windows-backup-native-load-guardian.ps1 | captured 内存 Reflection.Emit、组件相对 no-reparse pin、准确父 Host 绑定、DuplicateHandle、单次释放协议 |
| scripts/fixtures/windows-backup-helper-supervisor.cpp | 私有 Host pin 身份/同句柄 SHA/实际 module path 检查与窄句柄关闭 |
| scripts/fixtures/windows-backup-helper-process.ts | 首加载在 prepare 缓存，launch 复用实际 module；准备 receipt 可核对，CJS resolver 对齐 |
| scripts/fixtures/windows-backup-vfs.ts | connection DLL loading 在 Runtime reserve 前完成；pin/serialize 不启动 guardian |
| scripts/fixtures/windows-backup-journal-vfs.c | main open 前逐组件资格；journal FILE_CREATE/同句柄 I/O/close 后 exact-handle delete；资源上限与失败保留 |
| scripts/fixtures/windows-backup-journal-vfs.ts | 唯一 named VFS、guarded bootstrap、拒侧车/模式/fallback，bootstrap ownership 与 retryable close |
| scripts/fixtures/windows-backup-journal-crash.ts | 自有 Electron 在实际 COMMIT 前后等待父进程 kill |
| scripts/fixtures/windows-native-load-timeout.ts | 自有子 Host 永久 hook 与 partial-close cut，UNKNOWN 到真实进程退出 |
| scripts/windows-backup-native-load.test.ts | 首 NAPI/DLL load、Host independent identity、guardian death/timeout/partial-close/EXLOCK/路径对抗 |
| scripts/windows-backup-journal.test.ts | 24 项真实 SQLite lifecycle、碰撞、hot journal、kill、限额与 link/fallback 对抗 |
| scripts/windows-native-backup-integration.test.ts | 实际 Host maintenance/lease 使用 named VFS；同事务 backup-proof 和 readonly source proof |
| scripts/windows-backup-vfs.test.ts | 明确 per-connection preparation，保留原 identity/byte 断言 |
| scripts/windows-backup-helper.test.ts | Windows junction 仅删除 link 的安全 cleanup，setup 阶段失败不掩盖原错误 |
| scripts/run-electron-node-test.mjs | 仅两个明确测试 entry 的子进程设置 SQLITE_USE_URI=1 |
| .codeindex/tests-map.json | 注册两条标准 Electron runner 验证命令 |
| docs/platform/WINDOWS-BACKUP-TARGET-PROTOCOL.md | 当前 protocol、限定资格与历史边界 |
| src/main/library-lifecycle/README.md | 最近模块状态与当前证据入口 |
| src/main/independent-tags/README.md | 当前/历史证明与生产门区分 |
| TASK.md | 本请求状态、验证、恢复点与 STOP |
| docs/handoff/CURRENT-STATE.md | 唯一当前投影 |
| docs/handoff/WINDOWS-BACKUP-PATH-20261004.md | 本终态交接 |

WindowsNativeQualification build 源码未修改；scope extension 只是纳入预先准许的潜在文件，不代表实际修改。未跟踪新增源码与测试已纳入候选，不用旧 HEAD diff 代替本批 raw baseline diff。

## Before / after

- 之前首次 require/loadExtension 依赖 pathname 校验；现在 guardian 以 GENERIC_READ/shareREAD/noDELETE 持有组件及 leaf，READY 前复制到准确 Host，实际 NAPI 独立核对每个 Host file object、完整 same-handle SHA 和 module address pathname。guardian 突然死亡仍由 Host pin 持续保护。正常 Host 先关闭 duplicates；partial close 异常使用 ABANDON_UNKNOWN，不尝试旧数字，后续 preparation 拒绝。永久 hook 超时不进入 load、保留未知 pin 到自有进程物理退出。
- 之前 stock MAIN_JOURNAL 使用 OPEN_ALWAYS、close 后 pathname DeleteFile；现在 private named VFS 在首次源 SQL 之前绑定 main 并拒任何既有 journal/wal/shm，journal 用相对 FILE_CREATE，所有 I/O/sync/close/delete 绑定同一 handle。xClose 不丢失 delete 权威。hot journal 拒绝且不自动 rollback、恢复或删除。
- 之前事务 marker 与 source proof 分别验证；现在实际 maintenance 的 schema1→12、marker、原业务事务与 journal lifecycle 在同一 leased connection 验证。ACK 丢失仍是已提交；取消、DDL 故障与源变化按实际结果分类。readonly proof 是同进程新连接；独立真实进程 restart/kill 归 journal crash matrix，不把它们混称一条正式产品恢复路径。
- main 初始 ≤1MiB、写入/增长 ≤5MiB、journal ≤2MiB、session ≤128 次事务；OFF/MEMORY 与 RW→RO fallback 不能绕过资格。所有生产 Runtime、共享 ledger、UNKNOWN 物理 release 和撤权门保持，Windows 正式维护仍写入前拒绝。

## 适用验证

当前聚焦最终 138 PASS：native load 13、journal 24、helper 9、main VFS 10、native target 23、实际维护 6、commit proof 24、source 14、lifecycle 7、resource 4、生产拒绝 4。逐命令 raw log、exit、源码 SHA 在本机 verification-final / implementation freeze 证据；只统计最终选择集，不将中间复跑累加。candidate typecheck PASS；当前 666 产品输入和14 actual build artifacts 逐文件 SHA 核对 PASS，本批未重建产品。候选 ownership PASS（701/701）；Router suite 原 BUDGET_UNSATISFIABLE FAIL 保留，没有改预算、断言、测试门槛。

保留失败及真实调整：

- numeric EXLOCK 实际阻 DLL/NAPI 首加载，是被否证的方案，成功负向测试不转为可用实现。
- guardian 完整 EncodedCommand 超过 Windows 命令长度，首次 11 FAIL/1 PASS；改短 captured bootstrap 从 stdin 读取有界 script、仅在内存运行，不用临时 bootstrap DLL/执行策略绕过。
- 默认 SQLite DEFENSIVE 令 PRAGMA OFF 未真正生效，旧19/20保留；合成攻击 case 显式 unsafeMode 并断言实际 OFF，VFS 本身拒无 journal 主写入，安全门未降低。
- helper 首次8 PASS/1 FAIL 的 junction finally unlink EPERM 会掩盖 setup 原因；改有阶段标记、精确目标核对与 link-only rmdir，最终9 PASS。精确旧失败 fixture 现是原 compiler-output directory、无 junction 或 saved sibling；尝试恢复在对象检查处拒绝，未执行 mutation。详见 failed-fixture-state。
- 新 runner 被治理 UNSUPPORTED_VALIDATION_COMMAND 拒绝，失败保留；撤回自写 runner，改现有批准 runner 的两项窄子进程环境，不放宽治理 validator。其后 ownership PASS，Router 恢复为既有预算 FAIL。

独立 Standards 与 Spec 分别审查本批 raw baseline 增量，签最终 tree/review SHA；终审结论及准确身份见 standards-review-final、spec-review-final。主 Agent 验证不替代独立复核。两轴源码可行动发现已修复；整体生产资格保持 PARTIAL。

Computer Use：本批 NOT_RUN（private background native qualification，没有新增可见入口或正式 Adapter）。未启动正式 Host/profile制造验收；前批用户物理 Esc 中断仍 BLOCKED_UX_ACCEPTANCE，旧截图或 UI PASS 不归本批。命名业务实际接线/正式双客户端/安装包路径未验证。

## 当前身份

- HEAD b5cc954f90d248694aedc2d6ca1aa5188fa0aa11；branch codex/windows-workspace-1001。实际 WIP、raw blobs、22 文件 before/after/reverse reconstruction、candidate tree 分列保存在 candidate-manifest 与 closure-verification。
- actual build dam-4c583238a11c002d；sourceDigest 4c583238a11c002d03925b3e5a0d9cfdb879ef8c705a7b7331d7b18c6bb53bff；sourceCount666；builtAt2026-10-04T07:17:49.145Z。本批逐字节核对沿用，artifactDigest aa23d1b4f766527cd9345333db3275cdb21215f2caa9fcdd2620ec4acef577ac（14输出）；root generated 是原 WIP，actual generated 在候选单独封存。
- 当前隔离测试 runtime：Electron30.5.1 / Node20.16.0 / ABI123 / NAPI9 / libuv1.46.0；Windows x64 10.0.26200。外层命令 Node25.7.0/ABI141 分列，不使用它运行 better-sqlite3，也不重编 SQLite。
- SQLite3.53.1，source ID2026-05-05 10:34:17 c88b22011a54b4f6fbd149e9f8e4de77658ce58143a1af0e3785e4e6475127e9；nativeSHA258341bfff296ac7a779c1dfc35e0b781c18c1a1b9ec3406551dbb473b4fe359。installed native/OS/CLR 仍是显式信任根。
- 既有 MSVC14.44.35207 / SDK10.0.26100.0、csc及本机NAPI25.7 headers，仅 captured 测试 build；compiler+link SHA c4f3af53dcc6a620c0335ba9c84a88362394739bb30b78c8e5e45d9224b9dc9d。各实际 DLL/NAPI/header/guardian/bootstrap SHA 见 safe-load-implementation-final、journal-qualified-freeze 与日志 receipt；编译输出因绝对 build 输入及时间可不同，不用源 SHA冒充artifact SHA。
- Pi source Node24.21.0/SDK0.99.1；release/Main pin99e47ca53d91aa342d134125f1980106105e27186ef4f61640c3bc3b98c651c0，当前 source闭包核对；本批未运行Pi/model，不称实际模型Runtime已验证。

## 尚未验证与下一批建议

生产资格仍未闭合：晚期 source/journal hardlink 可成功，下一操作身份重验后拒绝只是限定检测证据；完整 namespace metadata/全部 FSCTL/已有外部 writer 原子隔离未证明。trusted OS/installed native bootstrap、DLL全部依赖与签名/分发闭包、managed executable pathname完整资格、guardian startup 原子 Job与完整 preparation 预算/硬RSS、目录及断电 durability、native main close/真实kernel CloseHandle失败故障注入仍未验证。partial 成功 CloseHandle 后应用异常已有物理cut，不冒充kernel CloseHandle故障；async continuation未单独验证。productionBootstrap/namespaceMetadata/dependencyClosure/signedDistribution/guardianStartupHardLimited、directoryDurability、productionQualified/restoreAllowed 均false。

下一批建议：先在同样的受控合成 NTFS 范围，对 source/journal/managed executable 的 metadata/FSCTL 与既有句柄竞争做资格矩阵，明确可证明的 namespace边界；再闭合 guardian preparation资源和分发/bootstrap来源。仍不建议当前直接正式 Adapter 接线。真实库/模型/Provider/安装/发布/CU另需相应范围，不能由本批自动延续。旧 admission/生产正向/UI与Router队列保留，未为了全绿处理无关项。

Remote Desktop Commander 快速接手：先读本文件和 CURRENT-STATE；再打开本机 .scratch/windows-backup-path-20261004/terminal-anchor.json 和 evidence-manifest-final.json 核对SHA。里面给出当前 tree/build/runtime、两轴review、测试选择集/失败分类、before/after/raw blob/reverse patch、WIP/index/root generated 与最终自有process/listener状态。此处 STOP；没有下一批运行授权，也没有自动恢复或生产写入资格。
