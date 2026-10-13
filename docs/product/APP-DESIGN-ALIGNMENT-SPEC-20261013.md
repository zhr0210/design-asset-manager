# DAM 整体设计规范落地与双端验收

## Problem Statement

DAM用户在素材浏览、检索、详情、AI与模型、任务、标签和设置之间切换时，会遇到不同的导航外壳、颜色、玻璃效果、文字尺度和按钮语义。用户难以稳定判断当前位置、主要操作、素材选择和当前查询状态。辅助页面重复标题，检索诊断长期占用浏览区域，部分弹层中的确认按钮与普通工具没有清晰层级。

代码检查还发现：生成的Gallery颜色仍沿用旧值；直接同步蓝色强调色会同时染蓝素材选择；辅助页面导航选中复用了主要操作样式；减少透明度回退不完整；图像工具引用未定义的样式角色；原单素材卡片使用独立硬编码外观。浏览器辅助页面受桌面1120px最小内容宽度限制，无法按已确认的1024px目标正常收缩。

这些是现行设计目标与实现之间的差距，尚不是本次候选的运行验收结果。用户需要一个视觉与交互一致、保持现有功能及数据保护、能从普通入口使用的本地视觉素材工作台。

## Solution

将已确认设计系统应用到Desktop Asset Workspace与同机Browser Asset Workspace，共用现有React产品界面和唯一Local DAM Host。覆盖主素材工作区、普通/AI文件夹、色板、回收站、详情、主资料库专注预览与笔记、AI与模型、任务中心、标签管理、设置、仪表盘、现存连接库/旧素材、帮助与公共浮层。

用户已确认以下六项设计决定与两项交付标准：

1. 所有纳入页面沿用主工作台的窄图标导航外壳。配置、任务、列表和概览保留适合各自职责的内部布局。
2. 主导航保留品牌/资料库、全部、文件夹、工作模式和回收站；底部固定AI与模型、任务中心、设置、更多功能，并保留主题切换。全局更多菜单容纳标签管理、仪表盘、连接库、旧素材、帮助与关于，在辅助页面同样可发现。
3. 常规浏览默认收起索引覆盖、空间标识、重建和恢复细节；查询进度、失败及影响结果范围/完整性的限制及时显式呈现。
4. 底部集中搜索框、当前查找方式和筛选入口；以图检索与索引维护按需打开浮层。顶部保留前后导航、添加素材，有选择时显示多选操作条。
5. 辅助页面只在内容区保留一组页面标题、简短说明与主要操作，取消外壳重复标题横条，保留系统窗口按钮和必要拖窗区域。
6. 保留Single-Asset Card的现有入口与功能，统一其颜色、文字、控件、明暗主题和材质回退。
7. macOS桌面与同机浏览器同步交付、分别验收；Browser不替代OS行为证据，Windows保持未验。
8. 浏览器内容宽1024px与1440px为本轮完整功能验收基准；桌面保留当前最小窗口策略，验证最小与常用布局。更窄浏览器窗口保留辅助预览布局，不列入本轮完整功能验收。

当前设计语言及关键几何如下，具体视觉规则继续由项目设计系统维护：

