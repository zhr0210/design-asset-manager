# A/B 原生窗口候选

视觉只由[DESIGN](../../DESIGN.md)维护，当前B用户行为见[悬浮工作窗交互规格](../../docs/design/INTERACTIONS.md#work-window)，技术机制见[工作模式模块](../../src/main/work-mode/README.md)。旧候选结果不构成新视觉设计的资格，实际版本与缺口由[CURRENT-STATE](../../docs/handoff/CURRENT-STATE.md)维护。

## B轮廓、锚点与呈现机制（2026-10-14）

B改用带系统圆角框架的非激活NSPanel（titled + fullSizeContentView）；隐藏原生标题栏内容、使用既有AppKit按钮，玻璃铺满底板。macOS26+玻璃采用与当前系统框架一致的16pt圆角，旧系统保留VisualEffect回退。没有生产私有圆角setter、额外描边遮盖或关闭阴影/聚焦。

WorkShelfExpansionAnchor保存紧凑frame及中心/左/右位置关系；只有实际用户拖动平移关系，屏幕夹取不当作用户移动。geometry附带可选expansion，由Host严格校验并保存，重开通过同一bounds命令恢复。紧凑态及停靠态不携带该字段。

WorkShelfPresentation只拥有前景视图、短期透明快照及可取消的延迟任务；窗口运动仍由WorkShelfInteraction控制。图片/文字在固定尺寸前景平面中呈现，快照不接受输入；实际透明度为零的平面不接受鼠标命中。再次切换从当前frame/opacity接续，拖动立即接管，冻结/隐藏结算目标并撤销旧回调。选择背景是独立CALayer，业务选择先更新，仅背景opacity做160ms过渡，复用卡片直接同步状态。全部时序取自DESIGN；真实运行资格只见CURRENT-STATE及本轮报告。

相关原生回归统一执行`npm run test-native-work-shelf`，涵盖呈现、交互、接收和颜色浮层；这些受控AppKit输入仍不替代正式原生验收。

## B原生设计接线（2026-10-14）

2026-10-14本工作树已实施B原生设计：220×240紧凑布局、系统图标按钮、紧凑/展开的NSGlassEffectView底板（支持系统）、窗内NSVisualEffectView停靠覆盖与独立图标抓手。Host布局归一化/校验与原生尺寸同步，旧紧凑布局原文在转换前保留；展开拖窗限制在目标屏可见区域。原生仅呈现，Host权威不变。

菜单以展示时的完整目标集合打开交付面板：紧凑全部、展开所选优先，并显示范围/数量；引用故障不静默过滤，后项失败回传已有回执并报告不完整状态。Escape先关闭交付浮层；冻结/隐藏/退休先撤销取色草稿再关浮层，防止关闭通知迟到后重新提交；停靠期间内容按钮和内容键盘操作退出，恢复入口保留。

实际候选、正式结果及缺口只看[CURRENT-STATE](../../docs/handoff/CURRENT-STATE.md)和[实施检查点](../../docs/checkpoints/b-native-design-implementation-20261014/README.md)，以下各旧候选记录不作为新实现的验收。

## B色板选择器（2026-10-13）

展开窗右侧的直接HEX输入已替换为“添加”按钮。WorkShelfColorPicker通过AppKit颜色区域、原生色相滑条、只读HEX及确认/取消按钮组成原生浮层；只保存不透明六位HEX，不添加透明度存储。选色预览不写Host；确认走既有colors编辑及300ms自动保存，重复颜色禁止添加。浮层关闭开始即撤销未提交选择，迟到确认、冻结、隐藏或关闭不会复活草稿。

此前未提交HEX阻止退出的规则只属于旧输入控件。当前浮层选择可取消，关窗冻结时取消未提交选择；备注输入法与文件来源仍保持原保护。范围是B原生展开窗色板，主工作台和独立大预览的React布局未重写。

## B核心重建 v3（2026-10-13）

本节取代v7的72×160及展开窗停靠行为：只有明确compact可以停靠，宽高不变、向外移出约84%，边缘点击以0.2秒EaseInEaseOut恢复至内侧12点并保持小窗。展开窗拖边保持展开。WorkShelfInteraction统一AppKit事件/候选/覆盖层和可替换运动；程序恢复不产生dockIntent，输入中断从WindowServer显示frame接管。预览覆盖层不接收输入；移动完成才交接停靠抓手。旧截图过渡及轮询入口已删除。

私有桥版本3要求motionId和gestureId，具有完成/取消/失败回执，Host等待实际终态再存布局并保持原会话/成员/撤权/文件任务保护。布局明确presentation和dock.style=edge-slide，旧记录转换前按原文保存legacy-layout.json；诊断trace v2有界异步写入，含关联ID、事件时刻、真实frame、目标、依据及Host提交结果，不含素材路径或内容。

当前产物dam-492930414aa9bcb7，正式单屏路径及临时库保护已验；原版速度/反向/中断对照、高帧率体验、多屏及触控板仍未验。详情见[本轮结果](../../artifacts/window-candidates/core-rebuild-20261013/RESULT.md)。以下旧报告仅历史证据，不能作为新契约PASS。

这是用户授权的两条实施路线的第一阶段，不能称为完整 Dropover 复刻或已经达到相同交互品质。完整覆盖与阶段差额由 `docs/tasks/TASK-REGISTRY.md#window-ext` 管理；运行证据在 `artifacts/window-candidates/`。

## 普通启动

```sh
npm run build
npm run start:shelf-a
npm run start:work-b
```

当前执行器仅实现 macOS；Windows 分开实现和验收，启动器明确拒绝，不静默用浏览器演示代替。A 的应用位于 `build/shelf-candidates/DAM Shelf A.app`；直接打开应用采用它自己的 Application Support 目录，脚本启动使用工作区的独立比较 profile。B 使用正式 DAM Host 与 `artifacts/window-candidates/profile-b`，从工作模式打开工作集或恢复窗口。首次使用通过正式界面创建/打开本任务的隔离测试库。

## 两版责任

- A：独立 AppKit 暂存架子，原生视图、文件/文本/内存图像接收、文件承诺回调、缩略图、Quick Look、展开、停靠、隐藏、固定、重命名、最近关闭记录和保存恢复。文件拖出当前只提供 Copy，不冒称已实现 Dropover 全部 source mask/结束策略。接收文件不自动入 DAM 库；尚未添加工作集/AI业务。
- B：原生小架子使用已有工作集成员及受控预览；私有父子管道只传展示状态和有限操作意图。首次打开复杂编辑面板才创建原来隔离的 Electron/React 工作窗口，不预先为每个小架子创建隐藏 Chromium 编辑器。它沿用原来的 token、frame、成员、修订、草稿、文件交接与关库撤权检查。

Native UI 不读 Library SQLite、不拥有账号/AI状态、不接受 Browser 任意路径或命令。B 窗口原生拖动及动画在 AppKit 内执行；Host 只保存完成后的实际几何。原生 Close 请求走现有 Workspace close/草稿核对；错误/未保存时显示复杂面板。未确认子进程退出不记作 close 工具成功，进程记录按实际 PID核对。

A及本轮B的AppKit背景在macOS26+使用NSGlassEffectView，旧系统使用NSVisualEffectView；B底板已接线但完整视觉/系统设置矩阵仍需按实际版本验收，不能因A使用玻璃而继承其资格。最低链接目标13只是构建目标，不是旧系统实测。动画遵循系统减少动态效果，过渡闭包有资格令牌，旧完成不能覆盖新操作。A与B分别持有本阶段profile，B业务仍由唯一Host持有，不能把A JSON暂存记录写成Library Asset。

## 尚未完成

A 的全局摇动/修饰键/自定义快捷键、菜单图标拖入、刘海、截图/监听文件夹、系统扩展、完整网格/多选/合并、本地工具及各错误/取消策略尚待逐功能实现。B的完整重排/收缩/停靠设计、原生直接拖出、直接在工作窗口启动反推及压力测试尚待完成。两版Windows、真实跨屏、全屏/Spaces、完整文件承诺来源矩阵、物理动画流畅性测量未验。

已有代码或编译成功不等于以上用户路径通过。阶段报告必须区分内部真实数据库测试、正式UI结果、渲染观察、物理拖放与平台差额，不用硬编码反推文本或预填 Store 伪造产品结果。

## B v2 深度开发（2026-10-12）

用户已选择B为主线。此前A/B第一阶段说明保留历史，当前B采用同一非激活NSPanel的紧凑/展开/边缘条状态，展开为NSCollectionView；React窗口只承担按需的大专注预览，不再作为第二个工作面板。左上返回/❌、右上下拉、图下文件名和原件尺寸、网格下用色/备注；图片通过单选、Shift逐项多选、空格预览、删除键移出引用。窗口默认置顶，菜单中的交付/ZIP复用Host业务；没有Finder定位。

私有桥接为版本2。Host持有内容提交、恢复草稿、成员/代际/帧校验、文件交付和取消权威；辅助程序可以在自己获授的随机state-root暂存显式拖入的原始图片/文件承诺，不能写Library或读取账号。原始图像拖入读取dragging pasteboard，不能借此读系统剪贴板；⌘V仍仅通过Host读显式剪贴板PNG。现代文件承诺数量可核对后提交；来源未报告可确认数量时保持等待/未确认，不冒称已取消或完成。

内容300ms合并保存，旧完成只确认旧序号。恢复日志只在Host profile；失败/冲突保持输入，明确核对库内版本后才重提交。关窗/退出先冻结输入并取得原生确认，再提交；未结束输入法、未提交HEX或文件来源仍在写入时保留窗口。子进程实际close后才完成释放，超时不是成功。

素材拖入以整个AppKit窗口为接收范围，松手后由统一Host收录。窗口/root注册素材类型；内部展示控件清除拖入注册，防止NSImageView自带的旧文件/文件承诺类型抢占目标。文本编辑器保留普通文本拖入；当来源同时包含文件及文本路径时，优先转交素材接收而不写入文本。虚拟化卡片和field editor创建、布局时同样维持这一规则，选择与拖出不依赖拖入注册。生产AppKit回调/注册树回归在`scripts/native-shelf-drop.test.swift`，仍需实际跨应用拖入确认。

当前资格为PARTIAL：内部真实库与AppKit运行冒烟不替代正式原生接收；尚需最新构建逐区域拖入、多文件实际接收、完整菜单参数/视频参考、AI/OCR环境实测与性能资格。Windows未实现。

### B v7拖动与自行验收

标题/背景统一应用内AppKit mouse事件移动，实际mouseUp检查磁吸，不以performDrag返回或global pressedMouseButtons作为主路径释放信号。事件使用CGEvent屏幕坐标；控件/卡片/文本各自保留交互。越过屏边也进入磁吸区域。私有ownedNative拖离restore坐标在Host校验，通用Renderer不获该字段权限。80条滚动motion-trace记录本窗移动阶段/位置/版本，不含账号、文本或素材数据；用于实时定位。当前单屏正式CUA左右/连续/展开/拖离路径见v7自行验收报告，多屏/跨Spaces及连续帧仍另验。
