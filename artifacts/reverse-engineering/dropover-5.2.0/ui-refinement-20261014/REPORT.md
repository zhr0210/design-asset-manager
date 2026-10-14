# B 工作窗体验修正：只读调研结果

**后续实时检查已定位聚焦直角黑框，当前结论见[正式进程因果对照](LIVE-ROOT-CAUSE.md)。** 下文5.1–5.3保留此前调查阶段及未知；其“黑线未定位”已被后续A/B/A证据取代。本轮仍未实施产品修复。

2026-10-14。用户已确认目标，但明确要求“继续调研，不实施”。本轮交付为机制、参数、现有差异与未解决项；没有修改产品代码、重建产品候选、提交或发布。设计规则分别保存在 DESIGN 和悬浮工作窗交互规格，本文不把规则当作已实现能力。

## 1. 结论

- DAM 的位置漂移已由当前源码及指定公开工作集的正式窗口操作共同复现。当前切换保持左上角再夹入屏幕，且没有记录展开前紧凑 frame。
- 安装的 Dropover 5.2.0 展开窗口动画为 **0.18 秒**，收起为 **0.23 秒**，窗口动画使用 `EaseInEaseOut`。展开前景分段淡入：导航栏延后 **150ms** 开始、持续 **200ms**；主体延后 **180ms** 开始、持续 **300ms**。收起使用详情快照与紧凑内容交叉淡化。
- 原版几何路径是“中心扩大后夹入可用屏幕范围”，夹取内距 **20pt**。本轮 DAM 已批准的“越界时固定对应紧凑边缘”是明确的产品规则，不能冒称与原版数学公式完全相同。
- 原版选择背景是独立 `CAShapeLayer`，通过 `opacity` 0/1 变化呈现。当前 DAM 直接改卡片背景色；独立背景层有利于只淡化背景。原版实际选择动画时长、曲线及中断连续性尚无运行证据。
- 后续正式进程实时A/B/A已定位：窗口自身角半径0、玻璃24；窗口持续key时，临时将窗口自身圆角对齐24，额外直角黑框消失，恢复0则重现。当前问题归于原生窗口外形与玻璃形状的集成不一致。先前玻璃外层裁切试验不能替代该因果对照或直接充作修复，详见[LIVE-ROOT-CAUSE](LIVE-ROOT-CAUSE.md)。

## 2. 对象与证据资格

| 对象 | 本轮核对 |
| --- | --- |
| Dropover | `/Applications/Dropover.app`，5.2.0（653） |
| Universal SHA-256 | `b0120976ab702cbd3eaca13e4e596bb5d4d6db8eeae776fb78e234b9d78b5294` |
| arm64 分析切片 SHA-256 | `b5dfa561d25dadff69ddc22376b626e32175f8fb1dac00a32fe08795707c2239` |
| DAM 源码 | 本工作树 `c6f7903`；本轮产品源码无差异 |
| DAM 实际窗口 | `dam-78f30cf9f4bc6f52`，已指定公开素材工作集 `B-native-design-public` |
| 分析工具 | REA 6.1.0、Ghidra 12.1.4、JDK 21；既有安装，仅给自有任务进程指定路径 |

本机 Dropover 包的额外 dylib、adhoc 身份及其归因限制见[基础报告](../REPORT.md)。本轮哈希与旧绑定一致，没有修改安装包、运行分析副本或访问账号。结论限定到本机字节和已解析调用路径，不保证官方其他包或 x86_64 路径相同。

伪代码是恢复结果，不是原始 Swift。关键双精度常量、几何寄存器及直接闭包调用已与 arm64 指令核对；ABI 不可靠的反编译变量名不作为几何证据。本轮没有取得 Dropover 同输入、高帧率连续运行对照，因此恢复的源码常量不能代替实际屏幕流畅性资格。

全部分析、原始错误和渲染实验保存在本工作树 `.scratch/dropover-ui-refinement-20261014/`。索引为 `evidence/research-evidence-index.json`，带地址、Evidence ID 与文件 SHA；活跃会话的最终 ledger 为 `evidence/session-bundle.json`。展开函数响应超过传输预算后，从保留 ledger 取回 `expansion-record.json`，没有重复分析凑成功。REA 的初次启动超时单独保留；后续完整结果及正常 `close_binary` 回执不与失败占位混淆。

## 3. 展开和收起机制

### 3.1 展开

