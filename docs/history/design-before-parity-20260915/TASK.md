# Current Task

## 已完成：新界面接入正式素材库闭环（2026-09-14）

用户要求按顺序完成第一项：全部→搜索/筛选→侧栏详情→专注查看的正式接线。
已授权指定Eagle库只读抽样及隔离副本测试，原库写入/迁移和云端素材外发不在范围内。

## 结果

- 正式`/library`现使用LibraryCanvas、LibraryFocus、LibraryMedia及现有Asset/Tag Store、
  Active Library Controls与projectAssetDiscovery。受控预览、名称/标签/描述/OCR词法检索、
  侧栏、专注硬切/画廊/缩放/平移和焦点恢复已接线，不导入原型fixtures或localStorage笔记。
- 保留创建/Copy/恢复、标签编辑与批量操作、原生卡片和会话草稿、Visual AI、图片工具、
  下载、Eagle连接、旧库找回、模型/AI设置与统计入口。Main/Preload/shared契约和schema未改变。
- 无法确认库identity/generation时不伪装ready；关闭/切换前清除UI权限与旧请求状态。
  同一库generation可以在重新打开后保持，关闭拒绝预览与当前持锁绑定才是实际权限证据。
- [交付范围与截图](docs/design/FORMAL-LIBRARY-CANVAS-20260914.md)及模块说明、context路由已同步。

## 验证

- 新增9项Electron闭环分别以生成素材和授权副本通过：正式profile隔离、Copy及排除、查询、
  标签、失败刷新保留、侧栏、专注、关闭/重新打开与进程重启；每轮3素材，0Renderer页面异常。
- 抽取5个Eagle文件副本，PNG/JPG/WebP通过；TTF/PDF按当前能力明确排除。原件及已核对库
  metadata.json哈希一致；私有素材不截图、不上传、不写入报告，源路径仅在私有临时清单。
- 完整Active Library Electron回归通过，含原生卡片、草稿、标签层级/别名、合成loopback AI、
  图片副本、下载及恢复；SQLite最终9素材/3标签/2确认关系，v4与源文件完整性成立。
- 类型/构建、Asset Store并发/失效、词法搜索、真实Library键盘、Canvas状态投影、标签workflow、
  context:check及268条路由评估通过。同步旧UI测试定位，修复双击与回焦问题；移除已有标签层级
  查找不应触发的tags.find静态禁令，功能检查保留。
- 新增3个源码文件仅登记Git跟踪意向以纳入context校验，未暂存代码内容；原暂存patch保持。
  Main/Preload/shared与开始快照逐字节相同。未提交或启动真实模型。

## 本地验收与后续

`npm run preview:library-canvas`使用正式应用入口与独立生成测试库，检查后保持窗口打开。
当前已有该测试窗口；关闭应用或对应终端Ctrl+C结束，不涉及正常用户profile。
`127.0.0.1:5173`仍是隔离交互原型，不要把它当作正式库版本。

下一项为笔记/色板正式持久化，之后是原生多工作集及AI增强检索；本轮未自动实施这些任务。
字体/PDF/DWG、真实模型质量、完整Eagle连接或整库迁移没有获得新的交付证据。

## 恢复

本轮源码、原暂存及工作差异备份由`/tmp/dam-library-ui-integration-state.json`定位。
[此前任务](docs/history/task-before-library-canvas-integration-20260914.md)保留原型与授权记录。
私有样本清单只存临时恢复点，源库仍保持只读测试边界。
