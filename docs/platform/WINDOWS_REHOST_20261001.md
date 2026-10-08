# Windows 新目录恢复（2026-10-01）

## 源码依据

- 直接从 GitHub 克隆 `codex/full-project-20261001`，基线
  `107106cea9d4566b0fbf68dc2317825219dfb9de`；本地分支 `codex/windows-workspace-1001`。
- 根 `AGENTS.md` 保持远端原文。没有导入旧指南、账本、node_modules、
  凭据、资料库或模型。用户确认模型暂不复制。
- 当前聊天的原目录不会因克隆自动切换；后续项目应从新目录打开。

## 缺失关键项的最小补入

远端的生产磁盘准入、只读数据库、开库检查和锁只支持 macOS。
生成素材的 Windows 生产链路先失败为 `library-target-invalid`，补入后验证通过。

仅复用本地已实现的 NTFS adapter 与合成回归
（来源 `dfff158` 的 `local-volume-qualification.ts` 和
`windows-library-production.test.ts`）；对应的四处生产选择/平台准入做最小适配。
Windows Sharp 文件缓存阻塞替换/清理，补入关闭文件缓存的三行修复。
没有合并旧安装器页面、素材读取修复或未完成的治理整理。

Pi 准备脚本的 Windows shell 丢失带空格的 `--prefix` 路径，安装失败。
本次在新源码中改用 cwd 传递安装目录，固定命令参数保持原义。

## 依赖与验证

- 主项目 `npm ci --no-audit --no-fund`，482 个包；保留远端锁文件，
  SQLite 原生依赖由 electron-builder 按 Electron 平台准备。
- Pi：官方 Windows x64 Node 24.21.0、Pi 0.99.1，独立 npm ci 85 个包；
  官方摘要校验与本机完整封印。生成资源清单和 Main 摘要是本机的新证据。
- 修正后的 `npm run pi:prepare -- --target=win32-x64 --approved` 从下载到
  安装和封印完整复跑通过，11837 个文件的封印与分步准备一致。
- 类型检查、生产构建、源码上下文检查通过。
  最终构建身份为 `dam-32498c70fecd2e37`。路径与文档检查、Git diff 检查通过；
  新 NTFS 源文件尚未提交，路由检查明确提示它不计入已跟踪源码覆盖率。
- `test-active-library-session` 通过；`test-windows-library-production` 两项通过，
  覆盖生成图片导入、中文/空格路径、重开、锁排他、原件字节保持和 WAL 拒绝。
- `node scripts/run-ts-test.mjs scripts/pi-runtime.test.ts` 五项通过：
  实际固定 Node/SDK 进程与自有 loopback 服务，无外部推理。

## 验证限制

旧 `test-active-library-host` 的 bootstrap 锁文件重命名故障夹具在 Windows
仍失败：实际返回 `library-operation-failed`，与该夹具预期的恢复/锁错误不同。
未删除或放宽断言；本轮没有宣称整个历史测试矩阵通过。
原生用户路径、安装包和真实账号尚未验收；未安装可选 Python 推理环境、
启动模型、推送或发布。新目录的基础运行准备不等于完整安装产品验收。
