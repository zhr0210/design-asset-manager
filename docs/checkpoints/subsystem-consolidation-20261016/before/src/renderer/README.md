# 共享Renderer与输入生命周期

主工作台、全窗口设置与独立预览共享React/Client，不读SQLite/秘密或取得任意路径。main.tsx安装传输，AppShell持有workspace session，页面/Store负责输入与展示，不成为Host库代际。

Settings分类切换保留草稿，跨端required calibration成功前不恢复写入；旧响应/旧save不能替换新表单。AiConsolePage是历史薄导出，不把旧五秒polling当正式主入口。B窗AppKit呈现不属于此React树。

## 入口与协作

- [main.tsx](main.tsx)
- [App.tsx](App.tsx)
- [asset-workspace-session.internal.ts](asset-workspace-session.internal.ts)
- [routes/Library.tsx](routes/Library.tsx)
- [routes/Settings.tsx](routes/Settings.tsx)
- [components/library/canvas/README.md](components/library/canvas/README.md)

外壳、启动、路由、Client安装、状态投影与连接/草稿/退出协作见[GUI系统说明](../../docs/subsystems/gui-shell.md)；素材浏览/详情跨层关系见[asset-workspace](../../docs/subsystems/asset-workspace.md)，局部详细保证见[模块接口约束](../../docs/subsystems/contracts/renderer.md)。使用当前命名Client和正式组合核对消费者，不从目录或类型推定启用。

## 验证与维护

按相关模块测试和[真实验收](../../docs/agents/ui-ux-acceptance.md)区分内部接线、Browser、Desktop/native与真实模型。修改行为写清触发/前后结果，更新唯一拥有者。视觉只由[DESIGN](../../DESIGN.md)维护；当前资格只见CURRENT-STATE，历史原文见本轮before.zip，不在本页按日期追加结果。
