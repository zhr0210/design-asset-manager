# 软件设计规范检查 · 2026-10-13

## 检查身份与范围

用户本轮明确要求：暂不覆盖工作集悬浮窗口相关部分，针对整个软件进行设计检查。本报告记录检查事实、访谈确认与待收敛问题，不作为产品实施或验收完成的证明。

检查基线为本工作树 HEAD `e7189b5`（detached HEAD）；检查前没有未提交改动。现行设计规范已随 `63dc760` 合入。规则来源为 [DESIGN](../../../DESIGN.md)、[工作台交互](../WORKSPACE-INTERACTIONS.md)及[产品基准](../../product/PRODUCT-FOUNDATION.md)。历史报告只用于确认来源，不转记为当前验收。

排除 AppKit/Electron 工作集悬浮窗、停靠/拖放/颜色浮层及工作集专属大预览；不评判其尺寸、Liquid Glass、原生控件或性能资格。不把共享 Gallery 文件中所有规则一律排除：主资料库、大预览和公共弹层仍消费其中的样式。主工作区内工作模式的全局导航位置属于全局检查，工作集编辑和参考窗口内部流程留在范围外。

本次是**规范、正式路由、组件调用链与 CSS 规则检查**。没有安装依赖、启动应用、读取资料库/账号配置、执行推理、构建或修改产品代码。因此不证明实际画面、裁切、命中区域、键盘路径、保存或运行性能；涉及这些内容明确保留运行核验。

## 总体结论

已批准的 Apple 中性色与主要操作强调色尚未完整进入实现。全软件同时使用 Gallery token、`--ui-*` token 和局部硬编码样式；差异不只存在于生成文件，组件的操作/选择语义、材质回退与辅助页面也需核对。

素材浏览的基础布局、等比预览、详情组织、网格重排与大预览硬切已有对应实现，不支持全应用推倒重做的结论。用户已确认统一窄导航外壳及入口分组、底部检索与维护信息层级、辅助页面单一标题，并保留单素材卡片纳入视觉对齐。六项确认均已分别写入职责对应文档；产品源码与运行资格没有因此改变。

## 正式页面覆盖

| 表面与普通入口 | 本次核对 | 结论边界 |
| --- | --- | --- |
| 素材工作区 → 全部 | Library → LibraryCanvas → Gallery/正式集成 CSS；搜索/筛选/多选/列表状态 | 主几何已有实现；选择与强调色复用、顶部检索信息区存在问题或待定项 |
| 素材工作区 → 文件夹/AI分类/色板 | FolderCard、OrganizationModal、颜色菜单与正式组织数据消费者 | 真实成员引用与颜色内容分离已有接线；提交按钮层级与浮层回退需处理 |
| 素材工作区 → 回收站 | 同一 Gallery 网格、恢复按钮、查询禁用说明 | 未把无效搜索呈现为可用；预览失败的实际画面仍需核验 |
| 图片 → 详情 | LibraryDetails、嵌入编辑器、分析/OCR/工具组件及覆盖 CSS | 配色与基础信息前置、单外层滚动和建议来源已有实现；工具样式 token 未统一 |
| 图片 → 空格/双击大预览 | LibraryFocus → FocusView/FocusCanvas；共享 Gallery 的最终规则 | 网格动画/图片硬切可在源码确认；完整键盘和笔记保存未运行 |
| 菜单 → 仪表盘/任务中心/标签管理 | 正式路由、页面组件、WorkspacePrimitives 与状态投影 | 使用另一套外壳和组件；历史任务完成徽标仍为绿色；下载历史预览裁切需收敛 |
| 设置 → 外观/资料库/采集/快捷键/高级 | Settings、AppShell、共享 CSS | 已有保存/冲突/旧偏好禁用说明；外观与主工作区不一致 |
| AI 与模型 → 五个子页 | AiWorkspace、连接、任务模型、本地模型/OCR、后台、诊断的正式消费者 | 分类与单一连接编辑入口已有实现；选中导航复用主要按钮，局部控件尺度不统一 |
| 菜单/设置 → 帮助与关于 | AboutPage | 构建读取有加载/失败分支；复用旧辅助页面外壳 |
| 创建/导入/切库/退出/草稿恢复等公共层 | ActiveLibraryControls、ReviewSheet、WorkspaceTransitions/Recovery/Connection、AuthActivity、FileSelectionOverlay | 范围与失败说明、焦点隔离机制可查；材质和主要按钮被局部规则覆盖 |
| 原单素材卡片 `/asset-card` | AssetCardWindow → AssetCardPanel → asset-workspace-modes.css | 与工作集悬浮窗是不同实现；第三套硬编码样式，入口位于“原单素材卡片与工具” |

