# Pi Provider / 认证 / 动作准入矩阵

2026-09-30；固定Pi0.99.1，不是全部真实服务已验收声明。共享策略为pi-runtime/provider-policy.json，Main编译嵌入同一数据；Worker读取封印版本。SDK技术支持、产品允许、隔离契约与真实账号资格分别判断。不能改配置绕过默认策略或静默fallback。

| Provider / 认证 | 目录 | 正式图片推理 | 正式登录/刷新 | 实际固定SDK隔离证据 |
| --- | --- | --- | --- | --- |
| OpenAI-compatible / none、API Key | 显式GET，自有服务已验 | 允许单次动作授权后执行 | 不支持OAuth | 既有5协议、7临时Host与正式Electron；本地服务/API同协议 |
| OpenAI / API Key | 静态，未证明服务健康 | 允许单次动作授权后执行 | 不涉及OAuth刷新 | 正常/429/重定向/超大响应/取消，共5项，生成JPEG，实际Worker+Responses SDK |
| Anthropic / API Key | 静态 | 允许单次动作授权后执行 | 不涉及OAuth刷新 | 同上5项，实际Messages SDK；已知订阅令牌伪装API Key拒绝 |
| Google / API Key | 静态 | 不可执行：受控fetch冲突 | 不支持OAuth | 实际SDK拒绝条件已复现；生产Worker在SDK/认证前拒绝 |
| OpenAI / OAuth (ChatGPT) | Static catalog | Only DAM verified credentials with plan usage resource scope, per-action approval | Guarded user sign-in and bounded refresh | Dynamic DAM client, stable host identity, issued-client reuse, full signed ID token verification; 9 crypto negatives + 3 actual SDK/Main/React isolated tests; real account NOT_RUN |
| Anthropic / OAuth | 静态 | 不可执行 | 产品不提供 | SDK技术支持不能替代厂商许可；API入口保留；旧数据不删除；SDK已知订阅令牌不能通过API Key通道使用 |
| Codex / OAuth | 静态 | 不可执行 | 尚未开放 | 实际SDK首个select、device/browser经Worker/Main/React合成网络贯通；非法ID/错state/取消/A-B-A/到期拒绝。认证网络仍未闭合 |
| Copilot / API Key、OAuth | 静态 | 不可执行 | 不可执行 | 实际OAuth合成网络复现条件policy POST；生产准入0调用，未修改真实账号策略 |
| Legacy HTTP / none、API Key | Main-only安全凭据探测 | 保留既有路径 | 不支持OAuth | 旧认证目录、凭据、标签执行等回归；切为Legacy不能使订阅连接可执行 |

所有真实模型、API账号、订阅账号、账单、OS Keychain、Windows与签名安装包：NOT_RUN。静态目录与保存凭据不等于认证或模型资格。用户须单独批准具体素材/动作外发；API Key不自动授予素材上传。

## 网络和副作用边界

| 动作 | 当前网络规则与预算 | 当前状态 |
| --- | --- | --- |
| Native静态目录 | 固定SDK内存目录；不调用getAuth；无认证/网络 | 已验收静态性质 |
| Compatible目录 | 保存的目标GET /models；禁止重定向；512000字节；连接超时，目录状态不验证模型能力 | 已有实际自有GET服务证据 |
| Compatible推理 | 选定origin POST /chat/completions；原始响应512000字节；SDK retry=0；共享DAM时限/一次截断重试 | 自有SSE与真实临时Host已验 |
| OpenAI/Anthropic API推理 | SDK固定API路由，Main冻结连接/模型/凭据revision；相同origin、redirect:error、原始字节限制和signal | 实际SDK+替代网络已验；未向真实厂商请求 |
| ChatGPT sign-in / refresh | auth.openai.com token POST and JWKS GET only; redirect refused; 64 KiB; 15s/request; login max6, refresh max3; owned ephemeral callback | Guarded adapter wired; real account NOT_RUN |
| Other subscription login / refresh | Existing restrictions preserved | Rejected before authentication |
| Copilot模型policy写入 | SDK条件POST不属于通用登录许可 | 当前生产拒绝全部相应路径；没有任何账号写入许可 |

测试bootstrap可以替代网络并经仅内部构造seam放行契约，用于发现真实SDK前置条件。生产index、Worker入口、Renderer配置或环境变量均不提供该放行。测试假令牌与不带真实网络的登录成功不构成生产认证资格。

## 已修复与仍未闭合

- F01采用明确不可用，未删除受控fetch、未改写全局生产fetch，也未声称Google已修好。
- F02补稳定安装级UUID和真实前置测试；The original Pi-branded authentication is not used for production; DP01 implements the user-approved DAM authentication adapter. Identity sign-in without plan usage scope does not authorize inference.
- F03支持text/secret/manual_code/select有界契约，选项id/label由Worker和Main分别校验，答案只接受当前operation/prompt。过期以内部20ms deadline快进测试；生产默认且最长300000ms。secret/manual_code使用密码输入；select使用选择器。
- F04正常产品禁止Anthropic订阅OAuth，且拒绝SDK已知的订阅令牌识别分支进入API Key通道；保留API与旧记录；依据[当前官方说明](https://code.claude.com/docs/en/legal-and-compliance)。OpenAI接入要求另见[OpenAI Docs](https://developers.openai.com/siwc/token-sharing-open-source/sign-in)，不泛化为全部订阅都禁止。
- F05/F06通过显式生产阻断收敛；Other restricted providers remain unimplemented. ChatGPT uses separate bounded authentication transport, without global fetch replacement.
- OBS01测首次/重复全量校验与取消；OS缓存未控制，真正disk-cold NOT_RUN。不引入缓存或常驻服务，不删除额外依赖/符号链接保护。

## DP01 generated-image acceptance

AI Console defaults to PLAN_ONLY: no catalog/probe/Vault/network. Explicit confirmation signs a one-use permit bound to connection, credential revision, model, origin, generated input SHA and finite budgets. Only an owned generated temporary Host is used. Every invocation, including truncation retry, spends budget without refunds. Authentication refresh is disabled. Unknown process exit retains resources until release. Request/token/time limits are software limits; cost is a user conservative estimate, not a guaranteed billing cap. CLI cannot mint approval.
