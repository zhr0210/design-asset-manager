# DAM Pi 统一模型接入交接

请先读 FINAL-HANDOFF.json → REPORT.md → REVIEW-FINAL.md → EVIDENCE-MAP.json。

此包是限定Pi接入的源码与证据交接，包含现有WIP的相关调用方；不是完整Git仓库、干净提交或可安装发行程序。真实模型/API/订阅账号按用户选择延期。

- source-snapshot/：674份当前源码/契约/调用方与测试入口；逐文件SHA见SOURCE-MANIFEST.json。
- before/、DELTA.json、CHANGES.patch：本轮28个既有文件修改＋29个新增文件。对接收工作区先核对before SHA；没有自动覆盖程序。
- PATCH-VERIFICATION.json：57项补丁在独立临时目录重建后after SHA一致。
- logs/：包括早期红灯及最终采用日志，不能仅取最后一次成功冒充全程无失败。
- screenshots/：界面证据；正式链路断言单独见Electron测试日志。
- pi-runtime/源码位于source-snapshot中。依赖、Node、模型权重、实际凭据/设置/库不在包内。重新准备需工程师明确授权，详见对应README。

WORKSPACE-PROTECTION记录原staged内容摘要保持，但index二进制摘要不同且无法归因。没有git暂存/提交/推送/恢复操作。

STOP，nextBatchAuthorized=false；原计划和旧任务记录不能新增真实账号/模型/素材权限。
