# 现场审阅：问题不是只有入口少一个按钮

审阅日期：2026-10-01。本文的 R-* 为现场源码来源，U-* 为上游一手资料，详见 [来源索引](07-SOURCES-AND-LIMITS.md)。

## 1. 判断

当前主要问题是：**功能归属没有统一、同一配置存在多个编辑入口、旧运行诊断仍在正式页面中、用户路径验收与内部集成验收没有严格分开**。只新增一个 AI 按钮不能解决这些问题。把旧控制台直接删除也会切断其中仍然承担的现行功能。

此前“正式链路通过”的表述，只能支持其记录范围内的连接与保存行为，不能证明普通人可以找到入口。今后必须将两种验收分别判定，不再以内部测试替代可用性。

## 2. 当前快照与计量边界

只读 Git 观察：分支 `codex/product-reassessment-20260905`，HEAD `3fa00df3bbb605478da6d0af18724d64021e723c`。状态统计为 staged 18、unstaged 779、untracked 253；状态有重叠，未跟踪项按 porcelain 的目录折叠方式统计，不等于叶文件数量。大量 WIP 不全是这一轮 AI 所写，不能全部纳入清理或提交。

| 目录 | 文件 | 文本行 | 统计含义 |
|---|---:|---:|---|
| src/main | 381 | 49,806 | 指定代码／CSS扩展名，排除依赖、构建和缓存 |
| src/renderer | 126 | 17,317 | 同上，不等于全部处于正式入口 |
| src/preload | 5 | 573 | 同上 |
| src/shared | 98 | 9,926 | 同上 |
| scripts | 363 | 52,622 | 含测试、工具、验证实现 |
| ai-service | 105 | 16,575 | 含当前 OCR 和旧 Worker／评测 |
| docs | 865 | 35,724 | 仅 Markdown，包含历史副本 |

没有取得完整目录磁盘容量基准，因此不把这些行数换算成安装包体积或内存消耗。删除目标也不应是任意“减少 30%”。本次一项扩展扫描未执行成功，候选文件的脚本／打包引用尚未全部核清。

## 3. 已确认的问题与证据

### A01｜导航有多份手写配置，入口随页面改变

`App.tsx` 和 `app-navigation.workflow.ts` 注册了 `/ai-console`；`WorkspaceRail.tsx` 的硬编码导航却没有 AI 项。非资料库页面使用顶部 `GlobalNavigationMenu`，资料库页面使用独立 `LibraryCanvas.menuItems` 和 `BottomDock`。

10月1日 `LibraryCanvas.tsx:70` 已增加顶部 AI 按钮，`BottomDock` 也不再因未开库隐藏菜单。这修复了一个入口缺失场景，但可见文本仅“AI”，不同页面仍然有不同导航实现。**本次没有重新在屏幕上验证该修复的可发现性、遮挡、焦点或实际运行构建。** [R01–R04]

### A02｜同一模型连接存在重复编辑界面

`Settings.tsx:83–86` 的“AI 与模型”挂载 `AiBackendSettingsPanel`，并用“运行环境与诊断”链接进入 `/ai-console`。新 `PiConnectionsPanel` 又在控制台编辑连接、认证、默认模型和任务分配；旧控制台本身还包含外部服务、Llama、提示模板等配置。

`Library.tsx:290,305–306` 及 `AppShell.tsx:74` 的配置入口仍去 `/settings?section=ai`。用户可能在旧界面保存地址，再去另一页保存密钥或登录，却不清楚是否同一个连接。两个界面都通过 aiBackend API 读写，不应成为两套产品配置来源。 [R03、R05、R06、R08]

### A03｜旧控制台仍属于正式路由，不是纯历史文件

`AiConsolePage.tsx` 2,583 行；约第1268行直接追加后台计划、后台 OCR、Pi 连接、服务验收四个面板，然后才出现旧控制台标题及旧 tabs。约809–815行挂载后调用状态、协作模型读取并每5秒刷新；旧 adapter 调用的多条 Runtime、模型、GPU、Llama 通道在 `disabled-app.ipc.ts` 明确返回不可用。

这会让用户面对不属于当前正式能力的状态、配置和失败提示。改法是按功能迁移并退休旧容器，**不是把新 Hub 再加到旧容器前面，也不是解除这些 IPC 的安全禁用来“让按钮有效”**。 [R06、R07]

### A04｜测试确实绕过了用户入口

`pi-electron.e2e.test.mjs:21` 在取得素材身份后执行 `page.evaluate(()=>location.hash='/ai-console')`；后续还有跳回资料库、直接改连接、直接关库／重开的行为。它有真实 Main/Preload/Host 价值，但不能验证用户能找到 AI 控制台。

