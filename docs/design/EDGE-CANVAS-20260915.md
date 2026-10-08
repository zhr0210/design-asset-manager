# 无顶栏画布、浮动导航与统一设计入口

2026-09-15，依据用户四张截图的最新反馈实施，替代此前固定上下文栏与搜索聚焦框。

## 修改

- macOS主窗口使用hidden标题栏，取消系统应用名横条；保留红黄绿与窗口管理能力。
  交通灯x16/y14；导航品牌避让，顶部透明12px区域和导航空白用于拖窗，按钮为no-drag。
  依据[Electron官方窗口说明](https://www.electronjs.org/docs/latest/tutorial/custom-title-bar)。
  Windows/Linux保留原系统框架，本轮未声称其他平台窗口定制完成。
- 删除全部素材/份数等顶部文字。前进、后退与右侧添加图片为36px圆形半透明玻璃。
  浮动控件不参与滚动区布局；素材滚动区域从窗口内容顶部开始，初始图片留白68px，滚动后
  图片可从按钮下方经过，直到窗口物理边缘。没有更改原图裁切或文件内容。
- 搜索聚焦只保留插入光标，移除focus-within阴影和input轮廓；其他控件键盘焦点保留。
- 添加图片直接复用现有文件选择、Copy计划和确认入库，通过Renderer内部ref连接；不增加IPC。
- 资料库管理的旧绿色已打开徽标改灰色；蓝色常规按钮/渐变/高光改为同套灰色玻璃。
  创建/导入确认弹层也使用同一材料。错误/警告保留语义色，材料透出的真实素材颜色仍保留。
- DESIGN.md合并原mobbin.md的YAML token，成为唯一活跃规范；mobbin.md只提供历史链接跳转。
  token生成器、原型启动器与视觉测试统一读取DESIGN.md。AGENTS、ADR0486和产品说明同步。

图4的异常来自旧ActiveLibraryControls/WorkspacePrimitives样式未完成适配，不是ADR要求。
图中大片橙/蓝来自玻璃后方图片，属于真实背景透色，与绿色就绪徽标不是同一原因。

## 验证与恢复

15组浏览器对照覆盖三个桌面宽度，另增加无顶部文字、圆形浮动按钮、搜索无聚焦框、
滚动区y=0、图片可滚到y<0的断言。旧基线保留在gallery-parity记录，新反馈基线另存。
正式Electron闭环验证macOS外框与内容框顶部一致，右侧添加图标完成实际选择/Copy入库，
常态徽标neutral、按钮无渐变；搜索、标签、刷新失败恢复、侧栏、专注、关闭与重启继续验证。
测试全部使用生成素材及隔离profile，没有访问真实素材库。

本轮Main仅调整窗口外观配置；没有修改Preload、共享协议、数据库schema或来源文件。
本机恢复点`/tmp/dam-edge-canvas-state.json`；合并前规范在
`docs/history/design-before-edge-canvas-20260915/`。新增源码只登记跟踪意向，未创建提交。

最终正式预览9环节、键盘回归、类型/构建、状态、token与context检查通过。
正式证据目录`dam-library-canvas-e2e-JUGR0I`；新窗口已打开供验收。
[中性灰资料库管理](artifacts/edge-canvas-20260915/neutral-library-manager.png)、
[正式侧栏](artifacts/edge-canvas-20260915/formal-side.png)。均为生成素材，不含真实素材库内容。
