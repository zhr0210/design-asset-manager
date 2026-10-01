# 来源、现场证据与限制

检索／审阅日期：2026-10-01。来源按“当前源码”“历史报告”“本轮实测”“外部规范”“本包建议”分开。本文路径可供下一位AI在仓库直接定位；行号只对应本轮观察，后续移动时用符号与摘要重新定位。

## R：当前仓库读取

| ID | 路径／位置 | 本包使用的事实 |
|---|---|---|
| R00 | AGENTS.md；TASK.md首段；.ai-run/LATEST.json；DP01 REPORT.md | 当前范围、10月1日后续修复、历史完成锚点不是当前所有源码 |
| R01 | src/renderer/App.tsx:22–45；src/shared/workflows/app-navigation.workflow.ts | HashRouter正式路由和全局导航定义 |
| R02 | src/renderer/components/layout/WorkspaceRail.tsx:6–25；GlobalNavigationMenu.tsx | rail未列AI，另一菜单包含AI；多处导航 |
| R03 | src/renderer/components/layout/AppShell.tsx:74；src/renderer/routes/Library.tsx:290,305–306 | 素材/原生卡片配置返回仍指向settings?section=ai |
| R04 | src/renderer/components/library/canvas/LibraryCanvas.tsx:53–54,69–71；components/gallery/BottomDock.tsx | 新AI入口已存在、手写库菜单、正常四视图 |
| R05 | src/renderer/routes/Settings.tsx:83–86；components/settings/AiBackendSettingsPanel.tsx | 旧编辑器仍挂载、跳转名不一致、过时下载文案 |
| R06 | src/renderer/routes/AiConsolePage.tsx:702–733,809–815,1268,1350及之后旧面板 | 2583行旧容器、新面板追加、5秒轮询、旧安装日志订阅 |
| R07 | src/renderer/modules/ai-console-status/electron-ai-console-status.adapter.ts；src/main/ipc/disabled-app.ipc.ts | 旧查询API与正式禁用通道对应 |
| R08 | src/renderer/components/asset/PiConnectionsPanel.tsx | 新连接CRUD、普通/高级混杂、独立认证与验证动作 |
| R09 | scripts/pi-electron.e2e.test.mjs:21–31；scripts/library-startup-navigation.e2e.test.mjs | hash跳转、直接IPC与部分按钮交互混用 |
| R10 | pi-runtime/openai-chatgpt-auth.mjs:26–43,47–72 | 当前自有OAuth、错误回调catch、身份和token规则 |
| R11 | src/main/ai-gateway/ai-connection-service.ts:login/status/credential/refresh callbacks | Main操作状态、持久化完成、通用错误、阶段缺失 |
| R12 | src/main/ipc/ai-connection.ipc.ts；pi-runtime/worker.mjs | 错误码压缩、受控authUrl、OpenAI自有adapter接线 |
| R13 | src/renderer/components/asset/PiConnectionsPanel.tsx:12–16,37–42 | unmount取消、轮询、等待/失败投影与登录状态 |
| R14 | src/renderer/components/asset/AssetInspectorDrawer.tsx；AssetPromptReversePanel.tsx | 静态import与条件渲染不同，不能直接当死代码 |
| R15 | DESIGN.md；.gitignore | 保留Gallery & Glass/四视图、原型基准、当前资料与构建排除 |
| R16 | src与scripts的只读目录统计和TypeScript AST检查 | 计量与27候选；不是完整运行依赖或删除证明 |

没有复制完整仓库到本包，也没有审计每个文件。R00等某些多文件组是导航索引，不是新增抽象模块名称。

## 本轮运行证据

1. 只读代码统计和Git状态汇总：`evidence/REPOSITORY-OBSERVATIONS.json`。文件数/行数按声明扩展名，排除依赖构建等；不是安装包体积。
2. TypeScript相对AST依赖图：`evidence/STATIC-GRAPH-OBSERVATIONS.json`。包含类型导入；不完整覆盖动态入口/worker/script/CSS/打包。27候选不自动允许删除。
3. 自有loopback拒绝回调：`evidence/AUTH-DENIAL-PROBE.json`和`evidence/reproduce-denial.mjs`。捆绑Node24.21.0，厂商网络0，账号/凭据0，自有尝试已清理，远程进程退出码0。复现脚本只供同类获准合成检查，不是CU证据。

没有重跑所有历史单元、Host、Electron、构建；没有真实Keychain/账号、用户素材库、Windows或安装包；没有Computer Use屏幕轨迹。Remote此轮文件/终端能力可用，但未执行专门的屏幕输入验证。

一条扩展扫描请求被执行安全检查阻止，未取得输出；没有据此认定引用缺失或磁盘大小。另一次文件名正则搜索返回0，也不作为内容不存在证据。

## U：上游与官方文档

### 固定Pi上游

- U01，仓库main在本轮读取固定为 `b29db895c5c1b30b560a39fb9e4664508f1683de`，commit时间2026-09-30T16:40:06Z。入口：https://github.com/earendil-works/pi/tree/b29db895c5c1b30b560a39fb9e4664508f1683de/packages/ai 。只比较固定内容，不要求立即升级到main。
- U02，package与engines：https://github.com/earendil-works/pi/blob/b29db895c5c1b30b560a39fb9e4664508f1683de/packages/ai/package.json 。本轮读取版本0.99.1、Node>=22.19.0。源码blob `21534501e17696bccb85ef50246cd53d7c0a0c65`。与npm锁定分发不同证据，版本名相同不证明字节相同。
- U03，CredentialStore：https://github.com/earendil-works/pi/blob/b29db895c5c1b30b560a39fb9e4664508f1683de/packages/ai/src/auth/credential-store.ts 。blob `fc17f6cc6e4f0442f80848cce6a07407f150e024`。用于串行写、内存默认与app持久化分工；不是DAM的数据库/密钥实现模板。
- U05，OpenAI OAuth：https://github.com/earendil-works/pi/blob/b29db895c5c1b30b560a39fb9e4664508f1683de/packages/ai/src/auth/oauth/openai-chatgpt.ts 。blob `0dbe5a7c88c4847c6be182a779c47267198f2228`。用于对照回调、progress、prompt取消与Provider接口。上游当前行为不能自动覆盖DAM自己的应用身份、注册复用和JWT验证。

### OpenAI官方

- U04，注册与登录：https://developers.openai.com/siwc/token-sharing-open-source/sign-in 。2026-10-01核查；直接公众客户端的注册、返回state、身份验证、权限与受保护持久化要求。后续实施前若内容变更，应记录差异，不把旧网页当永久协议。
- U06，远程VM场景：https://developers.openai.com/siwc/token-sharing-open-source/self-hosted-vms 。用于解释回环callback到浏览器所在机器这一条件；本包不授权复制真实凭据到其他机器。
- U07，公开客户端方案边界：https://developers.openai.com/siwc/token-sharing-open-source 。用于核验应用分发/许可场景，不推定任何账号自动具备权限。

### 其他官方边界

- U08，Anthropic认证/产品说明：https://code.claude.com/docs/en/legal-and-compliance 。沿用现有产品准入限制，不在本批尝试绕过订阅允许范围；实际允许范围应实施前按官方最新文档核实。

## 如何回溯一个修改

用户问题 → Axx现场发现或Uxx规范 → R00–R08阶段 → 具体源码符号 → 验收案例(U/A) → 实际证据类型 → 对应source/build摘要。

计划中的新路径、新错误码、新状态和验收门槛是建议，不是来源已实现事实。真实登录故障的rootCause保持UNKNOWN，直到拿到同一操作的脱敏阶段证据。
