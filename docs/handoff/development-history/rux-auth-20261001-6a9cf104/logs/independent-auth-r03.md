# R03 认证第二轮独立只读审查

范围：Main connection service / Runtime Host、Worker、ChatGPT auth、Credential Vault、安全契约、Main IPC 和 Library/shutdown wiring。UI R04 仍变化，未审 UI。未执行测试、网络、真实账号、真实库或缓存操作；没有修改业务源码/TASK/Git。本报告不是最终全批 PASS。

## 已解决的第一轮主要问题（源码确认）

- 匹配本次 state 的合法拒绝使 listener.result reject，finally 关闭本机 listener；错误 state 仍拒绝单个请求。无需 token/JWKS 请求结束拒绝。
- 登录 browser 等待不再使用 tracked/serialized。只有 credential callback 的短提交串行化；Library authority change 使用 drainInference；shutdown 使用 suspendAll+drain，后者等 tails 与 account completion。
- Vault persist callback revise 成功后记录 committed，晚 cancel/timeout 不取消已提交账号；catch 对已提交记录保持 completed。commit 前 assertCurrent 检查 closing/signal/latest operation/binding，失败沿 Vault previous 回滚机制。
- configurationChanged 在成功 backend/settings 保存后执行；无关 settings 不执行。账号只在原连接 binding 不同才取消；其他连接改变不会终止本账号。旧 CAS 仍存在。
- Main 创建 Worker 前检查安全存储。Worker/Host 按 auth-protocol 固定枚举传 auth stage/code，不返回 raw vendor body/error description。
- 身份-only 无 access/refresh 可以存入加密 Vault；Main infer 在 spawn 前拒绝 planUsageAuthorized!=true，Worker toAuth 同样拒绝。Vault metadata 返回布尔/expiry/relogin，不返回 subject/token/privateURL。
- currentLogin/latest operation 可让页面重新获取 Main 所有的状态；activeLogins 投影有限公共字段。安全 diagnostic 含 build/stage/timeline/code/commit 状态，不含凭据。

## 仍需修复的具体阻断

### B1 / P1：已有 UNKNOWN Worker 的新登录投影错误，并覆盖恢复指针

`createPiRuntimeHost.execute` 在 unknown.size 已非零时抛普通 Error('AI_PROCESS_EXIT_UNCONFIRMED')。`login.catch` 只用 instanceof PiProcessUnconfirmedError 判断 unknown。因此先前 Worker 未关闭时又调用 login，会先覆盖 latestLogin，再得到 state=failed、workerCloseStatus=confirmed（错误确认）；原 unknown 记录仍保留但 currentLogin 指向失败新尝试。

建议：在取消旧操作与创建 operation 前检查 runtime.inspect().unknown 并拒绝新登录，保留旧 current。并让 AI_PROCESS_EXIT_UNCONFIRMED 普通错误不能投影为 confirmed；必要时区分没有新 spawn 与既有全局 UNKNOWN。原实例带 released 的路径仍必须等真实 late close。不要仅修 UI 禁用；Main 必须保护入口。

反例：runtime 第一次抛带 released 的 PiProcessUnconfirmedError / inspect unknown=1，发第二次 login；断言未创建新 Worker/未换 latest、active projection 和 diagnostic 保持 unknown；late released 后才允许 fresh attempt。也检查 inference 导致全局 unknown 时 OAuth 新入口不能误报关闭。

### B2 / P2：Worker stage whitelist 包含 Main 自有的已保存阶段

Host 接受 auth-protocol 全 stages，其中 persisting-credentials / connected-identity / connected-plan 应由 Main commit 推进。当前 malformed Worker 只要发已知 connected-plan frame，即可在无 Vault commit 时让 public stage 声称“账号与计划权限已保存”；随后 Main stage 单调规则阻止回到实际验证阶段。固定生产 Worker 当前未这样发，但接口可信责任应在 Host/Main 强制。

建议：Worker/Host authStage 仅允许 preparing-listener / awaiting-browser / callback-received / exchanging-code / verifying-identity。preparing-local-storage / persisting / connected-* 只由 Main 推进；拒绝 Worker 非法 owner stage 为 AI_PROTOCOL_INVALID。反例用合成 stdio frame 验证尚未提交时不能出现已保存阶段。

## 证据与测试限制

以下是只读看到的主 Agent 执行记录，未由本审查者独立重跑；sha 为已有记录字段，不证明最新所有源码已冻结。
- r03-denial: exitCode=0, timeout=False, evidenceSha256=e90da9e5e196f2f3a9645144f2f719c6e56cca942cc1d9b0e588567311f81e79
- r03-account-lifecycle: exitCode=0, timeout=False, evidenceSha256=b1bca9f4647e2855ad188e1e40e59eda907c2ee9b838a32684c446abaa474418
- r03-auth-crypto-progress: exitCode=0, timeout=False, evidenceSha256=f5ef72ac1c8169922fcf8ab795017dbae3eb407f8c6bf68b8cd8b2f1dfa5be36
- r03-sdk-auth: exitCode=0, timeout=False, evidenceSha256=cf5715f76d4829711214ece98a0a3d5e37fb2f8f4c464b330fd96c9cbecdee18
- r03-credentials-scoped: exitCode=0, timeout=False, evidenceSha256=39a2334da9cb486cf59bf0a161a76721d2e8313d3a4031f05672cbad6e777231
- r03-prompts-storage: exitCode=0, timeout=False, evidenceSha256=82b1a196f43328bacd2f1a914b14c02a1d94fec9dcaab4f6a834bb180c3cd238
- r03-oauth-old: exitCode=0, timeout=False, evidenceSha256=b0cc8efca5e82c846a9daa1a0e7510341a95f4d8d9299c61f06b8c8e1beb001c

注意：auth-account-lifecycle 最后一个用例标题声称 fresh Vault，但实际使用同一个 f.vault.status；该 Vault 每次从文件读取，证明了持久行安全投影，尚未直接证明 fresh service + latest 状态恢复。它也没有执行 Main infer 的身份-only zero spawn 反例。late cancel 测试在真实 Vault.set 完成后 wrapper gate 阻塞，能验证 Main晚提交状态；尚未直接把文件 I/O gate 放在 pending write 与 persist callback之间。以上可以补关键反例，不应扩大成真实账号或免费推理通过声明。

本轮尚未核对 UI Computer Use 或安全清理；其通过必须另有真实可见操作与删除证明。真实账号继续 NOT_RUN。