| 角色/区域 | 本次目标 |
| --- | --- |
| 视觉基底 | 系统字体，白/浅灰表面，清晰黑灰文字层级；素材承担主要色彩 |
| 浅色角色 | 画布#f5f5f7、表面#ffffff、柔和表面#fafafc、文字#1d1d1f、次信息#707070、边界#d6d6d6 |
| 深色角色 | 画布#17191f、表面#23262e、柔和表面#303440、文字#f3f4f8、次信息#b9bdc9、边界#494e5b |
| 主要操作 | 网页默认#0071e3与白色文字；适用原生控件尊重系统强调色 |
| 普通工具、选择与导航当前位置 | 中性灰，角色独立于主要操作；素材色板是用户内容 |
| 常规状态 | 完成、就绪、格式等徽标保持中性；警告/错误配文字，不只靠颜色 |
| 排版 | 系统字体与中文回退；标题28px、区块标题18px、正文13px、标签/次信息12px；网格标题12px、次信息11px、局部图片标签10px |
| 间距/形状 | 4px基础节奏，8/12/16/24/32/48间距；小控件10px、一般容器16px、卡片20px、窗口24px、胶囊完整圆角 |
| 主要按钮/输入 | 主要按钮高36px；输入高40px、圆角10px；键盘焦点清晰 |
| 窄导航 | 宽70px；按钮46×46、圆角15px、图标22px；纵向间隔18px；无右侧装饰边线 |
| 顶部浮动导航 | 顶距12px、左28px、右46px；前后与添加为36px圆形按钮 |
| 多选操作条 | 顶距10px、高40px、左125px、右100px；水平滚动并避让导航、添加与素材复选框 |
| 网格 | 横间距20px、行间距26px；密度初值330、范围150–430、步进10，表示期望卡片宽度 |
| 素材图框 | 透明、圆角21px，图片等比完整显示；无装饰描边或选中外圈 |
| 底部搜索 | 主内容左28px、右60px、下18px；标签/搜索间距10px；搜索行圆角24px、内距10px、通常高62px，输入高42px |
| 搜索/菜单/标签材质 | 背景模糊20/24/14px，饱和度1.04/1.02/1.02；浅色填充40%/48%/27%，深色48%/58%/32% |
| 弹层 | 筛选最大宽410px，菜单宽300px；高度受可用空间约束，长内容内部滚动 |
| 详情/专注 | 详情宽316px、最大40vw；主资料库专注四周18px、最大宽1700px，信息栏宽304px；按窄宽调整 |
| 动效 | 重排/侧栏200ms，缓动cubic-bezier(.2,.75,.25,1)，可中断；作品切换清晰硬切；减少动态效果时简化或直接完成 |
| 可访问性回退 | 减少透明度或增强对比度时使用可读实底，覆盖导航、搜索、菜单、确认层、候选浮层与专注背景 |

工作集悬浮窗及其专属大预览继续排除。它们与共享界面存在样式消费者关系，因此必须限定此次变化的影响范围，保留其原有外观和行为。

## User Stories

