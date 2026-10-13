# B 窗口核心重建：2026-10-13

**后续原版补证更新**：用户指出吸附模糊及按钮视觉退出遗漏后，已在安装原版实际执行停靠/弹出，并取得连续图像与真实AppKit/Core Animation调用栈。确认整窗NSVisualEffectView(active/withinWindow)，现B的纯色overlay不足以复现；该视觉部分未实现/未验。详见[原版实时补证](../../reverse-engineering/dropover-5.2.0/overlay-runtime-20261013/RESULT.md)。以下原单屏功能PASS不等于该视觉细节已通过。

正式入口已可完成：工作模式 → 原生小窗 → 拖边松手停靠 → 点击边缘恢复小窗。停靠保持 290×310，屏外约84%；恢复到对应边缘内12点。展开窗左右拖边均保持640×520，不进入停靠。拖离完全回到屏内时保留松手位置。弹出不自动回缩。

代码基础为指定 B 副本的 `dam-f55e18f0df3e70b9`。当前实现/单屏路径已交付；与原版全部运动品质相同的资格仍 **PARTIAL**，下述缺口不转交用户复测。

## 身份、入口与范围

- 工作副本：`/Users/meigong/.codex/worktrees/6699/design-asset-manager-macos`。执行 `npm run start:work-b`，正式界面打开 `artifacts/window-candidates/library-b-v2`，进入工作模式并恢复工作窗口。
- 最终 Main build：`dam-492930414aa9bcb7`，构建UTC `2026-10-13T03:05:24.242Z`；源码摘要 `492930414aa9bcb7a04e12d2205f62ddcf5f6c7b1e8b9da22fc5d2f6e5774209`。
- Main文件SHA256：`8050e7a30ce2b6ea3779785ac754d747901de5f0ff5b5ec1f778d578d9a15832`。
- 原生文件SHA256：`5648ab9ac5154aca4f5ef7ec273d8540deb8613f7fcdb7624e7bac0f0cf2d57e`；原生源码摘要 `72dd350d20ec48354e25244f181e99f0345214cd59473eadf7700e4c51f53a4b`，私有桥版本3。
- macOS27.0 / arm64，实际单屏2240×1260、scale2。仅使用 profile-b / library-b-v2 的生成素材；正式工作集9份引用。没有运行AI/OCR或访问旧 library-b。
- 旧软件进程已关闭；最终完整Host重开后为新的B父/子进程，父进程cwd、profile参数与Main内嵌build核对一致。没有替换普通默认产品、推送或发布。

## 实现

`WorkShelfInteraction.swift`统一标题/背景的AppKit手势、原始deltaX、明确compact/expanded状态、候选边缘、移动与覆盖层生命周期。移除全局按键轮询、旧重复移动入口及截图拉伸。素材source session、控件及文字输入沿用独立路径。

停靠目标为左 `minX−.84w`、右 `maxX−.16w`。进度为越界距离/(.84w)，限制0至1；p>0且最后deltaX向外，或严格p>.4才停靠。目标与其他屏幕相交则拒绝该侧。duration按abs(raw deltaX)选[1,1.5):.6、[1.5,2):.45、[2,3):.35，其余.3秒，EaseOut；弹出.2秒EaseInEaseOut。没有把deltaX除以时间。

移动中输入从WindowServer实际显示frame接管；生成号让旧completion失效。预览覆盖层可在p>.4期间淡入，但不接收手势；停靠完成才获得抓手输入资格，运动期间不抢控件输入；恢复与.3秒淡出重叠。已经展示的预览不在停靠完成时重新清零alpha。

桥接关联gestureId / motionId / transitionId，完成、取消、失败回执分别处理；configureDock等待有效终态。打开、停靠、弹出和程序恢复均在实际完成后提交布局；迟到回执与撤权后完成不得覆盖新状态。原会话/成员/修订/文件任务/实际子进程退出保护保留。

布局增加presentation及dock.style=edge-slide；旧格式仍可读。旧小窗胶囊转换成同尺寸比例停靠；旧大窗胶囊恢复可见展开窗。转换前原布局保存在随机原生state-root的legacy-layout.json，不新增Library表；本轮原布局副本见legacy-layout-preserved.json。生产临时库测试覆盖旧小/大布局解释和Host重开；正式B首次旧普通布局归一化也已执行。

motion-trace v2使用2048条有界缓冲、拖动样本合并及异步原子写入；保留当前缓冲内开始/松手/中断/终态等关键阶段。记录build、原始事件时间、单调时钟、请求目标、实际位置、比例/方向依据、回执及Host保存请求/成功/失败。WindowServer不可用时明确标注appkit-fallback，诊断写失败不阻塞交互。它是滚动诊断，不是无限期审计存档。

## 原版证据及修正

原版仍为Dropover5.2.0，SHA256 `b0120976ab702cbd3eaca13e4e596bb5d4d6db8eeae776fb78e234b9d78b5294`。复用同身份静态证据，未重复启动分析会话。

