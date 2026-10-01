# DP01 实施与交接报告

本批完成范围：工作区基线、旧后台 OCR Runtime 观察撤权、完成锚点 v2、生成图片服务验收入口，以及用户明确批准的受控 ChatGPT 订阅登录入口。状态只代表隔离范围；真实账号、真实模型和付费服务仍为 NOT_RUN。最终复核签收与停止状态以同目录 FINAL-HANDOFF.json、REVIEW.md 为准。

## 授权与现场

- 执行依据：本轮用户批准 DP01，并选择 ChatGPT 订阅登录。附件中的架构目标、历史测试和候选补丁不是现场已实现事实。
- 用户对 ChatGPT 的最新批准覆盖附件中该路径保持禁用的限制；Google、Codex、Anthropic 订阅及 Copilot 的限制保留。
- 起点已有 Pi 受限接入。本批未重做历史批次，未升级 SDK、Node 或原生 SQLite ABI，未下载依赖或模型。
- 基线记录 2,755 个文件。DELTA 为本批 45 个文件：28 个既有文件修改、17 个新增。未暂存、提交、推送、回滚或清理用户 WIP。
- SOURCE-MANIFEST 绑定 679 个当前源码、契约和验证工具文件；这是一份部分项目源码快照，包含既有 WIP，不代表本批创作或逐项审计全部文件。摘要算法在清单中明确声明。
- index 与 staged 字节摘要保持一致；无基线文件删除、无范围外基线文件修改。证据见 WORKSPACE-PRESERVATION.json。

## 本批交付

| 切片 | 结果 | 验证边界 |
| --- | --- | --- |
| 01A 基线 | 当前源码、WIP、index/staged 与旧报告分开登记 | BASELINE / DELTA / WORKSPACE-PRESERVATION |
| 01B OCR | read/prepare/confirm/tick/claim/sent 前的异步观察均检查原会话、权限 revision 和 epoch；旧观察不能撤销新许可，A→B→A 不能恢复旧许可 | 21 控制器、10 真实临时 Host，另有 35 旧后台 OCR 回归 |
| 01C 锚点 | 已知 OCR/Pi/v2 格式显式适配；校验 STATE、源码、报告和复核；默认只读；CAS、独占协作锁及原子替换；不会自动抢旧锁或恢复任务 | 25 标准库用例；旧 FINAL/manifest 保持原样 |
| 01D 账号入口 | OpenAI OAuth 的 Continue with ChatGPT 使用 DAM 注册、稳定 host 身份、issued client 复用、签名身份验证与独立有界认证网络 | 9 认证用例、3 实际固定 SDK/Main/React 隔离用例；真实账号未登录 |
| 01D 服务验收 | 默认只生成计划；用户确认后签发单次 Main 许可，只使用生成图片与独立临时 Host；实际 Gateway/Controller/Host 不被替换 | 4 许可、6 Host/生命周期、1 正式 Main/Preload/Renderer 验收 |
| 01E 回归 | OCR、Pi、UI、原生 SDK、资源副本、类型与构建；独立只读复核 | 原始命令、退出码和日志见 EVIDENCE-MAP |
| 01F 交接 | 当前源码清单、before/after、最小补丁、完整红绿日志、限制和终态 | 复核后登记 LATEST，完成后 STOP |

## 正式调用链

```text
AI Console
├─ Pi 模型连接：OpenAI / OAuth / Continue with ChatGPT
│  └─ 窄 IPC → Main Connection Service → 私有凭据保险库
│     └─ 固定 Runtime Host → Node 24.21.0 → Pi 0.99.1 Worker
│        └─ DAM 认证适配 → 独占本机回调 / token / JWKS
└─ 生成图片服务验收
   ├─ 生成计划：公共连接配置 + 自有生成图片；零目录/探测/凭据/网络
   └─ 用户确认：一次性签名许可 + 持久请求预算
      └─ 原 Connection Gateway → Visual Controller + 共享资源准入
         └─ 指定 Provider → 真实临时 Active Library Host
            └─ 重开核对证据与原图摘要 → 关闭并回收自有临时目录
```

Worker 不写资料库，Renderer 不持有可信数据库、文件或模型执行权。没有静默 fallback。账号配置与登录不授权上传用户素材。

## 安全与实际行为

