# Current Task

## 本轮已完成：统一入库恢复与持久下载空间管理（2026-09-13）

用户批准下一步：普通图片导入/图片工具副本的中断恢复，以及显式放弃持久下载、
释放其受管检查点。本轮已实现、同步说明并完成合成验证；整体软件重构未全部完成。

## 交付

- 资料库新增“入库恢复”，列出已接受但未完成的普通Copy和已记录图片副本。
  核验后再确认；原件尚未发布时，显式重选同名/同大小/同SHA源文件并冻结字节。
  不改写外部来源，不覆盖不匹配原件，不复活Trash，不重复Promotion。
- 首次确认图片副本保存时明确提示并升级v4，持久记录名称、输出SHA和处理参数。
  预览/放弃预览不升级；普通Copy恢复沿用原schema。新库仍v1，v1–v4精确打开、
  AI读写/OCR和下载日志同步兼容。空AI/下载结构不启用相应服务。
- 副本支持预览/Promotion/metadata中断恢复，不重跑图片工具；Capture字节必须
  与持久意图一致。恢复保护后来修改的名称/文件名、描述和标签。
- Capture、图片副本、下载入库与恢复在同一Host写入序列内持锁执行。确认绑定
  当前Binding和记录指纹，关闭/换库失效；一次核验一个项目，保留一份有界快照。
- 下载队列通过既有prepare/enqueue确认放弃任务并退役检查点。只释放已登记且
  SHA/身份匹配的文件；未知、冲突或无法释放的记录/文件保留并报告，可再次确认
  释放。已经接受且未完成Capture的任务拒绝放弃，须先恢复入库。
- 已放弃任务不能重新续传；已完成素材、原件和其他任务保持。取消释放确认不删。
  普通下载默认memory模式与256MiB持久恢复空间预算保持。
- 已完成入库后的受管暂存清理再次核验文件与目录身份，改变的暂存保持。

## 实际验证

- `test-intake-recovery`通过：Copy发布前/后、匹配重选与冻结源字节、预览/Promotion
  重试、陈旧receipt/Trash拒绝；v4事务回滚/新Host重开、意图不可改写、Capture与
  意图SHA一致性、metadata收尾及用户名称/文件名保留。PNG/JPEG/WebP来源SHA保持。
- `test-download-space-management`通过：准备不删、过期CAS、登记文件释放、冲突
  保留/再释放、禁止恢复已放弃任务、未完成Capture拒绝放弃；v3→v4检查点保留与重开。
- `test-intake-recovery-electron-e2e`通过：真实Main/Renderer两次重启，UI分别恢复
  普通Copy与图片副本；取消确认不写入，确认后补齐metadata。真实loopback下载保留
  1MiB检查点，取消释放保留，确认释放清除登记块；网络请求仍1次、素材仍2份、
  外部合成来源字节保持。证据根`dam-intake-electron-e2e-qGWwWU/evidence`，三种
  确认界面已目检（截图关闭入场动画）。
- 完整`test-active-library-electron-e2e`通过：v4副本意图与旧标签/Copy/Trash/AI/
  原件裁剪/下载恢复/真实应用重启保持；最终9素材/3标签/2确认关系，来源SHA不变。
  证据根`dam-active-library-electron-e2e-Ph9Ugw/evidence`。
- 图片工具、已有下载恢复、持久下载、HTTP续传、下载store、Active Library IPC、
  IPC注册、退出协调、权限基线回归通过；typecheck/build通过。
- IPC现为199 invoke/4 event；context:check 565/565、Router 268评估通过。
  相关diff、文档链接与原暂存patch逐字节检查通过；新增源码/测试仅intent-to-add，
  未暂存内容或提交。没有访问真实素材库/历史下载/模型/Runtime，未替换已安装应用。

## 当前边界与剩余

恢复入口当前支持不超过32MiB的PNG/JPEG/WebP；此前没有可信意图的历史图片副本、
损坏原件/预览、未知孤立文件、热SQLite日志和坏库修复不被猜测接管。
合成正常重启/故障注入不代表断电、真实用户库、Windows或打包验收。

后续主要缺口仍是本地模型安装/Runtime与语义检索、复杂标签维护、真实Eagle接入、
旧库迁移及平台/发布验收；历史队列不能自动扩大授权。真实数据、外发、来源修改
或新的公共兼容变化按具体目标和范围确认。

## 恢复入口

[本轮范围与实现说明](docs/product/INTAKE-RECOVERY-SPACE-MANAGEMENT-20260913.md)、
[此前完整任务记录](docs/history/task-before-unified-intake-recovery-20260913.md)、
[重构功能记录](docs/product/REFACTOR-FUNCTION-MAP-20260911.md)。历史记录的相对链接
以仓库根为基准。此前Astra审计、标签、裁剪及跨重启下载成果保持。