正式协调器入口 `0x10024db54` 创建面板协调器后进入 `0x10025d764`。后者保存 `originalWindowFrame`，建立同窗容器，把导航与主体 alpha 先置 0，再插入视图。

该安装版本使用宽 **400pt**；预计素材数 ≤2 时高 **207pt**、3–5 时 **310pt**、≥6 时 **435pt**。这是原版尺寸策略，DAM 按用户确认保持默认 640×520pt，不引入数量自适应。

汇编 `0x10025dc38–0x10025dc70` 可恢复目标：`x += (旧宽−400)/2`、`y += (旧高−目标高)/2`，中心保持不变。随后读取 `screen.visibleFrame`，以 20pt 内距进入 `0x1001508fc`；该 helper 的寄存器流实现上下限夹取，不是单独的右/左边缘判定。边界夹取可以形成向内扩展的视觉结果，但不等于保持原紧凑边缘的通用契约。

动画捕获常量 `0x3fc70a3d70a3d70a` 解码为 **0.18**，经 `0x1000aee98` 进入共用 `0x100072120`。该 helper 设置 `kCAMediaTimingFunctionEaseInEaseOut` 和时长，并通过 `window.animator().setFrame` 改窗框。

同组回调 `0x100262ab0 → 0x1000ae0dc` 将容器 frame 过渡到目标尺寸、关闭紧凑内容交互并将其 alpha 动画到 0，然后调用 `0x1000a1308` 排程前景出现：

| 相对开始时刻 | 对象与持续时间 | 恢复路径 |
| --- | --- | --- |
| 0ms | 窗口、容器 frame 与紧凑内容退出，180ms | `0x10025d764 → 0x100072120 / 0x1000ae0dc` |
| 150ms | 导航栏 alpha 到 1，200ms | `0x1000a2354 → 0x1000a091c → 0x1000a23a0 → 0x1000a0a58` |
| 180ms | 当前主体视图 alpha 到 1，300ms | `0x1000a2380 → 0x1000a0b14 → 0x1000a2388 → 0x1000a0c50` |

因此主体淡入排程覆盖到约 480ms，不能把 180ms 窗框完成误作整次视觉过渡完成。两个后续组只明确设置 duration，未在所读方法中设专属 timingFunction；不能把窗框曲线强行标为它们的原版曲线。Dispatch 的排程常量也不保证现实机器精确按毫秒执行。

窗口组完成 `0x100262b0c → 0x1000ae1d4` 隐藏紧凑视图、整理容器关系并转移 key/first responder。这些动作和渐显本身是不同责任，不能靠视觉回调修改成员或保存身份。

### 3.2 收起

入口 `0x1000ad828` 读取 `originalWindowFrame`，获取面板快照（失败时退回空 `NSImageView`）、把真实面板 alpha 置 0、显示紧凑内容，再创建 **0.23 秒**共用窗口动画。`0x1000aee14 → 0x1000ae4b0` 在同组里将快照 alpha 到 0、紧凑内容 alpha 到 1。组完成 `0x1000ae53c` 移除快照/面板、清除协调器引用并恢复紧凑交互与焦点。

几何关系不是简单 `setFrame(originalWindowFrame)`：`0x1000aec54` 比较保存 frame 与当前 frame 的中心，包含 5pt 比较阈值，返回方向枚举；`0x100071f80` 按枚举决定缩小位置，并以 20pt 内距做屏内夹取。由此能证实原版保留位置关系并按当前窗位置收起，但本轮没有用主动拖动运行矩阵证明它在所有位置满足 DAM 的“未拖动精确回原位/拖动后跟随”要求。

### 3.3 DAM 现状与后续可实施边界

`NativeWorkShelf.swift:427` 当前先翻转 expanded，再按旧 minX/maxY 生成目标，立刻 `layout()` 切 hidden，之后才改窗框；默认两个方向都 0.2 秒。`WorkShelfInteraction.swift:158` 已有动画代次与中断保护，但前景呈现切换未使用上述准备、淡出、分段淡入和快照生命周期。

公开工作集正式 UI 的记录（坐标采用现有 Host 顶部原点）为：紧凑 `(1684,878,220,240)` → 展开 `(1600,740,640,520)` → 收起 `(1600,740,220,240)`，收起相对原位偏移 **−84/−138pt**。随后通过正式拖窗恢复到 `(1684,878,220,240)`，恢复保存已确认；记录见 scratch 中 `evidence/dam-ui-layout-observation.json`。切换与拖窗沿既有 Host 自动保存路径写入布局，不能称完全无写入；没有编辑成员、备注、颜色或原件。