路由依据为 [App](../../../src/renderer/App.tsx)及[导航登记](../../../src/shared/workflows/app-navigation.workflow.ts)，只列正式消费路径；未把原型目录、未挂载的旧 Sidebar/Topbar 或历史 AiBackendSettingsPanel 当作当前页面。

## 明确偏差与接线风险

以下严重程度表示设计一致性与可用性影响，不代表已复现的数据缺陷。修正方向中已获确认的部分见访谈记录，其余仍为建议；当前有效规则维护在DESIGN与交互规格，本报告不另建规范权威。

### D01 · 高：Gallery 生成颜色仍是旧值

[生成 tokens](../../../src/renderer/components/gallery/tokens.css)仍含 `accent:#55585f`、`dark-accent:#c9cbd1`、`ink:#202126`、`surface-soft:#eceef2`；DESIGN 要求 `#0071e3`、`#1d1d1f`、`#fafafc` 等新值。LibraryCanvas 正式导入该文件，差异有实际消费者。

建议：通过现有生成器同步，随后核对组件语义。只同步 token 不能关闭 D02/D03。检查脚本目前缺 `js-yaml`，本轮未取得其运行结果。

### D02 · 高：主要确认动作被局部规则改回中性底色

[正式集成 CSS](../../../src/renderer/components/library/canvas/library-canvas.css)第 54、60–61 行把资料库管理和公共确认层内的 `.ui-button`/`.ui-button-primary` 强制设为胶囊灰或 `accent-soft`，并去除背景图。它覆盖了 [ActiveLibraryControls](../../../src/renderer/components/library/ActiveLibraryControls.tsx)中明确标为 primary 的创建、添加和“确认复制并收录”。

[OrganizationModal](../../../src/renderer/components/library/canvas/OrganizationModal.tsx)第 49 行的“保存文件夹/保存颜色/加入文件夹”没有 primary 角色，第 75 行 CSS 又统一赋予中性胶囊底色。现行 DESIGN 要求主要确认/创建使用强调色。

建议：按动作角色恢复主要按钮；删除/危险确认另按风险语义判定，不能统一染蓝。

### D03 · 高：同步强调色会同时把素材选择染蓝

[Gallery CSS](../../../src/renderer/components/gallery/gallery.css)第 9、45 行的多选复选标记使用 `var(--accent)`/`var(--on-accent)`。旧 token 下为灰色，新规范同步后将变成蓝色，与“素材选择保持中性灰”冲突。

建议：把中性选择标记与主要操作强调色分开。第 56 行已移除素材选中外圈，不应误报为仍有外圈，也不应为修复选择颜色恢复装饰外圈。

### D04 · 中：辅助页面继续使用旧色系、渐变底板和高饱和玻璃

[design-system.css](../../../src/renderer/styles/design-system.css)第 1–58 行的 `--ui-*` 自成一套蓝灰颜色；第 60–98 行在辅助页面外壳、导航和品牌加入整面径向渐变、蓝色渐变、内高光和较重玻璃；第 147–156 行的次要/主要按钮仍使用渐变、150% 饱和度和内高光。

这些规则由 main.tsx → globals.css 导入，AI/任务/标签/设置等正式页面使用，不能视为死代码。与新规范的中性色基底、克制边界及网页按钮角色存在偏差。不同页面是否保留不同导航结构则属于 Q1，不能由颜色偏差推导为全部复制素材网格布局。

### D05 · 中：AI 分类和菜单当前位置被当成主要操作

[AiWorkspace](../../../src/renderer/routes/AiWorkspace.tsx)第 18 行及[GlobalNavigationMenu](../../../src/renderer/components/layout/GlobalNavigationMenu.tsx)将当前 NavLink 赋予 `ui-button-primary`。选中分类是导航状态，复用该角色会得到主要操作的蓝色渐变。

