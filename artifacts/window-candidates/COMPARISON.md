# A/B 两版实施检查点

用户授权：A先按Dropover非云范围完整复刻再扩工作集；B在现有工作集上全面调整并采用原生高频交互/React复杂面板/单Host。**父级目标仍未完成。**本文件记录第一阶段事实，不把较小候选冒称完整1:1。

## 实际实现

| 维度 | A | B |
| --- | --- | --- |
| 产品对象 | 独立暂存架子 | 已保存、Library-bound工作集 |
| 小架子绘制/移动/停靠动画 | AppKit | AppKit |
| 复杂业务 | 初步原生列表/Quick Look；工作集扩展未接 | 按需创建既有React工作面板 |
| 保存权威 | 候选A的独立JSON与书签 | 正式DAM Host/Library；原生child只做UI |
| 输入与交接 | 文件/文本/图像/promise接收及copy拖出初步方法体 | 受控preview和已有交付链；直接从原生小架子拖出尚未接 |
| 平台 | macOS初版；Windows未实现 | macOS初版；Windows未实现 |

## 本轮实际观察

以下正式UI均使用当前任务生成PNG与独立库/profile，没有读取原有Dropover架子或真实剪贴板，也没有运行AI服务或云分享。

- A从菜单“添加文件”选择生成蓝色PNG，窗口实际呈现缩略图与1项；展开为原生列表，停靠终态露出部分窗口。第一次GoTo路径操作未成功，保留失败，不称拖放通过；后续普通文件选择器进入候选fixtures后成功。
- B从正式DAM界面创建隔离库，确认复制两张PNG入库；新建“B原生交互比较”工作集并保存备注、色板`#4A9DAB`。界面显示已保存。
- B在“在桌面展开/恢复工作窗口”后创建真正AppKit辅助应用窗口，实际显示2项参考和保存色板；点击原生“工作面板”打开既有React原生工作窗口，内容、备注、色板一致。这不是直接调用IPC或注入Store的用户路径。
- B替换构建时正常退出未确认，owned SIGTERM没有退出，之后仅对本任务新建profile的已核对PID使用SIGKILL。之后从正式打开库入口重开，两个素材及工作集仍存在。这是受控中断后重开证据，**不是正常退出通过**。
- B原生关闭按钮后辅助进程已退出，主工作模式仍有保存的工作集；Computer Use对已消失窗口的后续读取超时，不能把这次超时写成窗口仍存在。

上述界面观察先后绑定不同中间构建。后续紧凑290×310、NSGlassEffectView、按需创建React面板、A恢复状态字段等改动必须对最终构建复测，不能沿用中间截图作为最终通过。

## 编译与内部保护测试

`npm run typecheck`、`npm run build`，以及`native-work-dock.test.ts`/`work-sets.test.ts`已执行。停靠测试增加owned-native intent、pin更新和dirty Close保留/显示detail验证；它使用真实临时SQLite及受控OS port，只证明权限/保存/草稿链，不证明物理动画。日志同目录保留。

## 继续入口

先冻结最终A/B构建，复验原生窗口、复杂面板、dock/recover、关闭/重开及草稿保护。再按逆向覆盖矩阵补A全部入口/生命周期/操作；B补直接交接、内容重排及工作集/AI交互。最后用同一素材、窗口数及操作录制比较跟手、可打断性、动画连续帧、资源和接收应用结果。没有这些测量前，不称“原生级丝滑”已经达成。

## 最新复验与阻塞（2026-10-12）

- 紧凑B为290×310，真实原生停靠条可点击恢复；截图见`b-final-compact.png`、`b-final-docked.png`。
- 原生工作面板按钮打开真实`/work-window`面板；目标窗口截图与AX同目录。未打开detail时owned Host只有1个Renderer，首次打开后2个，分别保存`b-processes-before-detail.json`/`b-processes-after-detail.json`。该证据证明按需创建，不能用进程数证明流畅性或全内存成本。
- 正式编辑备注后原生Close保留两窗口和草稿，再恢复原测试备注并保存；见`b-final-dirty-close.ax.txt`。
- A已有目标窗口Quick Look、dock strip隐藏控件、点击边缘恢复及收缩的实际观察，截图/AX均仅含生成材料。部分记录对应后续小修正之前的版本。
- 最后修正：React detail从保存的compact/dock状态重开时清dock并维持至少420×640；此修正编译/构建检查继续，但Mac已锁定，无法原生复验。手动解锁前不重复尝试自动解锁，不更改系统权限。