后续若获实施授权，应以已批准的固定尺寸、中心/边缘锚点、拖动后跟随和草稿保护为产品契约；原版时序作为可复查参照。不能直接移植原版动态尺寸、中心夹取或未核实的取消语义，也不能通过切换真实编辑控件销毁草稿。动画中断及保存重开仍需正式用户路径验收。

## 4. 选择背景

`DragSessionGridCollectionViewItem` 初始化 `0x1000b08e4` 建独立 `CAShapeLayer`，cornerRadius **8pt**、backgroundColor 为系统 controlAccentColor；`0x1000b163c` 初始 opacity=0，加入卡片 view.layer 的子层。`setSelected: @0x1000b22f4` 先调用 super 更新选择，再根据 isSelected 把该层 opacity 设为 1/0；`0x1000b23a0` 单独更新标签颜色。

在所读初始化及 setter 中没有看到给 selectionLayer 设置自定义 delegate/actions 或显式 `CABasicAnimation`。结合独立子层、可动画的 opacity 和用户观察，**推断为 Core Animation 隐式动画路径**。Apple 的[默认 action 查找](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/CoreAnimation_guide/ReactingtoLayerChanges/ReactingtoLayerChanges.html)和[图层动画说明](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/CoreAnimation_guide/CreatingBasicAnimations/CreatingBasicAnimations.html)支持机制解释，但上层事务仍可覆盖或禁用 action，系统文档不证明本机原版的实际参数。

当前 DAM 的 `NativeWorkShelf.swift:184` 直接更新 view backing layer 的 backgroundColor，缺少独立背景 opacity 过渡。后续可采用独立中性灰背景层，选择状态立即更新，视觉从当前 presentation 值接续；这是针对已批准契约的实现方向，未在本轮实现或验收。原版的强调色、选中文字变白不纳入 DAM 规则；精确时长、曲线和快速反选连续性仍为未知，不能填写未经证明的“原版 250ms”。

## 5. 异常黑线

当前 macOS 26 路径使用透明无边框 NSPanel、hasShadow=true、`NSGlassEffectView.cornerRadius=24`，无显式窗口 border/stroke；旧系统 fallback 才在 NSVisualEffectView backing layer 上裁切。Dropover `0x10029b6fc` 同样创建 NSGlassEffectView 并设置圆角及 contentView，所读函数未添加黑色外描边。只能说明同类系统材质与外框设置，不能证明内部合成、阴影和实际背景一致。

为缩小原因，在 scratch 编译了两个独立渲染诊断程序，均不导入 DAM、不接 IPC/数据库。它们只显示公开文字及自建不透明底窗；ScreenCaptureKit 限定到自有诊断窗，排除外部窗口阴影。四组均保持 **220×240pt**，只对比默认、加入 resizable、关闭 hasShadow、额外图层圆角裁切；名为 expanded-resizable 的用例不代表实际 640×520 展开布局。

| 对比默认组 | RGB 最大差 | alpha 最大差 / 平均差（0–255） | 能回答的范围 |
| --- | --- | --- | --- |
| resizable | 0 / 0 / 0 | 1 / 0.000218 | 该诊断捕获内没有新增可见色线 |
| hasShadow=false | 0 / 0 / 0 | 1 / 0.000218 | 捕获已排除外部阴影，不能据此排除真实外阴影 |
| 额外裁切 | 3 / 3 / 3 | 151 / 0.177178 | 边缘透明 mask 明显改变，未证明消除用户所述黑线 |

视图缓存检查中所见层 borderWidth 均为 0；WindowServer 合成 PNG 与像素指标分别见 `glass-edge/composition-captures.json`、`composition-pixel-metrics.json`。

### 5.1 用户补证：持续到失去焦点的直角黑框

用户随后提供[原始截图](user-reported-focused-border.png)，并明确确认：“一直保留，切换其他窗口后消失”。截图中可见清晰的直角外框，与玻璃圆角不匹配；这是窗口获得焦点后持续存在的故障线索，不再只列为无法描述的细边缘，也不按瞬间动画尾帧处理。原图 SHA-256 为 `983ea101473dfb56b3b6f43c68998db18522778280d59cccf2c12a51c0bcac40`；没有裁切、修饰或重绘附件。

针对焦点关联增加两组独立实验，均未修改产品源码或既有资料库：