1. As a visual creator, I want a consistent interface across all included pages, so that I can focus on my Design Assets instead of relearning controls.
2. As a Desktop Asset Workspace user, I want the same product vocabulary and actions as the Browser Asset Workspace, so that I can switch clients confidently.
3. As a Browser Asset Workspace user, I want to use the existing Local DAM Host, so that my library and saved changes remain authoritative.
4. As a visual creator, I want a stable narrow navigation shell, so that I always know how to return to my asset workspace.
5. As a library user, I want All, Folders, Work Mode and Trash to remain discoverable, so that familiar destinations remain available.
6. As an AI-assisted creator, I want AI and Models to have a fixed global entry, so that I can inspect configuration without hunting through asset menus.
7. As a user managing transfers, I want Task Center to have a fixed global entry, so that I can inspect progress and recovery from any page.
8. As a user adjusting preferences, I want Settings to remain globally accessible, so that configuration is independent of the current asset view.
9. As a user of less frequent features, I want a global More menu on auxiliary pages, so that tags, overview, existing library connections and help remain discoverable.
10. As a library user, I want global navigation to be distinct from current-view search actions, so that each menu has a clear purpose.
11. As a user navigating between pages, I want relevant library context and drafts to remain protected, so that switching pages does not discard work.
12. As a user reading an auxiliary page, I want one content title with a concise description and relevant actions, so that duplicated chrome does not consume space.
13. As a user configuring AI or preferences, I want form layouts suited to configuration, so that visual consistency does not turn every page into an asset grid.
14. As a user reviewing tasks or tags, I want appropriate lists and tables, so that I can compare records efficiently.
15. As a visual creator, I want neutral application surfaces, so that my own images provide the main visual emphasis.
16. As a user making a primary confirmation, I want its button to have the primary action treatment, so that I can distinguish it from ordinary tools.
17. As a user selecting assets, I want neutral selection feedback independent of the primary accent, so that selection does not compete with confirmation actions.
18. As a user navigating AI categories, I want the current category to have neutral navigation feedback, so that it does not look like a submission button.
19. As a user reading statuses, I want ordinary completion and readiness badges to be calm and explicit, so that colored success indicators do not imply broader qualification.
20. As a user encountering a warning or error, I want a clear explanation and an appropriate action, so that color is not my only source of information.
21. As a Chinese-speaking creator, I want readable system typography and consistent information hierarchy, so that form labels and provenance remain legible.
22. As a user of dark mode, I want every included component and floating surface to use the correct theme, so that no hardcoded light panel interrupts my work.
23. As a user reducing transparency, I want opaque readable fallbacks on all included surfaces, so that foreground controls stay clear.
24. As a user requesting reduced motion, I want simplified transitions without changed outcomes, so that I can still complete the same tasks.
25. As a keyboard user, I want visible focus and reachable controls, so that I can navigate without pointer input.
26. As a user of menus and popovers, I want Escape, outside dismissal and focus restoration to behave consistently, so that I can resume the triggering task.
27. As a user reviewing a modal action, I want focus and background input to be correctly isolated, so that keystrokes do not affect hidden content.
28. As a user with long labels or names, I want bounded menus, sensible truncation and accessible full text, so that content does not clip essential controls.
29. As a Browser Asset Workspace user, I want all included pages to work at 1024px content width, so that desktop-only minimum widths do not block my browser layout.
30. As a Browser Asset Workspace user, I want a balanced 1440px layout, so that available space improves browsing and configuration.
31. As a macOS desktop user, I want the minimum and common window sizes to remain usable, so that resizing does not hide necessary actions.
32. As a macOS desktop user, I want window buttons and drag regions to remain correct, so that interface cleanup preserves native window behavior.
33. As a creator browsing images, I want complete proportions and original visual colors in previews, so that I can judge references accurately.
34. As a user inspecting an asset, I want details to preserve browsing order and viewport context, so that opening the inspector does not disorient me.
35. As a user selecting several assets, I want a discoverable top action bar that avoids navigation and selection controls, so that bulk actions remain usable.
36. As a user adjusting thumbnail density, I want responsive packing and stable context, so that a layout change does not lose my place.
37. As a user searching assets, I want the search field, current search method and filters together at the bottom, so that retrieval controls have one predictable location.
38. As a user combining search conditions, I want text sources, tags, folders and color constraints to keep their actual meanings, so that a simpler layout does not change results.
39. As a user searching by an image example, I want an on-demand entry and a clear example scope, so that I understand what is being searched without unintended intake or disclosure.
40. As a user maintaining retrieval indexes, I want coverage and recovery details collapsed by default but easy to open, so that diagnostics do not dominate browsing.
41. As a user waiting for search, I want visible progress and applicable cancellation, so that I know whether to wait or stop.
42. As a user receiving limited retrieval results, I want current limitations disclosed without opening diagnostics, so that I do not mistake partial coverage for complete results.
43. As a user encountering failed refresh, I want previously loaded assets and a retry action retained, so that failure does not appear as an empty library.
44. As a user receiving no matches, I want a distinct no-match state and clear filter reset, so that I can recover the search.
45. As a user opening an empty or closed library, I want an accurate state and applicable next action, so that unavailable data is not presented as successful emptiness.
46. As a user organizing references, I want Ordinary Folders and AI Folders to retain their existing membership semantics, so that navigation changes do not copy originals or confirm suggestions implicitly.
47. As a user collecting colors, I want Palette Folder colors to stay separate from UI theme colors, so that visual alignment does not recolor my saved content.
48. As a user of Asset Trash, I want restoration and unsupported search states to stay explicit, so that recovery remains reliable.
49. As a user reading asset details, I want preview, palette, basic metadata and editable information in a clear order, so that core facts are not hidden inside tool disclosures.
50. As a user reviewing AI suggestions, I want suggestions and model provenance separated from confirmed edits, so that I can understand where information came from.
51. As a user editing metadata, I want failed saves and revision conflicts to retain my input, so that a design change cannot cause silent loss.
52. As a user reopening saved content, I want confirmed changes to remain available through the ordinary interface, so that visual success includes durable behavior.
53. As a user opening full preview, I want crisp image switching and existing navigation controls, so that the new styling does not blur or delay reference inspection.
54. As an Asset Notebook user, I want annotations and unsaved text protected during image changes and closing, so that my creative work remains recoverable.
55. As a user of image tools, I want themed controls with defined semantic styling, so that tools remain readable without changing Original or Variant ownership.
56. As a user configuring AI, I want configuration, identity, permission and model qualification shown separately, so that a successful login is not mistaken for proven inference.
57. As a user running an existing supported AI or OCR task, I want affected formal controls to keep executing real work, so that visual alignment does not replace functionality with a mock.
58. As a user of existing library connections or legacy libraries, I want their current entry and ownership rules preserved, so that design cleanup does not become silent feature removal or migration.
59. As a Single-Asset Card user, I want its existing entry, preview, description tools and prompt drafts retained with consistent styling, so that compatibility remains useful.
60. As a Work Window user, I want this unrelated design change to leave my excluded window and dedicated preview unchanged, so that shared styles do not bypass the agreed boundary.
61. As a user closing a client or exiting DAM, I want existing draft, task and Host lifecycle protections preserved, so that navigation cleanup does not change what gets closed or saved.
62. As a project maintainer, I want results tied to the new candidate and the actual client, so that old screenshots or passing internal tests do not masquerade as current delivery.

