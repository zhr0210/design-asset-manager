# WC01 Windows release attribution / source-loader boundary

2026-10-04，**PARTIAL / STOP**。已完成本批批准的私有合成释放诊断、source/snapshot/executable 威胁边界、最小诊断修复与适用验证。**EBUSY owner/timing 仍 UNKNOWN，productionQualified/restoreAllowed/namespaceMetadataQualified=false，formalAdapterWired=false，nextBatchAuthorized=false。** 本批不进入正式 Adapter、preparation-resource/bootstrap-distribution 或 OS broker/ACL 实施。

## 当前结果与 before / after

| 项目 | Before | 本批实际 After 与限制 |
| --- | --- | --- |
| 立即释放 | 上批保留三次首次 ancestor rename EBUSY，Node close 不能证明全部内核资源释放 | 当前源码 3 个并行自有 Host 的 72 个 fresh 样本又有 3 次首次 EBUSY。新增每样本单次 rename、retained direct-child PROCESS Wait(0)、首次 move 后的当前 Host PSS/typed DISK duplicate 元数据观察。没有失败瞬间 owner 证据，不能宣称修复 |
| 内存镜像 | 已有完整 bounded verifier，缺少与 source/Buffer/已有 writer 的明确资格区分 | 4 项真实合成 SQLite 实验：合法后续 source commit 不改原镜像；readonly 内存 SQLite 独立复制但 caller Buffer 可变；既有 writer 可改后返还 endpoint SHA；READONLY 可撤销且不撤已有权限。完整 source match 因 written 变化继续拒绝，未绕安全门 |
| 诊断异常 | 新增 observer 与 scanner 的预审发现三项清理缺陷 | 外层 finally 一次关闭 retained PROCESS，成功 move 后异常一次恢复自有根；UNKNOWN close 保留计数/poison，不重试旧数字。throw/thenable 子 Host 不调用 load、保留 UNKNOWN、后续 preparation 拒绝 |
| 策略 | metadata/hash、snapshot、loaded code 的能力容易混同 | [威胁边界](../platform/WINDOWS-BACKUP-THREAT-BOUNDARY.md) 分离三对象、principal 和 lifetime；A 协作 Host authority、B 独立 OS principal 均为 Target Architecture，未选作生产政策，未缩小原安全目标 |
| 当前入口 | 最近说明仍指 metadata 批及其旧 98/1 | CURRENT-STATE、TASK、协议和两个最近 README 指本批；历史保留日期/来源，旧 PASS 不作为当前执行证据 |

源身份、connection、metadata、完整 schema/FK/事务、资源 UNKNOWN、业务撤权与生产拒绝门都保留。未修改生产 backup、公共 IPC/schema/journal 或 Runtime 执行接口。无真实素材库/模型/账号/凭据、Provider 外发、下载/安装、stage/commit/push/发布；原 index、root generated 与无关 WIP 保持。

## 实际修改文件（13）

- `scripts/fixtures/windows-backup-release-diagnostic.ts`（新）：私有有界首 move 与 observer fault 诊断，独立 owner cleanup。
- `scripts/fixtures/windows-backup-release-probe.cpp`（新）：同一 owned child PROCESS、当前 Host PSS/typed DISK duplicate 查询与一次 CloseHandle；无系统句柄枚举或 CLOSE_SOURCE。
- `scripts/windows-backup-release.test.ts`（新）：fresh RW/DELETE 首 rename 原强断言、PSS held/closed 正控制、隔离 throw/thenable fault。
- `scripts/fixtures/windows-backup-native-load.ts`：spawn 后、stdin 前的同步只读 observer seam；原 load/receipt/deadline/拒绝不升级。
- `scripts/windows-backup-immutable-source.test.ts`（新）：四项真实 synthetic schema1/actual-MAIN/caller Buffer 边界实验。
- `docs/platform/WINDOWS-BACKUP-THREAT-BOUNDARY.md`（新）：当前调用链、反例、A/B 取舍与实施边界。
- `docs/platform/WINDOWS-BACKUP-TARGET-PROTOCOL.md`：当前协议边界，历史按来源保留。
- `src/main/library-lifecycle/README.md`、`src/main/independent-tags/README.md`：当前入口及生产拒绝事实。
- `.codeindex/tests-map.json`：登记 release 与 immutable source 测试命令。
- `TASK.md`、`docs/handoff/CURRENT-STATE.md`、本文件：终态与交接。

