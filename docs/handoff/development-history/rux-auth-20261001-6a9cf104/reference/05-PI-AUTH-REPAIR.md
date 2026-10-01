# Pi 接入与 ChatGPT 登录闭环：先定位失败阶段，再修改协议

## 1. 已知事实与禁止的推断

当前工程使用固定 Pi 0.99.1 和独立 Node24.21.0。`worker.mjs` 对OpenAI重新构造Provider，用本地 `openai-chatgpt-auth.mjs` 替换上游OAuth实现。因此“Pi官方能登录”不等于DAM现在这条自有链必然成功，也不能把9月30日旧评审中的缺失UUID问题当成当前问题——DP01已补齐。

用户报告“浏览器登录了但应用没连接”。目前没有取得该次真实尝试的阶段、错误码、回调接收情况或保险库结果；以下均可能导致相同表象：浏览器只登录网站未完成授权、回调回到别的机器、回调失败、换令牌失败、身份验证失败、保存失败、页面离开取消、已连接但界面状态未重读。**不得先选一个猜测当根因。**

已实际复现的只是合法拒绝回调不结案。它必须修，但不能承诺修完就解决用户那次成功浏览器登录的全部问题。

## 2. 官方参照必须固定版本和用途

本轮读取的Pi上游main固定到 `b29db895c5c1b30b560a39fb9e4664508f1683de`；其packages/ai也声明0.99.1。相同版本字符串不代表工作树、npm分发、锁文件和所有接口完全相同，实施时记录installed npm SRI、source commit、Node版本、Worker摘要和release摘要。

| 上游部分 | 借鉴的内容 | DAM不能直接照搬 |
|---|---|---|
| Provider/Models | 选择factory、model、stream终态、原生协议适配 | 不取代DAM素材权限、任务恢复、Host事务 |
| CredentialStore | provider维度的串行modify，app注入持久化 | 内存默认实现不能承担重启持久；DAM同Provider多连接必须隔离 |
| OAuth interaction | text/secret/manual_code/select、notify、signal和取消 | SDK任意对象不能直透Renderer；无意义取消不能代替业务失败状态 |
| 上游OpenAI OAuth | PKCE/state/nonce、回调、code交换、refresh组织方式 | 固定Pi应用名、每次新注册、只检查ID token存在，不能覆盖DAM的身份验证要求 |
| 原生SDK transport | 实际request/response/终态行为 | 一个Provider的fetch契约不自动适用其他Provider；网络限制不得删除 |

实施产出 `UPSTREAM-COMPATIBILITY.md`：每一个本地覆盖项写明原因、上游出处、相应测试和解除条件。不得直接fork整套Pi CLI/Agent，也不因用户说“pi agent”就引入coding-agent的任意文件/命令工具。当前任务是模型接入与账号，不是让SDK管理整个DAM。

官方OpenAI资料要求新注册与重授权区分、稳定host身份、验证state与ID token、按实际返回scope判断计划权限；回环回调必须到运行listener的机器。这里只将其作为认证契约依据，不据此推定用户的账号/产品分发场景已经获准。[U01–U06]

## 3. 首先补安全阶段诊断，避免盲修

在Main拥有的单个AuthOperation中记录以下阶段：

```text
idle
 → preparing-local-storage
 → preparing-listener
 → awaiting-browser
 → callback-received
 → exchanging-code
 → verifying-identity
 → persisting-credentials
 → connected-identity / connected-plan
```

失败终态：`denied / cancelled / expired / failed`，并带失败阶段。模型目录或图片推理验证是之后的独立动作，不能夹在“账号登录”里自动消耗额度。

最小内部记录字段：operationId、opaqueConnectionId、stage、sequence、startedAt、lastProgressAt、deadlineAt、configRevision、credentialRevisionAtStart、safeErrorCode、retryDisposition、workerCloseStatus。不得记录code、state原文、nonce原文、PKCE、token、完整URL、Authorization、Cookie、原始厂商响应。

