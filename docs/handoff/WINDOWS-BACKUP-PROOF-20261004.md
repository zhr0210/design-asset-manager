# WC01 Windows helper / VFS / commit proof 终态

2026-10-04，合成证明链验证完成；整体生产资格 **PARTIAL / STOP**。用户本批批准补 helper 资源、SQLite VFS 源身份与事务提交证明。正式 Adapter/composition 未接线，下一批未授权。仅自有合成 SQLite、原生 fixture 和机器已有编译器；无真实库、模型、账号、凭据、下载/安装、Provider、stage/commit/push/发布。

## 实际修改（25 文件）

| 分组 | 文件 |
| --- | --- |
| Main 私有证明 / 生命周期 | `src/main/platform/windows-backup-commit.internal.ts`（新增）、`windows-backup-lifecycle.internal.ts`、`windows-backup-source.internal.ts`；`src/main/library-lifecycle/host-schema-maintenance.internal.ts` |
| helper / 编译准备 | `scripts/fixtures/windows-backup-helper-supervisor.cpp`（新增）、`windows-native-qualification-build.ts`（新增）、`windows-backup-helper-process.ts`、`windows-backup-helper-launcher.cs` |
| VFS / crash fixture | `scripts/fixtures/windows-backup-vfs-extension.c`（新增）、`windows-backup-vfs.ts`（新增）、`windows-backup-commit-crash.ts`（新增） |
| 测试 | `scripts/windows-backup-helper.test.ts`（新增）、`windows-backup-vfs.test.ts`（新增）、`windows-backup-commit.test.ts`、`windows-backup-lifecycle.test.ts`、`windows-backup-source.test.ts`、`windows-native-backup-target.test.ts`、`windows-native-backup-integration.test.ts` |
| 文档 / 治理 | `.codeindex/tests-map.json`、`TASK.md`、`docs/handoff/CURRENT-STATE.md`、本文件（新增）、`docs/platform/WINDOWS-BACKUP-TARGET-PROTOCOL.md`、`src/main/independent-tags/README.md`、`src/main/library-lifecycle/README.md` |

精确 before/after SHA、raw bytes 与仅本批 patch 在证据 `file-scope.json` / `incremental-review.diff`；不把当前全部 WIP 当成本批修改。实际 generated build identity 仅写独立 candidate；根旧 generated 原字节保留。

## before / after 与当前源码差异

- helper 原先只在 CLR Main 后设限，receipt 后尾段未完整测量。现在 Host 内 NAPI supervisor 使用 `PROC_THREAD_ATTRIBUTE_JOB_LIST` 原子出生入限额 Job，具体 Job membership 确认后 resume；retained process/Job handles 到 actual exit、Job empty、pendingWrites=0 后取完整 kernel 高水位。128 MiB/process、256 MiB/job 是 **private commit** 硬限；RSS 是完整 postexit 峰值，`rssHardLimited=false`。blocked pipe input 使用异步 work；Owner/Buffer 引用到 completion，创建失败在 queue 前拒绝并清理。BCrypt 与 attribute-list 异常清理已收敛。
- UNKNOWN 原先可能被 Promise reject 或同步 throw 当成普通结束释放。现在二者均保留共享 VisualAdmission ledger；独立 reaper 确认物理退出才能释放。abort、hold 退出或 admission resume 不能证明 release。
- 源身份原先只来自 pathname/native retained source。现在隔离 extension 用真实 `SQLITE_FCNTL_WIN32_GET_HANDLE=29` 查询当前 main file object；readonly duplicate 只核验 identity，完整 SHA 从独立 no-reparse retained leaf 读取，不改变 SQLite file pointer。serialize 前、native source binding、DDL 前及 readonly 恢复事务重验。实际 schema 检查会 materialize SQLite 自有空 temp；只允许该空 temp，非空 temp/attach 拒绝，不机械沿用“database_list 必须长度1”。
- finished 原先只是 Main 声明。现在 private recordCommit 在**同一个 DDL/业务 write 事务**写现有 settled journal 的 `backup-proof:v1:<binding SHA>:<image SHA>:<target schema>`；异常原子回滚，事务返回才置 committed。当前源 readonly/query_only/FULL/DELETE、身份/代际、真实 VFS、完整 known schema、settled journal≤128 与实际记录回读才返回 `recorded-commit`。status 仍仅 `commit-claimed`，`restoreAllowed=false`、`productionQualified=false`。它是独占 Host authority 下当前源记录事实，不是对任意库外 writer 的密码学证明。
- 不新增表/列/trigger/状态集合/公共 IPC；正式 storage 不提供 commit hook，生产 Windows `TAG_INTENT_BACKUP_UNSUPPORTED` 写入前拒绝保持原字节。

