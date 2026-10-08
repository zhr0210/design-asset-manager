# 基础文件采用与当前用户结果续接（2026-10-06）

本次按用户当前请求合并 DAM-FOUNDATION-RESEARCH-20261005 包的七份候选。包是设计资料，不是独立授权；未执行包内脚本、未重开历史开发队列。主 Agent 自审，无子 Agent 或独立人员复核声明。

## 文档结果

| 文件 | 合并结果 |
| --- | --- |
| [README](../../README.md) | 产品介绍、启动和文档地图；删除已过期的Windows视觉能力快照，原型/历史入口迁入开发指南并保留链接 |
| [产品基准](../product/PRODUCT-FOUNDATION.md) | 完整愿景主文；基础自动策略、资源和手机方向标为目标；保留原配色交互、搜索历史、工作媒体及外部开发边界 |
| [架构](../../ARCHITECTURE.md) | 新增唯一结构入口；核对实际目录、同Host双客户端、Library控制连接、Legacy poller与Pi不同链路、账号及资源生命周期 |
| [开发指南](../../CONTRIBUTING.md) | 新增命令、环境/ABI、候选/WIP、真实验证与工程自主范围；保留旧README开发和路由入口 |
| [PROJECT](../../PROJECT.md) | 改为导航；Route A/B原件逐字节保存在[历史原件](../history/project-route-ab.md) |
| [验收流程](../agents/ui-ux-acceptance.md) | 指定真实验证直接纳入实施；保留浏览器优先、原生补齐、连续帧、状态和操作/复测模板 |
| [AGENTS](../../AGENTS.md) | 在产品/架构/开发主文落位后精简；15,448 → 6,117字节，隐私/原件/用户状态/Host及实际结果底线保持 |

同步 REHOST、商业目标、发行验收、CONTEXT、ADR索引、实施状态的活跃入口。内部IPC/schema逐项审批和指定真实验证一律暂停被当前授权替代；公开兼容承诺、真实资格、外发范围、不可逆数据损失、额外购买和发布保护保留。历史FAIL/NOT_RUN不改写。DESIGN及`.codeindex`无需改变，原有索引能定位对应域；不新增Claude/Copilot入口。

## CHANGE-MAP 30项逐项语义核对

各项均为文档保留通过，不是对应产品功能验收通过。以下§指[产品基准](../product/PRODUCT-FOUNDATION.md)章节。

| # | 保留意思 | 合并后位置与核对 |
| --- | --- | --- |
| 01 | 视觉创作者、本地优先、AI核心、收录到复用 | §1–2；保留 |
| 02 | 无模型基础可用不降低AI地位 | §1；保留 |
| 03 | 标签/描述/OCR基础自动与独立重跑 | §6；目标策略，非实现声明 |
| 04 | 反推手动/批量、非原提示词事实 | §6；保留 |
| 05 | 标签成功即用、失败独立、通知聚合 | §6；保留 |
| 06 | 确定性配色/占比、透明/近色/版本 | §6；保留 |
| 07 | Embedding显式启用、向量空间不可混 | §6、8；保留 |
| 08 | 普通验证组合、高级配置与手册 | §7；保留 |
| 09 | 内存/显存目标、闲忙调节、共享 | §7；含非物理硬预留限定 |
| 10 | 手动/自动大小模型、质量/授权 | §7；保留 |
| 11 | 持久任务、素材×能力恢复重授权 | §6–7；保留 |
| 12 | 本地/云/API/订阅、无静默fallback | §7、10；保留 |
| 13 | 原件/预览/派生、Copy非Move | §10；补保留Reference in Place显式模式 |
| 14 | 人工编辑/确认、AI建议、组织独立 | §6、8、10；保留 |
| 15 | Managed/Eagle/Legacy独立ownership | §10；保留Eagle单原件和独立Journal方案链接 |
| 16 | 四入口/底部搜索、普通/AI/色板 | §5、8；视觉主权归DESIGN |
| 17 | 笔记、标签别名/层级、Trash/Restore | §3、8；保留 |
| 18 | 多参考多窗口、恢复、移除不删 | §9；保留完整规格链接 |
| 19 | 色板去重、复制/收藏/工作窗口/备注 | §8；原有左右键/位置/空格语义保留并交DESIGN定稿 |
| 20 | 词法/结构化/向量/视觉与解释 | §8；保留 |
| 21 | 来源谱系、缓存、相似不自动删除 | §2、8；保留 |
| 22 | 证据设计辅助、确认工作集提议 | §3；目标，非新增通用Agent |
| 23 | 录屏插件、Host持久视频/帧/网址 | §9；保留卸载不删、普通导入视频适用 |
| 24 | 专业工具按需、渐进SDK | §3、9、11；不将市场作为前置 |
| 25 | 内置网页退休、独立下载保留 | §3；保留历史范围链接 |
| 26 | Browser+Desktop共享UI/Host、不扩LAN | §4、ARCHITECTURE§1；核对Local Host |
| 27 | Windows/macOS、未来手机收集管理/云AI | §4；手机明确未来目标 |
| 28 | 云推理/外部开发/社区分发权限不同 | §10；开发、安装和发布分别核范围 |
| 29 | 工程自主、指定真实验收、禁止读秘密 | §10–11、AGENTS、CONTRIBUTING§5及验收流程；保留 |
| 30 | 目标/正式实现/Tracer/发行分开 | 页首、§11–12及CURRENT-STATE入口；保留 |

