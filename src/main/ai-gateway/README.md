当前候选、Windows 分发和验证缺口统一见 [CURRENT-STATE](../../../docs/handoff/CURRENT-STATE.md)。2026-10-05，获批 ChatGPT 订阅已在受控普通 Windows Browser 实例用真实 Main safeStorage 完成 Luna low 生成图探测、公开图副本分析与关闭重开。其他 Provider、付费 API、安装包、原生桌面生命周期及全部模型质量仍未验收；范围见 [本轮交接](../../../docs/handoff/WC01-PI-REASONING-20261005.md)和[准入矩阵](PROVIDER-MATRIX.md)。下面带日期的段落是历史证据，不覆盖当前投影。

2026-10-05 思考强度接入：在“AI 与模型 → 连接与账号”选择连接后配置可选 `reasoning`。目录由固定 Pi 0.99.1 声明；Luna 支持 off/low/medium/high/xhigh/max，off 映射 none。省略保持既有 raw stream 行为（该 Luna 的实际默认 wire 为 none），显式档位经 `streamSimple` 转换；不支持的实际任务模型在 Worker auth/refresh/network 前拒绝，不静默降档。兼容接口未声明此能力，只允许模型默认。连接保存、执行 binding、确认单、重试、能力证明和视觉证据保持同一档位，旧省略档位的 binding 字节不变。视觉分析、反推与独立标签均接线；生成图验收也复用同一 Visual Controller。

原生静态目录成功结果和同 key 在途请求在配置页内复用；不缓存账号证据、推理结果或 Runtime 资格。改草稿清除旧能力确认与提示，probe 自身保存采用新证明，失败退休单次 review。新增参数19项、组件7项和相关回归48项通过；目录/其他档位的合成验证不替代真实模型质量。真实 low 以外的云端档位未调用。

2026-09-30 Provider收尾更新：以[当前准入矩阵](PROVIDER-MATRIX.md)为本模块最新状态。OpenAI-compatible、OpenAI API Key与Anthropic API Key有固定SDK隔离契约；Google原生推理、各订阅登录/刷新及Copilot推理暂不可执行。Codex交互已贯通合成网络，不能宣称真实账号已可用。新增稳定host ID、窄select契约与过期撤权；凭据存在显示“已保存凭据”。历史段说明不覆盖本准入限制。

# AI connection gateway — Pi integration

2026-09-30：此模块已接入正式 Main 组合根、窄 Preload 与 AI Console。隔离正式 Electron 流程已验收；实际模型、付费 API、订阅登录、操作系统凭据保险库和安装包验收未运行。不要把固定目录或生成图片的隔离应答当作真实模型资格。

## 调用与权威

```text
AI Console / Inspector / 独立标签
  → Shared Client → Desktop IPC / Browser loopback HTTP（同一 Main handler 校验角色、连接及单次授权）
  → AI Connection Service（冻结配置、账号 revision、模型、目的地）
      ├─ legacy → 既有单次 HTTP Provider
      └─ pi → Runtime Host → 固定 Node → Pi Worker → 指定 Provider
  → 既有 Visual/Tag Controller（时限、准入、取消、source/session 检查）
  → Active Library Host（权威提交、人工修订保护、幂等回执）
```

Pi 只负责模型传输与订阅认证。Host 保留资料库写入权；Worker 不读取资料库、模型权重或应用设置。兼容本机服务与 API 共用接口，但不能互相静默 fallback。OCR 保持专用能力；本次没有新增自动后台 caption、embedding 或模型启动器。

## 配置、凭据和能力

`transport=pi` 显式选择新执行桥；没有此值的旧连接继续既有 Provider。`providerKind`、`authMode`、`processingLocation` 与 `aiTaskModels` 分别选择提供方、认证、处理位置和任务默认模型。远端地址不能被声明成本机；本机代理可明确声明外部处理。配置保存和目录读取不授权素材上传。

普通设置、列表和 Renderer 仅取得白名单投影。秘密通过专用 Main 动作写入 `ai-credentials.v1.json`，生产使用 Electron safeStorage；无法提供安全存储时明确拒绝。旧明文配置只能显式迁移。Codex 仅允许订阅认证；UI 和 Main 根据固定 Provider 认证表拒绝不支持的组合。旧设置编辑器将密钥操作引导至专用入口，迁移后的旧接口目录/健康探测仍在 Main 内解析凭据；未保存的地址草稿不携带已有密钥。Vault 与 settings 使用待提交记录/前态及 durable revision 补偿，失败或崩溃后不误选新账号。OAuth 刷新保持账号 revision；换账号、登出和目的地变化撤销旧 review。合成 E2E 加密只在已有隔离测试入口启用，不证明真实 Keychain。

`modelValidation` 记录单独确认后生成的双色 JPEG 与完整 JSON 验证。声明能力、验证证据和实际任务可执行状态分开；探测不读用户素材，不写素材证据。原生 Provider 的静态目录不是服务健康证明。目录失败仍允许手动模型 ID。账号登录采用 Pi 实际 OAuth 提示与有界操作；浏览器只打开该操作登记的 HTTPS 地址，不索取用户密码。

## 协作与执行

视觉分析、提示词反推与独立标签复用现有批准和写入链。本机结果外部细化仅支持当前一个素材的有效先前证据，冻结并披露受控预览和已选结构化结果；必须另行确认。新证据带 upstreamEvidenceId，不覆盖用户描述、确认标签或原件。

Controller 独占截断重试和总时限；Pi SDK 重试关闭。响应、输出帧和队列有上限；同连接账号操作串行，最多两个 Worker。Pi Worker 内存预留只用于 Pi 请求，旧 HTTP 不承担此额外预算。生成能力探测共用实际资源准入。取消和关库等待 owned child close；退出未知时资源保持占用，迟到结果不保存。远端请求取消不证明远端计算或费用停止。

用量可得时显示 input/output tokens；未知保持 null。固定目录费用为估计，订阅与无价格连接不冒充实际账单。

## 验证与边界

`pi-runtime.test.ts` 验证真实固定 Pi/Node 对自有 SSE 服务；`pi-credentials.test.ts`、`pi-oauth.test.ts` 验证存储补偿、账号隔离与有界登录；`pi-visual.integration.test.ts` 使用生成图与真实临时 Host，包含视觉、细化、能力验证、UNKNOWN 准入以及独立标签 claim/commit/重复零再推理/重开。React 与正式 Electron 用例见 `pi-ui.test.mjs`、`pi-electron.e2e.test.mjs`。SQLite 测试使用仓库 Electron Node 启动器。

固定依赖和准备/封印流程见 `pi-runtime/README.md`。历史记录见 `.ai-run/pi-integration-20260930/REPORT.md`；最初红灯和修复证据保留。2026-09-30 的真实账号延期已由2026-10-05限定订阅/公开测试图授权取代，未授权相邻私人库或其他提供方。本模块完成不授予真实私人素材库权限。

## DP01 entry

Pi panel: select OpenAI + OAuth, then **Continue with ChatGPT**. Enter passwords only on the vendor page. Main retains verified identity, tokens and issued client; Renderer sees no token, full callback query or id_token_hint. Inference requires the DAM registration marker and plan usage resource scope. Identity login alone is not inference qualification.

See ../ai-acceptance/README.md for generated-image acceptance and budgets. `.ai-run/LATEST.json` is a historical DP01 pointer, not the current Windows candidate. Current facts use CURRENT-STATE above; old reports do not resume work or authorize another batch.
