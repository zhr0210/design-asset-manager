# 统一交互正文与视觉/交互验收：2026-10-15

用户确认统一交互正文及场景索引；DESIGN维护设计标准，INTERACTIONS维护动作/状态/平台差异，比对方法及放行条件唯一归ui-ux-acceptance，报告存实测。

baseline.json及before保全17个路径本轮前字节/新文件不存在状态；migration.json记录原三规格71个块的逐段保全与旧锚点去向。原文只调整标题级别和内部链接目标，不删除数值、例外、未确认项或来源；旧文件为兼容章节导航，历史证据不改写。

criteria.json在实施前确定独立判据；[preservation-check.json](preservation-check.json)核对71块语义保全、旧标题兼容、DESIGN的YAML及Overview起视觉正文不变。旧文件只有导航，不保留第二套可改正文；当前AGENTS、GUI/设置、产品/原生入口和机器active_contracts直达统一正文，历史入链继续经旧锚点兼容。

## 验收方法变化

真实验收流程新增“视觉与交互分别验收”：组件增删改及后端可见反馈均评受影响范围；先固定适用条款/批准参考及可比条件，再实际看图/操作；删除后检查剩余布局、焦点/导航/替代路径；动画需过程/中断证据；失败/取消/保存重开分别核对。无批准图可按明确设计要求验有依据范围，当前截图不能自封基准；必需未验不通过，修复保留原失败和新候选复验。规格只定义预期，方法唯一归验收流程，实际结果归报告。

## 独立行为探查

四个全新低思考上下文只收简短任务/工作区/只读边界；原文见dispatch.json和dispatch-surfaces.json，不传文件/检索提示或评分答案。主Agent按实际可观察轨迹/正文与最终应用逐层核对，本次场景通过，见[evaluation.json](evaluation.json)、[会话身份](probe-sessions.json)及各trace.json（无隐藏思维）：

- [删除组件](interaction_component.response.md)：视觉/交互/恢复分列，检查剩余布局、焦点、替代入口及保存。
- [B停靠动画](interaction_motion.response.md)：拒绝以终点截图/浏览器测试代替原生过程、中断与实际设备。
- [没有批准参考图](interaction_reference.response.md)：拒绝自封baseline，但不冻结已有明确条款可验范围。
- [主库/工作集预览统一](interaction_surfaces.response.md)：从统一正文及源码识别Space/切图/保存差异，明确统一须重新决定行为。

宽搜索部分截断、第四项有猜路径；关键原文随后定向读取可见。没有实际UI/动画执行或性能观察，不能称产品验收。只验证本候选这些场景，不保证所有未来任务质量；所有尝试保留，没有为了展示闭环而人为造错。

[candidate-integrity.json](candidate-integrity.json)确认2634份候选与本地正文一致，TASK/本任务证据排除可收尾更新。结构/引用、上下文/ADR索引、显式路径同步及268路由任务+10反馈回归实际通过，见[checks.json](checks.json)；changes.diff仅相对本轮前字节，不含其他WIP。本轮目标完成，只改文档/索引，不改产品/token或操作资料库，不提交/推送/发布。
