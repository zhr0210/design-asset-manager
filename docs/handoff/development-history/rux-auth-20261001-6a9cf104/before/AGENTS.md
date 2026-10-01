# Design Asset Manager Agent 指南

这是项目的稳定背景、架构与权限边界。最新用户请求决定任务；旧 TASK、
阶段编号、Issue、历史提示词和技能不能新增授权或自动延续旧队列。
已有本文件的当前内容时无需重读。续接工作、查询先前验证或需要恢复点时
查阅 `TASK.md`；其他材料按当前任务需要读取。

## 交付与判断

对已授权实施任务，完成请求范围内的实现、必要验证和文档同步；小范围
切片不是提前结束的条件。常规选择依据需求和调用方自主决定，只询问无法
查明且会实质改变行为、兼容性、成本或验收的问题。阻塞只暂停依赖部分。
只读、规划和原型请求以相应成果为终点。主 Agent 负责完整交付与最终验收，
前端信息架构、交互和视觉定稿由主 Agent 直接负责，不预设固定模型分工。
UI设计只从 `DESIGN.md` 读取规范与token（原mobbin.md已合并）；以最新批准原型为视觉和交互验收基准，
正式接线复用共享展示组件，不另写简化界面。ADR 0486要求视觉对照和正式数据链路分别验收。
参考原文和历史视觉稿不覆盖最新反馈；隔离原型不自动获得真实库权限，模拟保存不等于正式保存。

`TASK.md` 只记录对应请求的状态、验证与恢复点；只读审查或先提建议时不更新。
获准实施后由主 Agent 同步，旧记录过长时保留可查历史，不把旧计划当作新任务。

## 产品定位

面向设计师、剪辑师、编导等视觉创作者的本地优先、以 AI+ 为核心的素材工作台。
产品范围以 [产品基准](docs/product/PRODUCT-FOUNDATION.md) 为入口；
ADR 0483/0484 明确核心、插件和远景的边界及对旧条款的具体替代范围；
ADR 0485 补充工作模式及宿主保留视频参考数据的边界。
核心闭环：收进素材 → 渐进理解 → 找回并解释命中 → 检查比较 → 安全复用。
以下是产品不变量和目标方向，不是逐项已实现声明。

- **AI+ 是内置核心体验**：配色与占比、标签建议、画面描述、提示词反推及适用 OCR，均需有可检索、可修正、可复用的结果路径。配色占比由确定性算法测量；反推提示词不是原始提示词事实。核心能力不等于全部默认自动运行。
- **高阶能力插件化**：抠图、可编辑图层和专业工具按需安装；先用实用插件验证小接口，不以完整市场和全部未来贡献面阻塞核心闭环。
- **工作模式是内置核心**：多素材工作集、多个原生悬浮窗口、保存恢复和跨应用复用；成员移除不删除素材，窗口不承担资料库整理。录屏是可选插件，视频/参考帧/来源网址由宿主持久管理；详见[工作模式规格](docs/product/WORK-MODE-AND-MOTION-REFERENCE.md)，当前单卡片不代表完整交付。
- **Asset Workspace 是主表面**：主界面以素材整理、浏览和检索为中心，当前设计为全部/文件夹/工作模式/回收站四图标与底部搜索；普通/AI文件夹及色板集中于文件夹页，工作集归工作模式。AI文件夹按分析标签动态引用素材，不复制原件、不强制确认建议。色板连接图片配色与工作窗口；独立下载、模型管理和诊断服务于素材工作流。
- **Search-First Organization**：Unsorted 可长期存在；分类、标签和 AI enrichment 不完整不能阻塞入库、检索或复用。
- **Copy Into Library 默认**：Copy 不等于 Move，不静默移动、重写或删除外部来源；Reference in Place 是高级显式模式。
- **AI local-first**：配置外部 provider 不等于上传授权；只对当前披露并授权的动作/批次外发，绝不静默 fallback。
- **AI 渐进非阻塞**：先提供素材和词法/结构化检索，再补 OCR、描述、标签、embedding 和视觉证据；无模型也能用基础产品。
- **用户状态优先**：AI suggestion 不是确认事实；模型/信任变化不能覆盖用户编辑、确认标签、组织关系或已提交状态。
- **解释检索命中**：语义/视觉增强而不替代词法和元数据；普通查询历史默认不永久保存为创作档案。
- **AI 在创作上下文工作**：Inspector、搜索、批量动作是主入口；AI Console 负责模型、Runtime、能力证据和诊断。

