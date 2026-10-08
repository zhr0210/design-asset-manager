# Windows codec 与本地 NTFS 备份资格纵切终态

2026-10-04；最新用户单独批准的 WC01 后续纵切。**PARTIAL / STOP**：限定 Windows codec 交付；Windows NTFS 备份资格未交付，保留安全拒绝；下一批未授权。无 commit/push/发布、下载/依赖安装、真实模型/账号/素材库或 Provider/订阅开放。

## Before / after

| 能力 | 本轮前 | 当前行为 |
| --- | --- | --- |
| Windows visual preparation | 平台 codec 未资格化，视觉不可用；WC01 已隔离能力拒绝 | 精确 Windows x64 Electron30.5.1/Node20.16.0/ABI123 + Sharp0.34.5/libvips8.17.3/native SHA 才转换，正式 PNG/JPEG 审查已实测 |
| 资源账本 | macOS owned峰值；Windows不能据此放行 | Windows worker等 fd4 ack；Main持有进程 HANDLE、核验 spawn 时间窗内 StartTime后取 OS peak；计入 helper峰值与128MiB固定收尾估算，Promise等 worker close/helper settle 后归还 |
| 原安全门 | 32MiB source、50M pixels、单页8bit PNG/JPEG/WebP、1024白底JPEG85、4MiB output、原256MiB估算门 | 全部保留；UNKNOWN/无效/超额资源仍保守熔断共享准入，能力拒绝只影响视觉，恢复资源不恢复撤权 |
| Windows schema backup | 生产 TAG_INTENT_BACKUP_UNSUPPORTED | 仍在任何备份写入/DDL前拒绝；普通素材入库、编辑和重开可用。卷 classifier/UNC先拒绝/缩减 helper环境已保留 |

50M限定样本计账358,563,840B，小于原门469,112,929B。128MiB是固定保守估算，不是 helper 完整生命周期最终峰值实测或 OS 硬上限。

## 与计划差异及撤回

当前源码安全不变量要求备份状态不能越界、成功状态与父目录有可论证的持久化保证。临时 PowerShell/MoveFileEx publisher正常合成链路曾6/6及30/30，但独立复核复现 operation目录在guard后被替换为库外junction，可覆盖库外合成status；同时新建 schema-backups/operation父目录持久化未被证明。未降低门槛。

处理：完全删除新publisher与调用，生产 tag-intent-backup.ts 精确恢复本轮before原始字节（SHA256 6ca9b0b2499ef917217795337f137c30c6b27ba9a7f84c39dcb71694e434b5ee）。旧成功日志标 WITHDRAWN TRACER。P1危险代码已关闭；产品NTFS能力保持BLOCKED，需要安全方案而非机械套旧补丁。

## 本轮实际文件

以下仅为 baseline before→after 的本轮增量，不包含原有WC01与其他dirty WIP；最终raw哈希与可审查差异见本机 file-scope.json / incremental-review.diff；该增量不得直接套用到HEAD覆盖原有WIP。

- src/main/visual-ai/visual-preparation.ts（修改）
- src/main/visual-ai/visual-codec.worker.ts（修改）
- src/main/visual-ai/visual-codec-qualification.internal.ts（新增）
- src/main/platform/windows-process-memory.internal.ts（新增）
- src/main/visual-ai/README.md（修改）
- src/main/library-lifecycle/README.md（修改）
- src/main/independent-tags/README.md（修改）
- scripts/windows-codec-qualification.test.ts（新增）
- scripts/windows-schema-backup-qualification.test.ts（新增）
- package.json（修改）
- .codeindex/tests-map.json（修改）
- TASK.md（修改）
- docs/handoff/CURRENT-STATE.md（修改）
- docs/handoff/WINDOWS-QUALIFICATION-20261003.md（新增）
- src/main/library-lifecycle/local-volume-qualification.ts（修改）
- scripts/independent-tag-intent.integration.test.ts（修改）
- scripts/windows-codec-faults.test.ts（新增）

