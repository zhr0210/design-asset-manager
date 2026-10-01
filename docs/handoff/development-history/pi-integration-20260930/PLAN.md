# DAM：Pi 模型接入实施计划

日期：2026-09-30。状态：PROPOSED / PLAN_ONLY。

本文件响应用户“制定计划完成pi接入”。用户已选择“先接本地模型＋OpenAI 兼容 API，再接订阅”，实施顺序已按此固定。它是新方案，不是已实现声明，不恢复旧任务队列。下一次批准实施时，以本方案的明确范围建立新的运行记录；本轮不更新 TASK.md、不安装依赖、不登录账号、不发起模型推理。

## 1. 交付目标与完成定义

让 DAM 的同一个素材分析入口能够选择本地 LLM、云端 API 或可用的订阅账号，并统一获得可校验的结果、执行状态、用量和来源证据。

最终交付包括：

1. Pi 运行环境与可替换的 LLM Adapter，已有本地兼容入口保持可用。
2. 服务连接、账号认证、模型目录和任务模型分配的正式配置界面。
3. Main 管理的凭据存储，普通设置和 Renderer 不返回保存的 API Key / OAuth Token。
4. 本地兼容 Provider，以及用户指定的一家云端 API 和一家订阅 Provider；具体服务根据用户优先级确定。
5. 有明确披露的一条协作流程：本地生成初步分析，用户确认后把选定受控预览及选定结构化结果交给外部模型细化。
6. 真实临时 Host、正式 Electron 及打包运行验证；实际模型/账号验收单列，缺失时明确 NOT_RUN。

分清两个终点：隔离的代码与正式接线验收可以先完成；真实本地服务、付费 API、订阅账号、Windows 安装包未验收时，不宣称对应能力已经投入生产。若实际账号或测试平台缺失，报告准确标记受限交付，不能把未完成项隐去。

## 2. 当前事实与依据

| 已核实对象 | 当前情况 | 对计划的影响 |
| --- | --- | --- |
| DAM Electron | 30.5.1，内置 Node 20.16.0 | 新 Pi 不直接视为 Main 兼容依赖 |
| Pi 固定研究快照 | commit `1b347794e2a630e4359f2584f4eea388145d0ddf`，packages/ai 声明 0.99.1、Node ≥22.19.0、MIT | 实施前核对发布包与锁文件；main 的版本声明不等于已经验证 npm 分发物 |
| `VisionProvider.invokeOnce` | Main 内部单次调用 seam，无内置业务重试或数据库写入 | 第一条 Pi 接线从这里切入 |
| `runVisionRequest` | 受控 JPEG，完整结果校验；截断最多重试一次，共用上层取消/期限 | Pi 不能叠加自己的自动重试扩大调用次数 |
| 独立标签 | 复用 VisionProvider，已有 claim、回执、恢复和用户状态保护 | 迁移 Transport，不重做存储任务体系 |
| Backend 配置 | `apiKey` 在 AiBackendConfig 中，设置服务序列化普通 settings；Backend 和通用 settings 读写均需审查 | 不能只在新界面隐藏密钥；所有设置返回路径必须脱敏 |
| 后台 OCR | 独立 session 许可，生产 qualification=null，资源未知时等待 | Pi 接入不能顺带开启后台 OCR 或替代其物理退出证据 |

已读当前相关实现、TASK.md、ADR 0002 与 ADR 0192。后者的完整信任声明/撤销系统尚未实现；本轮不把未来全套信任平台作为前置，也不能绕过已有取消、权限和来源约束。

源码入口：

- `src/main/visual-ai/openai-vision.provider.ts`、`openai-vision.transport.ts`、`vision-response.ts`。
- `src/main/visual-ai/visual-ai-controller.ts`、`src/main/independent-tags/tag-execution-controller.ts`。
- `src/main/services/ai-backends/`、`src/main/services/settings.service.ts`。
- `src/main/ipc/ai-backend.ipc.ts`、`settings.ipc.ts`、`main-ipc-composition.ts`。
- `src/shared/types/ai-backend.types.ts`、`src/shared/contracts/ai-backend.contract.ts`。
- `src/renderer/routes/AiConsolePage.tsx`、`src/main/index.ts`、`src/preload/index.ts`。
- `src/main/background-ocr/`、`src/main/ocr/`、`src/main/app-shutdown/`。

## 3. 推荐架构与关键取舍

