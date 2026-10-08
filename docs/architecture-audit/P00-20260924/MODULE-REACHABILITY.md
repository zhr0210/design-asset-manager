# P00｜模块可达性、调用链与数据权威

MODE=SPEC。分类是当前工作区的入口审阅结果；current只表示有生产调用方，功能可能仍fail-closed。没有把文件名、目录存在或README当作执行证据。路径均相对于仓库根。

## 1. 模块分类表

| 模块 | 分类 | 正式入口/调用方 → 实现 | 数据权威与限制 |
| --- | --- | --- | --- |
| Main composition | current | `index.ts/setupIpcHandlers` → `ipc/main-ipc-composition.ts/registerMainIpcComposition` | 组合控制器，不把事务交给Renderer |
| Active Library Host | current | `active-library-runtime.ts/createProductionActiveLibraryHost` → `library-lifecycle/active-library-host.ts` | 持有受检连接、lease、identity/generation |
| Capture / Trash | current | `active-library.ipc.ts` → Host `dispatchAddAssets/dispatchTrash` → Capture/生命周期模块 | 持有当前库权威；Copy/Promotion与旧删除不同 |
| Visual AI | current | `VisualAiPanel` → 主/卡片Preload → `visual-ai.ipc.ts` → `createVisualAiController` | Main prepare/run；Map任务；Host持久完整结果 |
| Vision transport/parser | current | controller `execute` → `runVisionRequest` → `parseVisionOutput` | HTTP兼容服务，无数据库/模型自动启动权 |
| Dedicated OCR | current | `DedicatedOcrPanel` → `asset-ocr:*` → `createOcrController` → runtime/process | Main选择子进程；Host `commitOcr/correctOcr` |
| 配色测量 | current | organization/Host `measurePreviewColors` → `measure-preview-colors.ts` | 确定性预览算法，不是LLM |
| 素材查询 | current | Renderer Store → preload `listAssets` → active-library IPC → Host `readAssets` | 输出当前资产/AI/OCR投影 |
| 词法检索/AI分类 | current | `Library.tsx/projectAssetDiscovery`、`useLibraryOrganization` → shared workflows | Renderer纯投影；不是持久语义索引 |
| 笔记/普通组织 | current | 主库Canvas → active-library IPC → Host `saveNotebook/writeOrganization` | 库内持久对象，独立revision/session |
| Work Sets/windows | current | `useWorkSets`/`WorkSetWindow` → `work-set.ipc` → controller → Host | 内容/布局保存；窗口token与成员范围独立 |
| Asset Card | current | 主库/asset-card IPC → `createAssetCardController` →专属Preload | 当前素材范围，切库撤销 |
| Managed download | current | DownloadQueue → download IPC → `createManagedDownloads` → Host Capture/Journal | App历史与库恢复意图区分；网络成功不等于入库 |
| Image tools | current | 详情/卡片 → image-tools IPC → controller → Host `saveImageVariant` | 新派生素材，不覆盖来源 |
| Backend settings/probe | current | AiBackendSettingsPanel → ai-backend IPC → Settings/ModelServiceProbe | GET /models不是图像推理质量证明 |
| Model Workspace | current（受限） | ModelLibraryPage → workspace Preload/IPC → production provider | 发行目录输入missing，不能推出安装/激活闭环 |
| Model Library核心 | tracer | `model-library/README.md`所列内存/事务tracer及脚本调用 | 局部模型制品验证；与正式安装权限分开 |
| Eagle连接控制面 | current（受限） | ConnectedLibrariesPage → external IPC → connectedRuntime | 生产分支为UnavailableProvider；独立index/Journal |
| Eagle Web/companion adapter | tracer / 外部边界候选 | synthetic分支/聚焦测试 → Web API/companion adapter | 真实配对与第三方写入unknown，不能宣称当前可用 |
| Legacy Read-Only | current（需显式选择） | LegacyLibraryPage → external IPC → `createLegacyReadOnlyWorkspace` | read-only opener/query_only（当前darwin限定），不能迁移/写回 |
| 旧AI Client/Worker | legacy | 旧service/旧IPC实现保留；正式composition注册拒绝入口 | 旧getDatabase写法不能成为新库写口 |
| 旧Prompt Provider | legacy（策略有实测历史） | 旧Worker/provider与隔离评估调用 | 新正式视觉链路直接走transport，不自动回退 |
| AI Runtime adapter | tracer / plan-only | `createAiClientRuntimeAdapterPlan`与相关脚本 | 返回计划，不执行推理/SQLite/服务启停 |
| 旧Runtime/installer IPC | legacy（受限） | `disabled-app.ipc.ts`注册拒绝handler | 限制不是待自动恢复清单 |
| refactor/work-mode prototype | prototype | `renderer/routes/*-prototype`、preview scripts | 不在正式App路由表；共享展示组件可被正式使用 |
| 平台包/真实Eagle/当前已装模型 | unknown | 本轮只见源码/报告，不运行OS/服务检查 | 未据此放行Windows、签名包、当前模型状态 |
| 目标Orchestrator/Job Journal/Governor/Egress/FTS | target（非上述五种实现分类） | 包HOST-03/SYS-01；当前所追正式路径未见统一实现 | 目标索引，不创建占位模块、不声称已实现 |