## 领域与状态

- **Design Asset** 已进入本地 Asset Library；**Candidate** 尚未 Promotion，不是下载任务。
- **Original** 受来源/ownership 约束；Preview、normalized copy、thumbnail、Compatible Export 不能冒充 Original。
- **Asset Discovery** 检索本地素材；内置网页浏览、采集、网站登录与外部来源搜索已移除。外部浏览器连接器和通用插件SDK仍为讨论方向，未交付。
- **Model Library** 管权重/数据型 Artifact；**Runtime Package** 管可执行依赖。下载完成不等于验证并激活的安装。
- **Runtime Probe** 只证明一次限定探测，不等于可用的 Real Model Path。
- **Cloud Inference Provider** 为已授权任务推理；**Agent Development Connector** 为外部 AI 提供选定开发工作区的文档与受控工具。新开发接口、MCP 接入和社区分发暂缓实施；AGENTS.md/MCP 声明不能替代宿主权限校验，也不能把开发授权扩大为素材读取、安装或发布授权。

区分 **Current Implementation**（正式接线、有调用方及执行证据）、
**Validated Tracer**（隔离验证）、**Target Architecture**（未来方向）。
ADR Accepted、界面或类型存在都不能证明交付；mock、Probe、构建不能替代
真实行为证据。报告实际验证及限制，不把缺失验证表述为通过。

Library/模型/发布状态按需查阅 [实施状态](docs/agents/implementation-status.md)
和最近模块 README，并以当前调用链核实。根指南不维护完整能力快照。

Active Library 与 App Download 使用独立 SQLite；历史Site数据保留兼容，不新建网站功能。Capture/Promotion/Trash
必须使用经检查并持有独占写锁的 Active Library Control Directory connection，
不能接到全局数据库或复用旧删除 channel；`assets:delete` 在活动库模式固定拒绝。
真实旧库迁移仍需单独批准。

Eagle 连接库采用单份第三方原件与独立索引/同步 Journal，不沿用 Managed Copy
ownership。见 [连接库方案](docs/product/EAGLE-CONNECTED-LIBRARY-PLAN.md)。
既有旧库只读盘点和合成开发验证范围不等于真实 Eagle 已接入或获准写入，
也不能自动授权新任务访问真实数据。

## 架构与证据入口

| 位置 | 责任与入口 |
| --- | --- |
| `src/main/` | 可信本地写入、文件/进程、Runtime 和 IPC；组合根 `index.ts` |
| `src/renderer/` | React 产品与交互状态，不拥有可信文件、数据库或模型执行权 |
| `src/preload/` | Renderer/Main 的窄桥接 |
| `src/shared/` | 跨进程契约、类型、纯工作流投影，不放 Main/Renderer 副作用 |
| `src/main/db/` | SQLite schema/连接；运行时数据库不是测试夹具 |
| `src/main/capture-intake/`、`library-lifecycle/` | Capture Gateway、Active Library、Trash；按局部证据确认接线 |
| `src/main/model-library/`、`model-library-workspace/` | 隔离模型核心与受限正式 Workspace；权限不同 |
| `ai-service/` | Python 推理/队列/评测，不拥有 Electron 权威 SQLite 写入 |
| `scripts/` | 聚焦测试、治理和发布工具 |