新的 `library-startup-navigation.e2e.test.mjs` 前两项已有可见按钮交互，第三项仍直接 `electronAPI` 配置、开库、写密钥、prepare/discard。应准确拆为“界面入口集成”和“恢复状态下服务边界”，不能统称纯人为交互。 [R09]

### A05｜设置中存在与当前链路不一致的文字

`Settings.tsx:84` 仍写“下载执行器尚未接通”。当前工程已有独立下载／Capture 链及历史验证。这一提示至少需要按实际消费者与适用范围重写，不能让旧占位文案成为当前能力说明。设置里的目录、并发、间隔等字段也必须逐项找到消费者：保存成功不等于它影响当前执行器。 [R05]

### A06｜登录错误丢失了必要的阶段信息

当前不是纯粹调用 Pi 原始 OpenAI OAuth，而是在 `worker.mjs` 中以 `createChatGptAuth` 覆盖原 factory 的 OAuth 实现。自有回调页只表示收到回调；换令牌、JWKS、身份验证、Worker close、保险库写入仍在后面。

Worker 只保留少量错误码，其余压成 `AI_PROVIDER_FAILED`；Main login catch 再压成“登录未完成，原账号凭据保留”，IPC 也普遍返回通用失败。用户无法区分未收到回调、身份验证失败、系统保险库失败或无计划权限。**这是可证实的诊断设计缺口，不是已知真实账号失败根因。** [R10–R13]

### A07｜已复现：合法拒绝回调未结束登录任务

使用当前 `createChatGptAuth`、捆绑 Node 24.21.0、自有127.0.0.1回调与合成 UUID；认证网络替身固定不允许调用厂商。发送合法 state 的 `error=access_denied` 后，HTTP为400，120ms后登录 Promise仍未结案；测试主动 abort 后才清理完成。

根源在 `callbackListener`：`parseCallback` 识别拒绝并抛错，但 handler 统一 catch 只回400，不调用 `doneReject`。官方要求合法 state 的拒绝立即结束尝试、不得换令牌。必须分别处理“合法用户拒绝”和“错误 state 的无关请求”。本反例不证明用户本次走过拒绝分支。 [R10；U04；evidence/AUTH-DENIAL-PROBE.json]

### A08｜账户流程受页面生命周期影响，状态又不足以恢复

`PiConnectionsPanel` 卸载时调用 `cancelLogin`；切换连接也取消。离开配置页再回到应用可能终止当前登录，即使浏览器仍在工作。单纯切到浏览器窗口不等于组件卸载，不能据此断言实际发生过取消。

登录成功后的 planUsageAuthorized 在当前 operation 中可见，但普通凭据状态主要是 configured/kind/revision。应让应用侧持久账号元数据和安全状态投影支持重开页面／重启后解释“已保存／身份验证／计划权限／模型验证”，而不是依赖一次临时 toast。 [R11、R13]

### A09｜完成锚点与当前源码不再同步

`LATEST.json` 指向 DP01 完成快照并保存 `sourceVerification:current`；`TASK.md` 新首段明确说明10月1日修复不在旧快照中。这不表示旧快照错误，但“current”不能作为永久事实被读取器信任。需在读取时计算 current/stale，并让帮助页显示当前运行 buildId，而不是靠窗口标题或 HEAD 猜测。 [R00]

## 4. 删除候选，不是删除批准

AST 相对 import/export 分析覆盖598个 src 代码文件，包含类型导入；选择生产入口后，发现27个 renderer 候选未到达。图没有覆盖所有 script入口、IPC字符串、动态Worker、打包规则和视觉golden关系。名单与分类见 [清理计划](04-REPOSITORY-CLEANUP.md)。

`AssetPromptReversePanel` 并非简单“没有 import”：`AssetInspectorDrawer` 仍导入它，但实际渲染有 `!activeLibraryMode && settings && handleRunPromptReverse` 条件。下一阶段必须沿调用方证明该分支的可达范围，再迁移或删除。`work-mode-prototype` 是 DESIGN 的批准参考，不能因不在生产根图就删除。[R14、R15]

## 5. 这次能与不能下的结论

可以确认结构冲突、测试绕路、旧控制台的正式引用、合法拒绝回调的结案缺口以及大量待分类代码。尚不能确认真实登录失败的唯一原因、所有候选均可删除、当前软件已通过人机操作验收，或新代码与用户正在运行的构建完全一致。

本轮没有代码修复或删除，没有读取私有账号状态。后续必须按“先取证—小范围迁移—真实路径验收—再清理”的顺序执行。
