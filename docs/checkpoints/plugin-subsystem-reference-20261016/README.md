# 插件子系统文档与索引：2026-10-16

用户明确只建立子系统文档/索引，不实施插件MVP。新增plugin-system.md，描述目标职责、跨五系统边界、协议适配/隔离/包生命周期、失败保护、当前复用代码与未来验收；原讨论稿/详细契约/ADR不复制成第二套SDK。

baseline.json/before保全16路径原字节/不存在状态；criteria.json在正文和派发前确定判据。人读目录单列目标系统，机器planned_subsystems状态target-only与5个runtime topics/3个guides分开。AGENTS、架构、产品范围/目录、扩展索引和详细契约增加导航，不改原ADR决定或提炼条款。

结构检查新增负向保护：目标条目必须有target-only及可见“尚未交付”声明，不能计作当前运行系统；CLI同步消费者继续纳入目标文档，source-discovery保持最多3个相关入口。10个文档治理测试、268路由评估/10反馈测试及结构/上下文/ADR/显式同步检查通过，见[checks.json](checks.json)。

## 无阅读提示的独立探查

两个全新低思考上下文只收dispatch.json内简短自然任务、工作区、只读边界，无文件/检索/答案提示。主Agent检查实际工具返回及最终应用，三层标准在本轮范围通过，详见[evaluation.json](evaluation.json)、[probe-sessions.json](probe-sessions.json)和各trace.json（无隐藏推理）：

- [安装分析插件与复用工具](plugin_doc_entry.response.md)：找到新系统和0484/0154，区分公共契约、隔离运行时和MCP适配，识别现状缺口及旧讨论修订。
- [主Client与安装卸载边界](plugin_doc_boundary.response.md)：拒绝直接给完整Client，明确Host授权、提案提交、包/模型/Runtime分离及用户数据保留。

两项都有批量读取截断，关键规划状态、0484修订和边界在新正文/实际返回中可见，不能据此称全部细则逐条读完或完整SDK设计已验。具体运行与第三方隔离仍是未来实施资格。

[candidate-integrity.json](candidate-integrity.json)确认2639份固定文本与本地正文无漂移；TASK/证据排除可收尾更新。快照无Git/旧回答/历史来源，缺失追溯链接只限制来源覆盖；只读由指令/文件模式实现，不冒称OS沙箱。

本轮目标完成，只建立文档与索引及对应状态检查，不实现SDK、安装器、隔离或MCP，不启动应用/模型/服务、不执行第三方代码、操作资料库、提交或发布。真实插件闭环及互通/平台资格仍未验，不能据本页宣布可安装插件已可用。
