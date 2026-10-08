# D 视频参考与交付检查点

本目录保存在既有工作源码上的精确D差异与证据，不是clean HEAD的完整源码提交。最终构建 dam-452db36be3f6a1ad / 775输入。

- [task.patch](task.patch)含88份任务差异，文本统一LF，只相对本轮或相邻接线修改前的实际字节快照；不混入先前WIP。
- [manifest](manifest.json)记录每份before/candidate SHA、编译资源身份、原index条目SHA、静态自审及范围。补丁已在独立before-only副本通过git apply --check，无写库/index或真实源码应用。
- [交付记录](../../handoff/WORK-MODE-D-20261008.md)给普通入口与各候选的真实结果。[同一产物重开](evidence/same-build-reopen-two-frames.png)显示两帧、实际时间与人工备注；[回读核对](evidence/verification-summary.json)证明旧源/330文件/211向量/7任务及保存重开保护，四类真实下载哈希保持。
- 源/视频与模型不进入本目录，64MB官方视频仍在指定scratch；已生成的Native资源仍在build/out，源和重建命令在模块README中。回读脚本包含本机测试路径，仅用于已指定公开副本。
- Windows/Browser范围成立，Native创作应用接收/拖拽/置顶/隐藏/多屏等延期，D父级未完成；不扩E–F。源码继续在工作区WIP，原暂存条目保持，没有commit/push。
