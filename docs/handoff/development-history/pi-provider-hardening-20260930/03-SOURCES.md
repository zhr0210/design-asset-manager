# 来源与定位

读取日期：2026-09-30。源码根为用户指定的design-asset-manager工作区；下列使用仓库相对路径。行号按本次Remote读取时版本，后续修改应按符号定位。本包未复制完整源码、未重新计算全工作区摘要；路径与内容审阅不等于冻结快照。

## 现场材料

| ID | 路径 / 关键定位 | 使用范围 |
|---|---|---|
| S01 | `.ai-run/pi-integration-20260930/PLAN.md` | 219行；目标、授权、PI01–08、原SDK快照与方案取舍 |
| S02 | 同目录 `REPORT.md`、`REVIEW-FINAL.md` | 70/25行；原作者测试记载、原复核范围、限制 |
| S03 | 同目录 `FINAL-HANDOFF.json`、根 `TASK.md` | 终态及原作者摘要/文件计数，不是本次独立重算 |
| S04 | `pi-runtime/worker.mjs` | 57行；action/login/getAuth/approvedFetch/models.stream |
| S05 | `src/main/ai-gateway/ai-connection-service.ts` | 106行；execute、login、prompt投影、Vault回调和drain |
| S06 | `src/main/ai-gateway/pi-runtime-host.ts` | 80行；每次verify、完整inventory、stdio和close/UNKNOWN |
| S07 | `src/main/ai-credentials/credential-vault.ts`、`public-settings.ts` | 34/18行；秘密白名单与补偿 |
| S08 | `scripts/pi-runtime.test.ts`、`pi-visual.integration.test.ts` | 18/75行；兼容HTTP真实SDK及临时Host测试源码 |
| S09 | `scripts/pi-oauth.test.ts` | 47行；fake child/替身Runtime与Main生命周期案例 |
| S10 | `pi-runtime/node_modules/@earendil-works/pi-ai/dist/api/google-generative-ai.js` | stream开头的Custom fetch拒绝条件；实际已安装0.99.1 |
| S11 | 同包 `dist/auth/oauth/openai-chatgpt.js` | 185–194行getDeviceId；注册固定名、client策略、令牌检查 |
| S12 | 同包 `dist/cli.js` 第65行；`dist/auth/helpers.js` lazyOAuth | login第四参数和透传；CLI示例不作为稳定ID产品要求 |
| S13 | 同包 `dist/auth/oauth/openai-codex.js` 第324–339行 | Browser/Device select及合法值检查 |
| S14 | `src/shared/contracts/ai-connection.contract.ts` | 20行；prompt目前无options |
| S15 | `src/renderer/components/asset/PiConnectionsPanel.tsx` | 41行；第36行统一password输入、订阅与Provider配置 |
| S16 | `src/shared/constants/pi-provider-presets.ts` | 7行；SDK认证能力当前决定产品选项 |
| S17 | 同包 `dist/auth/oauth/github-copilot.js` | 392行；账号目录、自动enable policy、OAuth fetch和重试 |
| S18 | `pi-runtime/package.json`、已安装Pi包package.json、`pi-runtime/README.md` | 固定依赖、engines、分发与未验收平台 |

S19：已安装Pi的 `dist/models.js` 第354–365、424–452行另行核对：login第四参数直接传给method.login；applyAuth保留除transformHeaders以外的options并传至provider.stream，未移除自定义fetch。这支持F01/F02的实际调用链静态判断。

## 外部一手核验

以下是外部资料，不替代DAM工作区事实。网页可能继续更新；下次发布前复核。除必要短语外只做摘要，不打包第三方网页全文。

- W01 — Anthropic, Legal and compliance，Authentication and credential use（官方）：https://code.claude.com/docs/en/legal-and-compliance
  用于区分第三方应用的Claude.ai登录限制与原样Claude Code托管例外；不是本次法律意见或账号执法结果。
- W02 — OpenAI, Sign in with ChatGPT / ChatGPT plan usage Overview（官方）：https://developers.openai.com/siwc/token-sharing-open-source
  开源/本地应用支持范围、稳定host ID；付费/远程托管另有接入条件，不泛化为全部产品可用。
- W03 — OpenAI, Registration and sign-in（官方）：https://developers.openai.com/siwc/token-sharing-open-source/sign-in
  实际应用名、client注册复用、host ID、ID token/nonce/身份校验及凭据存储。
- W04 — Pi作者仓库，packages/ai：https://github.com/earendil-works/pi/tree/main/packages/ai
  SDK定位与上游参考；main不等于本机安装的固定分发物。具体缺陷以本机已安装0.99.1为依据。

原计划所列commit为 `1b347794e2a630e4359f2584f4eea388145d0ddf`；本次未成功抓取其若干raw文件，不把main内容当作该commit的逐字节校验结果。

## 本次执行证据

只有 `evidence/GOOGLE-PROBE.json` 中的单个已执行适配器探测。输出由Remote工具返回，整理保留字段；不是项目正式TAP日志。`node` 是系统25.8.0，不是捆绑24.21.0。追加捆绑Node/OpenAI合并探测被工具阻止，没有输出、不算执行；OpenAI和Codex结论分别为静态契约分析。
