目前只能确认“macOS 开发态运行过、Windows 交叉构建成功”；两端安装交付资格仍未成立。交叉构建不能替代 Windows 正式 Host、原生依赖及安装验证。

剩余检查：

1. **冻结并绑定交付候选**：记录 HEAD/WIP、build ID、目标 OS/架构、安装包与 SHA-256；开发态旧 PASS 不转记给安装包，修改候选后复验受影响范围。
2. **逐个承诺平台/架构核对产物**：生产构建、适用治理回归、实际制品、摘要清单、Package Smoke、Official Model Catalog 发布输入；检查 Worker、本地 import、Pi、原生库和 ABI 确实随包交付，不依赖开发目录。采用项目现有 `dist:mac` / `dist:win` 与平台校验入口。
3. **macOS 安装与信任**：DMG 挂载→复制→从安装位置启动→卸载镜像；Developer ID、Hardened Runtime、嵌套代码签名、公证、staple、Gatekeeper，以及正式图标与更新元数据。
4. **Windows 真机环境**：在 Windows 正式 Host 验证原生 DLL、Electron ABI、Media Foundation 等受影响能力；执行 Windows Sandbox NSIS 安装，核对安装子目录、已安装 EXE 和正常启动；补 Authenticode、正式图标与更新元数据。Linux/WSL 或交叉编译不能代替。
5. **从已安装包完成用户闭环**：正常启动、可见入口→收录/找回/编辑等本次交付范围→保存退出重开；覆盖适用失败、取消、原件保护、原生窗口/文件交接/系统凭据。涉及 AI 时使用现有模型与许可范围走正式链路，不下载权重；升级涉及数据变化时用可恢复副本验证迁移与恢复。
6. **形成可复核记录**：逐平台列 `PASS / FAIL / NOT_RUN / BLOCKED_UX_ACCEPTANCE`、实际命令/步骤、产物身份、证据及缺口。现有 CURRENT-STATE 中的旧候选、Windows 未验和原生缺口不能自动关闭。

项目发行门区分 `candidate_ready → distribution_ready → publish_ready`：未签名包最多保留为内部候选，不能称可分发安装包。对外发布另需明确授权，不自动 push、上传或发布。

依据：`docs/code-standards.md` 的平台/产物与交付真实性保证、`docs/subsystems/platform-release.md`、ADR 0008，以及 `release-flow-governance.ts` / `release-install-smoke-preflight.ts` 的实际门槛。以上为只读评估，未运行任何检查，也未确认现有安装包已满足其中任一新增门槛。