tag-intent-backup.ts 与已撤回 schema-backup-platform.internal.ts 不属于终态修改。测试Windows held-lock置换断言按OS实际拒绝保留原字节/无DDL；POSIX仍保留成功置换quarantine断言。frozen源仅CRLF→LF归一比原manifest，未重基线。

## 验证

| 记录 | 状态 | 实际范围 |
| --- | --- | --- |
| codec-matrix-04 | PASS | 8/8; bounded PNG/JPEG/WebP, limits/native/real OS accounting |
| codec-faults-03 | PASS | 4/4; native rejection isolation, invalid/overbudget peak, actual30s timeout |
| admission-final-01 | PASS | 10/10; real synthetic PNG/JPEG/WebP |
| isolation-final-01 | PASS | 10/10; shell Node25.7 unqualified path isolates visual |
| ntfs-final-guard-01 | PASS | 4/4; local volume/native evidence and unsupported refusal without writes |
| maintenance-final-01 | PASS | 30/30; private synthetic backup adapters, does not qualify NTFS |
| quiescence-final-01 | PASS | 11/11; ownership/lifetime regressions |
| candidate-typecheck-01 | PASS | candidate typecheck exit0 |
| context-candidate-01 | PASS | 694/694 owned; temporary candidate index only |
| router-candidate-01 | FAIL | existing BUDGET_UNSATISFIABLE; no expanded fix |
| ntfs-production-final-01 | FAIL | current production original positive suite:16 reached,5 PASS,10 BACKUP_UNSUPPORTED failures,1 cancelled at unreachable backup barrier; later tests not reached |
| ntfs-matrix-01 | WITHDRAWN_TRACER | 6/6 on removed Windows adapter, not current qualification |
| ntfs-original-03 | WITHDRAWN_TRACER | 30/30 on removed Windows adapter, not current qualification |
| electron-vite build | PASS | 现有依赖、独立candidate，工具session81526 exit0；未单存完整build日志，artifact SHA与运行About另证 |

77项限定聚焦测试通过，不等于所有测试绿。当前生产正向升级套件失败被保留，未删失败测试、放宽断言或安全门。其5个失败注入测试在Windows早期拒绝路径通过，不能算对应备份/DDL阶段已触达。终态治理复检记录见 context-terminal-01；已有router预算失败保留，不自动扩修。

## Computer Use

正式 Shared Browser Client→当前built Electron Local Host；WQ-01 / local-client-synthetic。Host声明synthetic-isolated、receipt、受控选择器与生成PNG/JPEG核对隔离。Codex IAB，Windows x64，明亮主题/default zoom；556×672及1280×900，临时viewport已reset。Electron30.5.1已确认；浏览器版本和OS缩放未独立测量。

Browser PASS：普通启动→创建库→正式选择两图→Copy确认；自有loopback合成服务→PNG分析准备/取消/重复；独立标签确认保存收到明确备份拒绝与0批任务；JPEG准备/取消；普通描述保存→关库/重开，2图与用户编辑保护保留；菜单About显示 dam-66a3d34ea3bbf6ce；菜单确认退出，Host launcher71881 exit0。自有fixture inference/downloads/catalog均0，监听51148/51153已关闭。

Desktop **BLOCKED_UX_ACCEPTANCE**：同一受控profile第二实例已启动，两次sky inventory均无electron.exe可操作窗口。未操作无关Chrome。PID21376精确核验command/profile/parent后工程停止，launcher52870 exit1/child4294967295；不是正常CU退出证据。不宣称完整跨端UI/UX验收。

完整操作—预期—实际、截图、限制：[本机CU报告](../../.scratch/windows-qualification-20261003/computer-use-final.md)。关键证据 cu-visual-review-visible.png、cu-backup-refused-visible.png、cu-jpeg-review.png、cu-manual-reopened.png、cu-about.png 及对应DOM；初始窄窗口review截图不单独作为完整证据。

## 独立复核