## Implementation Decisions

- 保留Electron、React、TypeScript和现有Local DAM Host基础。遵循ADR0491的双客户端共享权威、ADR0489的Work Set与窗口权限分离，以及ADR0493的已有呈现边界；本次不改成第二套业务后端。
- 主要改动责任位于共享页面外壳与导航、Gallery展示、检索控制、共享控件、详情/专注/笔记呈现、辅助页面、Single-Asset Card呈现和设计生成/构建检查。内部如何拆分组件由实施者按真实消费者决定，不建设没有消费者的新平台。
- 现行设计系统是视觉角色的唯一来源。收敛生成颜色、共享界面角色和局部硬编码，通过对应生成机制更新；不直接手改生成摘要使检查通过。
- 主要操作、普通工具、素材选择与导航选中使用不同角色。不能仅替换强调色后把所有选择染蓝，也不能让普通分类链接消费主要提交按钮的样式。
- 共享样式作用域必须核对到所有真实消费者。排除的Work Window与工作集专属大预览同样使用部分Gallery样式；必要作用域隔离属于本次实施，但不得借此应用其延期尺寸、材质或控件设计。
- 统一窄导航及已确认全局入口分组。资料库目的地与应用级页面分别表达当前位置；辅助页面返回路径、当前库身份与未保存转场保护保持。
- 表单、任务列表、表格和概览继续按职责组织；不套用素材网格比例、密度滑条或素材搜索。清理重复外壳文字标题，保留系统按钮、拖窗区域和点击控件的输入边界。
- 底部搜索区域保留查找方式、筛选和当前查询反馈。以图、维护与恢复按需浮层，保持现有字段、示例图准入、查询范围、分页、取消与结果语义；折叠不是执行暂停或结果隐藏。
- 保留图片比例、真实色彩、详情顺序、基础信息默认可见与单外层滚动。菜单/标签候选不得被编辑器裁切，长内容以受控滚动呈现。
- 应用的浅/深主题继续由现有偏好控制；适用原生控件尊重系统设置。减少透明度、增强对比度和减少动态效果覆盖实际纳入表面，不以存在一条媒体查询作为实现证明。
- Browser共享页面可收缩至1024px；桌面主窗口保留当前1136×760最小外尺寸策略及常用尺寸。网页CSS px与原生窗口尺寸按实际客户端分别测量，不直接当作同一单位。
- Single-Asset Card保留原兼容入口与功能，与承载已保存Work Set的Work Window在概念和权限上分开；不得通过统一外观绕过它的窄访问授权。
- 本规格不要求新增schema或通用业务API。若现有接口使必需用户结果无法成立，只在获批目标内修改最小相关契约，并同步全部消费者、保护测试和兼容说明；不以UI重做扩大权限或改变已发布兼容承诺。
- Host继续拥有文件、数据库、账号、AI执行和提交权威。Managed默认Copy，Original/Preview/Variant分开；人工编辑优先，保留事务、修订、幂等、未知提交、取消、撤权和实际进程退出语义。
- 实施基于本轮工作树，保留既有设计文档与其他WIP；准备必要锁定依赖和兼容运行环境，只对本任务差异建立恢复检查点，不全量重置或自动推送发布。
- 设计变化后同步受影响测试契约与新候选基准；旧原型、旧构建或旧像素资格不得阻止已确认设计，也不能改写为新版本通过。

