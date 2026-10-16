# 当前任务：相关ADR读取时机归位

2026-10-15用户进一步明确：ADR读取适用于所有项目任务，按主题与影响范围判断，不按“开发/排障/重构/测试/审查”等枚举限定。已将该原则放在AGENTS任务表之前，并同步开发指南/规范、领域文档、ADR协议和子系统指引。术语查询、文档方法与新建ADR条件继续分开；无关任务不机械加载全文，不新增逐次审批。

检查与本次身份见[全任务范围修订](docs/checkpoints/adr-reading-scope-20261015/all-task-scope/README.md)，前次[读取时机记录](docs/checkpoints/adr-reading-scope-20261015/README.md)保留原范围。本轮仅改指引，未改变路由算法、产品决定或运行资格；完成后停止。

## 前项：开发入口职责归位

2026-10-15用户采纳取消独立文档总入口的方向。已将任务读取/写回统一到AGENTS，维护方法归CONTRIBUTING，删除docs/README.md并修正现行入链及检查清单。根README恢复产品介绍、运行和必要开发链接；子系统目录继续导航详细功能/机制。结果与验证见[本轮检查点](docs/checkpoints/direct-agent-navigation-20261015/README.md)。

本轮仅调整文档/检查入口，不改变子系统契约、模型/原生资格或产品代码，未推送/发布。前轮完整重建与有效要求来源保留如下。

## 前项：文档体系与索引全面重整

2026-10-15用户明确“开始实施方案”。按[全面方案](docs/research/magpie-agent-engineering-20261014/AGENTS-REVISION-PROPOSAL.md)整理根入口、当前功能/子系统正文、目标规格/ADR细节、领域词库、设计/交互/验收、规范/经验、历史与人工/机器索引。

用户确认尚未实现的详细规格一起提炼，保留所有有效要求、例外与来源，不把目标加入产品实施队列。四项常驻约定与任务导航、三日期候选/严重问题立即处理、现有模型/真实Worker及受影响UI根因证明均在范围内。

本轮已完成：根导航/开发规范、18个子系统正文、20份详细能力规格、决策/术语与来源归位，机器路由、三日期候选及文档/CI检查接线。进展、源身份、映射和实际验证统一见[重建检查点](docs/checkpoints/documentation-rebuild-20261015/README.md)。本轮停止点：相关治理/导航与逐段保全验证已成立，后续从AGENTS按具体任务直接进入所属正文；P001–P003仍待复现，不自动处理产品长尾。

## 范围边界

仅改文档、索引及必要治理工具。产品源码、运行资源、模型权重、资料库及其他WIP保留；不切换B默认入口、不补新UI/模型资格、不推送/发布。

前项本地反馈闭环已完成，证据见[反馈检查点](docs/checkpoints/development-feedback-20261015/README.md)；设置整合/素材下载退休见[设置报告](docs/checkpoints/settings-integration-20261014/README.md)，其他历史任务和全部旧TASK原字节见本轮before.zip，实际能力仍以[CURRENT-STATE](docs/handoff/CURRENT-STATE.md)为准。
