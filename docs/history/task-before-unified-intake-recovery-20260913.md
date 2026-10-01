# Current Task

## 本轮已完成：获批的跨重启下载恢复（2026-09-13）

用户已批准[具体方案](docs/product/DOWNLOAD-RESTART-RECOVERY-PLAN-20260913.md)中的
v3 schema、prepare/jobs兼容扩展和合成验证。该范围已实现并验收；整体软件重构
尚未全部完成，历史阶段不能自动新增任务或授权。

## 交付

- 下载页新增“在当前库保留恢复检查点”。默认仍为memory；准备/取消确认不升级，
  确认持久下载才在同一事务创建意图并升级v1/v2→v3，明确提示旧版应用不兼容。
- 持锁Active Library Control DB保存不可改写的URI、名称、库与创建generation；
  Main-only日志串行处理检查点、读取和恢复。App历史仍不拥有恢复权限。
- 网络小块合并为不超过1MiB的不可变文件，fsync后CAS发布revision/epoch/offset。
  未发布文件保留且不计进度；唯一后缀允许安全重传该尾部。配额256MiB，不驱逐
  已承诺的恢复数据；只清理日志引用且受检匹配的退役块。
- 打开库发现未完成任务但不联网；新review重新核验检查点并绑定当前控制会话和
  revision。强ETag/identity才续传，版本变化切换epoch，旧字节不混入新结果。
- 完整下载先提交SHA再进入Capture；跨进程本地恢复读取可信来源/名称，补齐首次
  入库或既有部分Capture。不覆盖原件、用户编辑或冲突文件，不复活Trash；素材
  已存在但Capture记录缺失时拒绝恢复。
- 历史下载地址不再充当缩略图来源，避免打开队列就发起未确认图片请求或显示坏图。
- IPC等待异步结果，Preload仍为Promise；关闭/切库/退出先停止接收并收敛已开始
  的检查点/入库链，再释放lease。取消显式终止响应体读取，避免等待下一网络块。
- 精确schema/open/reopen及AI enable/read/write/OCR投影兼容已知v1/v2/v3；
  v3含AI证据结构不等于启用AI或允许外发。未知schema/热日志/坏库拒绝保持。

## 实际验证

- `test-persistent-download`通过：真实v1/v2 schema事务回滚；两次独立进程的
  精确Range续传、版本切换、完整下载/部分Capture本地恢复、过期review拒绝、
  任意历史id拒绝、v3 AI读写/OCR及用户描述保护。覆盖CAS、未发布尾部、哈希/
  链接/配额/轮次清理、目标冲突、缺失Capture与Trash拒绝。
- `test-persistent-download-electron-e2e`通过：真实应用退出并启动新Main/Renderer，
  发现1024KiB检查点，取消review不联网；确认后只发第二次HTTP，请求
  `Range: bytes=1048576-`及匹配If-Range，完成一次入库。最终4份合成素材。
  证据：`dam-persistent-download-electron-e2e-DbYXGw/evidence`。
- 完整`test-active-library-electron-e2e`通过：升级v3、保留AI/标签/Copy/Trash/裁剪/
  同会话续传及恢复行为，再验证真实应用重启后的确认、Range续传与入库。
  最终9素材/9 active/0 Trash/3标签/2确认关系，1条AI证据、2条完成持久意图；
  三份外部合成来源SHA保持。证据：`dam-active-library-electron-e2e-avk2tj/evidence`。
  升级提示和重启恢复确认截图已目检；截图关闭入场动画。
- 修正Electron测试中异步`waitForFunction`被Promise提前满足的问题；现在明确
  等待IPC条件为真，不能用提前返回证明检查点或入库完成。
- `test-managed-download-resume`、`test-download-store-integrity`、
  `test-owned-download-recovery`、`test-visual-ai-download-integration`、
  `test-active-library-session`、`test-library-open-inspection`、`test-active-library-ipc`、
  `test-app-ipc-registration`、`test-active-library-shutdown`均通过。
- typecheck、构建、权限基线、context:check（560/560）与Router 268评估通过。
  IPC仍为196 invoke/4 event；相关diff与文档链接检查通过。
- 原暂存patch逐字节保持；新增源码/测试仅intent-to-add，未暂存内容或提交。

## 边界与剩余

本次只使用临时合成库、生成图片及loopback服务。未读取/迁移真实素材库、旧下载、
模型/Runtime或私有来源；未替换已安装应用。正常重启和故障注入不是断电、热SQLite
日志自动修复、真实用户库、Windows或打包验收。

任意历史Capture、图片副本Capture恢复、损坏库修复仍未交付。标签合并/永久删除
仍受ADR0179身份重定向与恢复/撤销要求约束；模型安装/Runtime及真实模型质量等
更大重构范围仍待推进。真实数据、外发与新增公共兼容变化按具体范围获得授权。

## 恢复与来源

[此前任务记录](docs/history/task-before-persistent-download-20260913.md)保留审批时
状态和同会话交付；[模块说明](src/main/managed-download/README.md)、
[重构功能记录](docs/product/REFACTOR-FUNCTION-MAP-20260911.md)。历史记录相对路径
以仓库根为基准。此前Astra指令审计、标签、原分辨率裁剪等成果保持。
