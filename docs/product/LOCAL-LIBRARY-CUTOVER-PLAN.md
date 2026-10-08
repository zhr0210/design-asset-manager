# 本地 Library 正式接线：已批准的实施范围

> **2026-09-09 用户已在本会话明确批准下文范围。** 可以实施相应源码、契约、
> 调用方和合成新库验证；不包含真实用户库/legacy 迁移、Worker HTTP/AI 启用、
> 外发、下载、永久删除或来源文件变更。批准不等于实现完成；当前进度见 TASK.md。
> 下述现状与拟新增名称记录的是批准时基线，正式接线后按实际证据更新。

## 当前实现证据（2026-09-10）

批准范围的候选实现已在当前变更集完成：`src/main/index.ts` 使用独立 App
Store 和 Active Library Host 组合真实 Open/Create、SQLite/Sharp Capture、
Asset/Tag、受控 Preview 与 Trash/Restore；IPC 与正式 Preload 均为 path-free
窄桥，Renderer 提供创建和 Copy 复核、打开/关闭/重开、词法/标签检索、手动
标签、批量关系与回收站恢复。关闭/切换先清空旧素材、选择、关系和媒体状态，
Main 以 identity + generation + Asset identity 校验每次 Preview 读取。

`npm run test-active-library-electron-e2e` 使用生成 PNG/JPEG/WebP、临时 profile
及临时新库启动真实 Electron Main、正式 Preload 和完整 Renderer。它验证
Create/Copy 的取消和失败呈现、三种图片真实加载、来源 SHA 不变、同一 Receipt
重复确认不重复入库、Main 标签搜索、单个和批量关系、Trash/Restore、关闭后的
旧媒体拒绝、打开/重开持久化、SQLite 最终状态和退出 drain；HTTP(S) 被阻断。
证据不包含真实用户库、legacy 迁移、Windows 生产卷资格、打包应用、AI/
Runtime、外部 provider、真实下载、来源 mutation 或永久删除。

## 证据分级与结论

- **Current Implementation**：当前 Main 由 `src/main/index.ts` 组合，
  `initDatabase()` 创建进程级数据库；Asset、Tag、AI 和调色板服务通过
  `getDatabase()` 取得同一连接。`assets:delete` 仍由
  `AssetService.deleteAsset()` 执行 legacy hard delete。
- **Validated Tracer**：隔离测试中验证过的锁、会话、Capture、Open
  Inspection 和 Trash Adapter。它们使用注入的临时目录或数据库，尚未由
  Electron 组合根接入。
- **Target Architecture**：本文的 Active Library Host、受控分发器、IPC
  演进和停机协议。目标名称不是当前函数或现成能力的证明。

结论是采用 Asset Workspace 单写者接管：先打开并检查一个新建合成库，取得
独占租约后，所有 Library 级读写都绑定同一会话。旧进程级连接不与新库双写。

## 当前调用链与边界（源码审计）