[design-system.css](../../../src/renderer/styles/design-system.css)第 331–332 行的中性分类规则只匹配 `button[aria-pressed=true]`，实际分类是链接，不消费这组规则。不能因存在这段 CSS 就判断 AI 分类已对齐。

建议：导航当前位置采用独立中性选中状态，给真正提交/创建留出强调色。

### D06 · 高：降低透明度回退未覆盖全部正式浮层

[Gallery CSS](../../../src/renderer/components/gallery/gallery.css)第 16、51 行已有玻璃/搜索/菜单的回退，但第 58 行大预览 `::backdrop` 仍强制 16px 模糊；第 83 行前后/添加导航重新声明半透明填充与 14px 模糊，后置且比通用 `.glass` 规则更具体。现有减少透明度列表没有专门覆盖它。

[正式集成 CSS](../../../src/renderer/components/library/canvas/library-canvas.css)第 29、35、54、59、65 行的标签候选、资料库管理、内部按钮、公共 ReviewSheet 和组织对话框也各自声明玻璃。需要按最终层叠逐项补齐，不可只核对媒体查询是否存在。实际 OS/浏览器设置能否传达与截图结果尚未验证。

建议：按正式表面列出回退，验证浅/深主题、减少透明度和增强对比度；不能用静态不透明目标代替运行验证。

### D07 · 中：历史任务常规完成状态仍用绿色

[下载状态投影](../../../src/shared/workflows/download-status.workflow.ts)第 66–69 行为 completed 生成 emerald 徽标/图标/进度，[DownloadQueue](../../../src/renderer/routes/DownloadQueue.tsx)正式消费该投影。新规范要求成功、就绪、格式等常规徽标保持中性。

建议：区分已完成这一事实与警告/错误，不把全局 positive token 删除；绿色可以仍服务需要特别成功反馈的场景，常规徽标应服从现行规则。

### D08 · 中：文字与输入组件尺度仍由多套局部规则决定

DESIGN 基准为正文 13px、标签/次信息 12px，局部图片标签才使用 10px。[asset-workspace-modes.css](../../../src/renderer/styles/asset-workspace-modes.css)第 90–102 行将多个 AI 面板说明、字段、按钮和模型结果元信息设为 9–11px；pi-connections.css 只覆盖其中一部分。[design-system.css](../../../src/renderer/styles/design-system.css)第 171 行的输入为 39px/12px 圆角，规范 input 为 40px/10px。

建议：按“配置字段/说明/来源元信息/图片覆盖标签”核对实际文字角色，统一共享控件尺度；不机械把所有小字放大，也不靠全局 font-weight 覆盖替代组件审查。

### D09 · 中：图像工具引用未定义的样式变量

[asset-workspace-modes.css](../../../src/renderer/styles/asset-workspace-modes.css)第 109–133 行的图像工具/裁切字段引用 `--glass-border`、`--text-secondary`、`--surface-base`；本轮搜索 renderer 与 Tailwind 配置未找到这些变量的定义。部分属性没有 fallback，其他位置回退为白色，不能保证沿当前主题变色。

Library → LibraryDetails → ImageToolsPanel 是正式调用链。建议改用现行语义角色，并核对局部暗色字段；不以“样式表有 CSS 变量”认定已接入设计系统。

### D10 · 中：原单素材卡片仍有独立硬编码视觉

[AssetCardPanel](../../../src/renderer/components/asset/AssetCardPanel.tsx)正式消费 [asset-workspace-modes.css](../../../src/renderer/styles/asset-workspace-modes.css)第 63–84 行：蓝紫渐变、固定文字/表面色、7px 按钮圆角、10px 工具字等。未找到对应卡片的专门深色规则；通用 `.dark` 对 utility class 的覆盖不能替换这些硬编码值。

这是原单素材卡片，不是本轮排除的工作集窗口。用户已在Q6确认保留现有入口与功能，统一颜色、文字、控件、明暗及材质回退；已写入设计与交互规格，源码尚未实施。

### D11 · 中：辅助页面同时存在外壳标题与内容标题

[AppShell](../../../src/renderer/components/layout/AppShell.tsx)第 37–40 行为辅助页面渲染标题横条、英文产品名和固定产品说明；各页面又使用 [PageHeader](../../../src/renderer/components/ui/WorkspacePrimitives.tsx)渲染h1、描述和操作。AI与模型、设置、标签和帮助等正式页面均有两层标题呈现，AI与模型和帮助的外壳/内容标题还直接重复。

