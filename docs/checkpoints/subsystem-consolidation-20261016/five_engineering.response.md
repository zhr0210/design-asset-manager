建议精简“规范正文与导航重复”，保留既有构建和发行保护；先整理可执行交付手册，再根据实际重复决定是否重构脚本。工程协作、构建发行已经明确归指南，不应重新列为软件子系统。

当前材料提供的具体基础：

- `docs/code-standards.md` 保存跨模块保证；`CONTRIBUTING.md` 保存方法；`docs/agents/engineering.md` 主要导航和反馈流程。三者存在方法复述，可压缩工程指南，保留唯一规则与必要跳转。
- `docs/subsystems/engineering.md` 已是兼容导航；五个运行子系统目录明确把工程与交付排除在软件系统之外。
- `docs/platform/BUILD-AND-RELEASE.md` 已说明职责、产物闭包与平台边界，但还不是足够明确的操作手册。
- `package.json` 已有 `build`、`pack:mac/win`、`dist:mac/win`、`package:smoke` 及细分发行检查。构建包含 shelf candidates、macOS runtime、build identity 和 electron-vite。
- 既有 CI 分别负责跨平台治理、macOS 未签名产物、打包 dry-run、签名候选。签名候选流程已包含模型目录发行输入、摘要、更新元数据、信任/品牌证据、静态包检查、readiness 和外部门状态。
- `scripts/run-electron-builder.mjs` 明示发布禁用；`package.json` 的 `publish` 为 `null`。上传 CI artifact 不等于公开发行。
- 公证 hook 缺凭据时会跳过；正式 signed-required 入口另有凭据与批准约束。因此操作文档必须区分普通未签名构建与正式签名候选，不能仅依据 hook 日志宣布签名/公证资格。

实施计划：

| 批次 | 实施内容 | 完成标准 |
|---|---|---|
| 1. 规范去重 | 对规则逐条建立“保留正文／迁移方法／兼容跳转”映射。压缩工程指南重复流程，保留 Host 权威、数据保护、失败未知、候选身份、真实验收和自主权例外 | 每条有效要求、例外与来源可追溯，无循环导航、无丢失正文；不以删字数衡量成功 |
| 2. 交付手册 | 在现有 BUILD-AND-RELEASE 中按“本地构建→未签名候选→正式签名候选→目标机安装验收→授权发行”组织步骤。列每阶段输入、现有命令、产物、失败条件、证据和下一阶段门槛 | 命令与 package/脚本/四份 CI 一致；macOS DMG 与 Windows NSIS、x64 与 arm64 分列；静态检查、信任验证、实际安装资格不混淆 |
| 3. 必要工具收敛 | 只有核对消费者后才合并重复参数/证据生成逻辑；复用现有治理与摘要工具，不新增平行 release 状态机或包装入口 | 所有原正式入口保持拒绝语义；无签名输入不降级冒充 signed；publish 仍默认关闭；凭据不输出 |
| 4. 候选验证与记录 | 固定文档/脚本候选，完成适用结构、契约测试及文档消费验证；真实安装在另有执行范围时进行 | 报告分别列已验证、失败、未验及具体平台/产物摘要；文档完成不记作安装包已交付 |

验收建议：

1. **文档验收**：核对唯一权威、链接/锚点、旧入口兼容与机器路由。修改 AI 约束含义或检索路径时，按 CONTRIBUTING 既有协议，用全新只读低思考代理自然任务验证“找得到、用得对、推动任务”；本次探查不再委派。
2. **脚本验收**：按实际改动选择现有 release-flow、candidate、checksums、update-metadata、trust、signed-workflow、runner、entitlements、package-smoke 等测试；不因文档整理自动运行完整治理组。
3. **包验收**：绑定 commit/WIP、build identity、平台/架构和产物摘要，检查 Worker、Pi、原生 helper 与运行资源闭包；缺失或摘要不符应拒绝。
4. **目标机验收**：从安装包普通入口安装/启动，检查系统信任、实际资源、权限、保存重开及适用升级/失败恢复；Windows 与 macOS 分别记录。静态 package smoke 和 CI 打包不代替这些结果。
5. **发布验收**：单列授权、目标渠道、实际已发布版本及下载产物回读；本地 tag、上传请求或 artifact 成功不能关闭公开发行目标。

本次仅静态只读查看指定副本，未修改、联网、运行测试、构建、应用或服务。以上是实施与验收方案，不代表当前构建、签名或安装资格已通过。