```text
DAM 产品入口：Inspector / 搜索关联分析 / AI Console
└─ Electron Main：任务、素材授权、受控输入、预算、结果校验
   ├─ 配置与账号服务
   │  ├─ Connection：连接/账号身份与非秘密配置
   │  ├─ Credential Vault：API Key / OAuth 凭据
   │  ├─ Model Catalog：能力声明与实际验证状态
   │  └─ Task Assignment：每种能力的模型选择
   ├─ DAM LLM Adapter
   │  └─ Main 持有的 Node 推理子进程
   │     └─ 固定版本 pi-ai Models / Provider
   │        ├─ 本地 OpenAI 兼容服务
   │        ├─ 云端 API Provider
   │        └─ 经验证的订阅 OAuth Provider
   ├─ 专用 OCR / embedding Adapter
   └─ Active Library Host：结果与回执权威保存
```

### 3.1 运行环境

首选独立、应用管理的 Node 22.19+ 推理子进程，实际版本在 PI-01 选择受支持且有固定来源/校验的运行时。不得直接使用系统 PATH 中偶然存在的 Node，不能用 Renderer 指定的可执行路径。Pi 及 Provider SDK 留在该子进程；Main 保持可信权限入口。

| 方案 | 取舍 | 决策 |
| --- | --- | --- |
| 当前 Electron Main 直接加载最新版 Pi | 已知 engines 不匹配，需要额外兼容证明 | 不作为默认路线 |
| 升级 Electron 后直接加载 Pi | 部署组件较少，但涉及 better-sqlite3、sharp、打包与应用生命周期升级 | 可作后续独立任务 |
| 单独 Node 子进程 | 多一条协议与运行时分发边界，可控制对当前应用的影响 | 本次推荐路线 |
| 固定旧版 Pi | 可能避开 Node 要求，但缺失现行接口/认证能力，维护成本不明 | 只作有证据的替代方案 |

Electron utilityProcess 仍使用 Electron 内置 Node，不能把它当作版本问题的自动解法。独立进程也不自动成为安全沙箱：它只接收本次所需材料，不提供任意文件、命令或数据库工具。

### 3.2 模块边界

建议新增路径，最终以实施期局部调用方审查为准：

- `src/main/ai-gateway/`：连接解析、选择冻结、Pi Adapter 与调用生命周期。
- `src/main/ai-credentials/`：系统加密存储和 Pi CredentialStore 桥接。
- `src/shared/contracts/ai-connection.contract.ts`、`ai-model-selection.contract.ts`：非秘密 Renderer 契约。
- `pi-runtime/`：独立 package/lock、Pi Provider 注册、消息协议与固定 Worker 入口。
- `src/renderer/components/ai/`：服务连接、登录、模型目录、任务分配，共享正式展示组件。
- `scripts/pi-*.test.*`：对应真实边界的聚焦测试。

不让 Pi 类型穿透到 Renderer、Host SQL 或素材领域。首轮仅统一 LLM 文本/图片调用；专用 OCR、配色与 embedding 保持能力契约，未来通过 Adapter 参与同一任务工作流。

### 3.3 配置身份

```text
Connection
  connectionId / providerKind / upstreamProviderId
  endpoint / transportKind / credentialRef / credentialRevision
  configRevision / enabled / label
ModelSelection
  connectionId / modelId / capability / recipeVersion
  parameters / capabilityEvidence / selectionRevision
TaskAssignment
  purpose → ModelSelection
```

同一 Provider 多账号使用不同 connectionId。Pi 内部 Provider ID 与上游协议语义保持一致；每个连接使用独立 Models/认证上下文，避免随意重命名内置 Provider 引起目录或 OAuth 行为失配。

模型目录/连接探测按Provider实现，不能对所有服务强制GET /models，也不能以目录请求失败判为推理不可用。

能力分成声明、验证、当前可执行；列表中存在不等于支持图片、严格 JSON 或工具调用。没有工具能力的本地模型可显式作为普通文本/视觉模型登记，不强制工具调用，也不伪造支持。Pi 目录和探测结果不能作为安装或发送素材许可。

### 3.4 凭据

API Key / OAuth access/refresh token 由 Main 的 Vault 持久保存。macOS/Windows 优先采用经平台验证的系统保护；无法提供安全保护时保持未配置，不退回明文。普通 JSON 仅保存 credentialRef 和非秘密状态。