最新版本与source hash见`checkpoint.json`。此检查点没有关闭A/B父任务。

运行保留：A/B候选进程仅属于本任务profile；B的owned Host PID78710仍是最后尺寸修正前的版本。仅重跑启动脚本可能被单Host锁转交旧进程，不能称最新代码已运行。解锁后先正常退出旧B，再启动并核对新build，复验尺寸/恢复及正常退出。

## 解锁后的当前构建验收（2026-10-12）

Mac锁定已解除，上述锁定和旧PID记载为历史。当前DAM build为`dam-4ace278e22818c1a`，原生程序SHA见`checkpoint.json`；验收摘要见`resume-acceptance.json`。本节仅更新已实际完成的路径，完整两版目标仍为PARTIAL。

- **正常退出修复**：页面工作集由`dialog.showModal()`进入Chromium顶层；退出审查原是普通portal，z-index再高也会被遮挡，背景还被设为inert。`ReviewSheet`的transitionSurface现也进入顶层，保留原编辑器。正式菜单请求退出后审查可见；取消保留未保存备注，再恢复测试备注并保存。确认退出后核对owned Host和原生子进程均消失。临时诊断代码已移除，再对持有测试库、原生小架子和真实React面板的干净构建验证正常退出。`resume-quit-review.png`、`resume-cancel-retained.ax.txt`、`resume-clean-exit.json`为证据。之前强制中断和审查遮挡失败不改写成通过。
- **B正常重开**：再次从正式打开素材库→工作模式→工作集→在桌面展开→原生工作面板进入。两份生成图片、`#4A9DAB`色板及原测试备注均保留。当前复杂面板为420×640逻辑尺寸，目标Retina截图840×1280，没有沿用小架子/dock尺寸。证据为`resume-b-normal-reopen.ax.txt`、`resume-b-reopened-native.png`、`resume-b-normal-reopen-detail.ax.txt/png`。
- **B辅助进程与可见性**：辅助App未给mode时按自身bundle ID选择B，缺少owned state-root即退出，防止工具选择App时误起A模式。Host可见状态由原生窗口实际show/hide回报更新；启动请求不直接当作已可见。
- **A当前二进制**：正式菜单正常退出，确认owned进程消失；由profile-a脚本启动后生成蓝色PNG及1项记录保留。展开→空格Quick Look→Escape返回→停靠→点击边缘恢复→收起有实际观察。`resume-a-restored.png`、`resume-a-quicklook.png`、`resume-a-recovered.ax.txt`。Quick Look时工具AX曾仍绑定架子，截图实际显示系统预览；没有把AX无变化误判为预览失败。
- **内部回归**：TypeScript检查、正式build、原生意图/dirty Close真实临时SQLite保护、工作区transition回归通过。新增测试直接挂载生产ReviewSheet并覆盖已有modal上的点击确认、取消和Escape保留编辑器；Chromium组件测试单独记录，不替代正式应用路径。

当前A/B保留为可查看候选；没有替换既有默认产品，不读取原Dropover/真实剪贴板，不执行云分享或实际AI。接下来补A覆盖矩阵、B原生直接交接与内容布局，再做连续帧/跟手性与跨应用结果比较。Windows未实现；两版均未取得完整功能或“原生级丝滑”资格。

## B主线深度改造与用户复测（2026-10-12）

用户选择B深度开发，A仅保留参考。NativeWorkShelf独立于A；同一非激活NSPanel承载紧凑、展开NSCollectionView和停靠条，首次空格才创建React专注窗口。当前构建/哈希以checkpoint.json为准，Mac再次自动锁定阻止当前源码装载复验；运行中的中间版本仍为dam-ded8072ebde4b6e8。

正式中间构建观察：同窗展开/收起；卡片选择；空格打开1200×780独立专注；配色来自受控预览实测，尺寸来自核验原件；真实笔记页“自动保存验收页”无保存按钮提交，返回后仍有记录；原生备注“本轮 B 同窗自动保存备注”及#4A9DAB重开保留；窗口拖动触发左边缘条、点击恢复。以上操作并不证明最新代码全通过，原生连续帧/P95尚未测。