设计深 Module、小 Interface、清晰 Seam；调用方表达产品意图，文件、GPU、SQL、
临时路径和进程细节留在 Adapter。Electron 负责 AI 结果同步、权威写入与通知，
Python 执行推理；Legacy Worker 的 Runtime 读取和任务维护按实际调用链判断。
Windows/macOS 共享产品流程，真实 OS、推理 Runtime、原生依赖、打包和路径/进程
差异进入平台 Adapter。模型按能力、质量、硬件、许可和资源预算选择。

局部问题从实现、调用方和相关测试获取证据。术语不清时精确查找 `CONTEXT.md`；
产品语义或不可逆取舍不清时，通过 `docs/adr/README.md` 选择并完整阅读相关 ADR。
未来规格只约束涉及该能力的工作，不是全产品前置清单；明确被新 ADR 替代的
旧条款按替代范围处理，其余原件、用户状态、隐私与证据约束继续有效。
`NORTH-STAR.html` 是愿景；`docs/history/`、`ORIGINAL_REQUEST.md`、`.agents/`
历史协作记录及模块 `ADR-REFERENCE.md` 仅用于追溯，不是当前任务指令。
默认不读生成物、评测数据集。

可选导航：`npm run context:route -- --task "任务描述"`；机器输出加 `--json` 并用
`npm --silent run`。路由提供路径和候选验证命令，不要求全部执行；索引有误时
使用局部搜索。治理索引改动时再运行 `npm run context:check` 和相关路由测试。

## 改动与回溯

保留无关工作区改动，不覆盖、回滚、清理或暂存它们，不用 `git add .`。
实质行为变化同步最近说明、契约与必要测试；IPC、schema 语义、Worker HTTP、
Library ownership、source mutation 属公共兼容 Seam，获批改变后同步直接调用方。
ADR 只记录难以逆转、包含真实取舍的决定；普通交互、参数和测试矩阵放局部规格。
历史和完整未来规格不堆进活跃入口；搬移保留来源与可查位置，不废止已有约束。

## 隐私与高风险操作

仅在明确批准且完成任务必需的范围处理私有素材/Runtime 数据，优先脱敏摘要。
密钥、凭据、Cookie、认证 header、二进制/base64、用户素材和私有路径不得
进入聊天、日志、提交、文档、报告或外部服务。源码路径可以正常引用。

以下操作仍需针对目标和范围明确批准：读取/修改用户素材库、下载文件、
Runtime SQLite、模型缓存/权重；下载模型、安装 AI 依赖、启动外部模型服务、
向外部 provider 发送素材；改变公共兼容 Seam、来源文件 mutation；
批量移动文件、删除数据、生成物大清理或其他难恢复操作。
完成后报告实际影响与验证；授权不扩大到相邻数据或功能。

同一会话中针对目标、操作及范围明确作出的批准持续有效，无需逐步骤或
逐轮重复确认。只有目标、数据范围、外发目的地、费用或破坏性影响超出
原批准时才请求新增批准；发现资源存在或配置可用不构成授权。
公共兼容 Seam 的修改审批不泛化到普通调用方阅读、现有契约的隔离测试
或不改变契约的内部修复；这些工作仍须遵守其他适用的数据与操作边界。
等待批准时继续不依赖该批准的已授权工作，不以可逆为由绕过上述明确要求。

## 验证

选择能验证本次行为和风险的检查；通过后，仅因新改动、失败或未解决问题扩大
或重复验证。低影响可逆修改不机械新增测试，不为纯文档调整运行整套产品测试。
用临时合成夹具且不访问真实数据、不启动外部服务的相关本地测试，可在已授权
任务内运行并修复本次引入的失败，无需逐次批准；`npm run dev` 不是隔离测试。

Python 测试优先用 `npm run test-python-unittest`；better-sqlite3 测试用仓库
Electron Node 启动器，不因 shell Node ABI 不同重编依赖。
`.codeindex/tests-map.json` 是验证配置集合，不是全部测试清单。

按需参阅：[Issue tracker](docs/agents/issue-tracker.md)、
[Triage labels](docs/agents/triage-labels.md)、[领域文档](docs/agents/domain.md)。