## Testing Decisions

1. **主测试缝沿用已确认边界**：正常启动后的正式产品会话，用户可见操作经现有共享Client契约进入同一Local DAM Host，再由实际页面展示结果。桌面IPC与本机Browser传输是这一业务边界的两种客户端适配，分别取得证据；不新增测试专用业务API。该选择对应用户已确认的两端同步交付与正式入口验收。
2. **好测试验证外部行为**：从可发现入口点击、键入、选择，断言实际可见结果、持久状态、保存重开和失败/取消保护。不得复制实现来证明实现，不用改路由、注入Store、直接IPC或写库跳过用户步骤并宣称用户路径通过。
3. **视觉矩阵**：两端浅/深主题、键盘与指针、菜单/浮层、必要减少透明度/动态效果、长内容及空/加载/无匹配/失败状态。Browser按1024px与1440px内容宽度；桌面按现有最小与常用窗口。截图与操作绑定新构建、客户端和尺寸。
4. **页面覆盖**：纳入的所有正式页面与公共浮层可从菜单/导航进入；核对单一标题、导航定位、返回路径、主次按钮、输入/状态层级、裁切和焦点。桌面特有系统按钮、拖窗、选择器和Single-Asset Card实际打开/返回需OS证据。
5. **核心用户流程**：从正式资料库入口验证浏览、检索/筛选、以图查询、选择/多选、详情、专注、文件夹/色板/回收站、描述/标签/笔记编辑、设置和受影响的AI/任务操作。检索解释、进度、限制和维护入口必须同时正确。
6. **持久与并发保护**：受影响的正常保存关闭/重开；取消、失败、修订冲突、未保存离开、切库/关库、断连与迟到结果不丢草稿或覆盖较新输入。两端对同一内容的可见状态遵循现有Host权威，不合成第二写入者。
7. **真实执行**：复用已指定非隐私资料、可恢复副本、既有实际本地检索/AI/OCR环境与既有费用边界；按实际改动影响验证相关真实执行。配置保存、模拟SDK、假响应或禁用按钮不能替代功能成功；不自动扩展到所有模型/Provider的质量矩阵。
8. **已有测试先例**：复用导航工作流、桌面视口策略、正式Library Canvas状态/Electron流程、共享设计系统、素材描述草稿、Asset Notebook会话、Library Organization、Single-Asset Card、设置冲突及Local DAM转场/恢复检查。保持外部行为和安全断言，内部组件断言只补充故障定位。
9. **设计检查的界限**：当前设计生成检查主要覆盖Gallery颜色/圆角，不代表辅助页面或真实界面通过；旧Gallery parity比较原型与合成展示，不代表Host接线或新设计资格。按本规格更新有效契约，不能删除保护或降低断言以获得通过。
10. **工程检查**：先执行受影响的最小测试，修改过的测试必须执行；完成类型检查与必要正式构建，失败按原因修复并按风险扩大。无需把全部长期平台/模型队列作为每次检查仪式。
11. **排除范围保护**：验证新样式未泄漏至Work Window或工作集专属大预览。只做受影响边界检查，不自动启动它们的尺寸、材质、拖放或性能整改。
12. **数据与运行身份**：通过应用核对当前profile、库、副本和服务；每个明确profile保持唯一Host，不读取秘密配置或复制凭据。新候选不能只聚焦旧Host后声称已运行，正常关闭/退出与重新连接按正式流程处理。
13. **完成门槛**：纳入页面实现一致，受影响检查、类型与必要构建通过，两端必需正式路径及适用保存重开/失败保护有新候选证据。记录PASS、FAIL、NOT_RUN或BLOCKED_UX_ACCEPTANCE的准确范围；必需路径失败或未验时整体保持未完成，不转交用户代测。

