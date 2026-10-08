# Current Task

## 进行中：软件重构与禁用功能恢复（2026-09-13）

用户明确要求继续软件重构与禁用功能恢复。整体尚未完成。

当前推进同会话下载断点续传与取消/重试状态一致性。保持既有IPC和schema，
只用合成图片、临时库与loopback HTTP验证；不自动恢复部分Capture或跨重启下载。

### 本次已完成：原分辨率副本与自由裁剪

- 已落实获批的source/cropRect扩展：旧请求缺省preview、最长边1600行为保留；
  显式original从当前库受管原件生成派生PNG，最长边8192，不放大、不覆盖来源。
- Main持锁原件读取核对ownership、素材版本、库内路径、文件/目录身份、入库
  SHA及32MB上限，拒绝符号链接/额外硬链接/非受管来源；没有原件读取Preload。
- EXIF方向归正、旋转、镜像后使用统一的归一化裁剪区域。界面支持真实参考图
  拖拽、百分比和方向键；参考图receipt丢弃，最终结果另行审阅后单次保存。
- 五分钟receipt绑定原件指纹，save重新核对；5000万像素预算与原件单并发，
  schema保持原样，原件/预览派生物分别记录来源、尺寸、版本及recipe。
- `test-image-tools-integration`通过：3200×2000原件、旧1600预览、区域实际颜色、
  旋转后镜像、EXIF、参数拒绝、源身份变化/符号链接/非受管拒绝、并发取消、
  单次保存、描述保护、派生记录和重开。
- macOS合成Electron完整E2E通过：原生卡片框选/数值/键盘、1600×1800原件
  派生副本保存；旧图片副本及标签/Copy/Trash/AI/下载流程和来源SHA保持。
  最终6个素材、3个标签、2个确认关系。证据根`dam-active-library-electron-e2e-DoBZnV`，
  裁剪界面与选择区域已目检。不是Windows、打包应用或真实用户库证据。
- 权限图检查曾发现控制器为复用常量而导入库读取Module；已将常量移到纯共享
  契约，控制器仍通过Host访问原件，未放宽guard。修正后权限/集成检查、
  typecheck与构建通过。IPC唯一注册保持196，context:check为553/553。
- 相关diff检查通过，原暂存patch逐字节保持；两个新增源码文件仅intent-to-add，
  未暂存内容或提交。[工具说明](src/main/image-tools/README.md)。
  没有外发、升级真实库或替换已安装应用。

### 前次已完成：标签恢复

- 恢复 `tag:create-alias`、`tag:remove-alias`、`tag:set-parent`，保持原 Preload
  调用形式、当前库独占写锁和原有 schema；集中禁用表从90减至87项。
- 标签名称/类别/颜色编辑、创建、别名增删、上级选择进入标签页；循环层级
  与不存在的父级拒绝，别名表/JSON和父级双表更新在事务内执行。
- 别名参与实际确认关系的素材词法搜索，提供“标签别名”命中依据，不变成
  第二个确认标签；父级仅组织标签，不自动给素材打标。
- 标签加载失败保留既有内容并显示重试；变更失败保留编辑草稿。
- 标签元数据提取为 Main 内部 Module，Host 保持持锁/生命周期职责。
  当前范围见 [标签模块](src/main/library-lifecycle/README.md)及
  [恢复进展](docs/product/REFACTOR-FUNCTION-MAP-20260911.md)。

### 标签恢复验证

- `test-active-library-tags`：生成图片/合成库、别名幂等、循环/缺失父级拒绝、
  别名事务故障回滚、可信发送方、持久化与重开，通过。
- `test-asset-discovery-workflow`、`test-asset-store-loading`：别名命中证据、
  原标签不变、刷新失败保留与重试，以及原有竞态/切库回归，通过。
- `test-active-library-ipc`、`test-app-ipc-registration`（196 invoke/4 event）、
  `test-asset-authority-baseline`、typecheck 与构建通过。
- `test-active-library-electron-e2e`：真实 Main/Preload/Renderer，新增标签页
  创建/别名/父级/重名错误/颜色/搜索流程；保留 Copy、Trash/Restore、跨窗口
  草稿、AI、图片副本、下载及来源SHA后置条件。数据库新增一个父标签，
  最终5个素材、3个标签、2个确认关系；别名及父级持久化断言通过。
  证据根 `dam-active-library-electron-e2e-kfOvFR`；标签表格和编辑浮层已目检。
- `context:check`（551/551源码归属）、相关 diff 检查通过。没有访问真实用户库、
  模型/Runtime或替换已安装应用；上述不是Windows/打包/真实推理质量验证。
- 原有暂存patch逐字节保持；新metadata文件仅intent-to-add，未暂存内容或提交。

### 下一步与依赖

- 标签合并/永久删除：不能恢复旧删除源标签的实现；需先实现ADR0179的稳定
  身份重定向和恢复/撤销方案。当前保持明确不可用。
- 下载中断恢复、更多格式与复用工具、模型安装和Runtime仍未完成；真实服务、
  模型质量、真实库和Windows/打包验收需要相应环境与具体数据/操作授权。

## 已有成果与恢复

[前次重构TASK原文](docs/history/task-before-astra-instruction-audit-20260912.md)、
[已完成的指令优化记录](docs/history/task-astra-instruction-audit-completed-20260912.md)。
档案内相对路径以仓库根为基准。指令优化已完成，未因本次开发回退；
已有三模式、视觉AI、直连下载、图片预览副本及验证证据继续保留。
