# Current Task

## 已完成：精简配色说明、展开基础信息及修复裁切（2026-09-20）

按用户三张截图反馈实施。配色下HEX/百分比/提示文字移除，数值仍可悬停查看，复制/收藏操作不变。
来源/尺寸/大小/日期/标签/描述移到配色下默认展开，取消旧“编辑标签、描述与素材工具”折叠入口。
去除重复信息展示；工具操作仍保留，独立AI描述默认展开，专注模式基础信息同样可见。

AssetInspectorDrawer新增明确嵌入模式，不再用隐藏旧标题/预览的CSS结构选择器拼接；
去掉65vh内滚动与overflow裁切。TagInput候选菜单改主题portal，点击外部/位置更新适配，
候选菜单不被编辑器裁掉，修正旧深色蓝色/描边覆盖。未改IPC/schema或真实素材。

验证：13环节正式Electron流程（含菜单鼠标创建标签实际保存、明暗和无裁切），
键盘/焦点恢复检查、类型/构建/token检查通过。截图已检查，DESIGN.md和最近README已同步。
最终证据 dam-library-canvas-e2e-6DaYge，隔离预览session52614保持打开。原有用户窗口未强制刷新。
[截图与报告](docs/design/INSPECTOR-INFO-20260920.md)
恢复点 `/tmp/dam-inspector-info-state.json`；上轮记录 docs/history/task-before-inspector-info-20260920.md。
保留既有暂存和无关改动，未提交；本次请求完成，不自动推进下一模型。
