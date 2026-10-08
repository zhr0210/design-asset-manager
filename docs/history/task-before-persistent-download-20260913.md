# Current Task

## 进行中：软件重构与禁用功能恢复（2026-09-13）

用户要求继续。整体重构尚未完成；当前推进跨重启下载恢复。

## 当前审批点：可信下载日志与v3库结构

现有App下载历史可改写且缺少库/字节绑定，不能直接授权跨重启恢复。
[具体方案](docs/product/DOWNLOAD-RESTART-RECOVERY-PLAN-20260913.md)已准备：
Control DB可信意图/块日志、不可变块检查点、v3兼容迁移、显式恢复确认，以及
prepare/jobs的兼容扩展。旧请求继续memory模式，真实库与模型数据仍不在授权内。

临时SQLite协议验证8项通过；仅为孤立方案验证，不是应用能力。
需要用户批准上述公共schema/IPC范围后正式接线。本轮未修改生产代码、
库schema、模型设置或运行时行为；已有同会话能力保持。下方为此前交付。


## 本轮交付

- 下载页新增“检查并恢复入库”：先确认，再由既有retry接口进入Main内部恢复，
  不再次请求图片地址、不接受Renderer文件路径、不新增IPC或升级schema。
- 核对Library、Capture Request、Candidate、Original、Promotion身份及SHA/尺寸，
  使用库内已核验暂存；暂存缺失时只可从匹配的已发布原件重建。
- 补齐发布、Activation、Preview、Promotion或元数据收尾；已发布原件不覆盖，
  普通Copy重放仍只返回快照。恢复预览使用确定性身份，匹配才复用。
- 已完成结果幂等，用户描述/标签/名称编辑保留；身份冲突、不匹配/缺失文件、
  符号链接、其他库与Trash继续拒绝。不清理未知孤立文件，不默默丢弃冲突现场。
- 原件与暂存的有界读取统一到platform/verified-owned-file；原图片工具指纹算法
  与身份/哈希检查保留。恢复复制/预览使用已核验的冻结字节。
- [下载说明](src/main/managed-download/README.md)、
  [恢复实现](src/main/library-lifecycle/owned-download-recovery.ts)。

## 实际验证

- `test-owned-download-recovery`通过：发布前、Activation、Preview、Promotion、
  元数据故障，普通重放不隐式恢复，恢复预览复用，用户编辑保留，重复/哈希/
  缺失/符号链接/目标冲突/库与Trash边界；PNG、JPEG、WebP收尾恢复通过。
- `test-visual-ai-download-integration`通过：真实Activation故障后受检恢复，
  HTTP次数不增加，只新增一份素材。
- `test-capture-intake-workflow`、`test-capture-intake-sqlite-persistence`、
  `test-image-tools-integration`、`test-managed-download-resume`均通过。
- 最新macOS合成Electron完整E2E通过：恢复确认取消不写入，确认后本地恢复，
  无额外HTTP；旧标签/Copy/Trash/AI/裁剪/下载与来源SHA后置条件保持。
  最终8素材/3标签/2确认关系；证据根`dam-active-library-electron-e2e-rJdi32`，
  恢复确认界面已目检（截图关闭入场动画以读取稳定状态）。
- IPC唯一注册196、权限基线、typecheck/build、context:check（557/557）与
  Router 268评估通过。相关diff与文档链接检查通过。
- 原暂存patch逐字节保持，新增源码/测试仅intent-to-add，未暂存内容或提交。
  未访问真实素材库、历史下载、模型/Runtime或外部模型服务；未替换已安装应用。

## 剩余与依赖

- 跨重启下载任务发现/续传/恢复、任意历史Capture、图片副本Capture及损坏库修复
  未实现；当前只恢复本会话已知、可验证的下载任务。
- 标签合并/永久删除仍需ADR0179稳定身份重定向与恢复/撤销方案。
- 更多格式/复用工具、模型安装/Runtime、真实模型质量与Windows/打包/真实库
  验收仍未完成；真实数据、外发或公共兼容变更按具体范围取得授权。

## 已有成果与恢复

[前次任务记录](docs/history/task-before-owned-download-recovery-20260913.md)、
[恢复进展](docs/product/REFACTOR-FUNCTION-MAP-20260911.md)。历史记录中的相对路径
以仓库根为基准。标签、原分辨率/自由裁剪、同会话续传等已有成果与证据保留。
