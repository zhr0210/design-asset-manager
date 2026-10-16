# 子系统归并：2026-10-16

用户确认按五个运行职责组织软件：GUI与窗口、应用Host与系统集成、资料库与素材、AI能力与执行、搜索与检索。开发治理、构建发行流程和未来范围移出软件清单。本轮只改文档/索引与必要导航检查工具，不改产品源码/架构权威、模型、依赖、资料库或发布状态。

baseline.json/before保存本轮前101个路径的原字节/不存在状态；criteria.json在实施前确定独立判据。paths.json只列实际变化的99个本任务路径，changes.diff相对本轮原字节，不把此前WIP算本任务。产品代码/Runtime/模型/资料库未动；仅开发导航检查工具因分类变化同步。

## 归位与保全

- 软件：GUI与窗口、应用Host与系统集成、资料库与素材、AI能力与执行、搜索与检索五个一级正文，各有场景/阶段入口与跨系统拥有者链接。AI六专题合一；设置/素材/原生呈现归GUI，配置迁移与文件交接归Host，库内容与工作集修订归Library。
- 辅助资料：工程协作归docs/agents/engineering.md，构建/签名/发行归docs/platform/BUILD-AND-RELEASE.md，未来/可选/退休范围归docs/product/CAPABILITY-SCOPE.md。它们在机器guides中分类，不在五系统topics中；不新增独立全仓文档总入口。
- [destination-map.json](destination-map.json)与[migration.json](migration.json)记录原19篇524个内容单元，506项保留原意/数字/例外/源码与测试入口，18项为标题/导航显式归并。源码列表与模板去重后保留可追溯去向，未决项0；[preservation-check.json](preservation-check.json)核对原锚点标题均可兼容。15个旧文件只保留兼容指引，不维护第二套正文；历史报告和原ADR不重写。
- 第一方模块README、ADR主题/规格当前入口直接指向新正文；DESIGN/INTERACTIONS/验收方法保持原职责，不因合并改变输入/平台/授权语义或产品资格。

## 工具与结构验证

文档元数据增加guides分类；检查器要求运行系统和指南分别出现在自己的索引，兼容壳不能冒充当前拥有者。同步检查仍追踪工程/交付脚本消费者；路由保留最多3篇及实际本地路径/文件/symlink保护，只允许现行四类文档目录，不扩大源码/命令执行信任。

[preflight-failures.json](preflight-failures.json)保留新测试对广义OCR/MCP任务错误假设的失败；后续按明确分析任务及已有source-discovery范围验证，不降低路由的歧义/无匹配保护。最终268任务路由评估、10反馈测试、9文档治理测试以及结构/链接/上下文/ADR/显式同步检查通过，见[checks.json](checks.json)。

## 无阅读提示的行为验收

五个全新低思考上下文只收到dispatch.json内自然短任务、工作区及只读边界；不传文件/查阅顺序/评分或前次答案。主Agent核对trace.json的实际可观察工具返回与最终应用，三层标准在本轮场景通过，见[evaluation.json](evaluation.json)及[probe-sessions.json](probe-sessions.json)：

- [AI请求到取消/保存](five_ai.response.md)：完整链与实际executor/Host/物理退出分别核对，未把占用直接定性泄漏。
- [设置、路径与工作窗](five_gui_data.response.md)：正确跨GUI/Host/Library定位，默认Electron与B边界保留。
- [工程与交付](five_engineering.response.md)：找到新指南，按现行工具/阶段分列；不把文档完成当安装/发行资格。
- [以图检索与描述](five_discovery.response.md)：索引/向量/查询与生成描述结果分开，任务组合不暗中扩授权。
- [MCP扩展目标](five_future.response.md)：从产品范围到0484/扩展细则，目标与现有公共能力分开。

关键新正文实际可见；两项末次宽输出有截断，MCP项猜过不存在的局部index.ts，均未据此错误结论。具体差异/未验范围保留，不宣称检索普遍最优。[candidate-integrity.json](candidate-integrity.json)确认2638份固定文本与本地一致，TASK/检查点排除可收尾更新。快照无Git/旧历史/评分，部分来源链接缺失只限制追溯，指令/文件模式只读不冒称OS沙箱。

本轮目标完成。没有真实UI/原生/模型/安装/发布验收、自动下载或资料库操作，未提交/推送/发布。