ChatGPT 登录只开放受控 DAM 适配，未放行旧 Pi 注册流程。ID token 检查签名、issuer、audience、有效期、nonce 与账号身份；只允许指定 token/JWKS 目的地、方法与有限字节/请求/时限，拒绝重定向。完整授权地址和 id_token_hint 留在 Main，Renderer 只见无查询参数的公开地址。身份登录没有 plan usage resource scope 时保留身份但拒绝推理。旧账号在取消、错误 state 或身份验证失败时保持。

验收许可绑定连接配置、凭据 revision、模型、目的地、生成输入摘要和有限请求/token/墙钟/费用估计。每次尝试预扣预算，一次截断重试也扣第二次，不自动退款。验收禁止自动认证刷新，避免推理预算外的认证请求。费用是用户保守估计，**不保证真实账单硬上限**；生产费用默认未知时拒绝执行。当前零费用模式仅供自有合成测试，未交付真实免费本机服务的独立零费用声明入口。

准备与确认在首次 await 前登记。关闭或资料库切换等待确认、运行、提交核对与资源释放；UNKNOWN 保持资源到 owned release，超时不能宣称已关闭。Main 只在关闭协调器 idle 分支恢复入口。

Pi 完整树校验仅忽略精确 basename `.DS_Store` 的普通系统元数据文件；同名软链接、目录、其他新增文件、shadow 依赖及已封存内容变化仍拒绝。不读取或删除 Finder 元数据。固定运行文件清单现为 11,830 个文件及 2 个链接。

## 测试与失败记录

最终测试按声明范围去重，共 196 个用例；独立重跑的 81 个是其中子集，不重复相加。类型检查、构建、默认 PLAN_ONLY 和重新封印另计。以 EVIDENCE-MAP 的命令/退出码/实际发现数量为最终依据，不能用报告文字替代日志。

保留全部红灯记录，包括：旧观察/确认竞态反例、模型完整性检查拒绝、正式界面准备阶段被暂停，以及系统新增 `.DS_Store` 导致的联网前拒绝。后者通过固定文件摘要、链接和额外文件清单的小诊断定位，并验证精确元数据例外；没有跳过测试、放宽所有新增文件或删除系统文件。两项独立审查发现的确认/drain 和 Main 恢复分支缺陷已修复并增加反例。

SQLite 沿用仓库 Electron Node 启动器。认证测试使用合成签名身份和受控网络；推理测试使用测试自身持有的 loopback 服务；真实 Host 测试使用生成素材和临时 SQLite。UNKNOWN 用例替换的是 Gateway 的未确认退出故障，仍运行原控制器、资源与临时 Host；真实子进程释放另由 OCR/Pi 生命周期回归验证。

正式 Electron 用例显式关闭自有应用、等待 shutdown-complete 并回收自有临时数据；运行器均无超时。没有以进程名字或端口终止用户服务，也没有声称检查了所有系统进程。

## NOT_RUN 与保留限制

- 真实 ChatGPT 账号登录、订阅权限/额度、付费 API、真实模型推理和输出质量。
- 真实操作系统 Keychain/safeStorage、真实用户素材或资料库、旧库迁移与历史回填。
- 实际 RapidOCR 资格、模型权重、常驻服务、Windows/其他架构、签名与安装包。
- 真实账单与硬费用上限、OS disk-cold、持续负载或大库性能。
- Google、Codex、Anthropic 订阅、Copilot 未开放；后台 OCR production qualification 仍为 null，B01 开关仍只有规划语义。

## 工程师接手索引

先读 FINAL-HANDOFF.json → REPORT.md → REVIEW.md → DELTA.json → SOURCE-MANIFEST.json → EVIDENCE-MAP.json。changes.patch 相对本轮工作区 before，不是干净 Git HEAD 的补丁，禁止盲套；逐项核对 before hash 后再合并。

用户验证入口：AI Console → Pi 模型连接 → OpenAI → OAuth → Continue with ChatGPT。真实密码只在厂商页面输入；登录后另行审阅生成图片验收的目的地和有限预算。不要在交接中发送 token、授权 code 或完整回调 URL。

完成终态不会授权 DP02、真实账号外发或任何历史队列；nextBatchAuthorized=false、automaticResume=false，完成后停止。
