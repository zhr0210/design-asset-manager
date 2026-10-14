# DAM 当前可用状态

## 当前工作树的B轮廓、锚点与动效修正（2026-10-14）

最终运行/编译候选`dam-c534b500b396a7f9`，原生SHA `275c6cca276a48dc40537d00c7d46469ec87173211f416a09f6d28867c6c6eff`。#33–36代码已实施：系统圆角非激活框架/全尺寸玻璃、中心与左右锚点/保存恢复、批准分段淡化/可取消呈现，以及160ms独立选择背景。

正式公开库→工作模式→原生窗口已复验：紧凑/展开真实key截图无额外直角框/底部方块；中心、左右、主动移位及顶部夹取后收起正确；多选即时菜单范围、备注真实保存/切换保留、最终恢复窗口和原件保全通过。浅色/深色及减少动态效果已实测并恢复系统原设置。9成员、原备注及两色保持，原件SHA一致。

类型、构建、四项原生受控检查及相关真实临时SQLite保护检查通过。完整251项回归230项返回0、21项失败/超时；既有design:check差异保留。正式单屏核心行为可用，整体资格仍PARTIAL：实得连续采样约30fps，物理多屏/Spaces、完整输入法/拖出中断与高帧率原版对照尚未完成。准确范围和证据见[本轮结果](../../artifacts/window-candidates/b-work-window-refinement-20261014/RESULT.md)。锁屏历史阻塞已解除，不借用旧候选资格，不关闭#32–36。

普通默认窗口仍独立；本轮仅当前B工作树的本地实现，没有推送、发布或改动用户原库。

## 前一轮B原生设计实现（2026-10-14）

Issue #26及#27–#30的实现已落地，正式验收PARTIAL。当前工作树使用`npm run start:work-b`，本轮隔离profile与正式入口见[实施检查点](../checkpoints/b-native-design-implementation-20261014/README.md)。普通默认窗口未替换，本轮未推送、发布或改动用户原库。

最终候选`dam-78f30cf9f4bc6f52`，原生SHA256 `07267e86e50446f04a1bef02940918a2d48b53b457ee481d0795f5ae335d6488`。已落实220×240、全底板系统玻璃/系统按钮、真实窗内停靠模糊与可见抓手、菜单明确范围、引用故障反馈，以及浮层/冻结草稿/停靠键盘/展开可见边界保护。正式恢复→停靠Backspace保护→弹出→同窗展开已复验，9成员、备注和颜色保留；同轮先前候选的五类交付已实际生成并按身份记录，不能转记为最终版完整矩阵。

类型、正式构建、3项AppKit与相关临时库检查通过；完整250项轮次229项返回0、21项失败/超时，不表示全仓绿。物理取色、明暗/辅助显示矩阵、最终实际接收与输入/设备连续帧缺口仍保留，详见检查点。以下main核对及旧候选快照保留历史范围，不覆盖本工作树的新实现。

## main合并后的核对

本地main来源B提交63dc760，1462个源码/测试/构建配置文件一致，普通目录旧WIP未混入。合并验证修复了新素材测色消费者遗漏权限基线登记，精确导入范围与拒绝新增Host/Session的反例通过；没有改变产品行为或扩大权限。正式B窗自动保存、正常整Host退出与重开、颜色取消、大预览切图通过，9成员/4色/11原件保持，见[main验证结果](../checkpoints/main-merge-audit-20261013/README.md)。该结果不是全应用无bug声明，以下原生视觉/物理输入/设备及AI/OCR的缺口仍保留。

普通`npm run start:desktop`仍使用原Electron工作窗；当前B原生窗使用`npm run start:work-b`，同一main中保留两种入口，不因合并自动替换默认实现。

## 设计目标与受测产物的区别

设计系统已按Apple参考整理，功能流程与技术机制分别归位；这是文档更新，不是新的应用构建。主要操作采用系统强调色（网页默认蓝色）、紧凑220×240 pt、全底板明显Liquid Glass和顶部常显原生按钮是已批准的设计目标；本次未同步生成CSS、改动原生源代码或重建候选。现有网页tokens与新设计存在强调色差异，后续实施须同步并重新验收，旧证据不能关闭这些目标。

悬浮窗的区域分工、完整预览及菜单范围的确认状态见[交互规格](../design/WORK-WINDOW-INTERACTIONS.md)。最新色板产物及既有指针/覆盖层/设备缺口如下保留，资格不因文档迁移改变。

## B窗口核心重建（2026-10-13，492930）

最新色板候选为dam-8816c1fa125661e6：展开窗右侧HEX输入改为“添加”按钮及原生颜色浮层，用户选择不透明六位HEX。确认/取消/重复保护与整Host保存重开已从正式可访问控件验收；原备注/9成员/两色保留。浮层坐标指针输入未取得有效证据，物理鼠标/触控板取色仍BLOCKED_UX_ACCEPTANCE，详情见[色板记录](../../artifacts/window-candidates/color-selector-20261013/RESULT.md)。这不关闭前一轮原生模糊、按钮视觉退出及流畅性资格。