1. **系统玻璃诊断窗**：真正让另一个自有窗接管 key 后捕获非 key 状态，再让目标成为 key/根视图第一响应者；记录实际 isKeyWindow，不以 case 名称代替状态。对比根/玻璃视图 `focusRingType=.none`、根图层 backing、640×520 resizable 展开后返回 220×240。单窗及仅包含自有窗/底窗的 display 过滤捕获都有记录。关闭焦点环、增加 backing、展开后收起与默认 key 紧凑态的 RGBA 像素完全相同；key 与非 key 材质不同，但没有复现用户所示直角黑框。见 `glass-edge/focus-observations.json`、`focus-pixel-metrics.json` 与 `stage-*.png`。
2. **生产视图源码诊断**：直接编译本工作树未修改的 NativeWorkShelf、WorkShelfInteraction、WorkShelfColorPicker 三份源码和 scratch wrapper，在独立进程显示 9 张生成纯色色块；emit 不接 Host，未读取资料库。记录紧凑根视图、展开 collection、收起根视图及关闭 focusRingType 的四种 key 状态，均未复现直角黑框。见 `source-focus-observations.json` 与 `source-*.png`。首次使用诊断 NSPanel 底窗时底窗未进入可捕获列表，改为自有 NSWindow 底窗后完成；缺失目标那次不计成功。首个紧凑观测的 styleMask 为 136，后续收起为 128，这个受控过程与正式窗的初始化时序并非已证明完全一致。

还对已指定公开工作窗做了 CUA 空白处点击和读取，以及只含其自身/自建不透明底窗的窗口和 display 过滤捕获；没有取得附件中的黑框。当前实际位置已由用户改变，捕获记录在 `public-window-captures.json`；没有把它拖回早先研究位置。图片见 `public-compact-owned-stage.png`，窗口内容未编辑。