表外原约束去向：受检独占Library控制连接、App Download独立库与`assets:delete`拒绝归ARCHITECTURE§4；账号生命周期、资源UNKNOWN与撤权归§5；模块/ADR按需导航及只读不写TASK归AGENTS/CONTRIBUTING；实际OS/ABI、原生打包资格不因采用文档解除。

## 检查与恢复

原文件字节与本轮差异基线在`.scratch/foundation-20261006/before`及`baseline.json`，仅备份本轮文档；PROJECT公开历史原件单列。包内22份清单文件SHA/长度核对通过，未把包校验当产品测试。

- 主文首轮115项本地链接通过；同步TASK/CURRENT/本交接后的最终144项本地链接全部有效。PROJECT归档字节相同。
- `npm run context:check`通过；保留既有1个未跟踪一方源码排除警告，不stage或放宽索引。
- `python scripts/check-docs-sync.py`、`python scripts/check-adr-router.py`通过；前者只说明仓库变更类别配套，不证明本轮全部语义正确。
- `git diff --check`通过；本轮未修改业务源码，无需因纯文档重新构建或重跑旧模型矩阵。
- 本轮采用后八问由当前上下文自审：产品闭环、默认策略、主文入口、内部接口自主、指定真实直接验收、禁止全盘扫描、mock不关目标、历史证据须重核均可从主文回答。新会话自动加载核对仍NOT_RUN，不能在当前会话伪称完成。

## 当前用户结果续接

当前TASK最近获批结果为Pi思考强度接入。本轮续接这一范围的真实入口和保存重开验证，不启动WC/R/DP全队列，不扩大到全部模型质量、私人旧库或发行。
### 环境与数据范围

Windows x64，Electron30.5.1/Node20.16.0/ABI123，Pi0.99.1/独立Node24.21.0。沿用指定profile别名WC01-REASONING-R2、公开图副本work-browser（24资产/schema13）及已登录ChatGPT订阅；没有私库扫描、模型下载、新Provider或API fallback。
实际Main PID52160，loopback62288归该进程；命令行只核对既有launcher与Browser标记，不输出完整路径/环境。Main SHA `8371968e6079038dc5aabaa0d2ff392f8bf2fb76b8e19799d69bb36f9a74ea9d`，690源码输入和14个实际输出逐项无漂移，沿用build `dam-ddd88ccd17321322`，未重建冒充新功能。

该profile原来使用Main导入前隔离userData和legacy home的启动器，是真实safeStorage与正式业务，仍不是默认profile冷启动资格。桌面本轮通过普通Electron入口、显式同profile交给现有唯一Host；原生窗出现后确认仍是PID52160，没有启动第二个资料库后端。
首个PowerShell启动受继承的Electron Node模式影响，没有打开窗口；按已有正式launcher方式移除子进程的`ELECTRON_RUN_AS_NODE`后成功。未改系统环境。

### 实际操作—预期—结果