诊断导出只允许白名单：buildId、runId、Provider种类、阶段时序、非秘密错误码、HTTP状态类别、owned callback是否收到、是否验证/持久化完成、资源close是否确认。真实connection ID可在导出时改为报告内随机ref；不要用账号哈希建立跨报告追踪。

UI显示例子：
- “浏览器授权已返回，正在验证账号…”
- “账号已验证，但本次未授予计划使用权限。”
- “授权已返回，交换凭据失败。原连接未变，请重新开始登录。”
- “身份验证未通过，未保存新凭据。诊断编号：本次临时编号。”
- “系统安全存储不可用，账号没有保存；已有账号保持。”

错误码须有稳定枚举，不回传任意Error.message。至少区分CALLBACK_NOT_RECEIVED、CALLBACK_INVALID、AUTH_DENIED、CODE_EXCHANGE_FAILED、IDENTITY_INVALID、KEYS_UNAVAILABLE、CREDENTIAL_PERSIST_FAILED、CONFIG_CHANGED、TIMEOUT、PROCESS_EXIT_UNCONFIRMED。用户可操作文字与内部机器码分离。

## 4. 认证的正确完成边界

**浏览器回调成功只说明返回被接收。**最终“账号已连接”只能由Main在以下条件成立后发布：

1. callback与当前操作匹配，state/URI/code/client信息经过验证。
2. token交换成功，身份和授权范围经过本应用要求的验证。
3. Vault与连接修订补偿成功，实际读取安全元数据确认持久状态。
4. Worker生命周期按现有close协议收敛；如果资源未知，UI单独说明，不伪称已释放。

回调页立即返回时使用“DAM已收到授权，应用正在完成验证。请返回DAM查看最终状态”，不是“认证已完成”。若做回调页结果查询，只能读取本次短期操作的无秘密状态，且不得新增开放的账号API。优先让应用恢复焦点与状态更新，不为一个提示再建长期服务器。

## 5. 已确认拒绝分支的最小修复

`parseCallback`继续先验证来源和state。有效的用户拒绝/厂商明确error到达后，应结束当前尝试、取消对应manual prompt、关闭自有listener并让Main收到AUTH_DENIED；不请求token、JWKS或模型。

错误state、错误Host、过期旧操作、错误路径等不应终止另一个合法正在进行的授权。无效请求可返回400并保持当前listener；重复已消费回调返回明确拒绝，不再交换code。不能把全部catch都改成doneReject，也不能把所有400改成成功。

验收必须覆盖：正确state拒绝立即结案；错误state拒绝不杀合法尝试；之后正确回调仍成功；重复回调；cancel与回调并发；超时后迟到；manual与自动回调竞态。生产五分钟上限不因测试快进而被随意增大。

## 6. 页面不是登录任务的所有者

当前配置组件unmount会cancelLogin，这使长期外部浏览器流程与短期页面绑定。建议将AuthOperation由Main拥有，Renderer订阅或查询安全状态：

- 切浏览器、离开AI页、返回素材页：不会自动结束账号登录；全局可见“登录进行中”，回到连接页恢复相同operation。
- 用户明确取消、删除相应连接、改变身份/目的地、开始取代旧尝试的新登录、退出应用：撤销对应操作。
- 普通资料库关闭/打开失败：不得无理由撤销App级账户身份流程；涉及素材分析的review/claim仍由Host立即撤销。当前Main全局suspend逻辑需要逐项拆清，不可直接全部resume绕过UNKNOWN保护。
- App退出：有界收敛自有listener/Worker和凭据写入；不可中断一半写入后伪称旧账号已恢复。

一个连接同一时刻只有一个有效登录；同Provider不同连接不得共享凭据。页面回调/订阅按generation清理，旧轮询响应不能覆盖新账号。

## 7. 持久化与恢复状态

