# F 本地精确检查点

`F-ONLY.patch` 相对于 F 开始时快照，仅包含本轮差异；不是 HEAD 至当前
整个旧 WIP。`new-files/`仅保存本轮自有新增源码/测试/交付记录；
`MANIFEST.json`记录前后 SHA、原HEAD、原暂存SHA与候选身份。没有提交/推送。

应用产物与原始实际证据仍在 `.scratch/f-release-scale-20261008/`，不把
模型/账号/App DB/资料库打入检查点。准确结果与未完成项见
[F交付记录](../../handoff/RELEASE-SCALE-F-20261008.md)。

Browser/原生安装/macOS未成立时保持父级未完成。当前可恢复副本和工程
恢复不是原库/UI验收。最后状态及持续任务须按实际执行版本核对。
