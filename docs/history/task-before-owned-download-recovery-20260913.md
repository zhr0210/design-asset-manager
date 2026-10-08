# Current Task

## 进行中：软件重构与禁用功能恢复（2026-09-13）

用户要求继续重构。整体尚未完成；本轮已完成同会话下载续传与队列一致性。

## 本轮交付

- 下载传输内聚至resumable-image-transfer，固定URL、强ETag和一致字节范围
  才拼接；版本变化/不支持范围时重新下载，错误响应不送入Capture。
- 用户明确重试后续传，同一任务身份最多一次成功入库；保留实际retry_count。
  三个活动任务、32MB单任务、64MiB暂停数据总量、120秒超时保持有界。
  暂存只在内存，切库/关闭/退出释放，不能宣称跨重启可恢复。
- 修复完成任务仍可取消、重复重试、旧状态轮询覆盖新结果、旧下载确认响应
  覆盖/复活review，以及新准备请求还保留旧可确认review的问题。
- Capture已留下持久记录后失败（或无法确认受理状态），返回需要恢复，保留
  staging/记录；不能普通重试来掩盖部分入库。该修复也保护图片副本流程。
- 现有IPC、schema、来源与Library权限保持。[下载说明](src/main/managed-download/README.md)。

## 实际验证

- `test-managed-download-resume`：loopback精确字节、Range/If-Range、分段、
  来源版本变化、弱/缺失ETag、错误范围/编码/长度/大小、取消/重试/切库，
  以及64MiB总量淘汰行为，通过；大缓存场景使用内存响应，不发外网请求。
- `test-visual-ai-download-integration`：真实Capture Activation注入失败后
  仍只有旧素材，已受理记录保留且任务不能盲目重试，通过。
- `test-download-store-integrity`（含status workflow）：历史边界、轮询与review
  乱序、读取失败、取消后晚到响应及旧确认清除，通过。
- macOS合成Electron完整E2E通过：界面取消/续传使用真实Preload、HTTP与
  Capture，续传起点等于实际已收字节，最终7素材/3标签/2确认关系，来源SHA
  保持；原标签、Copy/Trash/AI、预览与原件裁剪流程均保留。
  证据根`dam-active-library-electron-e2e-xQAbtF`，下载页面已目检。
- IPC唯一注册196、权限基线、typecheck、build通过；context:check为554/554，
  Router 268评估通过。没有访问真实素材/下载历史/模型或外部模型服务。
- 原暂存patch逐字节保持，新传输Module和测试仅intent-to-add，未暂存内容或提交。
  本轮证据不代表真实网站、Windows、打包或商业发行验收。

## 剩余与依赖

- 下载跨重启恢复与部分Capture恢复未实现，需要可审阅的持久任务/恢复方案。
- 标签合并/永久删除仍需ADR0179稳定身份重定向和恢复/撤销，不能恢复旧删除式合并。
- 更多格式与复用工具、模型安装/Runtime、真实模型质量与Windows/打包/真实库
  验收仍未完成；新增公共契约、真实数据和外发按具体范围取得授权。

## 已有成果与恢复

原分辨率与自由裁剪、标签别名/层级、三模式、视觉AI和直连下载成果保留。
[前次完整任务记录](docs/history/task-before-download-resume-20260913.md)、
[恢复进展](docs/product/REFACTOR-FUNCTION-MAP-20260911.md)、
[图片工具](src/main/image-tools/README.md)。历史记录内相对路径以仓库根为基准。
