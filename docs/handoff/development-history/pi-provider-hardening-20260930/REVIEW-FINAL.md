# Provider收尾独立复核

独立reviewer：/root/pi_provider_hardening_review；业务代码只读，仅获准写本批logs/independent-*原始证据。用户同会话委托独立复核的授权持续适用，root为唯一业务写者。

审查批准提示、before、shared policy、Main/Worker、配置投影、窄prompt与答案、opaque hostID、实际SDK调用、生产与测试构造边界、旧OAuth保护、封印/资源分发和取消。独立核对固定Anthropic SDK的API key→OAuth识别分支，修补在Main/Worker同规则拒绝，保留旧数据。生产不注入admission/authorizeContract/loginEligibility/loginTimeoutMs的测试放行；没有环境或Renderer设置入口。

最终有效独立重跑：

| 原始日志 | 数量 | exitCode | timeout |
| --- | ---: | ---: | --- |
| independent-native-sealed | 17 | 0 | false |
| independent-admission-sealed | 8 | 0 | false |
| independent-prompts-expiry | 5 | 0 | false |

总计30项，不重复计旧16/6/4/5等历史独立重跑。到期通过内部20ms真实timer验证，生产默认且上限五分钟。实际SDK图像测试为生成JPEG，假网络验证有效图片字段；Codex实际SDK两分支及假令牌贯通是隔离Tracer。

结论：未发现需修复的剩余代码问题；有限矩阵可以交付。注册/client复用/JWT身份、受控认证网络、真实账号/模型、Keychain、Windows与签名安装均未验收。F01/F02/F05/F06的产品阻断不能表述为已实现所有原生认证能力。真实disk-cold未测，不以warm样本替代。