用户复测明确发现：紧凑可收录、展开部分区域不能；多选后鼠标按下缩为单选，拖出只能一张。卡片按下已选项现延迟单选至mouseup；drag开始保留整个选择。用户随后确认可以多选拖动，但实际接收未确认：原隐藏worktree接收目录为空且用户表示未看到目录。已在桌面建立DAM-B-接收测试-20261012-77a7，仅接收生成材料；不能把拖动影像等价为文件交接成功。

展开接收先补CollectionView delegate、卡片和滚动容器，用户复测仍指出部分子控件拒绝。后续补备注/颜色field editor、clip及色板滚动的显式拖入，保持文字粘贴语义。原始PNG/TIFF拖入用专属临时PNG而不读取真实系统剪贴板；现代文件承诺暂存后走唯一Host收录；未知数量保持未确认。此后续版本已编译，原生复测待解锁。

内部真实临时库：自动保存/重开、首次文件承诺字节、既有目标不覆盖、重复引用、外部Copy、ZIP承诺、成员移除不删原件与撤权均通过。延迟OS端口退出时窗口资格未先释放。新增预取消/批量取消测试在真实promotion后停止后续项（2/24完成），保留partial账本及原件，普通receipt replay不重新执行。控制OS port与AppKit协议冒烟独立标记，不替代正式GUI/接收应用。

当前AI服务与OCR环境未启用，专注中明确显示未配置；没有执行实际推理，不以按钮或API接线证明模型结果。视频参考路径、完整菜单/接收矩阵、跨屏与性能资格继续保留，B目标仍PARTIAL。

### 继续测试：当前构建已装载

当前Mac可操作；在启动前已确认旧候选Host与B子进程不在。2026-10-12以显式profile-b启动dam-868a26a56ee7438e，核对嵌入原生SHA af06dc0b3fe9fbc9d8fed57fd2b616499ae12213bd8785afadfc6dabeeba4040。仅打开新建library-b-v2，从工作模式正式入口打开“B二版原生验收”。紧凑/展开同窗实际显示两项，备注及#4A9DAB保持。空格进入独立大专注，自动保存验收页仍在；切暖色图时标题/640×480/配色#D69A6B更新。当前截图b-v2-current-focus.jpeg及两份focus AX在同目录。

Finder坐标输入仍报windowNotFoundAtPosition，未将失败拖动计为接收成功。继续请求用户逐区域拖入及拖往桌面专用接收目录；等待真实文件结果时不切换/重启测试窗口。

继续测试补充：`native-shelf-controller.test.ts`使用生产成员接口及真实临时SQLite库验证原件80×90、实测配色#195AF0（100%）；非成员/非授权窗口/未知操作被拒绝，未配置AI与OCR返回显式失败，移出成员后访问撤销。测试退出0，日志与源摘要见`b-v2-member-tools-test.json`。这是内部集成证据，未替代实际AI执行或跨应用接收。当前桌面接收目录只含本任务标记，未出现图片；Computer Use再次绑定原生窗口超时，未切换、重启或修改当前人工测试窗口。

### 网格空白拖入的确定修复

用户对dam-868a26a56ee7438e报告：网格空白无法拖入，拖出正常。接收目录当时为空，因此保留用户结果，不补造文件字节证据；备注/颜色区域没有逐项回答。生产AppKit回调测试复现NSCollectionView进入返回copy(1)，继承draggingUpdated返回none(0)。补齐Collection及Root的更新方法后，空/已有网格、卡片间隙和底部空白连续更新保持copy，完成交给Host；frozen拒绝接收。测试是受控sender，不能取代Finder用户路径。原始失败/修复日志和解释见b-v2-empty-drop-repair.json。

当前修复构建dam-9b3108abbc7bb01a已通过build，以正式退出审查正常退出旧版并核对进程消失，再从正式入口打开library-b-v2、工作集及展开原生架子。原两成员、备注和用户新增颜色#342342均保留；嵌入原生SHA7e751270c20f41320124da41289532a354185e2375e887b4753ec5f97418f898已核对。已生成三份独立320×240测试PNG用于空白/备注/颜色区域，等待当前版本用户拖入复测。没有把回调测试计为正式拖放通过。

### 整窗统一接收：图片子控件拦截

