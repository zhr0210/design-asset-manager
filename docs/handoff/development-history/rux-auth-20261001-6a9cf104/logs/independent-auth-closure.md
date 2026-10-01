# 认证源码复核闭合

状态：SOURCE_PASS，范围仅为本轮 DAM 账号服务的源码与内部可信边界，不表示交互、真实账号或整个 R00–R08 最终通过。

本轮有限只读复核 Main connection service、Credential Vault、ChatGPT auth adapter，以及连接表单诊断按钮。未运行任何测试、Computer Use、网络、模型或真实账号操作；未读取真实凭据/用户库。已有后台回归记录由主 Agent 产生，本审查未重跑。

已闭合前述空 access + plan=true 矛盾：Main commit 检查 result/credential 资格一致，并要求非空字符串access和两项scope；Main infer同样在Worker之前拒绝；Vault.set拒绝空access+plan真，status资格投影要求字符串access+scope。正常auth adapter原本就从hasAccess+scope计算资格。合法access存在但缺refresh仍能保存；没有access的identity-only仍能保存但不能推理。此前B1/B2闭合保护继续存在。

公共activeLogins已在Runtime UNKNOWN归零时收敛关闭状态；React观察unknown状态，无卸载自动取消。可见“复制脱敏登录诊断”按钮只从Main固定摘要端点复制，源代码没有把token、subject、私有授权URL或用户素材写入该摘要。按钮存在不等于剪贴板/Computer Use实际验收。

没有发现当前复核范围内新的源码级阻断。前述报告 independent-auth-final-source.md 的剩余资格补强项由本报告闭合；保留原报告与失败/审查历史，不覆盖它。

限制：Worker toAuth本身仍依据validRegistration+plan flag，DAM正式调用方已在Main追加access/scope强检查；不把该适配器声明为可脱离DAM Main任意复用的完整安全API。Unknown历史attempt state仍可保持unknown，即使workerCloseStatus已confirmed；属于历史诊断解释/可见交互待CU判断，不影响Main新spawn屏障。

SOURCE_PASS依赖以下源码摘要；后续实质修改需再复核：
- src/main/ai-gateway/ai-connection-service.ts: 5cdcf447306e9b15eabc970aea4b065347faa08d1aca0340b2d7f9eb3494488f
- src/main/ai-credentials/credential-vault.ts: 1073c2097b8d641205cfc67e81de8266cfcfe9a61ef126171baeb8f40d01a367
- pi-runtime/openai-chatgpt-auth.mjs: b9e206d542a8a28aec683451213c7e547a21359f889f392de8ec993544d54df7
- src/renderer/components/asset/PiConnectionsPanel.tsx: f3ac3ae2ee3e807077d4dd314fcb811fc72ff356472f1e9012227604760b52ee

最终交接请独立记录：后台契约测试（引用已有log）、Computer Use（本审查未测）、真实账号（本审查未测）、安全清理（不在本审查范围）。真实可用性不得从本SOURCE_PASS推出。
