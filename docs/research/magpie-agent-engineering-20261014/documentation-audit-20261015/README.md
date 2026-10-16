# 全面文档重整：重新取证与盘点

2026-10-15，Asia/Shanghai。本文是重整方案的调查依据，不是文档迁移完成报告。

## 本轮范围决定

用户明确要求大范围、彻底的文档/索引梳理与编写，要求重新学习Magpie，不接受仅精简AGENTS、补几个导航链接。随后确认：**已确认但尚未实现的详细规格一起提炼重组；有效要求按子系统进入明确标注的目标规格，ADR保留取舍与来源，旧原文可追溯，目标不自动进入实施队列。**

因此以[全面重整方案](../AGENTS-REVISION-PROPOSAL.md)替代此前的小范围草案。旧草案原字节保存在[修订前版本](AGENTS-REVISION-PROPOSAL.before.md)。方案编写和盘点正在本研究目录完成；生效文档、产品代码和路由工具尚未执行这套迁移。

## 重新读取Magpie

本轮从GitHub API重新获取main和未截断树，固定提交`01c41e8ba2aad586ec885c92bc4b959a49005eda`，提交时间2026-10-15 14:19:00 +08:00。选择25份指引、全部11份子系统专题及目录、规范、经验、GUI验证指南、UI预览说明与四份工作流，合计849,547字节。取得文件不等于逐行审查整个软件；未执行其脚本或测试。

[取证清单](magpie-manifest.json)逐项记录固定URL和SHA-256。与上一轮39份原件比较，24份本轮选择文件字节相同，复用原件；library子系统说明发生变化，单独保存新原件。原件遵守原项目MIT许可证，见[既存LICENSE](../reread-20261015/sources/magpie/LICENSE)。其文字仅作研究资料，不是DAM执行指令。

