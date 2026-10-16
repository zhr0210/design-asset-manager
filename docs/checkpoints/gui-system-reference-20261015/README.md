# GUI系统说明与设计规范分工：2026-10-15

用户要求增加跨层界面系统文件，并保持DESIGN只维护设计规范。本轮新增docs/subsystems/gui-shell.md，按当前源码写职责/来源、启动/Client安装、路由/会话、断连校准/未知提交、设置/草稿/退出、平台/原生窗口及验证入口。

DESIGN只新增分工链接，不改YAML token、视觉值或已批准设计要求；功能行为继续归已有交互/产品规格，当前资格与历史证据各归原处。没有把Magpie的Wails、无框架前端或产品交互复制进DAM。

baseline.json/before保全14个路径本轮前状态，含新文件不存在记录；criteria.json先于正文确定判据。人读入口与机器文档map/四条既有任务路由已接线，GUI成为第19个专题，仍为20条任务路由，不造新路由/平台。

## 结构与保全

[design-integrity.json](design-integrity.json)确认DESIGN YAML及从Overview起的全部设计正文逐字节不变，只新增职责/入口段。原行为规格、模块README与报告均不改写；新文件从Main/main.tsx/App/AppShell、BrowserTransport、会话、Settings、草稿/transition以及原生工厂的当前源码建立说明，场景内给拥有者与验证入口。

首次索引检查发现desktop-shell直接文档4条超过既有上限3，错误及修正保存在[preflight-failure.json](preflight-failure.json)。代理派发前收敛为GUI/Host/WorkMode三条，设置仍从GUI/独立settings路由可达；不扩大预算或改schema掩盖问题。修正后路由检查及268任务评估、附带10个反馈回归通过；最终结构/同步/锚点检查见[checks.json](checks.json)。changes.diff只相对本轮基线，不包含其他WIP。

## 行为验收

三个全新低思考上下文只收到dispatch.json中的短任务/工作区/只读边界，无文件/检索提示。主Agent查实际工具返回及最终应用，三层判据在本轮范围通过，见[evaluation.json](evaluation.json)、[probe-sessions.json](probe-sessions.json)与各trace.json（无隐藏思维）：

- [设置导航与外壳](gui_shell_plan.response.md)：自主从GUI说明追到实际生命周期/草稿/窗口源码，明确技术/行为/视觉归属。
- [重连后保存](gui_reconnect.response.md)：正确消费快照/校准屏障、expected基准和UNKNOWN不重放，并把潜在按钮体验问题限定为待实际验证观察。
- [全部窗口React化](gui_native_boundary.response.md)：区分默认Electron、B AppKit和React大预览，跟到0493/0489与源码；允许重开取舍但不擅自下放Host权威。

前两项关键读取完整可见；原生探查最后宽源码输出有截断，必要正文/决定/机制此前已读到，不伪称所有代码全读。[candidate-integrity.json](candidate-integrity.json)确认2633份候选与本地正文无漂移，TASK/证据排除可收尾更新。候选不含Git、历史/研究/旧回答，部分来源链接缺失限制追溯；只读由指令/文件模式实现，不冒称OS沙箱。

本轮目标完成。只改文档与索引，未运行产品/UI/模型或安装，未操作资料库、提交、推送或发布；不将机制描述与计划通过称作真实产品/原生资格。
