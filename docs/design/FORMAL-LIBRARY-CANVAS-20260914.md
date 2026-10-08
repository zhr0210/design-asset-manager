# 新界面接入正式素材库：第一阶段交付

> 2026-09-15：本页保留历史实现/验收记录。新界面的布局、材料和交互以 [DESIGN.md](../../DESIGN.md)
> 与 ADR 0486 为准；旧模糊、固定尺寸和简化正式界面不是当前验收基准。


2026-09-14。本轮完成“全部 → 搜索/筛选 → 侧栏详情 → 专注查看”的正式接线。
正式入口是`/library`，不是127.0.0.1原型页面；Main、Preload和公共schema/IPC保持原契约。

## 接线结果

| 能力 | 正式行为与证据 |
| --- | --- |
| 素材库生命周期 | 复用ActiveLibraryControls创建、打开、关闭、重新打开及受控Copy。无法确认identity/generation时不伪装ready，清除UI上下文并提示重新检查 |
| 素材浏览 | 正式Asset Store数据，受控dam-preview协议预览；不加载原型样例、远程图或文件路径回退 |
| 搜索与筛选 | 复用projectAssetDiscovery和现有Main标签查询；名称/文件名/确认标签/别名/描述/OCR词法匹配，显示字段依据、清除筛选和无结果状态 |
| 加载与失败 | 初次加载、空库、筛选无结果、加载失败、刷新失败保留内容区分；已有store请求序列和切库epoch防止旧结果覆盖 |
| 侧栏详情 | 使用现有Inspector、标签和描述编辑、Visual AI与图片工具；侧栏占位，网格按剩余空间缩小。单击与双击分开处理，避免重排抢走第二次点击 |
| 专注查看 | 左侧受控预览、右侧只读信息、底部有序缩略带；硬切、缩放、平移和焦点恢复。1:1明确是预览像素，不冒充Original分辨率 |
| 原生卡片 | 既有单个原生卡片、窄Preload、草稿同步、描述保存及关库撤销保持；工作模式入口保留该能力 |
| 回收站与其他入口 | 复用现有Trash/restore与版本校验；保留导入、标签管理、Eagle连接库、旧库找回、模型/AI配置、下载、统计和设置入口 |

专注模式为本阶段只读查看，不把原型笔记写入localStorage冒充正式持久化。
普通文件夹、AI文件夹、色板、笔记和多工作集/多窗口管理仍按后续阶段推进；分类页只展示
既有标签引用并说明边界。真实模型质量、颜色/提示词索引与语义检索未因本轮接线自动完成。

## 真实数据授权及测试范围

按本轮指定Eagle库的授权，只读抽取PNG、JPG、WebP、TTF、PDF各一个文件，使用通用名称复制
到独立临时测试根。5个副本合计约7.73MB；测试库和应用profile均位于临时目录。
PNG/JPG/WebP完成正式导入与预览；TTF/PDF明确排除，另有合成TXT用于排除校验。
没有把Eagle库当作本软件Active Library写入，也没有迁移其文件夹、标签或数据库。

测试未截取/展示私有素材、未向外部模型发出请求。源文件及已核对的库metadata.json前后
SHA-256一致；私有样本清单保留于临时恢复点，不将源路径、名称、像素写入本报告或提交。
这证明限定样本下的真实文件链路，不等于整库迁移、所有格式支持或完整Eagle连接验收。

## 验证

- 新增Electron闭环分别以生成素材、授权副本运行9个环节：隔离profile/网络、Copy及格式排除、
  真实查询/标签、失败刷新保留并重试、侧栏、专注、关闭时拒绝旧预览、重新绑定与进程重启恢复。
  每轮3个实际Asset、0Renderer页面异常，原型存储键为空。
- 迁移并通过完整`test-active-library-electron-e2e`：包括原生卡片窄桥接/草稿、标签别名/层级、
  视觉HTTP确认（只用生成素材与loopback）、图片副本、下载/取消/续传/本地入库恢复和进程重启。
  最终SQLite为9素材、9活动、0Trash、3标签、2确认关系；v4与既有恢复证据保持。
- `test-asset-store-loading`、`test-asset-discovery-workflow`、`test-asset-library-keyboard`、
  `test-library-canvas-state`、标签workflow、typecheck/build通过；268条context路由评估通过。
- Context路由更新为正式LibraryCanvas/LibraryFocus及Active Library IPC；新增3个源码文件仅登记
  Git跟踪意向以纳入校验，没有暂存代码内容，原暂存patch保持不变。
- 删除一条与既有标签层级身份查找冲突的`tags.find`静态禁令，保留领域投影与功能测试。
- 核对Main/Preload/shared文件与本轮快照逐字节一致；正式Renderer bundle没有原型素材/笔记键。

注意：同一库重开时持久generation可保持不变，不能把“字符串变化”当作权限验证。
验证的是关闭状态拒绝预览、UI状态清除、当前持锁授权重新建立和旧窗口token被撤销。

## 运行与后续

- 正式工作区隔离验收：`npm run test-library-canvas-electron`。
- 打开正式界面的独立测试窗口：`npm run preview:library-canvas`。该命令使用真实Main/Preload和
  生成测试库，完成检查后保留窗口；关闭应用或终端Ctrl+C结束，不读取正常用户profile。
- 原型仍可用`npm run prototype:work-mode`，其浏览器地址不能作为正式库接线证据。

当前闭环完成。下一步按既定顺序处理笔记/色板正式持久化，再处理原生多工作集与AI增强检索。
这些后续写入需要具体数据模型和契约方案，不由本报告自动授权或启动。

正式界面生成素材截图：[侧栏](artifacts/formal-library-canvas-20260914/formal-library-side.png)、
[专注查看](artifacts/formal-library-canvas-20260914/formal-library-focus.png)。
截图只包含生成素材，不包含Eagle私有样本。当前已打开独立测试窗口供本地验收。
完整回归证据目录`dam-active-library-electron-e2e-8crfOK`；最新正式窗口检查目录
`dam-library-canvas-e2e-ugfLyB`（复核原件尺寸缺失时的如实提示）。私有样本报告仅保留脱敏统计。