后续原版实测确认吸附使用真正窗内NSVisualEffectView，全部原按钮视觉退出/弹出恢复；当前B纯颜色overlay遗漏该效果，尚未实施或取得对应视觉资格。651张指定公开窗口图像及后台实际AppKit/Core Animation栈见[实时补证](../../artifacts/reverse-engineering/dropover-5.2.0/overlay-runtime-20261013/RESULT.md)。本轮仅调研，B二进制身份未变。

最新要求取代旧f55展开停靠/72×160胶囊体验资格。本轮仅在B工作副本实现：明确compact/expanded、同尺寸84%屏外停靠、12点内侧恢复、原始deltaX时长、可中断原生运动、私有关联回执及终态后Host保存，旧布局原文备份、异步有界诊断保留。最终dam-492930414aa9bcb7及原生5648ab9…已独立构建并核对实际身份。正式单屏CUA左右停靠、弹出、再拖、拖离、展开左右拒绝、关闭重开及整个Host停靠恢复已验，9成员/备注/两色/修订20保留；临时生产SQLite另验取消、保存失败和撤权。入口为B副本npm run start:work-b / profile-b / library-b-v2。

[完整证据与缺口](../../artifacts/window-candidates/core-rebuild-20261013/RESULT.md)：指定窗口连续采样约10fps，原版背景/标题原子drag未产生运动，无法获得慢/快/反向/中断对照；物理多屏、触控板和高帧率体验未验，父级1:1仍PARTIAL。旧进程已退出，仅新B候选在跑；普通默认软件、发布和AI/OCR未触及。以下为先前受测产品及候选的历史状态。

更新：2026-10-11文档整理；产品证据截至2026-10-10。本页只维护能力、启动、版本和限制。当前工作见 [TASK](../../TASK.md)，跨系列状态/剩余条件唯一入口为 [任务主台账](../tasks/TASK-REGISTRY.md)。

## 用户现在可用的范围

Mac本地优先素材工作区、普通Browser/Desktop共享Host、Copy/查询/人工编辑、适用2B模型标签/描述/OCR/一键分析、SigLIP2中英文/混合/以图、工作集/官方视频参考帧与独立PNG交付已有限定真实证据。T23公开库189图片图文覆盖/190词法；规模公开副本10018条、三批9新图18后台效果、1801.5秒观察、正规暂停/物理退出/同包重开及保护成立。

这些是固定平台/候选/素材范围的结果，不是全部模型、Provider、质量、规模、原生或发行资格。完整证据见 [Mac验收记录](../history/task-consolidation-20261011/handoff/AF-MACOS-20261010.md)。

## 普通入口

```sh
cd /Users/meigong/Documents/design-asset-manager-macos
npm run start:desktop -- --profile=/Users/meigong/Documents/DAM-public-macos-profile
# 或连接同一profile的唯一Host：
npm run start:browser -- --profile=/Users/meigong/Documents/DAM-public-macos-profile
```

复现已验普通未签名候选：

```sh
cd /Users/meigong/Documents/design-asset-manager-macos
".scratch/af-macos-20261010/package-page-fix-final/mac-arm64/Design Asset Manager.app/Contents/MacOS/Design Asset Manager" --dam-profile=/Users/meigong/Documents/DAM-public-macos-profile
```

先复用或正常退出已有同profile Host，禁止两个Host写同一活动库。npm入口使用`--profile`，直接.app使用`--dam-profile`。源码改变后的开发产物不能借此候选的旧资格。

“资料库管理”选择 `/Users/meigong/Documents/DAM-T23-macos-library`；工作模式有`T23 Mac 联合参考`与官方视频工作集。规模库是独立公开测试副本。端口/PID随运行变化，本页不保存旧进程为当前事实；IAB首次或Host重启后，从原生设置→高级维护→准备浏览器入口，在内置浏览器打开应用当次给出的`/launch`地址，建立独立会话，不复制账号凭据。

## 身份与消费者

| 项目 | 记录（产品证据截至2026-10-10） |
| --- | --- |
| 源码/分支 | 唯一上述目录 / `codex/macos-migration`；产品修复`c2e5646`，验收提交`a1faf93`；文档整理另记Git提交 |
| main基准 | `6b86ef05e558229e2bd87998101ca5678bc228cc`；未声称本轮刷新远端/合入功能 |
| 受测普通包 | `dam-175fb4d6af635d1d`，790输入，构建UTC2026-10-10T06:43:06.696Z；完整SHA见验收记录 |
| 平台 | Apple M4 / arm64 / macOS27.0 / 24GiB统一内存 |
| Node/npm/Electron | 25.8.0 / 11.11.0 / 30.5.1 |
| 原生依赖 | better-sqlite3 12.10.0（Electron ABI）/ Sharp0.34.5 |
| Pi | 0.99.1 / 固定Node24.21.0，真实seal/Main绑定；不得用Windows分发物替代 |
| Python消费环境 | `.scratch/macos-migration-20261009/python`，3.12.11，正式应用已消费，不能作为临时缓存删除 |
| Python依赖 | Torch2.14.1、Transformers4.57.6、NumPy2.2.6、ONNXRuntime1.23.2、RapidOCR1.4.4；[精确锁](../checkpoints/macos-migration-20261009/python-lock.txt) |
| 模型/运行包 | ModelScope Qwen3-VL 2B/4B Q4_K_M+Q8投影、SigLIP2、RapidOCR；固定b11429 Mac GGUF；实际适用资格按主台账 |
| 分支隔离 | Eagle方向调整在`codex/eagle-integration`（隔离检查点8cf60c7），未混入迁移；[目录与分支](BRANCHES.md) |