| 当前路径 | 已核实函数/通道 | 事实与切换影响 |
| --- | --- | --- |
| `src/main/db/index.ts` | `initDatabase()`, `getDatabase()`, `setDatabase()` | 进程级连接、schema 安装和 legacy 动态迁移；不是 Library authority。 |
| `src/main/services/asset.service.ts` | `listAssets()`, `saveAsset()`, `deleteAsset()`, `listTags()` | Asset 主读写和删除；`saveAsset()` 还会调用归一化服务，必须改为会话注入连接。 |
| `src/main/ipc/asset.ipc.ts` | `assets:list`, `assets:save`, `assets:delete`, `assets:save-custom-category`, `assets:get-custom-category`, `assets:update-caption`, `assets:reset-caption-edited` | IPC 当前直接构造 legacy service 或执行 SQL；需统一经过活动库路由。 |
| `src/main/services/tag.service.ts` | `getTag()`, `createTag()`, `updateTag()`, `deleteTag()`, `mergeTags()`, `listTags()`, `searchTags()`, `createAlias()`, `removeAlias()`, `setParent()` | Tag 字典和别名读写属于 Library 级数据，不能继续依赖全局连接。 |
| `src/main/services/asset-tag.service.ts` | `addTagToAsset()`, `removeTagFromAsset()`, `addTagsToAssets()`, `removeTagsFromAssets()`, `replaceTagForAssets()`, `getTagsForAsset()`, `confirmAiTag()`, `rejectAiTag()` | 关系、`assets.last_tag_updated_at`、Tag usage count 必须在同一活动库事务内。 |
| `src/main/services/tag-search.service.ts` | `searchAssetsByTags()`, `populateTagsForAssets()` | 词法/标签检索是 Asset Discovery 的只读调用方，应查询活动库并排除 Trash。 |
| `src/main/ipc/asset-tag.ipc.ts`, `src/main/ipc/tag.ipc.ts` | 全部 `asset-tag:*`、`tag:*`、`tag-search:*` handlers | 保留现有语义和 DTO，改变其 Main 路由与错误状态；不要从 Renderer 传入数据库或库路径。 |
| `src/main/ipc/ai-worker.ipc.ts` | `ai-worker:run-prompt-reverse` | 当前 handler 直接写 `assets`、`ai_prompt_tasks`；需依赖活动库会话并在租约内提交。 |
| `src/main/services/ai-client.service.ts` | `startQueueSync()`, `stopQueueSync()`, `pollCompletedTasks()` | `src/main/ipc/ai-client.ipc.ts` 注册时启动轮询；轮询和完成同步会写 AI task、Asset、Tag。切换/失锁时必须停机。 |
| `src/main/services/color-palette.service.ts` | `ColorPaletteService.runStartupBatchScanner()`, `extractAndSavePalette()`, `refreshTextPaletteFromTextBlocks()` | `index.ts` 当前启动扫描；IPC 和 AI 完成回调也会写 `assets`，不能脱离活动会话。 |
| `src/main/services/text-detection/qwen-vl-text-box-provider.ts` | `detect(_imagePath, assetId?)` | 当前按 Asset ID 从 `assets.ai_analysis_json` 读文本框；`file_path` 是 legacy Asset 的主处理路径，不能表述为“原件”。原始路径字段是另行建模的 `original_path`。 |
| `src/main/path-migration/path-migration-executor.ts` | `executeMigration()`, `rollbackMigration()` | 回滚会 `setDatabase()`，并可 `unlink` 源文件；冻结为 legacy 治理工具，不得接管活动库切换。 |
| `src/main/ipc/path-governance.ipc.ts` | `assets:path-migration-report`, `assets:path-governance-report`, `assets:apply-path-migration` | 报告是 legacy 只读方；应用迁移含文件变更，必须与活动库 authority 隔离。 |
| `src/main/services/site.service.ts` | `listSites()`, `saveSite()`, `deleteSite()`, `updateSiteStatus()`, `updateSiteAuth()` | `sites` 是应用级站点元数据；不属于某个 Library。认证状态由 `src/main/services/auth-state.service.ts` 另行管理，本文不把 Site 配置等同于凭据。 |
| `src/main/services/download.service.ts` | `listTasks()`, `saveTask()`, `clearCompleted()` | Download Task 是应用级任务记录；当前没有真实下载执行器，也不因 Task 行自动产生 Asset 或 Promotion。 |

启动证据链是 `app.whenReady()` → `initDatabase()` → IPC 注册；其中
`registerAiClientIpc()` 调用 `startQueueSync()`，`index.ts` 还调用
`ColorPaletteService.runStartupBatchScanner()`。这些调用方必须在活动库切换
协议中显式停止或重定向，不能只改 Add Assets。

## 可复用组件与缺口

以下路径是隔离证据，不是生产入口：

- `src/main/library-lifecycle/exclusive-library-lock.tracer.ts`：租约和
  `runWhileHeld()` 的锁行为；需要生产限定的锁 Adapter、失锁通知和关机协调。
- `src/main/library-lifecycle/active-library-session.ts`：
  `createActiveLibrarySession()`、`createActiveLibraryCaptureWorkflow()`；
  已把 identity、generation、Storage roles、SQLite 和锁绑定，但尚未在
  `index.ts` 持有活动会话或提供通用 Asset 分发。