Standards与Spec分别由win_qualification_standards / win_qualification_spec只读复核。保留代码0项未解决可行动发现；原P1通过撤回代码关闭。Spec明确NTFS要求部分未达；固定128MiB估算、Desktop、真实推理、发布与断电不在代码复核通过范围。各轴原结论见本机review-final.md/json。

## 身份与候选闭包

- HEAD b5cc954f90d248694aedc2d6ca1aa5188fa0aa11；branch codex/windows-workspace-1001。保留原dirty WIP，真实index条目（路径/模式/blob/stage）仍精确对应HEAD，暂存区空；二进制stat缓存已被只读status刷新，与baseline hash不同，未回滚缓存。跟踪非scope源码按baseline逐字节核对；12项既有未跟踪WIP按起点status会员及前次root raw来源摘要逐字节核对一致。未commit。
- 独立candidate来自HEAD + 当前保留WIP + 明确未跟踪源码/命令。raw字节hash-object --no-filters、core.autocrlf=false、临时candidate.index；最终tree与逐文件provenance以本机candidate-manifest.json / closure-verification.json为准。最终测试/文档同步未改变产品输入。
- 实际build dam-66a3d34ea3bbf6ce，sourceDigest 66a3d34ea3bbf6ce0f9c6bf6677c92aa4ed784bb1baf9c2584474c2a6592b33b，659产品输入，builtAt 2026-10-03T18:47:15.462Z；candidate/out。About与Host一致。root build-identity.generated.ts旧WIP保留，不能代表本轮build；candidate generated另列build产物。
- Windows codec：Electron30.5.1/Node20.16.0/ABI123，Sharp0.34.5/libvips8.17.3；native SHA sharp=afc813593f255968ddae8f1d66557e0f96484bb374606e4eb2267a7dbc7cb25a，vips=f1b3c3eeea1b6a8292a69d78dd2cd1debacb9951cabdd9217a57e34137570cd1。
- Electron SQLite3.53.1，source c88b22011a54b4f6fbd149e9f8e4de77658ce58143a1af0e3785e4e6475127e9（2026-05-05）；win native SHA258341bfff296ac7a779c1dfc35e0b781c18c1a1b9ec3406551dbb473b4fe359；前置存在不等于NTFSbackup资格。
- Pi源release保留WC01 Node24.21.0/SDK0.99.1 Windows资源声明；本轮未启动Pi/真实模型，未认证实际安装runtime、凭据或模型路径。shell Node25.7.0/ABI141只是编排器，不能冒充Electroncodec或PiNode。资源声明/源manifest哈希另列artifact manifest，不继承历史runtime PASS。

## 未验证与下一批建议

未验证：安全NTFS成功备份/DDL、junction贯穿防置换/新父目录持久化、物理断电；真实AI/OCR/Pi/账号；签名打包、安装后native/路径资格；macOS实机；Desktop完整路径、全尺寸/缩放。Browser止于视觉准备审查并取消，无推理/结果写入。

建议下一批：先论证Windows可信handle-bound备份Adapter及父目录durability，再做合成对抗矩阵与原正向断言；另补可识别受控Desktop CU。router BUDGET_UNSATISFIABLE单独排队。建议不构成授权；nextBatchAuthorized=false。

## Remote Desktop Commander 终态锚点

1. 工作区 G:\antigravity\Design Asset Manager 1001；先读CURRENT-STATE与本文，不把历史WC01/旧generated/PASS当当前进程。
2. 本机 .scratch/windows-qualification-20261003/：baseline.json、before、file-scope.json、incremental-review.diff、candidate-manifest.json、closure-verification.json、artifact-manifest.json、review-final.json、failure-queue-final.json、computer-use-final.json、terminal-anchor.json。
3. 受控Host正常退出，已知Desktop子进程0、fixture/Host监听0；codec/helper随已验证子进程close/settle和测试收敛；Browser标签已关闭，Desktop第二实例已工程停止。需要再次运行时先核对最终candidate及controlled-launch receipt，不启动默认/身份不明profile。
4. 本批STOP；不进入Governor/完整后台AI或下一WC阶段，不自动commit/push/发布，不授权真实库/模型/账号。
