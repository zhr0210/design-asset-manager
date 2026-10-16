# 按任务类型选择ADR阅读关注面

任何项目任务均适用ADR；下面分类不是准入白名单，也不决定某项ADR对其他任务无效。先选最接近的任务类型，再选主题/影响范围，查少量候选摘要，最后读选中的原文。新类型用general，或直接按主题检索。

| 类型id | 任务 | 阅读重点 |
| --- | --- | --- |
| `research` | 调研/方案比较 | 比较既有选择、理由与被排除方案；源码事实另核对 |
| `planning` | 规划/优先级 | 先核对核心/可选/未来边界与依赖，目标不等于队列 |
| `requirements` | 需求/产品讨论 | 核对用户契约、边界、非目标及人工/数据保护 |
| `design` | 交互/视觉设计 | 核对行为与呈现取舍，视觉具体正文仍归DESIGN |
| `implementation` | 实现/重构 | 保持相关决定及消费者/数据保证，允许替换实现手段 |
| `diagnosis` | 排障/性能分析 | 核对有意行为、失败/恢复/资源取舍，避免误修设计 |
| `verification` | 测试/验收 | 核对承诺、边界与证据要求，Accepted不等于交付 |
| `documentation` | 文档/术语整理 | 定位唯一正文/决定来源与准确替代范围，不把规格搬成新决定 |
| `operations` | 运行/数据维护 | 核对原件、锁、迁移/恢复、权限和不确定状态 |
| `delivery` | 构建/安装/发布 | 核对平台/资源闭包、兼容与交付边界，发布范围另明确 |
| `decision` | 新建/重开取舍 | 核对相关现有决定和改变前提，再判断新建/替代条件 |
| `general` | 其他或未分类任务 | 仍按主题/影响范围筛选；类型仅改变关注优先级，不排除相关决定 |

## 使用

```sh
node scripts/adr-context.mjs route --kind design --topic work-mode --task "悬浮窗的原生交互与数据权限" --json
node scripts/adr-context.mjs route --kind research --topic retrieval --task "语义检索的模型空间" --json
node scripts/adr-context.mjs route --kind operations --topic library-storage --task "资料库恢复与锁" --json
```

机器目录.codeindex/adr-index.json由工具查询，不把整份JSON作为AI启动上下文。

默认最多3条候选，只输出元数据和详细契约引用，不输出ADR正文；更多候选显示数量与所属目录，按需增加limit（最多8）或缩小主题。不提供主题/有效查询时要求补范围，不回退到全量Core。分类/状态仍保留在每条候选上；历史默认不选，追溯原因可显式include-history。

类型只调整关注优先级，不过滤同主题的其他有效决定；不把类型匹配或关键词结果当完整适用性判决。涉及跨主题数据/权限/兼容时跟踪相邻主题与原文引用。原有context:route仍提供工程源码/验证及精确ADR线索。