## Out of Scope

- Work Window及工作集专属大预览的功能、尺寸、Liquid Glass、控件、色板、停靠/拖放、动画/性能改造；共享样式的保护隔离与回归边界检查除外。
- 删除Eagle连接、写回、导入或其他现存功能；新库迁移、破坏性原件实验、重建用户资料或擅自改变兼容承诺。
- 移除Single-Asset Card兼容入口，或扩展为单素材卡片功能重做。
- 全应用原生化、第二套Host/数据库、任意文件/SQL/终端入口、通用插件平台或未指定的AI功能。
- Windows/Linux实际平台资格、移动端与更窄浏览器窗口的完整功能验收；共享代码仍须遵循既有平台边界。
- 全模型/全Provider质量、规模库持续推理压力、物理多屏和工作窗完整性能矩阵；实际改动引起的必要相关回归除外。
- 新服务购买、充值、额外计费、读取凭据/私有资料或扩大云端披露范围。
- Git推送、远端合并、签名发行、部署或产品对外发布。按用户显式调用to-spec发布本规格到issue tracker是本轮文档交付，不等同于这些产品动作。

## Further Notes

- 本规格依据2026-10-13对话中的六项设计确认、双端同步与宽度确认，以及源码基线e7189b5的规范/调用链检查合成。它包含尚未提交的已确认增量，执行者不能只按远端旧设计正文实现。
- 现阶段已有设计审查与准备记录，未安装当前工作树依赖、未修改产品代码、未构建或进行新候选运行验收。设计目标、源码状态和实际资格必须分开。
- Single-Asset Card是单份Design Asset的参考视图，包含素材信息、描述编辑和提示词草稿；Work Window是已保存Work Set的原生呈现。将卡片纳入不扩大工作集窗口范围。
- 普通入口为现有桌面/本机浏览器启动流程与应用内导航。验证复用已明确的公开素材和可恢复副本；issue正文不包含私人绝对路径、凭据、完整认证回调或用户内容截图。
- 无法取得特定工具/模型/服务或资料身份时，只阻塞依赖该条件的检查，继续独立工作，并保留整体完成限制。旧平台、旧构建和历史PASS不能转记。
- 当前视觉规则继续归设计系统，用户行为归对应模块规格，概念归领域术语表，执行状态归任务台账/当前任务，真实能力与候选身份归当前状态，证据归本次执行报告。规格不授权自动恢复旧任务队列。
- 以ready-for-agent发布表示规格已具备执行信息；本轮to-spec交付以发布并核对该issue为终点，不在本聊天自动执行产品实现。