## 2. 正式链路

```text
index.ts / setupIpcHandlers
├─ createProductionActiveLibraryHost
│  └─ createActiveLibraryHost → inspected binding + exclusive lease
├─ registerMainIpcComposition
│  ├─ registerVisualAiIpc → VisualAiController
│  │  └─ controlled preview → HTTP transport → complete parser
│  │     └─ Host.saveVisualAiEvidence → visual-ai-storage transaction
│  ├─ registerAssetOcrIpc → OcrController
│  │  └─ OcrRuntime → runLocalOcr → Python runner
│  │     └─ structured observation → Host.commitOcr → OCR transaction
│  ├─ registerActiveLibraryIpc
│  │  └─ Host.listAssets/readAssetContext → readAssets → current projection
│  │     └─ Preload mapping → Asset Store → lexical search / AI folders
│  ├─ registerWorkSetIpc → WorkWindowController
│  │  └─ Host.writeWorkSet/writeWorkLayout → library-owned content/layout
│  ├─ registerModelLibraryWorkspaceIpc
│  │  └─ production Workspace → empty release inputs → unavailable catalog
│  ├─ registerExternalConnectedLibraryIpc
│  │  ├─ connectedRuntime → production UnavailableEagleProvider
│  │  └─ Legacy workspace → explicit selection → read-only SQLite
│  └─ registerDisabledAppIpc / active-library legacy rejection
└─ ShutdownCoordinator
   ├─ workWindows.drain / assetCard.invalidate
   ├─ visualAi.invalidate / ocr.invalidate / imageTools.invalidate
   ├─ managedDownloads.drain → ActiveLibraryHost.close
   └─ connectedRuntime.drain → appStorage.close
```

## 3. 数据写入权威

| 数据域 | 当前唯一权威边界 | 不允许的替代 |
| --- | --- | --- |
| Managed Asset / Capture / Trash | Host的有效binding与lease内操作 | Renderer路径、全局getDatabase、旧assets:delete |
| 视觉证据与标签建议 | Host→commitVisualAiEvidence事务，人工描述受保护 | Provider自行写库、截断字段冒充完整结果 |
| 专用OCR/修订 | Host→OCR storage/session/revision检查 | 视觉新结果清空修订、Worker直接写库 |
| 组织/笔记/工作集 | Host→各域持久模块；设备布局按device隔离 | localStorage原型存储作为正式权威 |
| App下载历史/设备ID/OCR环境选择 | app-state.sqlite及应用设置 | App历史替代库内恢复授权或素材成功 |
| Eagle原件/元数据 | Eagle外部权威；DAM仅独立索引、Journal、受限缓存 | 当成Managed Copy、假设本地锁可锁住Eagle |
| Legacy旧库 | 无写入权威，显式read-only | initDatabase、migration、自动复制/合并 |
| 模型制品/Runtime | 独立模型存储及受限Workspace/管理层 | 本次分析请求顺带下载/安装/启动 |

## 4. 生命周期与目标状态机的差别

当前visual-ai：prepare内存receipt→queued/running→completed/partial/failed/cancelled；取消/切库撤销；完整结果持久保存。OCR也有独立内存任务和持久结果。两者没有共同持久Job/Attempt/PhysicalInvocation。

目标包：持久意图→重新绑定授权→准入许可→物理调用→各能力完整验证→Host事务提交证据/成功状态/Outbox。该目标未在P00实现；下载Journal和Eagle Outbox只覆盖各自域，不能被借名当作AI全局任务事务。

## 5. 可达性审计限制

这是根入口+关键调用方的人工聚焦审阅，不是完整whole-program静态分析。没有把所有旧目录判为不可达，也没有建立任何删除清单。未来清理必须继续证明直接/间接调用、测试用途和兼容依赖。测试脚本存在不意味着本次执行；生产handler存在也不代表相关外部依赖可用。