这些结果**不证明故障不存在，也不证明关闭 focusRingType 能修复**。Apple [focusRingType 文档](https://developer.apple.com/documentation/appkit/nsview/focusringtype)说明第一响应者和 key 状态会影响焦点绘制，但普通焦点环在本次受控对照中没有解释黑框。窗口过滤仍可能遗漏来自另一层的聚焦标示或改变玻璃取样；相同显示器上的真实焦点状态和捕获层归属尚未与用户附件绑定。因此根因与修复方式保持**未解决**。

下一项有依据的调研是取得同一正式窗口在黑框出现和消失时的成对焦点/窗框绘制证据，区分目标窗口自身、系统聚焦标示及其他合成层；不继续重复没有黑框的静态玻璃截图，不直接归因为 `.resizable`、加裁切或画白线遮盖。本轮不改辅助功能/系统设置，不把缺陷转记为已修复。

### 5.2 用户指出底部方形轮廓后的补核对

前轮把仅选窗口的过滤截图作为主要观察，漏掉了实际合成中的角部输出。用户指出“圆角矩形外围还有正方形的矩形在底部”后，改用**正式公开窗口的实际 display 合成局部图**：只捕获该窗与自建不透明底窗所覆盖的区域，先检查前景窗口栈；有其他前景窗口相交时跳过，随后满足检查才完成捕获。不读取其他窗口标题或内容、不截全桌面。见[正式窗底部方形残留](public-window-square-corners.png)，底部两角可见矩形暗块。这张图补证方形残留，未重现用户附件的黑色细描边。

生产视图源码诊断补录了 appActive、isKeyWindow、浅色/深色以及根视图到窗口 frame 的容器几何。实际链为 `WorkShelfRoot → ContentHolderView → NSGlassEffectView → NSNextStepFrame`。玻璃 API 的 cornerRadius 为24pt，但其 backing layer cornerRadius 为0且 masksToBounds=false；外窗 frame 层也为矩形边界。**类名和矩形边界本身不证明谁画黑线**：在 key 状态隐藏玻璃后，单独的外窗 frame 未画出黑色矩形。

随后在同一隔离源码诊断中对比角部输出：

| 条件 | 底部左角像素(120,1159) RGBA | 底部另一角点(130,1150) RGBA | 结论 |
| --- | --- | --- | --- |
| 原始玻璃，窗口 hasShadow=true | 150,176,188,255 | 145,171,182,255 | 与纯底窗背景不同，矩形暗块存在 |
| 保留玻璃，窗口 hasShadow=false | 150,176,188,255 | 145,171,182,255 | 相同角部像素，窗口阴影开关未消除该残留 |
| 隐藏玻璃，外窗 frame 保留 | 161,190,202,255 | 161,190,202,255 | 恢复纯底窗背景，残留来自玻璃视图子树输出 |
| 保留玻璃与 hasShadow=true，玻璃外层 layer 施加24pt圆角裁切 | 161,190,202,255 | 161,190,202,255 | 角部恢复背景，视觉圆角外的矩形输出可由统一裁切消除 |

左右共5个角部采样点一致，完整坐标/像素见 scratch 的 `glass-edge/source-corner-mask-comparison.json`；状态/容器见更新的 `source-focus-observations.json`。对照图：[原始输出](diagnostic-original-corners.png)、[统一裁切输出](diagnostic-aligned-mask.png)。两图是生成纯色色块的隔离渲染，**不代表正式窗口修复结果**。

据此可以把**底部方形残留**的输出范围收窄到玻璃视图子树及其与透明窗口的边界接法。这个结果尚未证明某个内部 CALayer 参数错误，或恢复了具体产生暗块的系统绘制方法。单独关闭 NSWindow.hasShadow 未消除该残留。外层裁切同时改变了玻璃原有边缘/高光表现，不能在本轮直接移植为修复，也不能宣称已经满足“保留正常玻璃与阴影”的要求。用户附件中聚焦出现的黑色细线是否同源、具体由哪条绘制路径产生，仍待证明；本文没有用方形暗块的补证替它关闭。

正式进程的只读 LLDB 附加在加载/不加载初始化配置两次均于 attach 阶段退出(138)，未执行窗口属性表达式；应用进程仍正常运行，未读取进程环境、内存转储或崩溃转储，也没有扩大系统权限。回执分别为 `evidence/actual-window-attach.txt` 和 `actual-window-attach-noinit.txt`。该失败解释为何未取得正式进程内部 frame 归属，不能当作产品窗口失败；后续容器数据均明确来自隔离源码诊断。

### 5.3 “矩形”含义与责任归因澄清

用户进一步询问为何可见黑线没有进入工具捕获，以及矩形是否为旧代码残留或macOS组件缺陷。附件中的黑线清晰可见；此前“没有看到”只指重新采集的图未包含该细线，不能用作否认用户显示器上的现象。窗口内容抽取、指定窗口过滤与实际display合成的采集对象不同，采集时的焦点/背景也未与附件的同次点击完全绑定；目前没有证明究竟是哪一差异导致细线缺失。

“矩形”描述的是视图/图层画布与合成边界，**没有识别到一个遗留的可见矩形控件或第二个旧窗口**。原生玻璃在这一画布内绘制圆角形状和效果。`NSGlassEffectView.cornerRadius`定义玻璃角部曲率，[Apple API说明](https://developer.apple.com/documentation/appkit/nsglasseffectview)与本机SDK头文件均如此；内部backing layer的cornerRadius为0本身不证明错误。AppKit可以自行渲染曲面，并不要求所有内部图层属性与公开API逐项相同。

已将完全不导入DAM源码的原生诊断窗与生产源码诊断逐点比较：纯AppKit `stage-key-root-default.png` 的(120,639)/(130,630)/(550,630)，与生产源码图的(120,1159)/(130,1150)/(550,1150)，分别均为(150,176,188,255)/(145,171,182,255)/(145,172,182,255)；底窗背景均为(161,190,202,255)。因此**底部矩形暗块不依赖DAM旧卡片、旧绘制代码或Host逻辑**。但该最小实验仍沿用“透明无边框NSPanel，NSGlassEffectView铺满contentView”的同种接法，不能因此把它升级为“已证实Apple组件缺陷”。

当前工作判断为**原生玻璃与透明悬浮窗的边界集成问题，具体责任未定**。需要证明规范用法/窗口承载方式是否仍出现该效果，才可进一步区分接法问题与系统缺陷。旧系统NSVisualEffectView fallback与macOS26玻璃分支是条件互斥的，当前分支没有同时添加两种底板。聚焦黑线与底部暗块的同源关系仍保留未知，不能把两者混成一个已经完全定位的缺陷。

## 6. 本轮终点

展开/收起主要路径、窗口时长/曲线和分段淡入参数已补证；选择背景的层结构及 setter 已补证。聚焦直角黑框已由后续正式进程形状A/B/A对照定位。原版前景后续曲线、选择实际参数/快速中断，以及生产公共API修复方式仍待后续工作。本轮分析会话已正常关闭，原始材料保留；产品代码与运行候选保持此前版本，不关闭父级功能票据，不恢复旧实施队列。
