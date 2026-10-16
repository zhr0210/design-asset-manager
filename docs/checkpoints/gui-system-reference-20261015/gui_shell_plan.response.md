建议从 [GUI系统说明](/var/folders/f4/shnswpzd58bg4kx8hv46y2zw0000gn/T/dam-gui-system-probe-20261015-rgtffrro/docs/subsystems/gui-shell.md)进入，按“导航 → 外壳生命周期 → 设置草稿 → Host窗口”定位，避免仅调整页面样式。

定位顺序：

1. `src/shared/workflows/app-navigation.workflow.ts` 与 `src/renderer/App.tsx`：设置分类、嵌套路由及旧地址别名。
2. `src/renderer/components/layout/AppShell.tsx:30`：设置全窗口标记、主页导航隐藏、覆盖层；第42行稳定 `/settings` 动画键必须核对，分类切换不能卸载草稿拥有者。
3. `src/renderer/routes/Settings.tsx`：分类导航、返回入口、设置搜索、嵌套 `Outlet`、路径表单及保存冲突。底部保存仅针对路径偏好，不能视为所有AI配置的统一保存。
4. 如涉及实际窗口行为，再看 `src/main/index.ts` 的 `createWindow`、Local Host生命周期及工作窗模块；默认Electron工作窗与macOS B候选分别评估，B不属于AppShell的React树。

验证计划（后续实施时执行，本轮未执行）：

- 静态/确定性：`typecheck`、`test-app-navigation-workflow`、`test-library-view-draft-lifetime`、`test-desktop-viewport-policy`；按影响追加设置读序/冲突、连接恢复、Host transitions与覆盖层检查，命令以 `package.json`及脚本为准。
- 用户路径：从可见入口进入设置，切分类、搜索、返回素材工作区，核对主页工具/搜索不叠加、未保存输入和焦点保留、资料库身份不变。
- 错误保护：跨端设置变化、保存失败、断连与校准、选择器取消、退出取消/失败仍保留输入；覆盖层恢复入口可操作。
- 视觉/原生：依据 `DESIGN.md`和现行交互规格检查宽度、主题、键盘、窗口拖动与关闭/退出差异；动画用连续帧，Desktop、Browser与B候选分列结果。

当前源码已实现全窗口设置与稳定设置生命周期；`CURRENT-STATE.md`中的旧候选资格仅作历史背景，不能证明本次调整通过。本轮仅在指定工作区读取文件，未修改、联网、运行应用/模型/服务或继续委派。