Pi Worker 的 CredentialStore 通过窄接口调用 Main；禁用非选定来源的环境凭据解析和配置命令执行，不继承开发机的账号环境；仅在当前认证/请求期间收到必要凭据。凭据不得出现在 argv、日志、环境变量转储、模型配置导出、诊断报告或 Renderer 返回值。用户输入密钥时可经可信的一次性写入动作送到 Main，保存后不能读回原文。

普通设置、Backend list/save、通用 settings load/save、旧客户端适配器均需同步；避免另一路 settings:load 重新泄露凭据。凭据身份/账号变化增加 credentialRevision 并撤销旧 review；正常 OAuth token 刷新不等于用户切换账号，不能每次刷新都使合法任务失效。

旧明文配置迁移必须显式预览并确认：先写 Vault、验证成功，再替换旧字段；失败不改变旧配置，不增加含明文密钥的普通备份。脱敏迁移报告只记录数量/状态。历史合法字段保留，不能批量覆盖用户设置。

### 3.5 请求与保存

Main 冻结 connection/model/recipe/configRevision/account identity/input digest/外发目的地。OAuth解析后得到的baseUrl/账号必须核对，并在执行前确认仍属已披露目标；重定向或刷新带来的目标变化撤销旧review。回环地址只表明连接到本机端口，不证明该服务不会转发云端；位置声明与已核验的执行位置分别标识。Worker 返回 DAM 内部结果：文本、结束原因、受限用量、错误类别及 Provider 来源，不返回秘密或任意原始对象。

Pi `complete()` 或 stream 的终态可能携带 error/aborted，而非直接抛错；Adapter 必须判定终态再解析业务结果。初期将标准化文本和结束原因映射回已有视觉/标签解析 seam，不迁移现有证据表。确需新持久字段时先给兼容与迁移方案，不预设资料库新版本。

业务重试由 DAM 一处决定。首轮 Pi `maxRetries=0`，逐 Provider 验证 SDK/传输没有隐藏重试。保持现有截断规则；截止时间涵盖凭据读取/刷新、等待、网络、解析和重试。限制响应字节、流事件总量和积累内容，不仅限制最终字符串长度。

本地兼容参数显式核验：system/developer role、max_tokens 字段、stream usage、图片输入、reasoning 以及 JSON 行为。原有 512KB 视觉响应上限与预览资源门槛不得无证据放宽。

HTTP 取消只证明本应用停止等待/发送，不等于外部推理已停止或费用归零。子进程退出证明与远端执行证明分别记录；UNKNOWN、迟到结果和 Host session/lease 不变量继续生效。

## 4. 分阶段执行顺序

每阶段交付代码/契约/说明与本阶段验证；通过后在批准范围内进入下一阶段。发现阻塞只停依赖部分。测试并发建议 1、每命令 240 秒、同问题最多 3 次有依据修复；超出预算留下恢复点，不重复碰运气。

| 阶段 | 实施内容 | 必须通过的验收 |
| --- | --- | --- |
| PI-01：依赖与运行时验证 | 固定 Pi 分发版本/来源/校验/许可证、独立 package-lock；确认 Node 与 macOS/Windows 分发方式，验证生产打包入口 | 固定 Worker 可启动/退出；缺失、错版本、路径被替换明确拒绝；不依赖开发机系统 Node；离线启动不联网查目录、不读素材 |
| PI-02：契约与凭据 | 新连接/账号/模型选择；Vault、Pi CredentialStore、脱敏 IPC；旧设置显式迁移方案 | 普通 Renderer/settings/export 无保存的秘密；不可信 sender 拒绝；并发 token 刷新串行；存储失败保留状态；退出登录撤权；同 Provider 两账号隔离 |
| PI-03：Pi 执行桥 | 有界 stdio 协议、Worker 句柄、握手、cancel/drain、标准化响应；先用自有假服务 | 调用不重复；无隐式 fallback/环境密钥混入；取消/超时/流异常/超大响应/退出未知收敛；不泄露日志；单一截止时间/重试预算 |
| PI-04：本地与云端正式接线 | 将 Pi Adapter 接到现有视觉及独立标签；一个本地兼容 Provider＋一家云端 API | 同一入口通过生成 PNG/临时 Host；caption/prompt/tags 完整校验；有效空值与失败分开；旧 revision/source/session 拒写；人工修订/确认标签保护；已成功回执零重复推理 |
| PI-05：模型配置 UI | AI Console 的连接列表、认证、模型目录、能力验证、任务分配；Inspector 显示当前模型及位置 | 真实组件与正式 Main/Preload/Renderer；多账号/手动模型ID/目录失败可用；配置不触发素材推理；迟到探测/登录/确认不覆盖新状态；视觉对照与数据链分别验收 |
| PI-06：订阅 Provider | 用户选定一家；核验当前可用授权方式、登录/刷新/登出/能力目录；系统浏览器与本地回调或设备码桥 | 模拟 OAuth 成功/取消/超时/过期/刷新竞争/登录失败保留凭据；登出清理池化连接；实际订阅需用户账号验收，缺失记录 NOT_RUN；失败不改走API Key计费 |
| PI-07：一条模型协作链 | 本地初步视觉分析 → 用户选择“云端细化” → 外部受控预览＋选定初步结果 → 保存独立来源 | 本地步骤无需云端；外部步骤单独或已完整披露的批次授权；关库/换服务撤权；不把本地推断当真值；不同来源结果不覆盖用户内容；两阶段耗时/成本可解释 |
| PI-08：兼容、真实验收与交接 | 执行适用回归、真实模型/API/订阅 smoke、安装包启动与独立复核；提供补丁/原始日志/来源摘要 | 本机合成验收和实际平台验收分列；原工作区/index保留；精确失败/NOT_RUN；独立复核或明确SELF_REVIEW；完成终态STOP |