## 实际限制

后台在验收终态暂停；启动后的现场状态以正式界面为准。4B Metal有资源拒绝记录，8B本机未验，OCR漏行/空格及模型徽章细节误读保留质量弱项。30分钟观察含空闲、规模图片只有3种内容；91条索引阶段57–1028ms不等于所有交互P95或持续推理压测。27MB旧schema工程副本恢复不等于用户UI恢复。

真实断网、Windows原页压力、外屏、完整原生交付、Eagle、完整窗口扩展和签名发行等状态只在主台账维护，不在本页再建待测表。窗口云上传/分享已取消；移动同步不是同一目标。Mac适用收敛不关闭WC01、A–F全平台、DualClient父#23、LocalAI父#24或商业父级，最新已核对main两平台CI仍失败；本轮未新验产品或远端状态。

## 按需接续

[模块接线入口](../agents/implementation-status.md) → 对应模块README；[任务主台账](../tasks/TASK-REGISTRY.md) → 相关原始证据；[历史索引](../history/task-consolidation-20261011/README.md)仅在需要因果/旧方案时读取。保留运行环境、资料、模型与其他WIP，不默认加载全部旧报告。

## 当前工作副本的窗口候选（2026-10-12）

用户授权的A/B两路线正在实施，状态PARTIAL，非上述旧候选的新资格。启动入口为当前工作副本的`npm run start:shelf-a` / `npm run start:work-b`，默认独立profile；源码与范围见[原生候选说明](../../native/shelf-candidates/README.md)，阶段证据见[比较记录](../../artifacts/window-candidates/COMPARISON.md)。原生接线、部分正式UI及保护回归已有证据；A完整1:1、B整体原生级体验、AI新增接线及Windows未完成。Mac已手动解锁，最新构建正式复验正常退出/重开、草稿取消保护和复杂面板尺寸；修复退出审查被页面modal遮挡。A最新构建正常退出/重开、Quick Look及停靠恢复通过。旧失败记录保留，不将旧截图转记到新代码。精确build/原生SHA与运行范围见[检查点](../../artifacts/window-candidates/checkpoint.json)。不替换此前受测普通包、不继承其PASS、不对外发布。

### B深度改造的当前检查点

2026-10-12用户已选B为主线、A保留参考。B已实现同窗原生网格、边缘吸附、直接文件承诺、Host自动保存与恢复、独立专注/真实笔记及受限成员工具。用户指出的展开局部拖入/多选缩为单项已分别修复；用户确认多选拖动保持，但接收文件尚未证明。最新整页拖入和输入/退出保护代码已构建，Mac自动锁定阻塞装载与正式复验，当前仍运行中间构建。桌面专用接收目录为`/Users/meigong/Desktop/DAM-B-接收测试-20261012-77a7`。精确下一动作与限制见[TASK](../../TASK.md)；不得把内部真实库、旧截图或拖动影像代替新构建的接收结果。

### B 原生候选验收续记（2026-10-12，5f8522）

当前测试候选dam-5f8522c6e415e0b9，入口npm run start:work-b与独立profile-b/library-b-v2。整窗拖入用户已确认；取消/错误反馈/真实图片点击焦点修复，正式生成原件、预览、兼容PNG、图像处理、9项ZIP与文件回读符合；备注与真实矩形笔记正常退出重开、引用移出不删原件再恢复已有9项已验。详细范围及未完成条件见[当前验收矩阵](../../artifacts/window-candidates/B-ACCEPTANCE-20261012.md)。菜单物理接收、视频参考帧、AI/OCR配置、跨屏及性能未关闭；B仍PARTIAL，普通默认版本不变。

### B吸附自行验收结果（2026-10-13，f55e18）

当前候选dam-f55e18f0df3e70b9，仍走npm run start:work-b与指定隔离profile/library。用户明确后续由Agent测试，本轮正式CUA紧凑左右吸附、弹出后再吸附、展开左右、点击恢复、拖离保留当前位置已通过；实时backend12个完整意图/命令/终态链及保存layout读回一致。详见[自行验收与原因分析](../../artifacts/window-candidates/B-DOCK-SELF-ACCEPTANCE-V7-20261013.md)。仅当前单屏吸附子目标PASS，父B及多屏/Spaces/连续帧、其他OS交接/视频/AI/OCR资格仍PARTIAL，不替换普通默认版本、不发布。