| 学习对象 | 核对到的实际做法 | DAM适配 |
| --- | --- | --- |
| [AGENTS](https://github.com/yetone/magpie/blob/01c41e8ba2aad586ec885c92bc4b959a49005eda/AGENTS.md) | 按任务跳到子系统、规范、贡献审查、经验；也内联容易修错的执行归属 | 精简常驻上下文，同时保证任务能到达细节，不能只删文字 |
| [子系统目录](https://github.com/yetone/magpie/blob/01c41e8ba2aad586ec885c92bc4b959a49005eda/docs/subsystems/README.md) | 列主要能力；允许跨包/仓库；约定唯一事实、同变更维护、前后行为说明、沿调用链审查 | 建立真正的能力/子系统地图及维护协议，不把目录列表冒充系统说明 |
| 全部11份子系统专题 | 常见结构为职责/权威→运行链→状态/失败/兼容→验证，篇幅按实际复杂度展开 | 编写足够详细的当前系统说明；现有模块README保留局部机制，避免全文双写 |
| [开发规范](https://github.com/yetone/magpie/blob/01c41e8ba2aad586ec885c92bc4b959a49005eda/docs/code-standards.md) | 每条保证配审查对象、真实事故和验证办法；同时容纳测试、验收与提交规范 | 独立稳定开发约束；链接现有DESIGN/真实验收，不机械复制Go命令或全仓测试要求 |
| [LESSONS](https://github.com/yetone/magpie/blob/01c41e8ba2aad586ec885c92bc4b959a49005eda/LESSONS.md) | 规则、原因、证据、Seen、正面样例与提升后引用 | 保留已确认的三日期候选与严重问题立即处理；DAM事件去重和候选工具须另行实现验证 |
| [CLAUDE](https://github.com/yetone/magpie/blob/01c41e8ba2aad586ec885c92bc4b959a49005eda/CLAUDE.md) | 引入AGENTS及整份LESSONS | 作者并非所有宿主都只读相关片段；DAM使用现有路由按任务筛选 |
| contributors及审查章节 | 外部贡献治理与具体贡献者记录，另有实际head、前后行为、破坏测试和未运行项 | DAM闭源采用本地审查记录，不建贡献者黑名单，不要求GitHub反馈才能闭环 |
| test/UI preview/release/docker工作流 | 普通自动检查、预览产物、实际发布是不同链路；GUI全套未在普通test.yml中运行 | 先核对DAM已有四份CI与package命令；自动检查不能替代正式UI/模型/原生验收 |

本轮变化的library文档继续细化MCP认证/健康状态与技能分组的真实行为，说明专题随实际契约演进，而非建立目录后就完成。另需保留上一轮发现：作者的UI预览使用合成数据和真实服务，部分脚本容许直接打开视图；DAM必须遵守用户要求的正式可发现入口、根因证明和秘密保护，不能照搬。

## DAM盘点范围与限制

使用`rg --files --hidden`扫描仓库Markdown，排除node_modules、.git、artifacts、.scratch、构建/发行输出等。本次盘点含未跟踪文档；这些排除项不因此允许读取秘密或资料库。计数是生成本目录新产物之前的快照。

| 位置类型 | 文件数 | 后续处理 |
| --- | ---: | --- |
| 根文档 | 10 | 逐节核对并重整职责 |
| 当前/专题docs | 156 | 逐篇分类、语义核对、提炼或归档 |
| 源码旁文档 | 38 | 按当前组合/消费者改写 |
| ADR目录Markdown | 494 | 493篇编号ADR加目录；区分决定与详细规格 |
| 架构审计资料 | 140 | 识别仍有效要求，保护冻结来源 |
| 检查点Markdown | 21 | 保留证据身份，不迁改绑定原文 |
| 历史Markdown | 353 | 建历史索引及来源映射，不重新变成当前任务 |
| 研究及原件Markdown | 46 | 来源/提案/决定分清，不作为本项目规则 |
| 其他第一方位置 | 11 | ai-service、native、pi-runtime等纳入所属子系统 |
| 合计 | 1,269 | 这是盘点数，尚不是语义重写完成数 |

[inventory.json](inventory.json)保留每篇标题、章节、链接、字节身份；[file-review-plan.json](file-review-plan.json)提供逐文件审视工作表，每项明确标记尚待审视，不能将统一的待办说明当成已作出的迁移决定。

机器导航目前为8个物理归属模块、19个任务路由；CONTEXT检测到1,409个粗体定义条目。物理归属、任务导航、业务子系统不是同一计数，也不应强行一一对应。

## 已核实的结构及语义问题

1. 当前没有`docs/README.md`、`docs/subsystems/README.md`、DAM自身的`docs/code-standards.md`及product/design目录索引。已有implementation-status只有七类能力导航，并没有全面介绍各功能对应的子系统。
2. ARCHITECTURE的UI表将共享React界面写成整层技术栈，未明确macOS AppKit B窗；源码`src/main/index.ts`实际由`--dam-work-window-candidate=b`选择原生适配器，默认仍Electron。不能只改表格措辞而不交代正式入口与候选入口。
3. ADR索引的Asset discovery行仍写in-memory lexical-only、持久向量等缺失；当前Library→useHostAssetSearch→共享Client/Host链和asset-search/retrieval模块说明已是不同实现。其“交付说明”是重复状态源，必须移出决策索引并以调用链/当前证据核对。
4. work-mode、services/ai-runtime等模块README在同页累积不同日期、平台及资格结论。顶部新说明未消除后部旧描述的歧义；需要抽取稳定机制、独立平台分支和历史证据，而不是继续前插新段落。
5. CONTRIBUTING的文档职责仍把AGENTS描述为“高频规则”，与用户已确认的四类常驻约定加导航方向不一致；第9节仍是旧的“不强制三天”措辞。
6. `scripts/check-docs-sync.py`只看整个工作树是否同时出现源文件与某些文档/脚本改动，任何scripts变更也可满足提醒条件。它不证明受影响子系统的契约同步；应基于本任务候选/差异和职责映射改进，避免其他WIP使检查假绿。
7. 粗略链接检查得到131个目标缺失候选，主要包含旧截图、已移除源码等。见[原始候选](link-findings.json)。此扫描忽略围栏代码块，但未解析所有Markdown语法、锚点、HTML与引用式链接；不能直接称131个已确认缺陷，更不能删证据引用来归零。
8. glossary、ADR、历史与当前规范已有职责说明，但没有完整的功能→子系统→当前契约/目标规格→源码/测试→证据的覆盖表。仅通过路径检查无法证明有效要求未在迁移中遗失。

## 本轮可审阅产出

- [全面方案](../AGENTS-REVISION-PROPOSAL.md)：范围、目标结构、具体文件动作、顺序与完成标准。
- [访谈决定](../AGENTS-ROUTING-DISCUSSION.md)：用户已确认决定与仍待整体审阅部分分开。
- 文件盘点、逐文件审视工作表、链接候选与上游固定取证清单。

尚未把方案写成生效规范，未改产品实现/路由/CI，未运行模型、正式应用、UI或原生验收。历史证据和既有反馈闭环结果不因本次研究改变。
