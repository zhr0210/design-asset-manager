# WC01 Windows 原生备份目标续批终态

2026-10-04；本批用户批准原生安全目标 / SQLite 接入与持久化资格 / 资格解释恢复；completion=PARTIAL。执行到本批交接后STOP，nextBatchAuthorized=false。

本批交付了受限原生目标 tracer、维护模块真实 SQLite/lease 合成集成，以及正式资格拒绝解释/恢复。**Windows 生产备份仍在backup/status/DDL前拒绝 TAG_INTENT_BACKUP_UNSUPPORTED**，没有把tracer接入生产，没有成功NTFS生产升级声明。

## 实际修改文件与行为

| 文件 | 本批变化 |
| --- | --- |
| src/main/background-analysis/background-analysis-controller.ts | 资格拒绝说明原因及计划/资料库未提交，未知错误不泄漏内部信息 |
| src/renderer/components/asset/BackgroundAnalysisPanel.tsx | 分开read/action错误；自动成功轮询不清操作失败，显式重新读取/新动作/scope/session或关库才清除，保留epoch/revision fencing |
| scripts/fixtures/windows-backup-native-target.cs | Test-owned NtCreateFile单组件相对创建、retained ancestor handles、no-reparse/create-only、同句柄写读/hash/flush、held finish协议；productionQualified=false |
| scripts/fixtures/windows-backup-native-harness.ts | 有界pipe/child、callback、物理close与timeout共享harness；限自有dam-native-target临时树/1MiB |
| scripts/windows-native-backup-target.test.ts | 5项原生创建、junction写前拒绝、碰撞、flush故障、HELD后timeout释放 |
| scripts/windows-native-backup-integration.test.ts | 4项真实SQLite connection/lock/维护模块：正常schema1→12、取消、实际afterDdl回滚、serialize前RAM拒绝；非正式Host composition |
| scripts/background-analysis-message.test.ts | 资格提示和未知错误两项 |
| scripts/background-analysis-ui.test.mjs | 真实React原测试及操作失败轮询/恢复，合计5项 |
| .codeindex/tests-map.json | 登记聚焦验证命令；不扩router预算 |
| src/main/background-analysis/README.md | 当前资格解释和状态生命周期 |
| src/main/independent-tags/README.md、src/main/library-lifecycle/README.md | 原生tracer范围/生产仍拒绝；旧EXLOCK显式历史化 |
| docs/platform/WINDOWS-BACKUP-TARGET-PROTOCOL.md | 原生方案、真实源码差异、证据及生产门槛 |
| docs/handoff/WINDOWS-NATIVE-BACKUP-20261004.md、docs/handoff/CURRENT-STATE.md、TASK.md | 当前结果/身份/队列/恢复点；历史保留 |

before：计划确认只提示通用失败，成功状态轮询可清提示；EXLOCK反例否定原安全目标。
after：明确Windows安全备份资格未通过、计划未保存、资料库未升级、现有素材/手工编辑可用；自动轮询保留错误，显式读取可恢复，重复确认仍拒绝。NTFS成功路径仍未放行。

## 当前源码差异与最小调整

没有机械采用压缩包历史补丁。当前Windows O_NOFOLLOW=0，属性句柄可把持有的空目录设为junction；只靠EXLOCK、lstat、sentinel或rename拒绝不够。本批改为限定的NtCreateFile RootDirectory单组件创建、OBJ_DONT_REPARSE/FILE_OPEN_REPARSE_POINT；真实junction返回C0000280，零写/hash/flush，outside sentinel不变。首轮预期写后检测与事实不符，改成更严格的写前拒绝并保留失败记录。

SQLite候选使用真实connection.serialize()有界镜像，native同句柄写入/readback。生产inspector仍拒绝journal_mode=memory的Buffer；测试保留此拒绝，helper退出后现有readonly pathname inspector检查只证明受限retrieval。真正RAM lease、完整同句柄库身份/schema verifier、源与空间重验、Main到DDL/commit的finish/cancel/close生命周期及完整fault/status/restart/retrieval资格仍缺失。因此productionQualified固定false；backup/Host维护生产源码与本批基线逐字节一致。

Standards复核实际复现child退出后等待未完成whileHeld callback的挂起，已修复并抽共享harness。新增测试先触达HELD，再确认timeout拒绝前目标句柄与parent释放，不把kill请求当物理释放。

## 验证和 Computer Use

本机证据根：.scratch/windows-native-backup-20261004/。纯文档交接不触发机械整套产品回归。

| 验证 | 当前结果 | 证据 |
| --- | --- | --- |
| native目标 | 5/5 PASS | native-target-05.log/json |
| native SQLite/lease/维护集成 | 4/4 PASS | native-integration-03.log/json |
| 正式生产资格拒绝 | 4/4 PASS | refusal-01.log/json |
| Host私有维护 | 30/30 PASS | maintenance-01.log/json |
| 真实React | 5/5 PASS | ui-registered-01.log/json；实际登记命令 |
| 资格消息 | 2/2 PASS | message-test-receipt.json；本轮chunk67f6cc，无完整本地log |
| 当前candidate typecheck/build | PASS | candidate-typecheck-02、candidate-build-02 |
| 原生产升级集成 | 5pass/10fail/1cancel；16触达，后续未运行 | original-01；原断言保留，不以早拒绝PASS代替fault cut |
| candidate context ownership | PASS，694/694 owned、47 excluded | context-02；隔离临时index，不修改真实index |
| 原router | FAIL BUDGET_UNSATISFIABLE，original test:406 | router-02；未改预算/断言 |
| 正式Browser/Windows CU | 资格解释/轮询/恢复、实际picker创建Copy、手工保存保护、关库重开、About及正常quit限定PASS；底部菜单裁切FAIL | computer-use-final.md/json、cu/、controlled-result.json |