完整 raw before/after、仅本批 diff 和 SHA 在本机 `file-scope.json` / `incremental-review.diff`。原 artifact/native-load 断言文件未编辑。六个新文件及现有全 WIP 明确纳入 isolated candidate，不能遗漏未跟踪命令/源码。

## 验证与失败分类

最终选定 **8 条命令 / 6 个测试文件，44 PASS / 0 FAIL**；这不是全部尝试全绿。完整 receipt、log SHA 和版本绑定见 `verification-final.json` / `release-diagnostic-final.json`。未因通过而刷绿旧失败，也未加首 rename retry/delay。

| 最终适用检查 | 结果 |
| --- | --- |
| guardian-wait、native-first-move | 各 3 tests PASS / 24 fresh 首次 move PASS；共 48 个成功样本，move 前 retained guardian 均 kernel-signaled。不能回溯归因另一次失败 |
| 最终默认 release / observer 子 Host | 4/4 PASS，24 首 rename PASS；throw/thenable 均 UNKNOWN、guardian signaled、load 未调用、后续 prepare 拒绝 |
| native-load / immutable-source / snapshot | 13/13、4/4、4/4 PASS |
| helper / 正式 Windows 写入前拒绝 | 9/9、4/4 PASS |
| candidate tsc --noEmit / ownership | PASS；701/701 owned，47 excluded |
| 产品输入/实际产物 | 666/14 逐 SHA PASS，沿用实际 build，未重新构建产品 |
| Router | FAIL `BUDGET_UNSATISFIABLE`，原预算与断言保持 |
| 独立 Standards / Spec | 分别在本机 `standards-review-final.json` / `spec-review-final.json` 对最终 tree、raw diff 和证据签收；缺失或 stale 签名不得算通过 |

Instrumented 两个 mode 的 test SHA 为 9e9b266b…；终态默认 test SHA 为 d427d27b…，差异只补未在两个 mode 执行的 fault-child LOCALAPPDATA 环境。scanner、guard、matrix 分支未改；受影响的子 Host 分支已在当前终态默认命令复测。精确文件/编译 artifact/source/compiler/header SHA 见 freeze 与诊断报告，不能用旧日志冒充新源码全执行。

必须保留的非选定记录：

- **RELEASE-UNKNOWN**：上批三次 EBUSY、本批 3/72 首次 EBUSY。串行 24 成功、其他并行 Host 成功、原 artifact 10/10 与后来 rename 只证明各自时点；不指认 AV/Windows/filter 为原因。
- **PSS-NAME-COVERAGE**：两轮 name-only 正控制 FAIL；本机 File 条目没有名称，零具名匹配不能推断无 owner。补 query 后 held root/leaf 2、closed 0，仅 capture 后当前 duplicate 对象；numeric reuse、untyped/non-DISK/query unavailable 和更早时点未覆盖。
- **SCANNER-NOT-COMPLETE**：旧未加 DISK filter 的诊断工程中止，精确自有 Host25972 / esbuild29952 核对与停止见 `release-owned-stop.json`。exit4294967295，不算正常退出。阻塞具体 API 原因未证明；后续 filtered 有界完成不能把该次变 PASS。
- **OBSERVER-CHILD-ENV**：最初终态默认 2 PASS / 2 FAIL，子 Host 缺 LOCALAPPDATA，已安装 node-gyp 头文件路径不可用，C1083。最小 allowlist 补正后 4/4；无下载/安装、无断言降低。
- **CHECK-COMMAND**：主 Agent 误用不存在的 tsconfig.node/web 两次 TS5058；保留错误日志，按真实 tsconfig.json / tsc --noEmit 修正通过。

Computer Use 本批 **NOT_RUN**：仅私有诊断/文档，未改产品 UI 或正式 Adapter，也未启动普通产品 Host。前批用户 Esc 的 **BLOCKED_UX_ACCEPTANCE** 不清除，Browser/Desktop 业务 UX 未补验。代码/契约 PASS 不替代 UX。