## 验证与失败分类

本批聚焦 **144/144 PASS**，另独立 held ancestry 合成实验 2 项限定 PASS。命令、起止/exit、日志 SHA 和完整资源 receipt 见 `.scratch/windows-backup-proof-20261004/verification-summary.json`。

| 检查 | 结果 | 覆盖 |
| --- | --- | --- |
| helper | 9/9 | 真实 suspended launch UNKNOWN、startup/tail OOM、1 MiB 不读输入实际 timeout/kill、held replacement/hardlink/junction |
| native target | 23/23 | no-reparse create、同句柄 hash/readback、flush cut、interruption/retrieval、finish failure |
| VFS | 10/10 | current file-object identity、同 SHA 不同 fileID、link/junction、readonly txn、writer txn refusal、native coexist |
| commit | 24/24 | 同事务原子回滚、schema/identity/journal容量与状态、真正 owned Electron 实际 COMMIT 前/后 kill 后 readonly 重开 |
| lifecycle / source | 7/7、14/14 | sync/async UNKNOWN 占账、async pin取消；uint64、connection、data_version、size/hash/space |
| 实际 SQLite lease / maintenance 整合 | 6/6 | 正常 v1→12、取消、DDL 回滚、RAM 拒绝、ACK uncertain、source changed；source readonly/VFS独立commit回读 |
| 维护 / 生产拒绝 / bound recovery | 37/37、4/4、10/10 | 私有 hook 与正式拒绝兼容、status不授予source commit/restore |
| candidate typecheck / 正式 npm build | PASS | 独立 candidate，build-identity 后 electron-vite；非签名安装包 |
| candidate ownership | PASS | 独立 index 覆盖 701/701 owned，47 excluded；未 stage 真实 index |
| Router 相关整套 | FAIL 保留 | candidate `BUDGET_UNSATISFIABLE`；不调预算/断言。真实 index 的未跟踪命令拒绝单列，candidate closure 已证明 |

首次 commit 23/24 的精确错误分类旧断言已改为 `JOURNAL_REFUSED` 后 24/24。整合早版 1pass/5fail 已保留：已确认 readonly helper 返回 BEGIN 的真实连接，pin 必须按 readonly-transaction；pin 初始化失败也必须 finally close。早版 cancel 399.876秒缺阶段证据，完整耗时原因未证明；冻结当前源码后的 sealed 6/6 约8.7秒，不能倒推旧因。首次 `npm.cmd` spawn EINVAL 是 runner 调用错误，改用 Node npm-cli 后真实 typecheck/build PASS。编译准备和早版故障日志均保留，不删失败制造全绿。

独立 Standards / Spec 固定源码与终态增量签收见证据 `review-standards-final.*`、`review-spec-final.*` 及 `review-spec-delta.*`。本批发现的 journal 全状态、sync UNKNOWN、过度 pathname 声明和 native exception cleanup 已修复复核。整体生产资格仍 PARTIAL，源码审阅不能替代下面未验证项目。

## Computer Use 与尚未闭合资格

本批无新增正式 UI 或生产接线；Computer Use **NOT_RUN**，原生测试不记 CU。前批 WBR-D01 的物理 Esc 中断仍为 `BLOCKED_UX_ACCEPTANCE`；本批仅精确核对自有 PID/profile/executable 后工程停止旧 Host12284，exit4294967295、64869 listener关闭，不能算正常 quit 或补成 CU PASS。前批终态未封存，与本批分别保留。

