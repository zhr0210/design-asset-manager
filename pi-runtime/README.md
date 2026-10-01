DP01 current override: ChatGPT OAuth uses the guarded openai-chatgpt-auth.mjs adapter. Other OAuth paths, Google native inference and Copilot remain blocked. Fixed SDK and Node versions are unchanged. Real accounts remain NOT_RUN.

2026-09-30更新：Worker入口默认采用封印provider-policy.json；auth-interaction.mjs处理有界交互。所有生产OAuth及Google原生推理/Copilot推理按当前矩阵拒绝，SDK技术支持不自动开放产品。新增资源已纳入seal和extraResources；依赖版本、Node和原有依赖文件均未升级。完整校验可取消，未缓存。详见src/main/ai-gateway/PROVIDER-MATRIX.md及本批报告。

# DAM isolated Pi runtime

本目录是执行依赖包，不是模型权重库。当前固定 `@earendil-works/pi-ai@0.99.1`，独立 Node `24.21.0`；主应用 Electron 的 Node/原生 SQLite ABI 保持原状。

## 本轮已验证分发物

- 官方 darwin-arm64 Node archive：52,909,993 bytes。
- SHA-256：`bed7eea5325e1108f32ce5228ddd6a5f0f08a499ee42aa7442aea583702f6057`。
- 来源：`https://nodejs.org/dist/v24.21.0/node-v24.21.0-darwin-arm64.tar.gz`，匹配同版本官方 SHASUMS。
- Pi npm 分发的锁定完整性保存在独立 `package-lock.json`，安装禁用脚本；Node LICENSE 与 npm 包许可证保留于依赖树。
- 已执行 macOS arm64 本地资源副本/离线启动测试；macOS x64、Windows x64/arm64 只提供准备代码，尚未实际下载、执行、签名或制作安装包。

## 准备和完整性

`node scripts/prepare-pi-runtime.mjs` 默认仅显示计划；明确批准后带 `--approved` 才下载固定官方 Node、验证摘要、安装锁定依赖并封印。模型权重、真实账号和素材均不参与该步骤。指定支持平台使用 `--target=darwin-arm64`（其他值见脚本）。第三方下载和平台准备仍遵守项目授权边界。

`npm run pi:seal` 对 Worker、锁文件、Node/许可证及所有普通依赖文件及允许的符号链接生成 `release.json`，并生成 `src/main/ai-gateway/pi-runtime-release.ts` 中的固定摘要。修改 Worker 或依赖后必须重新封印、重新构建 Main，再重验资源副本；不能仅修改摘要文件绕过验证。Runtime Host 以 Main 编译绑定的摘要校验完整文件清单和实际依赖 inventory，拒绝未封印的嵌套依赖或符号链接，不使用系统 Node。生产通过 extraResources 从 `resources/pi-runtime` 读取；开发从编译 Main 的相对资源根定位。

源码交接包包含 Worker、锁、清单、准备/封印脚本及来源证据，不包含巨大的 Node/依赖目录。交接包不是已签名安装程序。接收工程师在获准环境重建依赖后核验清单与源码差异，再构建。Windows 准备代码、ASAR 配置和静态类型不能代替 Windows/安装包真实验收。

## Worker 约束

Worker 一进程一个动作，stdio 接收 Main 冻结选择和内存凭据，stdout 只返回有界协议。环境为私有临时 HOME，无环境密钥、其他应用账号或素材库读取。目录/推理/登录均由 Main 显式动作触发；启动应用不会启动模型服务。没有工具执行或资料库写入权。

本轮真实协议测试连接自有 loopback SSE 服务，验证的是 SDK/进程/保存链行为；不证明实际云端/API/订阅权限或模型质量。实际验收按用户选择延期。

DP01 inventory validation ignores only regular files with the exact basename `.DS_Store` (Finder metadata); a same-name symlink or directory is rejected. Other extra files, shadow dependencies, symlinks and sealed content changes remain rejected. This exception neither deletes nor reads Finder metadata and does not change executable entrypoints.
