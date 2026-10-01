# 仓库管理与安全减量

## 1. 本次不采用的做法

不换Electron/React/SQLite技术栈；不引入微服务；不要求先实现插件平台；不通过缩短代码排版制造行数减少；不把所有“旧/legacy/tracer”目录一键删除；不把仍有用户数据的schema降级；不删除失败测试来维持绿灯；不把全部依赖目录手工裁剪后继续宣称锁文件完整。

目标是减少**重复业务入口、无意义运行调用、无主状态和不必要的生产依赖**，而不是把有价值的证据与保护一起删掉。

## 2. R00工作区保护

工作区存在大量既有修改。必须记录：HEAD/branch、index摘要、staged diff摘要、目标文件before摘要、相关未跟踪文件、选定源码恢复副本。Git bundle或历史提交不包含全部未提交WIP，不能单独用作回退依据。

仅收集必要开发文件；真实数据库、用户素材、`.env`、浏览器状态、凭据、模型缓存/权重、私人截图不纳入普通交接包。拒绝读取、归档或打印秘密以“做全备份”。

实施前确定单一写者，记录协作锁与工作区前置摘要。若有其他AI同时写同一文件，暂停冲突部分；不能靠重复覆盖赢得竞争。优先使用经核对的源码工作副本做大范围迁移，但必须携带已授权相关WIP，而不是只checkout旧HEAD。创建分支／提交由本批授权决定，默认不提交、不推送。

回退只处理本批拥有的变更，先核对after摘要；发现后来编辑就逐块合并，不自动恢复整文件。资料库和凭据回退是另一层，不能用源码回退冒充状态回滚。

## 3. 建立完整引用图：先证明入口，再证明可删

第一层静态图：TypeScript AST import/export、动态literal import、require、CSS import、React路由、Electron-vite entry、原生窗口Preload、Worker entry。

第二层运行声明：IPC注册/调用/禁用表、字符串注册、Python命令入口、package scripts、extraResources、CI、node_modules导入边界、原型预览脚本、文档中仍被测试执行的源码夹具。

第三层有限运行证据：标准用户路径中真正挂载的组件及实际IPC集合。该诊断仅作辅助，不作为Computer Use动作来源。无运行观测不能自动删静态未知边。

每个候选落入且只能落入一个主要状态：
`KEEP_PRODUCTION / MIGRATE_THEN_RETIRE / DELETE_PROVEN / MOVE_TEST_ONLY / ARCHIVE_REFERENCE / KEEP_PENDING_EVIDENCE`。

只有以下全部成立才能 `DELETE_PROVEN`：无生产入口；无动态/脚本/打包必要引用；无须保留的公共拒绝/兼容边界；无用户数据/恢复责任；相关测试或golden已迁移；具体删除清单和before可回退；范围已批准。

## 4. 初步候选名单与处理方向

下列27项来自本轮相对AST入口图，**全部仍是待核候选**。JSON版本见 `manifests/DELETION-CANDIDATES.json`。

| 组 | 候选 | 初步建议 | 删除前补证 |
|---|---|---|---|
| 旧全局壳 | layout/Sidebar.tsx、Topbar.tsx | DELETE候选 | 检查story/preview、CSS与测试调用；当前AppShell替代关系 |
| 旧素材布局 | library/AssetWaterfallGrid.tsx、BulkActionDock.tsx、LibrarySidebar.tsx、LibraryToolbar.tsx、library-labels.ts | DELETE或抽取后删 | 确认AnchorGrid/LibraryCanvas及正式批量工具覆盖全部仍需行为 |
| 旧分析面板 | asset/AssetDeepAnalysisPanel.tsx | DELETE候选 | 查所有动态面板注册、测试与支持格式，不让旧AI数据库口复活 |
| 旧标签编辑 | tag/TagEditDialog.tsx、TagFilterBar.tsx、TagMergeDialog.tsx | DELETE或保留测试价值 | 复杂merge曾受限；不因删除旧UI顺带宣布合并功能完成 |
| 旧hook | hooks/useActivePromptModel.ts、usePromptReverse.ts | DELETE候选 | 核对脚本及旧反推调用者；保留当前Visual/Tag Controller |
| 测试adapter | 两个in-memory-*.adapter.ts | MOVE_TEST_ONLY | 检查测试导入；移动到tests support，不删除仍用夹具 |
| refactor原型 | FloatingAssetCard、ModeSwitch、RefactorPrototype | ARCHIVE_REFERENCE候选 | 冻结引用、确认是否仍是视觉对照，移出生产src前修改预览工具 |
| work-mode原型 | AnchoredGrid、BottomDock、ColorTools、FocusCanvas、FocusMode、FolderCard、WorkModePrototype、fixtures、focus-notes | ARCHIVE_REFERENCE / 测试保留 | DESIGN明确它是批准视觉参考；保留可渲染golden与来源，不能批量丢弃 |

上述路径前缀均是 `src/renderer/`，完整路径以JSON清单为准。

