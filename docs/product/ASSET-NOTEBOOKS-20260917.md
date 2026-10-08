# 图片笔记正式保存与恢复

2026-09-17。本轮完成计划第1项：将既有专注画布的多页、画笔/形状/文字/便签接入正式素材库。
沿用批准界面，存储由Main持有的Active Library连接负责，不修改图片字节。

## 数据与接口

共享契约`asset-notebook.contract.ts`定义NotebookScope、AssetNotebook、Snapshot和SaveRequest。
每份笔记包含pages与active页；每页有id/name/elements。坐标是0–1000的相对预览坐标。
Main对形状、范围、颜色、文本、重复id、未知字段、页数/元素数/点数和总载荷做校验，
不能通过输入路径、库外id或前端声称的保存状态取得写权限。

新增窄接口`library-notebook:read`、`library-notebook:save`通过可信主窗口sender校验；Preload
只提供对应方法。读取按素材id，不扫描整库。保存按库身份、generation、绑定会话token、
sourceRef、expectedRevision检查，同一事务内更新版本与内容。新会话重新生成token。

v5的asset_notebooks表位于现有控制目录SQLite。首次保存明确说明“旧版应用无法打开v5”，
只有确认后才创建表和写入；取消及普通读取不升级。v1–v4原有结构按既有升级函数保留，
v5的AI证据、下载、变体恢复、素材查询和精确schema校验均同步支持，不降级版本。

## 用户流程与失败

- 专注打开后读取当前图片笔记。读取失败显示重试，不能用空对象覆盖已保存笔记。
- 保存只提交当前图片的笔记；其他图片草稿留在当前库会话。切换图片、关闭专注再打开保留草稿。
- 保存期间新增编辑保持未保存标记；未提交文字/正在绘制会阻止切图/整体保存。
- 保存失败保持内容，允许重试；版本冲突提供“保留草稿并载入最新笔记”，以新页id保留
  变更页，再由用户核对保存。预览版本冲突不自动合并到新图片。
- 已保存页重开资料库、应用重启后恢复。进入回收站保留笔记，恢复后继续使用。
- 跨页面导航保留当前库会话草稿。关闭/切换库前有未保存提示；应用退出/重载有未保存拦截，
  选择继续编辑不丢内容，明确放弃才能离开。崩溃时未保存内存草稿不保证恢复。

当前注释针对静态受控预览；1:1是预览像素。不声称视频逐帧标注、永久删除、导出或搜索索引已完成。

## 验证范围

全部验证使用独立合成库，不读取或迁移用户Eagle库，不外发素材。

- 主进程：升级确认、取消无写入、v5关库重开/新host重启、库隔离、旧会话拒绝、重复版本冲突、
  预览不匹配、malformed与未知字段、回收站保存拒绝/恢复保留、SQLite失败回滚、可信IPC。
- 会话：读取合并去重、保存期间新编辑仍dirty、失败重试、失效响应不回填、冲突草稿与远端结果共存。
- Electron：实际图形创建、首次升级取消/确认、失败保留草稿后重试、关库重开及完整进程重启恢复。
- 图像来源哈希前后不变。读接口不会写库；没有把localStorage保存当成正式存储。

最终执行结果和证据由TASK记录。实现入口：`src/main/library-lifecycle/asset-notebook.ts`、
`src/renderer/components/library/canvas/notebook-session.ts`及共享FocusView。

## 本轮结果

上述Main/会话测试通过；正式Electron12环节通过（`dam-library-canvas-e2e-2kWUJQ`），
v5完整既有应用回归通过（`dam-active-library-electron-e2e-9zFsn7`），涵盖AI证据、
下载/图片变体、恢复和进程重启。15组视觉对照、10组原型笔记交互、真实Library键盘、
类型/构建、token/context检查通过。没有读取真实Eagle库或调用真实外部AI。

[正式保存后的笔记画布](../design/artifacts/asset-notebooks-20260917/notebook-saved.png)仅含合成设计。
不宣称未保存草稿可跨进程恢复；崩溃或明确放弃时，只有已提交到库的笔记保证持久化。