用户已在Q5确认只在内容区呈现一组页面标题、简短说明与主要操作，移除外壳重复文字横条，保留系统窗口按钮和必要拖窗区域。该决定已进入DESIGN与交互规格，源码尚未实施。

## 待运行核验或待设计收敛

1. **菜单键盘策略**：BottomDock 的 Escape 只在自身事件范围处理，没有统一进入菜单、方向键导航和关闭后焦点恢复；ColorMenu 则有主动聚焦、方向键与恢复。确定存在实现差异，但没有运行证据支持“菜单完全不可键盘使用”的结论。见 [BottomDock](../../../src/renderer/components/gallery/BottomDock.tsx)与[ColorMenu](../../../src/renderer/components/gallery/ColorTools.tsx)。
2. **顶部检索区与多选条**：Library 每个素材页常显检索方式、索引覆盖、维护及控件；正式集成 CSS 第 157 行把多选条改为普通流式布局，区别于 DESIGN 的顶部悬浮 40px。Q2已确认维护信息默认收起，Q4已确认搜索控件集中底部、顶部保留导航/添加与多选操作条；当前源码没有因此改变，实际空间与输入仍待验证。见 [Library](../../../src/renderer/routes/Library.tsx)第 345–355 行及[正式集成 CSS](../../../src/renderer/components/library/canvas/library-canvas.css)。
3. **下载历史缩略图裁切**：DownloadQueue 第 52 行使用 object-cover，与等比完整显示作品的方向不同。若此处只作识别缩略图，可作为经确认的场景例外；本轮没有该例外授权，不直接更换实现或定为作品被破坏。
4. **图片标签对比**：LibraryCanvas 的 labelTone 依据素材总体 dominantColor，尚不能证明标签实际覆盖区域对比合适。规范要求根据实际背景变化选择文字；实际素材与截图未验。
5. **宽度与标题密度**：辅助页面外壳 minContentWidth=1120，图库放开该宽度；辅助页没有与图库相同的窄宽规则。正式桌面最小窗口、本机浏览器窄窗及帮助/设置/AI长内容需分别运行确认，不能凭 CSS 判定都溢出。外壳/内容双标题已从调用链确认，见D11；内部区块标题的必要性和最终文字密度仍需实际画面核验。

## 已核对的正向实现与避免误报

- Gallery 的窄图标导航、底部搜索、透明素材图框及 contain、316px 详情、304px 专注信息栏有对应规则和正式消费者。
- AnchoredGrid 使用 200ms / cubic-bezier(.2,.75,.25,1)，取消旧动画并适用减少动态效果；符合当前重排要求。
- Gallery 第 59 行仍保留旧模糊 keyframes，但第 67 行禁用 focus-incoming/outgoing 的动画、filter 和 transition；不据旧定义报告当前大预览仍模糊切图。侧栏最终为 .2s ease-out，与指定曲线仍有小偏差，优先级低于 D01–D06。
- 图片信息与配色前置；基础编辑器取消 max-height/overflow 截断；标签候选有独立浮层。实际滚动/候选裁切待运行，不记为通过。
- 首次加载、首次失败、刷新保留内容、无匹配、空库已有分支；回收站不支持查询时禁用并说明。
- AI账号配置无需开库，AI统一分类路由与设置导向唯一连接编辑器已有接线；未把登录、目录探测或配置声明当作推理成功。
- ReviewSheet 有输入隔离、焦点恢复和 Tab 边界；设置/组织操作已有未保存、失败、冲突与兼容确认说明。行为仅在源码核对，本轮不宣称保存重开通过。
- 标签颜色、色板及素材本身的颜色是用户内容，不按 UI 中性规则删除。

## 检查工具与证据限制

已尝试只读执行 `node scripts/sync-gallery-tokens.mjs --check`；失败原因为 `ERR_MODULE_NOT_FOUND: js-yaml`，不是本轮已获得的 token 校验失败结果。颜色差异通过现行文档和实际生成文件直接核对。没有为运行该检查修改依赖或生成 CSS。

该脚本即使恢复运行，也只比较 Gallery colors/rounded 的生成文件；不校验辅助页面 `--ui-*`、组件角色、排版/间距、媒体回退、正式入口或运行结果，不能作为全软件设计已对齐的证据。

