# 本地开发反馈闭环 · 2026-10-15

现在可以从普通工程入口 `npm run context:route -- --task "具体任务" --json` 获得相关源码、模块说明、检查候选，以及本地未解决问题、分组经验、可执行检查和写回位置。所有记录都在仓库内，不依赖 GitHub 反馈或定时巡检。

本轮完成的是开发工作方式与工具，未修改应用 UI、资料库、模型或原生窗口。真实 AI/外部推理仅使用现有模型、禁止权重下载，每次影响 UI/UX 必须按 DESIGN 检查的要求已进入正式开发与验收入口；这不是本轮已运行应用/模型的资格。

## 使用入口

```sh
npm run context:route -- --task "素材检索 Client 接口与键盘消费者" --json
npm run context:route -- --module asset-discovery --json
npm run context:check
npm run test-agent-context-router
```

结果的 `feedback` 提供 `problems`、`lessons`、`deferred` 和 `writeBack`。读取条目正文后，把适用 `Check` 纳入当前任务；最新目标没有纳入的问题只登记，不自动执行。非 JSON 输出也显示记录锚点、检查和写回位置。

## 最终实现与职责

- [AGENTS](../../../AGENTS.md)规定每次任务读取、判断适用和写回的时机。
- [CONTRIBUTING 第9节](../../../CONTRIBUTING.md#9-本地开发反馈闭环)说明状态、格式、去重、规范提升与证据归属。
- [本地开发问题](../../agents/DEVELOPMENT-PROBLEMS.md)保存具体问题，已解决项保留证据但不默认进入待处理集合。
- [LESSONS](../../../LESSONS.md)按共通、界面、Host、跨端分组；同一事故一个主记录，可关联多个路由。
- [实际加载与筛选](../../../scripts/development-feedback.mjs)读取权威 Markdown，检查 id/状态/路由，返回有界记录；条目文本不成为命令。
- [上下文路由](../../../scripts/agent-context-router.mjs)消费记录并把完整检查计入预算；记录多时延后，不把检查截成半句。
- [验收流程](../../agents/ui-ux-acceptance.md)明确现有模型、每次受影响 UI/UX 预览和未复现缺陷不得通过。
- 主台账继续保存跨系列责任，模块 README 与原架构入口继续解释机制；GitHub 只用于明确涉及它的任务。

本工作树进入本轮前已经有基础反馈接线及相关 WIP。本轮在其上完成检查、增长预算修复、完整消费/写回示范、检索导航核对与结果交接。未覆盖其他会话的差异，也没有全量 staging、reset 或清理。

## 真实问题驱动本轮改动

### DAM-P004：经验增长阻断路由

在隔离目录写入各12条相关问题与经验，每条416字符检查。原实现按8条/类别截取，但输出仍估算8776 tokens，超出4000元数据上限，真实 `buildContextPack` 返回 `BUDGET_UNSATISFIABLE`。[修复前失败输出](growth-red.log)。

修复改为按完整条目延后记录、核对延后总数、保持各类至少一个检查，并明确指向原索引。没有删除问题或抬高预算，也没有截断检查含义。必需源码与最小反馈确实无法容纳时，仍返回可观察的预算错误。

六项聚焦检查在最终实现通过，其中增长用例要求：路由可用、必需源码保留、问题与经验均可见、所有24条记录均计入保留/延后数量、完整检查未截断、预算与延后提示一致。[聚焦结果](feedback-green.log)，[完整路由回归](router-final.log)。

原因与复验已写回 DAM-P004，检查经验成为 DAM-L007；下一次治理任务已经能读取它。[实际治理路由](completion-governance-route.json)。

### DAM-P005：检索导航摘要与实际消费者冲突

读取 Library → `useHostAssetSearch` → `searchAssetsPage/retrieval.query` 的实际链路，发现索引仍称内存词法匹配并把单库索引/向量/以图接线记为未来。修正这一项路由的状态与读取入口，加入实际查询 Hook 和 Host 模块 README。

本项静态证据足以证明导航摘要错误，修复不构成真实模型、规模、跨平台或用户路径验收。其他路由未因这一修复被重新宣称全部当前准确。经验 DAM-L008 提醒后续沿消费者核对导航。[修正后的实际检索路由](completion-search-route.json)。

## 记录写回怎样影响下一次工作

[行为测试](../../../scripts/development-feedback.test.mjs)在独立目录复制路由所需源码，只编辑本地问题/经验：

1. 写入待复现问题，调用真实上下文路由，读到对应状态。
2. 更新为当前任务认领及新的检查，下一次路由读到更新。
3. 将隔离示范问题写为 resolved，并提炼相关经验；下一次路由不再列它为待处理问题，但返回新的检查经验，原问题文件保留。

这是记录消费与状态投影的内部验证。它没有把生产中的 DAM-P001 虚假改为已修复；P001—P003仍待当前候选复现。实际本轮P004/P005的复现、原因、修复与经验写回另有上述证据。

## 验证结果与范围

| 验证 | 本轮结果 |
| --- | --- |
| 普通 CLI 检索路由 | 关联DAM-P001；共通/UI/Client/导航经验可读，返回写回位置 |
| 普通 CLI 打包路由 | 不带入检索或AI问题，仅返回适用共通要求 |
| 普通 CLI 治理路由 | 已消费本轮新增经验DAM-L007/L008 |
| `npm run test-agent-context-router` | 268项路由场景与6项反馈行为测试通过，没有取消或跳过 |
| `npm run context:check -- --json` | 13条反馈记录有效，tracked源码归属798/798；保留6个未跟踪源码未纳入trusted覆盖的警告 |
| `python3 scripts/check-agent-context.py` | 入口/路由检查通过 |
| 差异、文档链接、记录锚点及源码哈希 | 本轮核对；源码身份见manifest |
| 同会话code-review | 核对直接加载者、调用者、状态/预算与记录职责；非独立审查 |
| 应用构建、UI/原生预览、真实AI/厂商服务 | 本轮未执行；没有应用运行行为改动，不调用无关模型或资料 |
| 推送、发布、定时巡检、旧问题批量修复 | 未执行 |

最终工具候选是07c2工作树上的明确源码集合，HEAD `a7b7803fcee9` 加本地差异，Node `v26.11.1`。完整源码身份及直接核对消费者见[manifest](completion-source-manifest.json)，[当前索引检查](completion-context-check.json)。这里不是某个应用 build id，也不是旧产品验证的新资格。

此前本目录的 `context-check.json/search-route.json/packaging-route.json` 保留为基础接线阶段记录，最新结果使用 `completion-*`，不覆盖旧证据。

## 留给后续适用任务的缺口

P001旧键盘夹具、P002OCR/视觉AI收尾、P003空库/404诊断仍未新复现或修复。它们只有在当前用户目标涉及对应范围时才推进。当前路由资格不证明所有模块摘要都已逐项重验；后续沿相关源码核对。

UI预览继续由正式Desktop/Browser入口和验收流程执行，供审查的截图/录屏存本任务检查点；本轮未新增独立预览服务器或录制平台。经验提升仍需实际检查消费者，不能用文件数量、规则数量或一次全绿代替用户结果。