| 结论 | 地址 / Evidence |
| --- | --- |
| 同尺寸84%移出 | 0x10000731c / ev_3285d1717a3f29dc2b1b81a1e4250f787761b6ba755500978342f8bd935cc18c |
| 进度函数汇编含1−，反编译丢失该项 | 0x1000069bc / ev_99bd259cb91509bbdd33ccf2f5258a85b9c6816dc280ba58d4d78fb12e8a2ee9 |
| mouseUp方向或严格p>.4 | 0x100006250 / ev_76f2dfdb1c2de83cf7a2d64a41674289d973e5da1cfd7f06955742b0f2fd9120 |
| 原始事件deltaX及四段duration | 0x100007cd8 / ev_8dbc865cae0660a792fa2b662a2e7d99128cc0fd08698e16802972eed8f4c9a7 |
| 停靠EaseOut、恢复.2 EaseInEaseOut | 0x100007410 / ev_616c33811248414cc32e4d7a9f50963883271f5e0ae4b3d812022038c9a90b4d；0x10000769c / ev_ce90f569b0540a9396cc3369b0c7495cf7915b3061fd13b56033018bbc5b91f5 |
| 相邻屏幕交叠拒绝 | 0x100009188 / ev_86b96f0faa35aa949c742fc9fbdf64560077542aee466714ad7d7439e86926b7 |

补证修正了先前“overlay仅在运动完成后出现”的过强结论：原版拖动p>.4时即show；mouseUp fallback也提前show，恢复运动与hide重叠。完成回调最终设置抓手。新实现的预览不可点击/终态抓手可点击，是DAM输入保护设计，不能写成原版每个hit-test细节已证明一致。原版部分分支目标Y另加2×raw deltaY；本计划保留释放Y，不宣称复刻该垂直动量。

对原版公开测试窗 `DAM public animation test 2026-10-13.txt` 执行两次CUA背景/标题拖动，窗口未发生移动；连续152帧的实际frame保持2028/121/198/207。不能把该自动化失败当成原版行为结论。CUA仅有原子drag，无速度、停留、路径或持鼠移动API；本轮无法获得所需慢拖/快速拖/反向拖/动画中真实输入的原版观察，保留BLOCKED_UX_ACCEPTANCE。

## 已执行验收

| 层级 | 结果和边界 | 证据 |
| --- | --- | --- |
| 类型、必要构建、嵌入身份 | PASS，当前产物 | build.log、runtime-smoke.log、identity.json |
| 实际AppKit控制器 | PASS：左右比例、严格.4、raw-delta时长边界、相邻屏幕拒绝、展开/素材source拒绝、失败/取消/完成、实际显示位置中断、旧完成失效；受控事件不是物理输入资格 | interaction-test.log；scripts/work-shelf-interaction.test.swift |
| 原生内容接收/取消保护 | PASS：注册树、文字路径、Host确认取消、迟到交付和保存错误隔离；受控sender | drop-test.log |
| 生产Host+临时真实SQLite | PASS：打开与运动等待终态、私有手势字段接线、取消保留、保存故障保留旧有效布局、撤权后迟到运动拒绝、旧布局归一化、整个Host重开、内容/原件bytes保全；OS端受控 | motion-host.log、native-host.log |
| 正式原生CUA | PASS：最终构建左右停靠、边缘弹出保持小窗、弹出后再拖、左抓手拖离保留186/373、展开左右拖边保持640×520、收回小窗再停靠、关闭小窗并从正式工作集重开、停靠状态整Host退出重开 | traces/、sampling-and-readback.json、会话内CUA截图 |
| 保存读回 | PASS：整Host重开前停靠布局−244/373/290/310/compact/edge-slide，重开后WindowServer同frame；9引用、原备注、#4A9DAB与#342342、修订20保留 | traces/afe48…、traces/fd40…、sampling-and-readback.json |
| 连续图像与记录关联 | 有限PASS：最终左右样本内未见尺寸改变、图片轴向拉伸、终态回跳或重复吸附；覆盖层淡入/淡出与终态关联相符 | final-cycle-left/、final-cycle-right/，各自frames.json和contact-index.json，联系图 |

正式CUA曾发现私有gestureId被外层白名单拒绝；已修正并新增真正私有入口回归。自审还修正了打开/恢复预先保存、原布局备份被clamp、覆盖层完成时alpha重新清零。中间f1c739/26ad86证据仅用于定位，未转记到最终构建。

## 资格缺口

最终右195样本/20秒、平均间隔102.8ms、最大335ms；左197样本/20秒、平均101.5ms、最大217.5ms。每张图为指定窗口的ScreenCaptureKit图像，包含完整窗口；屏幕边缘裁切/露出比例由独立WindowServer位置与屏幕frame核对。元数据在图像请求前取样，不能冒称原子同帧或60fps录屏。联系图只选择290×310段，跨展开尺寸的采集配置不用于图片比例判断。

因此无法排除所有单帧闪烁、验证显示刷新率下pacing、物理鼠标/触控板速度分段和动画中持鼠反向接管；这些仍未验。跨屏、触控板、Spaces、全屏和其他系统未实际覆盖。原版慢/快/反向/中断运行对照未完成；父级1:1体验资格保持PARTIAL。

当前下一动作是，在具有分段持鼠拖动和高帧率指定窗口录制能力的环境中，补原版与候选同输入对照；不新增摇晃、刘海、自动回缩、云分享、Windows或AI/OCR任务。
