# Windows NTFS安全备份 / Desktop续批终态

2026-10-04；最新用户已批准前轮“下一批建议”。范围是安全Windows backup Adapter论证、合成对抗、原正向验证及受控Desktop CU。completion=PARTIAL；execution=STOP；nextBatchAuthorized=false。NTFS正式成功备份仍未交付。

## 实际结果与最小调整

当前源码重新核对：`tag-intent-backup.ts`只准Darwin精确APFS/native/SQLite组合；Windows在写备份、status或DDL之前拒绝。Host先drain、持真实lease、串行维护及close，不能据此防外部文件系统操作。上述两文件与本批起点原始字节完全相同。

候选把Windows持久化与路径保护集中在Main持有的Node FileHandle，避免helper退出提前释放。已确认本机Electron30.5.1 / Node20.16.0 / libuv1.46.0：numeric EXLOCK=0x10000000传给CreateFileW share=0，libuv附加BACKUP_SEMANTICS；read-write目录sync成功、持有时rename返回EBUSY。

但独立对抗证明：仅FILE_WRITE_ATTRIBUTES=256的句柄可以与EXLOCK并存，并在空目录执行FSCTL_SET_REPARSE_POINT成功。后续按路径写子文件实际落到另一个合成目录。GENERIC_WRITE打开被error32拒绝，零access的FSCTL被error5拒绝；非空目录的这次mount-point设置被error145拒绝。非空反例不能保护mkdir后首次写之前的空窗口，也不证明所有reparse tag。Windows NOFOLLOW=0；打开已有junction时fd指向target，lstat仍是link。重复检查或事后重验不能消除检查后的竞态。

因此候选停在反证阶段，不接入生产、不恢复前轮撤回publisher。下一实现必须解决原生handle-relative、拒绝重解析的原子子路径操作，以及SQLite `backup(target pathname)`的可信目标接入；仅加sentinel或多次lstat不满足不变量。目录metadata契约、由下到上的flush顺序、失败/取消/句柄寿命也须论证。物理断电认证未进行。

## 本批实际修改文件

| 文件 | 实际变化 |
| --- | --- |
| scripts/windows-backup-session.test.ts | 新增4项真实Windows/libuv对抗反例；使用自有临时合成目录，不是生产Adapter |
| .codeindex/tests-map.json | Windows资格集合增加该Electron Node命令，纳入候选来源闭包 |
| src/main/independent-tags/README.md | 更新资格缺口和当前交接入口 |
| src/main/library-lifecycle/README.md | 同步相同备份资格事实 |
| docs/handoff/WINDOWS-BACKUP-20261004.md | 本批完整终态、队列与Remote恢复点 |
| docs/handoff/CURRENT-STATE.md | 唯一当前投影，历史结论分列 |
| TASK.md | 新请求状态及证据入口；原记录保留历史 |

本机证据目录另含baseline/before、探针、测试日志、CU截图/矩阵、审查、增量patch、候选tree/来源闭包和terminal anchor；不属于产品源码。没有生产TS、package、原正向测试的改动；没有commit/push/发布或暂存真实index。

before：前轮NTFS缺口归目录置换/父目录durability，Desktop未取得受控可操作窗口。after：EXLOCK候选的属性访问反例可重复运行，拒绝的依据更精确；有效非空sourceSelections配置的新鲜Desktop首次启动成功。产品Windows backup行为仍是明确资格拒绝，未增加成功能力；普通描述、关库重开及用户编辑保护仍可用。

## 验证及失败分类

| 检查 | 当前结果 | 证据与限定 |
| --- | --- | --- |
| namespace-02 | 4/4 PASS | Counterexample成立；这不是backup资格PASS |
| namespace-01 | 3/4，初次测试失败 | EXLOCK期间scandir被拒绝；断言移到关闭句柄之后再核对，未降低断言；保留初次日志 |
| refusal-01 | 4/4 PASS | 正式门无备份/DDL、外部合成目标不变、普通写与重开；资格前置不是backup授权 |
| maintenance-01 | 30/30 PASS | 私有合成storage seam验证drain/lease/close、固定intent及事务保护；不替代Windows生产成功备份 |
| original-01 | 5pass/10fail/1cancel，exit1 | 原断言完全保留；16项触达，后续未运行。5个故障测试在早期平台拒绝通过，未触达其目标backup/DDL切点 |
| context-01 | root拒绝 | 新/既有未跟踪源码不被真实index当作可信来源；候选闭包验证另列，不为全绿暂存真实index |
| candidate-context-01 | PASS；694/694 owned、47 excluded | 原始字节候选/临时index覆盖本批及既有未跟踪来源；真实index未暂存 |
| candidate-router-01 | FAIL，exit1 | agent-context-router.test.mjs:406，既有Agent Context Router ADR governance: BUDGET_UNSATISFIABLE；未放宽预算或断言 |

38项限定聚焦PASS；原正向集成仍失败，不称全绿。typecheck/build本批未重跑：只新增测试/治理登记与文档；659产品输入及旧build产物重新逐字节匹配。历史typecheck/build PASS不写成本批新执行。

队列：WNB-F01 **BLOCKED_CAPABILITY**（安全目标接入及路径原子性）；WNB-F02 **NOT_QUALIFIED_DURABILITY**（新父目录metadata顺序/失败协议）；WNB-F03 **FAILED_ORIGINAL_POSITIVE**（F01导致）；WNB-F04 **FIXTURE_BARRIER_UNREACHED**（原套件在afterBackup等待，早拒绝未入barrier）；WNB-F05 **UX_EXPLANATION_FAIL**（Desktop计划保存拒绝只有通用重试提示，自动轮询后消失）；WNB-F06 **BROWSER_INITIAL_CONNECTION_RECOVERED**（首连断连，普通刷新恢复，未查明根因）。Router BUDGET_UNSATISFIABLE仍单独排队。