身份、注册和凭据仍由Main Vault保护。普通UI可读取安全状态（已保存、类型、到期/重新登录需要、身份验证/计划权限布尔、绑定的连接revision），不得读回token或完整ID token。账号显示名称使用明确可显示的元数据；报告中不导出真实邮件/subject。

`credentialRevision`表示账号或凭据选择的世代，不因正常access token刷新就让所有合法任务失效。refresh与新登录、登出串行；新登录失败保留旧账号；token旋转与scope更新原子保存；保存失败不假装登录完成。

重启不能恢复旧授权code、旧listener、原库权限或已过期的login operation。可恢复的是已持久验证的账号状态。身份登录成功但无plan scope要可持久显示，不能在刷新页面后变成泛化绿色“可推理”。

新注册已收到issued client但交换失败的重试策略需对照固定上游及官方契约：保留非秘密的待完成注册信息时必须标记未验证、不给推理权，不把它与完成账号混合。只重试明确可重试步骤；失效code不无限重放，禁止自动切到API Key计费。

## 8. 网络与配置核查清单

- Browser/system listener是否同一机器，127.0.0.1不指向另一台开发机；不要用更换端口掩盖host不一致。远程浏览器情形单独设计支持范围，默认提示在DAM所在机器完成。
- listener在打开浏览器之前建立；随机可用端口本身不是错误，必须每次authorization与token使用完全相同的redirect URI。
- issuer/JWKS/token端点从官方固定契约核实；不要猜测并用更宽泛域名白名单解除失败。
- 用维护良好的JWT实现（若项目已具备适用依赖则优先复用）替代无必要的自研密码学；新增依赖另行列版本/SRI/许可证并批准。未批准时保留并扩展当前验证测试，不能为了登录删签名/nonce/sub检查。
- proxy/TLS/网络异常只输出安全类别；不读取开发者全局代理/认证配置作为隐式fallback。
- 样式或名称变更不应触发网络。目录显示区分静态catalog与实时服务返回。
- Models.getAuth可能刷新令牌，不能作为只读页面健康探测；一次推理的认证、refresh、send应有同一截止时间和明确计数。
- disabled Provider继续阻断到有契约和实际允许范围；本批不自动解锁Google/Copilot/其他订阅。

## 9. 逐层验证，不能用假账号证明真登录

| 层 | 使用真实什么 | 可以替代什么 | 不能证明什么 |
|---|---|---|---|
| 纯状态/参数 | Main状态机与Validator | 时间、UUID、受控输入 | 厂商账号成功 |
| 实际SDK假网络 | 固定Models/Provider/OAuth接口 | token/JWKS响应、错误、延迟 | 真实账号权益 |
| 实际listener | 本应用自有HTTP listener | callback查询值、浏览器访问源 | 用户操作可发现 |
| Vault补偿 | 实际事务/写入逻辑 | 安全存储适配器或临时目录 | 真实Keychain可用 |
| Native CU合成 | 正式应用UI、系统输入、实际Main链 | 自有认证服务/测试Provider，必须独立标识 | 真实厂商授权 |
| 用户辅助真实登录 | 用户在同机厂商浏览器输入、真实受控回调、Main持久状态 | 不能伪造身份、scope或token | 未执行的图片推理与费用 |

真实登录测试限定“账号连接”，不自动发图片、不读取用户库。用户只在厂商界面输入密码/二次验证；任何需要复制callback内容的紧急回退只进DAM本机秘密输入控件，不进聊天、报告、CLI参数或截图。

## 10. 本专题完成标准

不能以“更换提示文案”或“永久禁用用户明确需要的ChatGPT”作为已修复。先完成受控链与诊断，再进行用户辅助的指定账号验收；没有真实验收就写AUTH_REAL_NOT_RUN，代码准备可以交付，真实故障不能宣告关闭。

合格交付必须回答：本次用户失败在哪个阶段（有证据才填）；修改解决了什么；旧账号如何保护；浏览器返回与最终账号状态是否一致；重启后状态是否相同；模型权限是否单列；同机/不同机行为是否明确；每个结论是哪层证据。
