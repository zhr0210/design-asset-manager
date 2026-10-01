# DAM Pi 统一模型接入实施报告

日期：2026-09-30。结论：本轮获准的源码实现、隔离验收、独立复核和交接已完成。真实服务验收按用户明确选择延期；这不是生产所有账号/模型/平台已验收的声明。

## 范围与交付

用户批准“本地模型＋OpenAI兼容API优先，再接订阅”的 PI-01–08 方案并要求开始执行，随后选择“先完成隔离验收，真实账号后续配置”。本轮只使用生成图片、临时资料库、隔离 profile、自有 loopback 服务和固定 SDK 资源。没有读取真实应用设置、真实凭据或用户素材库，没有启动真实模型、下载权重或向云端发送素材。已安装的公开开发依赖为批准的 Pi 0.99.1 与独立 Node 24.21.0。

新增正式模型连接与任务配置入口，统一兼容本机/API的模型选择、图片传输、结果映射及订阅认证适配。保留旧接口的单次调用、应用层统一重试、资料库权威与人工状态保护。新路径出错明确反馈，不能静默切换到旧接口或另一个 Provider。

## 当前调用框架

```text
DAM AI Console / Inspector / 独立标签
├─ 连接配置与任务默认模型（analyze / reverse / tags）
├─ 专用加密凭据 / 显式迁移 / 有界订阅登录
└─ 单次执行范围确认
   └─ Main：冻结连接、模型、凭据revision、目的地与受控输入
      ├─ 已有连接 → Legacy 单次 HTTP Provider
      └─ Pi 连接 → Runtime Host → 固定 Node 24.21.0
         └─ Pi 0.99.1 Worker → 明确选定 Provider
            ├─ OpenAI-compatible 本机服务/API
            ├─ OpenAI / Anthropic / Google API 适配
            └─ OpenAI/Codex / Anthropic / Copilot 订阅适配
      └─ 既有 Controller：重试、时限、准入、取消、晚到拒写
         └─ Active Library Host：权威写入、claim/receipt、人工状态保护
```

OCR继续专用链；没有新增自动 caption、embedding、模型启动器或权重管理。具体品牌的实际账号/服务可用性未验收，以上品牌行表示固定 SDK 适配接线。

## 按阶段对账

| 阶段 | 本轮完成 | 验收与限制 |
| --- | --- | --- |
| PI-01 | 固定分发、锁文件、独立Node、完整资源清单与extraResources | macOS arm64资源副本离线启动通过；Windows/其他架构/签名安装包NOT_RUN |
| PI-02 | 窄IPC、秘密白名单投影、Vault/settings补偿、显式迁移/登出/账号revision | 14项凭据测试通过；真实OS保险库NOT_RUN |
| PI-03 | 有界stdio、单动作owned Worker、SDK零重试、取消/drain/UNKNOWN | 5项实际Pi协议及9项OAuth/进程夹具通过 |
| PI-04 | 正式视觉与独立标签调用方统一Provider、旧接口兼容 | 7项真实临时Host通过，含标签claim/commit/成功重复零再推理/重开；真实模型/API延期 |
| PI-05 | AI Console连接、模型目录/手动ID、任务分配、能力声明/验证分离 | 4项React与1项正式Electron通过；保存/目录不启动素材推理 |
| PI-06 | 订阅登录提示/设备码/浏览器/取消/刷新适配、固定认证支持表 | 隔离协议与目录metadata验证；真实账号登录/额度/品牌许可待后续确认 |
| PI-07 | 本机结果到外部细化的选定证据关联与单独授权、可得用量/估计 | 历史OCR不外发；费用未知为null；实际云端质量/账单NOT_RUN |
| PI-08 | 最终回归、独立复核、before/after、补丁、原始日志和源码交接 | 限定隔离范围完成；不自动进入真实账号/用户库/平台发布 |

## 测试结果

最终选用的新增测试为43项：Pi真实协议5、凭据14、OAuth/进程9、真实临时Host7、资源/Provider metadata2、React4、正式Electron1、旧认证目录探测1，全部通过。正式Electron使用正式Main/Preload/Renderer与隔离profile，覆盖配置、秘密不回传、目录、任务默认、单独能力验证、素材分析、外部细化、持久保存重开和退出。能力验证/分析/细化分别计数，配置操作零素材推理。

相关回归：独立标签执行30、批次12、恢复22、视觉Provider9、资源准入10、OCR Controller12、后台OCR35，共130项通过；App Settings与AI backend restoration两个断言脚本通过。最后typecheck/build通过。

独立reviewer最终复跑资源2、Host7、旧认证探测1，共10项通过；见 REVIEW-FINAL.md 和 logs/independent-*。正式截图见 screenshots/pi-config.png 与 pi-result.png。截图只证明界面；正式链路断言与日志独立记录。

EVIDENCE-MAP.json列出本轮实际command、exitCode、timeout、日志SHA、测试数量及最终采用记录。没有将重复运行数量累加成新增测试数量。

## 发现与修正

独立复核的五项问题（Codex认证、细化OCR披露、额外依赖遮蔽、旧设置秘密入口、迁移后旧接口认证探测）全部修复并复核闭环。连接地址/账号变化撤销旧review；未保存地址草稿不携带已有密钥探测。关库与退出等待owned进程收敛，UNKNOWN保留资源直到实际close，不以Promise拒绝冒充释放。

早期红灯完整保留：keyless SDK占位认证、开发资源定位、OAuth双Worker夹具时序、SQLite错误ABI runner、错误地给旧HTTP附加Pi内存预算导致两项240秒超时。修复后采用相应正确runner/预算/路径并通过。本次review修补的类型名错误、资源复制改变符号链接语义，以及浏览器option断言方法问题也保留原始失败；没有删日志、跳过失败或放宽生产权限。

## 来源与环境影响

Pi npm精确版本和SRI在pi-runtime/package-lock.json；Node官方archive为52,909,993 bytes，SHA见DEPENDENCY-PLAN.json与pi-runtime/README.md。保留Node和第三方包许可证；运行时清单封印11827个普通文件与2个登记链接。主应用Electron/SQLite ABI未重编。交接源码不包含Node大二进制或node_modules，不是可分发安装程序。

没有暂存、提交、推送、发布、签名或操作真实数据库。WORKSPACE-PROTECTION.json核验2715份开始基线；授权改动均有对应before快照，无缺失或未归类修改。原staged diff摘要相同。原index二进制摘要与当前不同，未留原index副本、无法归因，因此不能宣称index字节保持；未恢复或改写index以掩盖差异。

## 接收工程师复核

先读FINAL-HANDOFF.json，再读本报告、REVIEW-FINAL.md、EVIDENCE-MAP.json。源码快照包含现有WIP相关调用方，不是干净Git提交。DELTA.json与CHANGES.patch只表达本轮改动；对目标文件先比before SHA，不直接覆盖工程师现有修改。PATCH-VERIFICATION.json记录补丁在独立临时目录重建后的after摘要一致。

真实账号下一轮需指定服务/账号、生成测试素材、外发目的地和费用上限，再验证本地模型、API和订阅。Keychain、Windows、安装包/签名、远端真实取消及模型质量另行验收。没有把旧Qwen授权扩大到此轮真实模型启动。