聚焦总计50项PASS；tracer9项不是9项生产能力。首轮CLIXML/CRLF、junction预期、Buffer检查/取消scope、npm.cmd EINVAL及router命令形状失败均保留。timeout复核修复后native5+integration4复测PASS。

WNT-D01新鲜受控profile，从普通入口和实际picker操作：2合成图片Copy、计划取消和重复安全拒绝、3次约3秒间隔采样（首末约6.2秒）、显式重新读取、Browser手工描述保存及Desktop同步、关库重开后exact caption/用户保护回读。About确认本build。Desktop正常quit审查0草稿/账号，Host PID48744 exit0；owned window与port49880关闭，Browser显示中断后仅关闭测试tab。退出后只读SQLite：schema1、2active assets、edited=1、quick_check=ok，无后台schema/备份，来源Copy摘要一致，核验前后DB字节不变。

素材工作区底部菜单后半项裁切，滚动/最大化未露出About/退出；改用设置页正式导航菜单完成，失败单列。完整尺寸/缩放/主题、逐帧闪烁与全部产品UX未验，整体PARTIAL。前轮Browser首连问题不作成本批事实；本批首连正常。

## Source / build / runtime 身份

- HEAD b5cc954f90d248694aedc2d6ca1aa5188fa0aa11，branch codex/windows-workspace-1001。完整当前dirty tracked/untracked源码/WIP纳入候选闭包；不是HEAD干净树。真实index字节/语义和staged均保留，无stage/commit/push/发布。
- 本批独立新build dam-46fc882dff980814，sourceDigest 46fc882dff9808140fb12212f46755043c2c2a20f0109424d271cecd498c50d0，659产品输入，builtAt 2026-10-04T04:22:36.616Z。14产物，artifactDigest 649ef3478c630caa796de601941780c883a2f8577840b6b9731818f20b40404c。
- candidate产品输入与root逐字节相同；root旧generated完整保留，candidate实际generated另入临时index封闭，当前运行身份由About/launch/manifest绑定。最终tree/源码清单/本批raw incremental diff/reverse reconstruction/index证据见candidate-manifest.json、closure-verification.json和terminal-anchor.json，避免把root旧generated/历史PASS当当前build。
- 退出后实测win32 x64 10.0.26200；Electron30.5.1 / Node20.16.0 / ABI123 / libuv1.46.0；SQLite3.53.1，sourceId 2026-05-05 10:34:17 c88b22011a54b4f6fbd149e9f8e4de77658ce58143a1af0e3785e4e6475127e9；native SHA258341bfff296ac7a779c1dfc35e0b781c18c1a1b9ec3406551dbb473b4fe359。
- Pi源码release声明Node24.21.0/SDK0.99.1。本批未启动实际Pi/模型服务，不声称该source声明是安装Runtime资格。前轮codec Sharp0.34.5/vips8.17.3资格保持，完整helper最终峰值/硬限仍未验。

## 独立复核与后续队列

两轴终审完成，按本批固定baseline.json/before→16文件当前增量复核，排除此前WIP。Standards=PASS，0未修复标准/smell发现，timeout挂起已实际修复复测；Spec=PARTIAL，3类资格缺口、0范围扩张/0新增可行动实现错误。两轴分别核对CU截图/日志、50项统计、原失败、actual generated seal及真实index/WIP保留；原报告和最后文档签收回执见本机review-final.md/json，不将Spec PARTIAL表述为生产资格通过。

后续建议（本次交接后不自动执行）：优先同句柄SQLite完整identity/schema verifier + 真实RAM lease + private finish/cancel生命周期；再做完整durability/status/中断重启/retrieval矩阵，全部资格满足后才讨论生产composition与原正向suite。Router预算及菜单布局独立排队。真实库迁移/模型/安装包/断电/macOS资格仍需其对应范围批准。详见failure-queue.json和[目标协议](../platform/WINDOWS-BACKUP-TARGET-PROTOCOL.md)。

## Remote Desktop Commander 快速接手

先读本文件与CURRENT-STATE，再读本机terminal-anchor.json、evidence-manifest-final.json、file-scope.json和closure-verification.json。终态是PARTIAL/STOP，nextBatchAuthorized=false；受控Host已退出，不是待继续的运行进程。合成profile原始映射仅留本机controlled-launch.json，不读取其他数据目录。候选与raw增量为自有证据，非待自动提交；无后续自动commit/push/发布许可。

历史：[前轮EXLOCK反证](WINDOWS-BACKUP-20261004.md)、[codec/NTFS纵切](WINDOWS-QUALIFICATION-20261003.md)、[WC01](WC01-20261003.md)。原始日志/截图在.scratch本机保留，普通checkout不自动带证据。