独立 FSCTL 实验中 library/.dam 属性句柄均能打开，junction 修改因 `ERROR_DIR_NOT_EMPTY(145)` 拒绝；VFS/file/hash、SQLite值与 sentinel保持且合成树回收。仅覆盖这两个非空祖先切点；该实验绑定较早 supervisor 源 SHA，VFS源码未改变。

以下不得提升为生产资格：

- NAPI/DLL 校验与 pathname load 间 TOCTOU；managed executable ancestry/metadata 与 pathname launch全链路。receipt明确 `managedArtifactsPinned=true`，`managedExecutablePathLaunchQualified=false`、`supervisorModuleLoadQualified=false`。
- source journal pathname 完整创建/提交/重启生命周期与异常对抗；现有 VFS 证明 **file-object provenance**，不等于整条 pathname资格。
- hard RSS、Main/native模块所有异常分配的故障注入、分发包/native签名与目标机器兼容、断电/硬件崩溃/磁盘断连、任意外部 writer 的认证取证。
- 正式 Adapter/composition、原正向生产升级套件、完整本 build业务CU。真实模型/库/账号、macOS实机均 NOT_RUN。

## 当前源码 / build / runtime 身份

HEAD `b5cc954f90d248694aedc2d6ca1aa5188fa0aa11`；branch `codex/windows-workspace-1001`。本批 baseline 记录3279路径（3270既有文件+9缺失记录），终态 candidate 3280个tracked/untracked raw文件；实际 tree、全部 blob、两轴签收、patch与逆向重建在 `candidate-manifest.json` / `closure-verification.json` / `terminal-anchor.json`。树由独立 index封存，不是commit，不改变真实 index。

build **dam-4c583238a11c002d**；sourceDigest `4c583238a11c002d03925b3e5a0d9cfdb879ef8c705a7b7331d7b18c6bb53bff`；666产品输入；14产物；artifactDigest `aa23d1b4f766527cd9345333db3275cdb21215f2caa9fcdd2620ec4acef577ac`。candidate typecheck/build后的cpp异常清理增量属于scripts，不在产品 build输入；最终product字节核验保持同digest。根 generated不代表该build。

实际测试 Electron30.5.1 / Node20.16.0 / ABI123 / NAPI9 / libuv1.46.0，Windows x64 10.0.26200；shell Node25.7.0仅编排。SQLite3.53.1 source ID `2026-05-05 10:34:17 c88b22011a54b4f6fbd149e9f8e4de77658ce58143a1af0e3785e4e6475127e9`；native SHA `258341bfff296ac7a779c1dfc35e0b781c18c1a1b9ec3406551dbb473b4fe359`。VFS headers SHA、每次native artifact/compiler SHA及完整helper峰值见verification/runtime证据。编译使用已有MSVC14.44.35207、SDK10.0.26100.0、Framework64 csc；这是本机Validated Tracer，不是分发包资格。

Pi源码/metadata本批逐字节与baseline一致：Windows x64 Node24.21.0 / SDK0.99.1，release/Main pin `99e47ca53d91aa342d134125f1980106105e27186ef4f61640c3bc3b98c651c0`；本批不执行Pi/真实模型，不能把旧探测写本批PASS。证据 `pi-source-identity.json`。

## 下一批建议与 Remote Desktop Commander 锚点

先做 native/DLL/executable 安全加载与 source journal pathname 资格纵切，明确资源上界和分发资格。通过后再提出具体正式 Adapter/private seam方案及原正向生产路径/CU验收；公共兼容取舍按具体范围审批。本批不自动接线。历史admission旧codec前提、生产正向升级、Router预算、菜单裁切/诊断提示与前批CU缺口保留各自队列，不借本批合成PASS改判。

Remote入口：先读 `docs/handoff/CURRENT-STATE.md` 与本文件，再核对 `.scratch/windows-backup-proof-20261004/terminal-anchor.json` 的 tree/build/runtime、manifest SHA及进程/listener终态。证据根保留 baseline、before/after、仅本批patch、候选、rawblob/逆向重建、完整命令日志、失败队列、独立审阅及 `evidence-manifest-final.json`。无新正式Host/UI启动；此前旧Host工程停止单列。**STOP，nextBatchAuthorized=false**。
