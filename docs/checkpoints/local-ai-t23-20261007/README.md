# T23 浏览器验证检查点

保存本轮取消接线/终态、页外工作集查找与文件夹顶栏修复的精确差异。实际工作产物为 dam-4deb9e68a5e80a0a；源码仍在原 WIP 工作区，不是 clean HEAD 完整源码提交。

- [task.patch](task.patch)按 T23 修改前快照生成，统一 LF；查询 Hook 的 a97d 基线从既有检查点精确恢复并逐 SHA 验证。
- [manifest](manifest.json)列举基线/候选 SHA、索引 SHA 与范围；7 个产品源文件和本轮诊断/回归文件单列，不整文件提交旧 WIP。
- `git apply --check --no-index` 已在工作区内仅含 before 文件的独立副本通过；没有应用到真实源码或 Git index。
- 生成前后 `.git/index` 与暂存 entries 字节一致。本轮没有提交、推送或发布。
- [实际浏览器交付](../../handoff/LOCAL-AI-T23-BROWSER-20261007.md)列明当前功能、证据版本、保护与损坏副本已有 AI 变更、原页工具限制。T23/父级保持未完成，不伪造 Native 验收。

恢复先核对 manifest 和相应 before 快照，只在独立副本检查补丁；不要把它直接套到已有 WIP 或 clean HEAD。
