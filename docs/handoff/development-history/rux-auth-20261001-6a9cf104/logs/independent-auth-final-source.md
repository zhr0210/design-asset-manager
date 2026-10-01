# 认证最终候选源码复核（只签源码边界）

状态：SOURCE_REVIEW_WITH_ONE_REMAINING_HARDENING_ITEM。本报告不签 Computer Use、真实账号、测试独立执行或全批验收。主 Agent 回归仍进行，源码仍可能变化；源码摘要见 independent-auth-final-source-manifest.json。

审查者只读审查 Main/Worker/Vault/React App账号生命周期、安全投影与提交线性点，不执行测试、网络、模型、真实资料库、凭据读取或 Git 写操作。只新增本报告/源码摘要两个审查文件。

## 已确认闭合的先前阻断

- B1：login 在创建新 operation/覆盖 latest 之前检查 Runtime inspect().unknown；已有 UNKNOWN 新登录被拒绝。catch 对 plain AI_PROCESS_EXIT_UNCONFIRMED 也投影 unknown，而不是 confirmed。currentLogin 在 Runtime全局unknown清零后可以更新关闭状态。
- B2：auth-protocol.workerStages 只包含 preparing-listener / awaiting-browser / callback-received / exchanging-code / verifying-identity；Worker、真实 Runtime parser 和 Main callback 都检查该子集。preparing-local-storage / persisting / connected-* 仅 Main产生。新的 owned-stage 测试源码使用实际封印verify与合成child，4种非法Main-owned帧要求协议拒绝、0commit、0unknown。
- 登录浏览器等待与素材 tracked/tails 分离；只有凭据commit短serialized段。Library drainInference 不取消账号；shutdown suspendAll+drain 等全部completion/串行事务并检查Runtime UNKNOWN。
- commit线性点在 settings revise 成功后同步 record.committed=true；late取消不把已提交状态覆盖为旧凭据保留。commit前 signal/latest/binding/closing 检查继续保护rollback。
- React卸载与选择别的连接只停止本地观察/清输入，未取消Main账号；currentLogin可恢复。AppShell公共AuthActivity只取secret-free投影。
- callback合法拒绝结案、错误state不终止当前尝试、有限受控token/JWKS、身份签名与nonce/issuer/audience/subject验证、加密Vault pending/previous revision保护和真实close后提交均保留。
- public credential/status/diagnostic只投影metadata、stage/code/timeline/build，未看到 token、email、subject、private callback或完整授权URL进入公共诊断。Main私有auth URL映射与system browser受信sender校验继续保留。

## 仍需收敛：空 access 不能因残留 flag 表示计划权限有效

当前 `credential-vault.ts` 为允许合法access存在但不带refresh的grant放宽set验证，但无access也只需registration/identity/client/idToken即可存储；不再要求planUsageAuthorized=false。status、Main execute与Worker toAuth仍仅依据planUsageAuthorized flag。在正常auth adapter中flag=hasAccess&&scopes，正常路径不会产生矛盾；但malformed credential/result协议反例可以用空access+plan=true骗过存储及“计划已授权”投影。

建议：保留“access存在但无refresh”合法grant，不新增refresh强制；在Main login提交检查credential/result资格一致，plan=true须有非空字符串access；Vault set对无access+plan=true拒绝，status资格投影须包括非空access；Main infer和Worker toAuth同样拒绝空access，防止已有矛盾行进入推理。必要反例：无access+plan=true不能提交，旧revision不变；已存在矛盾fixture行 status.plan=false 且infer0spawn；有access且无refresh仍能保存/投影，过期需重新登录。

## 未作通过声明的交互/证据项

- Unknown UI不再轮询（只poll starting/interaction/cancelling）；普通globalUnknown收敛仅由currentLogin更新，activeLogins不自动刷新。这不会绕过Main新spawn保护，但可能显示陈旧“退出未确认”。建议unknown期间继续观察直到关闭confirmed，届时显示已收敛可重试。
- 当前PiConnectionsPanel未消费authDiagnostic，AiWorkspace诊断页只有About/生成图验收入口。如包要求用户生成/复制认证诊断摘要，Main端点存在不等于用户入口完成，须补可见按钮并Computer Use验收。
- 新account测试源码含fresh Vault真正新实例及Main identity-only infer0新增spawn；本审查未运行。新增UNKNOWN测试证明quarantine拒绝保留current，不等于真实unknown子进程完整late-close UI验收。
- 本轮未做Computer Use，未测试真实账号。真实厂商浏览器登录/真实OS安全存储/计划推理仍不能标通过；不能从源码、IPC、Store或DOM测试推导。

如上述资格矛盾得到修复，本审查未发现其他认证源码级必须阻断的问题。最终交接仍须逐项报告代码/契约、Computer Use、真实账号与安全清理的独立状态。