## 5. 并非不可达，但必须整合的模块

**AiConsolePage.tsx**：从当前旧容器中逐项迁移仍有效的连接、任务分配、模板、模型库摘要、后台状态。每移一项就删除原挂载及对应副作用，不留新旧并行默认入口。最终只有兼容redirect或薄组合页，不再有旧状态轮询。

**AiBackendSettingsPanel 与 PiConnectionsPanel**：不是简单删一个数据服务。先让全部配置入口使用统一连接页，保持原连接ID/credentialRevision/模型验证绑定，再删除第二编辑器。历史API连接用legacy执行adapter兼容，不要求一轮强迁所有Provider。

**AssetInspectorDrawer 与 AssetPromptReversePanel**：仍有静态导入。分别证明activeLibraryMode条件、各调用者和历史可用范围；保留人工标签/描述能力与正式VisualAiPanel，只在替代调用点验证后移除不可执行的旧AI分支。不能为了让bundle变小移除用户编辑。

**AiRuntimePanel / RuntimePackagePanel / DoctorPanel**：实际处于禁用通道或验证实现的动作从正常产品表面移除；可用诊断按现行数据源重建。若还有打包/开发脚本使用对应核心，先移出产品UI，核心稍后判定，不为删除页面扩大到整个安装框架。

## 6. 明确保留的边界

- `library-lifecycle`：检查过的连接、lease、事务、原件、恢复、source/session/revision/CAS。
- `capture-intake`、受管下载、图片变体、回收站、组织、笔记、工作集；去重状态投影不合并其权威。
- 当前专用OCR执行入口 `ai-service/tools/local_ocr_worker.py`及其最小真实依赖；不得删除整个ai-service。
- `disabled-app.ipc.ts`中的安全拒绝：当仍有旧Preload/客户端契约时保留薄tombstone。没有界面消费者不等于拒绝代码无价值。
- Eagle和旧库只读：已注册真实路由，有独立数据所有权。名字中legacy不是删除理由。
- 已提交AI结果、OCR修订、确认标签、历史凭据迁移记录和回执；页面简化不能清空表。
- 锁文件、许可证、模型/runtime来源清单、安全校验；不以“依赖太多”手改node_modules。

## 7. Main／Worker收敛，不新增万能服务

本批只围绕以下稳定职责拆分已有代码：
`ConnectionRepository`（非秘密配置）、`CredentialVault`（秘密持久化）、`AuthCoordinator`（账号生命周期）、`ModelCatalog/Capability`（声明与验证）、`InferenceGateway`（一次调用）、`RuntimeHost`（自有进程）、各业务Controller、Library Host。

这是职责边界，不要求新建8个框架包或每类都抽接口。优先提取可测试的现有函数，禁止“为了目录漂亮”逐文件加Service层。跨边界信封须运行时校验、错误分类和明确来源；不要使用无约束 `any` 或任意SDK对象从Worker直达UI。

长文件是审查信号，不是自动拆分阈值。修改到的压缩长行模块应先做可审阅格式化，并与行为变化分开保存差异；禁止全仓库格式化掩盖本批代码。

## 8. 生产包、脚本与文档减量

- 生产构建入口只保留正式应用；原型和in-memory数据不进入正式路由。
- `extraResources`审查按实际运行需求白名单化；Python评测、历史下载器、巨大测试夹具不应因整个ai-service通配符进入安装包。任何裁剪先有打包启动与运行文件解析测试；本批未批准打包变更时只交付清单，不假称裁完。
- Pi固定runtime的完整性树仍由lock/source/release校验。减少体积需先明确可重建打包流程和许可证，不删随机依赖文件。
- 测试按unit/SDK/Host/IPC/UI-integration/CU/real-account分层注册；重复用例只有覆盖等价且保留负向场景ID后可合并。旧route injection测试保留为integration，不计CU。
- 活跃文档入口压为AGENTS、TASK、ARCHITECTURE、FEATURE-MAP、当前计划。旧报告归档但可追溯；不把6000行词汇表当每次启动必读。
- 交接不再递归嵌入所有历史ZIP。当前包只放本批差异、精确来源指针、必要证据和变更前后清单。历史留一份完整性校验的归档索引。
- 缓存/构建输出/旧报告的磁盘清理由独立显式清理动作处理，不借代码整理顺带删除用户资料或模型。

## 9. 清理批次与完成标准

每个删除小批建议最多5–10个相互关联文件；不是硬限制，而是控制可审阅差异。顺序：证明→替代→调用者迁移→相关测试→CU受影响路径→删除→构建→引用再查→记录。

结果必须给出：实际删除/移动/合并文件；每项依据；保留旧能力的对应路径；生产依赖图变化；旧轮询数与重复编辑器数变化；未处理候选及理由。仅显示“减少了N行”不算完成。没有完成删除证明时写KEEP_PENDING_EVIDENCE，不能为了目标数量硬删。