## Computer Use

正式Desktop IPC及Shared Browser→同一Electron Local Host，WNB-D01新鲜合成profile；配置校验、明确profile参数、owned root与sources、窗口标题、About及逐字节产物证明被测身份。仅2张生成PNG/JPEG，无fixture模型服务、真实模型、账号、凭据或真实素材库。Desktop窗口截图1266×825，明亮主题；OS缩放与全部尺寸/主题未测。

Desktop从普通首次启动和可见入口执行：创建文件夹/库、实际产品选择器双选、Copy审查确认、手工描述保存、后台计划审查取消、重复确认后拒绝、普通关库/重开、描述保护回读、About和正常退出。计划保持未启用，不授予OCR许可、不启用provider。功能拒绝/恢复与持久化限定PASS；资格原因解释FAIL，完整UX不宣称通过。

前轮Desktop脚本传入空sourceSelections，不符合当前配置入口；本批使用有效非空配置、Desktop首次启动和visible launch修正测试准备，未改变生产launcher或窗口代码。前轮BLOCKED记录保留；不能反推其唯一根因或把旧停止算正常quit。

Browser优先工具曾读取失败；恢复后用正式新入口，首连显示断连，普通刷新后接收Desktop入库事件，Inspector回读同一手工描述/保护、关库状态同步、重新打开与About。Browser无后台计划配置按钮（当前owner资格），未用业务函数绕过。详细操作—预期—实际、截图、复测与未覆盖见本机computer-use-final.md/json。原生悬浮窗口、全部尺寸/缩放、真实推理及成功备份路径未测。首连与轮询精确时序未留连续截图/录屏，不宣称根因与逐帧验收完成。

本批通过可见Desktop退出审查/确认正常quit：Host exit0，受控窗口消失、端口关闭，Browser显示连接中断后本批标签关闭；没有工程强停。退出后仅只读核验自有WNB-D01合成库：schema1、2assets/2active、精确手工描述与edited=1、无background表或schema-backups目录/文件、quick_check=ok、Copy原件hash匹配，数据库字节未被核验修改。该结果是后台持久化核验，不计为CU新操作。

## 独立复核与来源

code-review skill两轴：win_qualification_standards / win_qualification_spec初始独立只读审查一致拒绝EXLOCK候选：Main lease不能防外部文件系统变更，path-based SQLite目标还未解决。最终Spec已核对本批原始固定点与七文件保留diff，未发现新增可行动实现错误或范围扩张，产品结果判PARTIAL。最终Standards两次被审查工具“可能涉及网络安全风险”过滤中断，标BLOCKED_REVIEW；初审不能替代新增测试/文档的最终Standards结论。主Agent自查及Spec通过不填补这一缺口。两轴完整保留结果见review-final.md/json。

官方来源：libuv **v1.46.0** `include/uv/win.h`、`src/win/fs.c`（EXLOCK/NOFOLLOW/BACKUP_SEMANTICS/FlushFileBuffers）；Microsoft CreateFileW（属性访问不受sharing flags限制）、FlushFileBuffers（写权限/metadata契约）、FSCTL_SET_REPARSE_POINT。公开资料只读查询，未下载安装依赖或helper；链接和限定摘记在本机references.md。目录sync探针只证明调用成功，未进行physical power-cut认证。

## 当前身份与Remote Desktop Commander锚点

- HEAD b5cc954f90d248694aedc2d6ca1aa5188fa0aa11，branch codex/windows-workspace-1001；原dirty WIP保留。真实index字节/条目/暂存与本批baseline一致；前轮stat-cache刷新属于历史，不误报成本批差异。
- 本批实际复用已构建产物 dam-66a3d34ea3bbf6ce，sourceDigest66a3d34ea3bbf6ce0f9c6bf6677c92aa4ed784bb1baf9c2584474c2a6592b33b，659输入；builtAt2026-10-03T18:47:15.462Z。产品输入及artifact SHA当前重新匹配，About再次核对。本批候选tree含本批文档/测试与既有WIP；actual generated身份与root旧generated分列。
- OS win32 x64 release10.0.26200；Electron30.5.1 / Node20.16.0 / ABI123 / libuv1.46.0。SQLite3.53.1及exact source，native SHA258341bfff296ac7a779c1dfc35e0b781c18c1a1b9ec3406551dbb473b4fe359；codec Sharp0.34.5 / vips8.17.3资格沿用未改源码，本批未重跑codec或推理。
- Pi源release仍Node24.21.0 / SDK0.99.1，本批不启动或认证实际runtime/model路径；shell Node25.7.0只是编排器。签名安装包、真实模型/OCR/Pi、macOS实机、断电未验证。
- 工作区 G:\antigravity\Design Asset Manager 1001；先读CURRENT-STATE及本文。`.scratch/windows-backup-20261004/`的baseline.json、file-scope.json、incremental-review.diff、candidate-manifest.json、closure-verification.json、review-final.json、computer-use-final.md、controlled-launch.json、controlled-result.json、terminal-anchor.json与evidence-manifest-final.json供本机接手。testId WNB-D01，不把绝对合成profile路径写入普通交接。
- 当前进程/端口终态以terminal-anchor/process-terminal为准；正常quit与工程停止分列。再次启动只能复核登记的合成配置及build，不启动默认或身份不明profile。

下一批建议：先完成可审查的原生目标接入方案及原子no-reparse创建，再做对抗/原正向成功/metadata与失败取消生命周期验收；另修复资格错误的解释与恢复反馈。Router保持独立。建议不构成授权；本批STOP，不进入下一WC阶段，不自动commit/push/发布。
