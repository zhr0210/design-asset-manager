# 统一入库恢复与下载空间管理

2026-09-13，用户批准实施。当前代码已接线并通过合成验收；具体结果见TASK。
范围是当前Active Library已接受的图片导入、已记录的新图片副本，以及持久下载
检查点。不是任意旧库、坏库修复、原件永久删除或真实数据迁移授权。

## 用户流程

- 资料库“入库恢复”列出未Promotion的普通Copy以及待收尾图片副本。列出记录不
  读外部源、不自动恢复。核验后显示名称/字节数，用户再确认继续。
- 普通Copy优先读取由Capture身份决定的已发布原件；尚未发布时，用户显式重新
  选择一个同名、同大小、同SHA文件。选择后冻结核验字节；确认只复制该快照，
  不改写外部源。当前入口支持PNG/JPEG/WebP、单文件不超过32MiB。
- 图片副本保留首次确认的名称、输出SHA、来源身份与处理参数。恢复使用已保存的
  输出，不重新执行图片变换，也不把预览冒充原件。恢复入口同时处理metadata收尾。
- 原件/预览冲突、哈希或身份不匹配、Trash、已完成项目、陈旧review均拒绝；
  不用覆盖或重建记录掩盖问题。仍需保存的用户名称、描述和标签不会被恢复覆盖。

## v4持久意图与兼容

首次确认保存图片副本，在受管文件写入并核验后，于held Control DB事务中增加
`image_variant_intents`和不可变字段触发器，并升级v4。预览/放弃预览不升级；
普通Copy恢复沿用原Capture记录，不升级。保存按钮前明确提示旧版应用不兼容。

v4包含既有v2视觉证据和v3下载结构；创建空结构不启用AI、网络或下载。
新库仍v1。精确schema、打开/重开、AI读写/OCR、下载日志同步接受已知v1–v4，
未知版本及原有热SQLite日志/损坏库拒绝继续保持。文件已写入但意图尚未提交的
未知文件不猜测认领、不自动删除；这不构成断电恢复或文件系统修复保证。

普通导入、下载入库、副本保存和显式恢复经同一Host写入序列持锁执行。确认绑定
具体Binding、记录指纹和5分钟receipt，关闭/换库失效。一次只核验一个项目，
最多保留一份32MiB待确认快照。重启后重新准备确认，不复用历史receipt。

## 放弃下载与空间释放

使用既有prepare/enqueue通道扩展`{abandonTaskId}`，显示登记检查点字节数与影响。
准备/取消确认不删除。确认后以revision CAS将未完成下载标记ABANDONED并退役
当前轮次，再尝试释放日志引用且哈希/身份匹配的块。任务不能重新续传；完成素材
保持原状。已受理且未完成的Capture拒绝放弃，须先恢复入库再用Trash管理素材。

未知文件不删除，冲突/缺失/链接或无法释放的登记文件保留引用与报告，用户可再次
“检查并释放保留数据”。只释放完成的匹配检查点，不声称整个目录已清空。
保留256MiB恢复目录预算，不自动驱逐其他任务。App历史不参与写入或恢复授权。

## 实现和验证入口

- [Host恢复实现](../../src/main/library-lifecycle/intake-recovery.ts)
- [副本持久意图](../../src/main/library-lifecycle/image-variant-intents.ts)
- [v4结构](../../src/main/library-lifecycle/intake-recovery.schema.ts)
- [下载释放实现](../../src/main/managed-download/download-journal.ts)
- `test-intake-recovery`：Copy发布/选择、预览/Promotion、metadata与用户编辑、
  v4回滚/重开、Capture与意图SHA一致性、过期receipt/Trash。
- `test-download-space-management`：准备不删、过期CAS、受检释放、冲突保留/再次
  释放、已有Capture拒绝放弃、v3→v4检查点保留和重开。
- `test-intake-recovery-electron-e2e`：生成素材/loopback，真实应用两次重启后分别
  经UI恢复Copy和副本，取消与确认释放检查点，素材数量和外部来源不变。

真实用户库、Windows、打包版本、超过32MiB的恢复、未记录意图的历史副本及损坏
文件/控制库的修复尚未验证或交付。已有下载恢复及其他能力见最近模块说明。