本轮没有 screenshots、正式入口点击、系统设置切换或设备输入证据。本报告完整列出源码检查的页面覆盖，不把它称为全应用视觉验收。后续视觉检查须绑定本工作树实际候选与指定非隐私资料，浏览器不替代 macOS 原生窗口资格。

## 访谈收敛顺序

**Q1 · 已确认（2026-10-13）**：用户采纳“AI、任务、标签等页面统一使用主工作台的窄导航外壳；统一导航与视觉语言，页面内部仍采用适合配置、任务和列表的布局”。视觉决定归DESIGN的“配置、任务与其他应用页面”，导航职责归WORKSPACE-INTERACTIONS的“应用页面导航”。具体全局入口分组随后在Q3确认；没有实施页面或重排资料库四个入口。

**Q2 · 已确认（2026-10-13）**：用户采纳“索引覆盖率、重建和恢复等维护信息默认收起；保留清晰的搜索方式与筛选入口，查询进度、失败和影响结果的限制及时显示”。行为规则归WORKSPACE-INTERACTIONS的“搜索与检索信息”；控件位置与多选条分工随后在Q4确认。此决定没有删除维护能力或改变执行/取消语义。

**Q3 · 已确认（2026-10-13）**：用户采纳保留“全部、文件夹、工作模式、回收站”四个素材入口，导航底部固定AI与模型、任务中心、设置与更多功能，保留主题切换；标签管理、仪表盘、旧素材及帮助与关于进入全局更多菜单。该全局菜单在辅助页面也可发现，不依赖素材搜索菜单。已写入WORKSPACE-INTERACTIONS的产品表面与应用页面导航；现有代码入口仍未变。

**Q4 · 已确认（2026-10-13）**：用户采纳底部保留搜索框、当前查找方式与筛选入口，以图检索和索引维护按需打开浮层；顶部保留前后导航与添加素材，选中素材时显示多选操作条。视觉位置归DESIGN“导航与工具栏”，用户行为归WORKSPACE-INTERACTIONS“搜索与检索信息”。沿用现行几何基准，未实施源码布局。

**Q5 · 已确认（2026-10-13）**：用户采纳取消辅助页面外壳的重复标题横条，只在内容区保留一组页面标题、简短说明与主要操作，保留系统窗口按钮和拖窗区域。视觉规则归DESIGN“配置、任务与其他应用页面/导航与工具栏”，行为边界归WORKSPACE-INTERACTIONS“应用页面导航”；源码尚未改变。

**Q6 · 已确认（2026-10-13）**：用户采纳保留原单素材卡片的现有入口与功能，纳入本轮视觉规范对齐，统一颜色、字体、控件、明暗主题和材质回退。它由独立asset-card模块提供，当前位于工作模式的“原单素材卡片与工具”，不属于本轮排除的多素材工作集悬浮窗。视觉规则归DESIGN，入口和行为边界归WORKSPACE-INTERACTIONS；Single-Asset Card与Work Window的概念区别归CONTEXT。

## 本轮收口

规范/源码检查与六项设计访谈已完成。本报告保留11项明确偏差或接线风险、5项需实际画面/输入核验或考虑场景例外的事项，以及正向实现与误报排除。已确认的中性色、蓝色主要动作、灰色素材选择、减少透明度/动态效果和保护语义继续有效，无须重复投票。

当前文件分工：DESIGN保存视觉规则；WORKSPACE-INTERACTIONS保存导航、搜索与入口/状态行为；CONTEXT新增单素材卡片的纯领域定义；本报告保存检查来源、偏差与访谈确认。未形成难以逆转的新取舍，不新增ADR。

文档差异与职责边界已复核，本报告及本次涉及规范的本地链接、空白格式和六项确认状态均已检查。生成CSS、产品源码、工作集悬浮窗规格、TASK、任务台账和CURRENT-STATE保持原内容。没有更新构建身份、提交、推送或发布；本轮收口不等于这些设计已在产品中实现。

尚缺：开发依赖恢复后的design:check、正式候选的明暗/系统设置/键鼠/宽度/浮层检查，以及受影响行为的保存重开与失败保护验证。浏览器与桌面资格分别保留。当前授权终点为设计检查与文档收敛，本次不把上述实施和验收工作自动启动为新队列。