用户确认9b3108版空白、备注、颜色区域均可拖入，但现有图片区域拒绝，并明确要求整个AppKit窗口均可松手添加。生产AppKit测试观察到NSImageView默认注册NSFilenamesPboardType及promise元数据/类型等，会抢占祖先接收。整窗修复以window/root为素材目标，内部展示控件取消注册，普通文本编辑保留.string；来源同时含文件与文字路径时仍走Host收录。动态卡片及field editor同样处理。修复前/后注册树及callback日志、来源摘要见b-v2-window-drop-repair.json；受控sender不计正式拖放通过。

当前dam-f7c6458f26028af2已build完成，旧版正式Quit审查后owned进程消失，新版经打开指定库/工作模式/工作集/桌面入口加载。5成员、原备注与两色保存重开，停靠条点击恢复为展开态；原生SHA62f26e6c15c04bebf62cd55cd24df891e49a16dea5946dfc9aad6ccc6ead0566已核对。当前仅请求用户把新生成整窗图片区复测-f7c645.png拖到已有缩略图中央；真实结果仍待确认，不沿用前三区域的旧版结果作为新版全页资格。

### 继续其他项目验收（5f8522）

用户确认整窗拖入已修复并授权继续其他测试。当前dam-5f8522c6e415e0b9修复取消永久等待/过期拖出入口、交付错误串入保存反馈、缩略图吞鼠标导致Space仍进入备注三个实际问题。正式菜单生成原件/预览/兼容PNG/160×120副本及9条目ZIP，字节/CRC/索引回读符合；真实Shift增减、点击+Space、文本删除、未完成HEX阻止关闭、备注及矩形笔记正常Quit重开、引用删除不删素材并恢复9项已观察。实测矩阵、版本范围及未完成项见B-ACCEPTANCE-20261012.md。AI/OCR未配置，菜单OS接收/视频/跨屏/性能仍未完成；不把正确生成文件等同物理交接。

### 六项交互修正（46c9）

用户新增Space只开关、Shift-wheel共享缩放、精简工作集专注/右底缩略条、切图不退回读取页、胶囊弹出离边及动画/REA补核、全状态圆角。已实现并装载dam-46c9fc1a3415f2ce；现有生成9项、原备注/两色/笔记均保持。当前UI及组件/Host证据与手势限制见B-INTERACTION-V4-20261012.md，REA原始ID补核见dropover-dock-motion-20261012.md。物理Shift-wheel与停靠/动画待用户反馈，不把构建/内部32pt位置测试计为实际物理通过。

### v5明确纠正（f9785179）

用户确认滚轮正确，报告吸附等待仍奇怪，并明确大图直角/所有小预览圆角容器+柔影、缩略条在笔记下左侧且不延展右栏。当前dam-f978517998ccb4b4已实现并正式加载；UI截图及带CSS组件回归符合。新增原生动画主动打断、motionId新旧回传检查、tracking排除旧位置命令及停靠尺寸/style纠正；即时redock内部回归通过，实际快速反复手势待用户。详见B-INTERACTION-V5-20261012.md，旧v4吸附FAIL不改写。

### v6吸附回归根因（2026-10-13，16ed668）

v5f978用户报告完全无法吸附，保持FAIL。核对SDK/Apple契约发现performDrag立即返回且不保证mouseUp，以返回当释放的实现错误。当前16ed版本新增仅活跃拖动期间button状态/final frame跟踪，松手后才判定，清timer；左右intent/异步回调内部测试通过。正式启动当前版本成功，ComputerUse实际拖动仍未移动frame，不计吸附PASS。已请求用户首次/立即重复两路径。完整根因及日志见B-DOCK-REGRESSION-V6-20261013.md。

### v7自行验收通过（2026-10-13，f55e18）

用户撤销继续人工代测，要求Agent自行测试及后端实时分析。现场motion记录证实frame移动却无dockIntent。背景/标题统一原生mouse事件与CGEvent屏幕坐标，越界纳入磁吸；私有Native拖离恢复带合法本次位置，Renderer不获该权限。最终dam-f55e18f0df3e70b9通过Agent CUA紧凑左右、连续左redock、展开左右、点击恢复与拖离保留新x/y；实时backend12完整链、保存layout/9成员与UI一致。旧用户FAIL保留，当前单屏吸附子目标PASS；父B仍PARTIAL。详见B-DOCK-SELF-ACCEPTANCE-V7-20261013.md。
