# ADR分类与任务索引交付

2026-10-15用户要求ADR分类并按任务类型索引，避免全局读入影响任务质量。本轮落实为：AGENTS→任务阅读类型→主题/影响范围→少量候选元数据→选中的ADR/详细契约。任务类型只调整阅读重点，不排除任何任务或同主题的数据/权限等决定。

## 现在怎样使用

```sh
node scripts/adr-context.mjs route --kind design --topic work-mode --task "悬浮窗交互与数据权限" --json
node scripts/adr-context.mjs route --kind research --topic retrieval --task "比较持久向量与索引重建" --json
node scripts/adr-context.mjs --list-types --json
node scripts/adr-context.mjs --list-topics --json
```

默认最多3条候选（上限8），输出标题、性质、原文声明状态、详细契约引用及有限的相邻决定id，不输出ADR正文。候选总数/延后数明确，无范围提示补范围而不回退全量Core。类型未列出时走general，不构造新白名单。索引无命中不等于没有适用决定。

## 分类与入口

- 493篇记录全部进入.codeindex/adr-index.json，按29个主题视图组织；12种阅读类型包括调研、规划、需求、设计、实现、排障、验收、文档、运行、交付、重开取舍及general。它们是入口，不限定ADR只能用于这些类型。
- [短ADR入口](../../adr/README.md)、[任务类型](../../adr/indexes/tasks.md)、[主题目录](../../adr/indexes/topics.md)分级读取；完整性质分类和背景从原根入口移到按需页，不在启动时读全部Core/语料。
- 主题页只列标题/性质/声明状态，原ADR路径、编号、具体决定及已迁出的详细契约均未改动。声明状态、Core等性质分类、实际交付三者分开；未显式声明不等于未批准。
- 元数据路由内部查询目录，模型只接收小批结果；.codeindex JSON本身不是需要全量装入的上下文。中英文概念和精确编号可缩小主题内候选，匹配仅是线索。
- 现有context:route继续用于工程源码/检查/反馈及已有精确ADR线索。本轮不修改其算法或预算。

AGENTS、CONTRIBUTING、领域文档与工程专题已接入新入口；没有重建独立文档总入口，没有新增审批或产品ADR。

## 保全与验证

baseline.json与before目录保留本轮11份现有文件的修改前字节/摘要；新增目录与工具在delivery.json列出。原有历史报告/已冻结来源保留原字节。本轮只修改索引、文档与必要治理工具，不变更产品源码、资料库、模型权重或原生资格，不提交/推送/发布。

| 验证 | 结果与证据 |
| --- | --- |
| ADR元数据路由 | adr-route-tests.log：8项通过，覆盖全493篇目录完整性、无范围不加载Core、类型不排除相关决定、未分类任务、默认上限/延后/输出预算、历史/Proposed与契约链接、坏路径/范围、中文精确主题 |
| 分类/状态/目录同步 | adr-check.log：493篇性质分类、实际标题/声明状态、主题覆盖和任务索引一致；canonical ADR引用保持 |
| 文档/既有迁移 | structure.json、migration.json：现行链接/锚点与1428个已迁出段落保全，冻结来源未改 |
| 原有context | context-check.json：现有源码/路由健康；不把新元数据候选当完整适用性判决 |
| 文档检查工具 | documentation-tests.log：既有7项治理行为检查通过 |
| CI配置 | ci-governance.log、ci-hygiene.log：相关本地检查通过；现有workflow接入新ADR检查/行为测试，未触发远端Actions |
| 实际入口示例 | navigation.json及四份route.json：设计/调研/运维/文档分别选到少量候选，输出约2KB；完整候选保留延后数 |

上下文选择是启发式导航，不宣称穷尽全部隐含依赖或已证明模型任务质量提升。跨主题边界与相邻引用仍按任务核对；不为凑数量自动添加无关Core，也不把历史/提案冒充现行确认。

同会话自审，检查了内容归属、任务类型与相关性的区别、状态/交付分离、只输出元数据、编号/原文稳定及分类漂移检查。没有运行应用/模型/UI或原生验收；不把本轮工具结果转记产品资格。