- `src/main/library-lifecycle/library-open-inspection.tracer.ts`：
  `createLibraryOpenInspectionTracer()` 只读检查；取得写租约、生产卷能力
  评估和切换协调仍待实现。
- `src/main/library-lifecycle/library-creation-planner.tracer.ts`：
  `createLibraryCreationPlannerTracer()` 只做目标观察、容量/资格审查和
  可回放 Review；`prepare()` 的 `writeAuthority` 固定为 `not-issued`，
  不创建目录、不建库、不产生写权限。它是规划器，不是创建目录能力。
- `src/main/capture-intake/add-assets.workflow.ts`、`capture-gateway.ts`
  及 `sqlite-capture-persistence.adapter.ts`：已有 path-free Copy Plan、
  Candidate、Preview 门禁和 Promotion 事务；生产 Preview Adapter、IPC
  组合和活动库数据库初始化仍缺失。
- `src/main/library-lifecycle/sqlite-asset-trash.adapter.ts` 与
  `sqlite-asset-trash.schema.ts`：隔离验证 CAS Trash、Receipt、关系摘要和
  `ON DELETE RESTRICT`；尚未替代 `assets:delete`，也不负责文件删除。

## 首个批准批次的收敛范围

Astra 的架构收敛：先交付不依赖 AI 的新建库 → Copy 入库 → 检索/标签 →
Trash/Restore 完整闭环。活动库模式明确禁用旧 AI 任务提交、直接 Worker
回写与 queue sync，停止旧启动扫描；不能以旧连接或外部 provider fallback。
保留配置和用户状态，不启动模型。本批不修改 Worker HTTP 协议，也不启用
新的 AI 执行路径。下文 AI identity/generation 协议是后续重新接入的前置条件，
须另行明确其 Worker/shared/Main 的一致变更范围后实施。

## 已批准的契约与调用方改动

本节是用户已批准的公共 Seam 变更清单。实现时必须同时修改直接调用方、
共享类型和 Preload；不把已批准范围内的常规细节再设为逐步确认点。

1. 在 `src/shared/contracts/asset.contract.ts` 增加活动库状态、Copy Plan /
   Confirm、Trash / Restore 的请求响应类型；保留现有 Asset 读写 DTO，给
   `assets:list` 增加活动库/生命周期语义。Trash 使用以下**拟定新增、当前
   不存在**的 path-free 通道：`library-trash:prepare`、
   `library-trash:dispatch`、`library-trash:inspect`。三者只携带 Asset
   identity、plan receipt、revision 和结果投影，不接受库路径、数据库句柄或
   原件路径。具体字段须由实现测试锁定，不允许用任意 `any` 扩大输入。
2. 在 `src/shared/contracts/tag.contract.ts` 声明活动库未打开、切换中、
   失锁的固定错误/状态映射。Tag/AssetTag DTO 不携带数据库或库路径作为
   authority。首批 AI 入口沿用当前失败响应形状返回明确不可用，禁止提交及
   回写；后续 AI contract/Worker HTTP 演进不包含在本批实现中。
3. 在 `src/preload/index.ts` 增加窄桥：活动库 inspect/open/switch 状态、
   Add Assets prepare/confirm/inspect，以及与上述拟定通道一一对应的
   `libraryTrashPrepare()`、`libraryTrashDispatch()`、
   `libraryTrashInspect()`（均为拟定新增名称，当前不存在）。对应的
   `tag:*`、`asset-tag:*`、`tag-search:*` 原有入口改为调用同一活动库 Main
   dispatcher；Renderer 只提供意图和既有业务字段。
4. 在 `src/renderer/routes/Library.tsx`、`src/renderer/stores/asset.store.ts`、
   `src/renderer/components/asset/AssetInspectorDrawer.tsx` 和
   `src/renderer/components/asset/AssetDeleteButton.tsx` 把活动库删除动作改
   为 `prepare → dispatch → inspect` 的新 Trash 流程。旧的 `assets:delete`
   通道不处理新库数据；活动库模式下必须拒绝并返回固定的 legacy-disabled /
   authority-required 状态，或在注册时停用，绝不能把旧 handler 偷换成新
   Trash authority。仅在另有明确 legacy 模式边界时才可保留旧 hard-delete。