| 路径 / 实测端 | 操作与预期 | 实际结果 | 证据（`.scratch/foundation-20261006/`） |
| --- | --- | --- | --- |
| IAB普通origin | 尝试现有loopback入口 | 无启动会话，显示“请使用DAM浏览器版入口”；未复制grant/Cookie，转应用已打开的Chrome | 当次CU记录；此项不是应用失败或IAB通过 |
| Browser连接 | 工作区→AI与模型→ChatGPT连接；应回读low与六个目录档位 | PASS；目录加载后low及off/medium/high/xhigh/max可见 | `browser-low-proof.png` |
| Browser真实推理 | 核对生成图→同意发送；仅一张应用生成双色图、同服务gpt-6-luna/low | PASS；图片、完整JSON及颜色挑战通过；时间2026-10-06 00:11:24（上海） | 同上；界面显示的UTC为2026-10-05T16:11:24.513Z |
| Desktop配置取消 | 普通桌面→AI与模型→连接→high草稿→滚动→取消 | PASS；恢复low、没有提交high或触发high推理 | `desktop-six-levels.png`、`desktop-high-draft.png`、`desktop-cancel-low.png` |
| 双端保存回读 | 桌面保存low→Browser刷新→重新选择连接 | PASS；low和本轮新生成图验证时间保持 | `browser-low-proof.png` |
| Desktop库重开 | 素材工作区→重新打开上次库→滚动→public-01-astronaut→Inspector→展开AI分析 | PASS；读到原有真实low描述、建议、541输入/267输出及费用未知；未重发素材推理 | `desktop-reopened-low-result.png/txt` |
| 后台独立保护核对 | 只读SQLite integrity/FK、人工字段/关系及原件/预览对照 | PASS；24资产、恰好一条既有low证据；其他23资产、61 baseline文件及48原件/预览保持 | `independent-oracle.json` |

桌面默认窗1268×826截图像素、浅色，未改变缩放；系统缩放因子未单独读取。取消前后截图可核对最终状态，不宣称覆盖快速操作或动画时序。桌面工具首次AX点击因缺少几何失败，刷新带截图的窗口状态后恢复；后续AX会滞后一拍，最终结果以刷新后的截图和文本共同确认。搜索框focus字段始终返回document，本轮未键入，改用可见滚动定位，键盘搜索验收不计通过。

本轮真实服务调用是1次生成图动作，不重复上批素材分析；准确wire请求数、token用量和费用未观测，不承诺硬cap。图像挑战不是全模型质量结论；既有素材内容与公开图相符只是这一个样本的检查。
只读oracle复用上批检查代码，仅将输出改到本轮目录。首次以`.scratch`路径运行被仓库Electron测试启动器拒绝（未执行测试）；随后将相同字节临时置于允许的`scripts/fixtures/foundation-reasoning-readback.test.ts`执行通过，校验与保留在`oracle.test.ts`的字节一致后删除本轮临时执行副本。没有绕过启动器、降低断言或覆盖旧证据。

### 本轮结论与限制

- Browser CU：上述正式连接、真实low生成图及刷新读回PASS；IAB会话入口未完成。
- Desktop CU：普通同Host入口、档位选择/取消、保存、指定公开库重开及既有分析回读PASS。原生键盘完整矩阵、账号登录/锁屏/退出生命周期、工作窗口/跨应用交接、安装包和macOS NOT_RUN。
- 后台保护核对PASS；不代替CU。未保存导航直接丢弃草稿的既有限制、默认profile路径权威及订阅硬cap缺口仍保留，未扩展为本轮功能改造。
- 本轮基础文件采用与上述当前结果续接完成，不宣称整个产品/全部UI/UX/商业发行完成。没有修改业务源码、提交、推送或发布。

入口：已打开的[本机Browser](http://127.0.0.1:62288/)及同Host的Design Asset Manager桌面窗。正式常规启动命令仍为`npm run start:desktop` / `npm run start:browser`，它们默认使用常规profile，不能假称会自动进入本轮受控profile；本轮直接使用现有已确认实例。
当前桌面停在公开样本low结果，Browser停在low连接页；应用、模型账号会话保留。复核入口失效时按记录核对Host与profile，不能只凭旧端口认定当前身份。