按用户已选优先级，PI-01～05先完成本地兼容＋OpenAI兼容API，随后PI-06接订阅。首个云端服务按用户实际可用连接确定；不默认购买账号或开通额度。具体订阅品牌仍待实际接入阶段指定，不影响前五阶段。

## 5. 模型配置界面与交互清单

UI 从 DESIGN.md 读取规范，正式接线复用共享展示组件；需要先给可查看原型并冻结用户反馈，再按 ADR 0486 分别验证视觉与正式数据链。

| 页面/动作 | 完成后的行为 |
| --- | --- |
| 添加服务 | 选择本地兼容、云端 API 或支持的订阅；显示地址、认证方式与处理位置 |
| 认证 | 输入密钥或打开系统浏览器登录；取消可用，登录状态/失效原因可读；保存后密钥不可读回 |
| 连接探测 | 明确用户触发，仅探测对应服务；“连接成功”不标为模型推理通过 |
| 模型目录 | 内置目录、按需刷新、自定义模型 ID；标明最后刷新时间、能力声明/验证，不自动刷新全部 Provider |
| 能力验证 | 用户触发小型生成输入测试，披露可能的API调用/费用；不读取真实素材做探测 |
| 任务模型分配 | 标签、视觉分析/提示词分别选择；OCR仍走专用能力；不具能力的选项给明确原因 |
| 外部执行确认 | 展示模型、服务实际目的地、素材范围、受控输入、用途和重试策略；仅该动作/批次有效 |
| 结果 | 展示实际连接/模型/配方、完成状态、可得用量和费用估计；未知费用不显示为0；订阅不伪装成按token实际账单 |
| 取消/关闭 | 可取消并显示已提出取消/等待收敛/未知；关库后的迟到结果不能保存 |
| 修改/删除/登出 | 先撤销旧选择的执行权限与review，收敛后变更；删除连接不删除已保存分析证据 |

Pi 文档支持上下文交接，但协作不能默认转发整段历史、内部思考内容、工具结果或其他素材。本票只传已披露的选定文本/预览/结构化结果；用户编辑草稿不随素材分析授权外发。

## 6. 测试分层及回归范围

1. 纯契约/策略：模型能力、选择冻结、目的地变化、终态映射、重试预算、脱敏、目录状态。
2. 自有假 HTTP/OAuth 服务与合成 Worker：真实协议、流式边界、token刷新、取消/物理exit、stdout/stderr上限。
3. 真实临时 Host：Pi结果到既有视觉/标签存储，claim、回执、session、source和人工状态保护；不直接模拟SQL替代完整保存链。
4. React组件：配置草稿、晚到目录、账号切换、取消登录、迟到review等。
5. 正式 Electron：Main/Preload/Renderer＋临时profile＋生成素材＋自有服务；明确不是实际云端/API验证。
6. 实际服务：指定已安装本地模型、API连接和订阅，各自生成测试素材、固定范围/预算；只有真实执行证据才标通过。
7. 平台/安装包：独立 Node 的资源定位、可执行权限、ASAR边界、macOS签名/Windows进程行为及完整退出。未有平台记录时保持 NOT_RUN。