## 当前 source / build / runtime

| 身份 | 当前证据 |
| --- | --- |
| HEAD / branch | `b5cc954f90d248694aedc2d6ca1aa5188fa0aa11` / `codex/windows-workspace-1001`，未 commit |
| 当前 WIP / candidate | baseline 3306 path records / 3295 existing；当前全 tracked/untracked raw candidate 3301 files、本批 13 文件，最终 tree 与 raw closure 见 `terminal-anchor.json`。不是 HEAD，也不是仅已跟踪清单 |
| actual product build | `dam-4c583238a11c002d`；sourceDigest `4c583238a11c002d03925b3e5a0d9cfdb879ef8c705a7b7331d7b18c6bb53bff`，666 inputs，14 outputs；artifactDigest `aa23d1b4f766527cd9345333db3275cdb21215f2caa9fcdd2620ec4acef577ac` |
| root generated / actual generated | root 旧 WIP 字节保留，SHA d227f4ee…；实际 candidate generated SHA16df0552…另封入 tree，不能把 root 旧声明当当前 build |
| 当前 test Runtime | Windows x64 10.0.26200，Electron30.5.1 / Node20.16.0 / ABI123 / NAPI9 / libuv1.46.0；外层 harness Node25.7.0 / ABI141 另列 |
| SQLite | 3.53.1；source ID `2026-05-05 10:34:17 c88b22011a54b4f6fbd149e9f8e4de77658ce58143a1af0e3785e4e6475127e9`；native SHA `258341bfff296ac7a779c1dfc35e0b781c18c1a1b9ec3406551dbb473b4fe359` |
| Pi | source Node24.21.0 / SDK0.99.1 / pin `99e47ca53d91aa342d134125f1980106105e27186ef4f61640c3bc3b98c651c0`；NOT_EXECUTED。未运行模型、未授予 Real Model Path |

## 未验证及下一建议

释放 failure-time owner、真实 kernel/MAIN close fault、任意既有 writer/mapping/section、完整 metadata/祖先可变 authority、snapshot transfer ownership、原子 pre-I/O/load 与实际 loaded dependency closure、managed executable 仍未取得资格。guardian 准备 Job/全生命周期预算、bootstrap/dependency/signature/distribution、hard RSS、目录 sync/断电、真实安装包和 Mac 均未完成。真实数据/模型/账号仍 NOT_RUN。

下一批建议**先形成可审阅的 authority 决策与 native/OS 设计**：明确需隔离哪个 principal、哪个对象和哪段 lifetime，是否保证任意库外 writer/loader 防护，再比较 A/B 是否满足原安全目标，并列出 controlled test plan。保留 EBUSY UNKNOWN 和资源/分发资格队列。此建议不授予 broker/token/ACL/service/account/native production seam 实施；正式 Adapter 继续等资格收敛。本批后停止，不自动进入下一阶段。

## Remote Desktop Commander 终态锚点

1. 从本文件、`docs/handoff/CURRENT-STATE.md`、`TASK.md` 进入。
2. 本机 `.scratch/windows-backup-boundary-20261004/terminal-anchor.json`、`evidence-manifest-final.json`：先核 SHA/最终 tree，再看 `file-scope.json`、`incremental-review.diff`、`closure-verification.json`。
3. 检查 `verification-final.json`、`failure-classification-final.json`、`release-diagnostic-final.json`、两个独立 review，以及 `artifact-manifest.json` / `build-reuse.json` / `runtime-identity.json`。
4. `process-final.json` 核终态自有 Electron/helper/guardian/test Node 与旧64869 listener 为0；普通 app quit NOT_RUN，旧 scanner 工程停止另列。不得凭进程退出或证据文件存在授予生产。
5. 该 `.scratch` 为本机完整证据；普通源码 checkout 不包含它。此前 metadata sealed tree a22987b4…及130份历史 SHA只证明起点，不继承 PASS。保持真实 index、root generated 与无关 WIP，不 reset/clean/stash 或 commit/push。