5. 在 `src/main/index.ts` 增加生产级 Active Library Host 组合根：启动时
   先建立与 Library 无关的 App 级 Site/Download 存储边界，再只对用户明确
   选择并通过 Open Inspection 的库建立会话；活动库启动不得执行
   `initDatabase()` 中面向 Asset 的动态迁移，也不得无条件启动
   `ColorPaletteService.runStartupBatchScanner()`。切换前执行 Quiescence，
   切换后重新绑定所有 Library 级 Reader/Writer；不得用 `setDatabase()` 替换
   全局连接来模拟切库。
6. 改造 `src/main/ipc/asset.ipc.ts`、`asset-tag.ipc.ts`、`tag.ipc.ts`、
   `ai-worker.ipc.ts`、`color-palette.ipc.ts`、`path-governance.ipc.ts` 和
   `src/main/ipc/ai-client.ipc.ts` 的直接 service/SQL 调用；保留
   `src/main/ipc/site.ipc.ts` 与 `download.ipc.ts` 的应用级边界。
7. 为 `AssetService`、`TagService`、`AssetTagService`、`TagSearchService`、
   `AiClientService`、`ColorPaletteService` 和 Qwen 文本框读方增加受控的
   Connection/Library Context Adapter。旧的 `getDatabase()` 不能作为活动库
   fallback；无活动会话或租约无效必须 fail closed。
8. 活动库 schema 初始化只能对经 Open Inspection、目录角色和独占锁检查的
   Control Directory connection 执行：复用
   `src/main/db/schema.ts` 导出的 `initializeCaptureIntakeSchema()` 与
   `src/main/library-lifecycle/sqlite-asset-trash.schema.ts` 导出的
   `initializeSqliteAssetTrashSchema()`；二者当前均已存在，但没有现成的
   `initializeActiveLibrarySchema()`。若需要该组合器，必须标为拟新增并只接收
   受检的活动库连接。不得对全局 legacy connection 运行这些初始化，也不得
   用 `setDatabase()` 切库。

## 所有后台读写的切换与隔离

| 数据面 | 活动库接线 | 切换/失锁规则 |
| --- | --- | --- |
| Asset、`asset_tags`、Tags、别名和搜索 | Dispatcher 将上述 service 的每次读写绑定当前 Session；同一操作的 Asset/Tag 事务共享该连接。 | 关闭或失锁立即拒绝写入；列表、标签搜索只投影 active Asset，Trash 状态由生命周期 Adapter 过滤。 |
| AI task、AI caption/prompt/analysis、AI suggestion | `pollCompletedTasks()`、`ai-worker:run-prompt-reverse` 和 `ai-task-lifecycle-sync.sink.ts` 完成同步只能在 Session lease 内读写；首批停用旧 AI 准入与回写；后续恢复 AI 时，派发记录、Worker 请求和结果必须携带并校验 `libraryIdentity` + `generation`，不得由结果 payload 选择连接。 | 切换先停止准入和 `stopQueueSync()`，等待当前同步结算；generation 不匹配、旧任务回放或失锁时拒绝并记录 stale 结果，绝不回写或静默切换到旧连接。 |
| Palette 与文本框 | `runStartupBatchScanner()` 不再由 `index.ts` 无条件启动；扫描、`extractAndSavePalette()`、`refreshTextPaletteFromTextBlocks()` 和 Qwen `detect()` 通过活动库读写 Adapter。 | 无活动库不扫描；切换取消/暂停队列；`file_path` 只作为当前 Asset 处理路径，原始资产身份仍由明确字段和 Copy/Promotion 记录证明。 |
| Capture/Promotion/Trash | `createActiveLibrarySession()` 组合 `createActiveLibraryCaptureWorkflow()`；Copy、Candidate、Preview、Promotion 与 Trash 使用同一受检连接和 Storage roles。Renderer 删除只调用拟定的 `library-trash:prepare/dispatch/inspect`。 | 只允许 Copy Into Library；来源文件保持不变。Trash 首阶段为软删除/Receipt，永久删除和文件 mutation 另行批准。 |
| Site/Auth state 与 Download Task | 由独立 App 级存储 Adapter 维护；不把 `sites` 或 `download_tasks` 表复制到 Library schema，也不通过 `setDatabase()` 在两种 authority 间切换。 | Library 切换不得复制、清理或重写这些记录；任何认证外发或真实下载仍由各自授权控制。 |