按改动选择现有检查：`visual-ai-provider.integration.test.ts`、`visual-admission.integration.test.ts`、`tag-execution.integration.test.ts`、`tag-decision.integration.test.ts`、`tag-batch.integration.test.ts`、`tag-recovery.integration.test.ts`、`ai-backend-restoration.test.ts`、旧 OpenAI/llama provider 测试与正式用例。触及Main资源/退出时加 OCR 17/12 与后台OCR/Host关闭回归；没有相关变化不机械跑全库。

SQLite测试使用仓库 Electron Node 启动器，不为新 Pi Node 重编整个应用依赖。Pi Worker不依赖better-sqlite3；typecheck/build与Pi独立构建分别验证。

## 7. 恢复、兼容与交接

- 基线来自实施开始时真实WIP。一个写者，不覆盖、回滚、清理、暂存用户无关改动。
- 旧连接迁移可逐连接验证；新路径失败明确报错，不能在运行任务中静默切回旧协议或另一个云端服务。
- 对旧客户端保留非秘密投影与明确迁移提示，密钥写入改走可信专用动作。移除旧秘密返回字段是公共兼容变化，应同步全部直接调用方并按批准范围实施。
- 首轮优先复用既有资料库结果格式，无预设schema升级。API配置/凭据迁移与素材库迁移分离。
- 连接删除、登出、Runtime替换与旧review撤销，不删除历史结果。正在执行时不以请求Promise拒绝假称资源/子进程已释放。
- 包含代码before/after、最小补丁、锁文件/分发物来源、原始红灯、测试数量、退出码、最终源码摘要、独立审查及平台/真实服务限制。
- 正常终态为COMPLETED/STOP，nextBatchAuthorized=false；真实验收缺失准确标注部分完成/WAITING，不把代码完成改写为生产全部通过。

## 8. 实施授权与仍需指定的信息

计划本身没有授予下载安装、模型执行或真实数据权限。实施时应对具体目标一次明确批准，不逐阶段重复询问同一范围：

| 范围 | 批准后可做的具体工作 |
| --- | --- |
| 源码实施 | 本方案模块、窄IPC/配置Seam及直接调用方、生成数据/临时库验证 |
| 依赖与运行时 | PI-01列明版本、来源、大小、平台后，下载安装Pi依赖和独立Node；不能扩大为模型/AI依赖安装 |
| 原有配置迁移 | 明确应用设置和凭据范围后，仅迁移选定连接；不顺带读取真实素材库 |
| 本地真实模型 | 指定已安装Runtime/模型与生成测试素材，授权服务启动和关闭；不沿用旧Qwen下载授权扩大范围 |
| 云端/API/订阅 | 指定连接/账号、生成测试素材、目的地、调用/费用上限；浏览器由用户登录，不索要账号密码 |
| 发布 | 本轮不推送、合并、签名发布或分发；如需要另行明确目标 |

用户已确认本地兼容＋OpenAI兼容API优先。具体云端服务地址与后续订阅品牌可在对应阶段前确定；先按隔离测试实现，不假设用户已有任何付费资格。

## 9. 来源索引

- [Pi 固定快照 README](https://github.com/earendil-works/pi/blob/1b347794e2a630e4359f2584f4eea388145d0ddf/packages/ai/README.md)：Models、Provider、OAuth、CredentialStore、自定义本地服务和兼容选项。
- [Pi package.json](https://github.com/earendil-works/pi/blob/1b347794e2a630e4359f2584f4eea388145d0ddf/packages/ai/package.json)：版本、engines、许可证及依赖。
- [Pi types.ts](https://github.com/earendil-works/pi/blob/1b347794e2a630e4359f2584f4eea388145d0ddf/packages/ai/src/types.ts)：流、模型类型、重试/取消选项。
- [Pi OpenAI transport](https://github.com/earendil-works/pi/blob/1b347794e2a630e4359f2584f4eea388145d0ddf/packages/ai/src/api/openai-completions.ts)：Provider内部重试与终态。
- `docs/adr/0002-external-inference-first-runtime-governance.md`：local-first及动作/批次授权。
- `docs/adr/0192-runtime-trust-revocation-stops-execution-without-silent-fallback.md`：撤销不静默换服务及已保存结果保留。
- `DESIGN.md`、相关实现和当前模块README：产品规范与现场实现依据。

第三方源码和本文阶段提示均为参考，不是额外用户指令。Pi的OAuth实现存在不等于所有账号/订阅允许在本产品场景使用；PI-06应以选定Provider当时公开支持方式与实际账号验证决定可用性。