## Quiescence 与合成库验收

切换顺序固定为：停止新的导入、Asset/Tag/AI/Palette 写入准入；返回可识别的
`LIBRARY_QUIESCING`；等待已有 `runWhileHeld()` 操作自然结算；调用
`stopQueueSync()` 并停止调色板扫描；确认没有待提交事务后释放旧锁并关闭其
连接；对目标库重新执行 Open Inspection、schema 检查和独占锁获取；最后发布
新的 path-free Session projection。超时、generation 不匹配、数据库只读或
任何 Storage role 越界都 fail closed。

第一阶段只允许在新建的空合成库验证：创建器规划 Review → 明确确认后创建
受管目录 → Copy Plan → Candidate → Preview Ready → Promotion → 活动库
`assets:list`/词法检索 → Trash → Restore。测试用生成字节和临时目录，必须
验证来源不变、重复确认幂等、事务回滚、锁失效拒写、Trash 隐藏/恢复和 Tag
关系一致性。规划器本身仍只读，不能被测试描述为创建器。

现有 `scripts/asset-authority-baseline.ts` 是当前 legacy source-policy 守卫，
其检查的是全局 `getDatabase()`、legacy Asset/Tag 写入和旧 channel 形状。获批
实现时不能删除守卫来“解锁”接线；应在同一变更中把期望替换为：活动库读写
必须经过 Active Library Host、schema 初始化只接受受检 Control Directory
connection、新 `library-trash:*` 三通道必须有唯一注册/调用方、旧
`assets:delete` 在活动库模式拒绝且不触碰新库、AI 结果必须匹配 generation。
替换后的负向测试仍需阻止任何直接/传递 `getDatabase()` 写入、全局 schema
初始化、重复 handler、Renderer 传路径及 stale AI sink 回写。

## 单独批准、恢复矩阵与范围

真实用户库/legacy 数据迁移必须另行批准：先出具只读盘点、字节/文件数、空间、
备份与恢复报告，采用 Copy Into Library，原来源保留，失败可回滚；本方案不
升级旧 schema、不推断 ownership、不读取真实素材或旧运行时数据库。

外部 AI provider、认证状态外发、网络下载执行器、Reference in Place、永久
删除、批量文件移动和跨设备同步也必须另行批准；配置 provider 不等于上传授权。

| 场景 | 合成库验收证据 | 失败语义 |
| --- | --- | --- |
| Open/Switch | manifest、目录角色、schema、generation、独占租约与连接一致 | `unavailable`/`recovery-required`，不产生写权限 |
| Lock lost | 操作中替换/失效租约后所有后续写入被拒 | 不回写、不切旧库、不报告成功 |
| Crash/Restart | Capture/Promotion 事务回滚或幂等恢复，孤儿状态可识别 | 不重复 Asset，不把半成品当 Promotion |
| Trash/Restore | 新 `library-trash:prepare/dispatch/inspect` 的 Receipt、CAS revision、关系摘要、active 列表过滤和恢复幂等；Renderer 删除只走新通道 | 活动库模式的 `assets:delete` 拒绝且不触碰新库；永久删除未授权 |
| Legacy/Provider | 只验证隔离边界和拒绝路径 | 未经单独批准不得读取、迁移或外发 |

## 本次批准的精确范围

批准下一阶段仅可修改上述列出的 Main 组合、IPC/Preload/shared contract、
受控 Adapter 和聚焦测试，并只使用新建合成库完成不依赖 AI 的端到端验证；批准同步更新
直接调用方和契约，使公共 Seam 保持一致。批准不包含真实用户库、legacy
迁移、Worker HTTP 变更或 AI 执行启用、模型/Runtime 下载、外部 provider、认证状态外发、真实下载、永久删除
或来源文件 mutation。本文为已批准实施范围，不是实现完成声明。
