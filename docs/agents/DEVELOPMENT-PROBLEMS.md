# 本地开发问题

本页是开发问题明细的权威记录，不是产品任务中心或新的长期实施队列。当前获批工作归[TASK](../../TASK.md)，跨系列责任归[主台账](../tasks/TASK-REGISTRY.md)，实际能力归[CURRENT-STATE](../handoff/CURRENT-STATE.md)。

从 `npm run context:route -- --task "具体任务" --json` 的 `feedback.problems` 找到相关条目。开始前核对当前代码、运行身份和最新用户要求；旧报告不证明问题仍存在。未经当前目标纳入的问题仅登记。

## 记录约定

每项有唯一 `DAM-PNNN`、影响与复现线索、当前责任/状态、下一检查和证据。相同问题多来源合并到同一项。`Routes` 使用现有路由 ID，`Group` 为 common/frontend/host/integration；这些是检索元数据，不是执行权限。

`Status`：needs-reproduction（待核实）、open（已复现）、in-progress（当前任务认领）、blocked（有具体依赖）、resolved（复验已成立）、not-planned（有明确决定）。认领时写当前任务与候选；结束时保存实际结果与下一步。只通过静态检查、无法复现或缺适用环境不能改为 resolved。格式与处理规则见[开发指南](../../CONTRIBUTING.md#9-本地开发反馈闭环)。

<a id="dam-p001"></a>

### DAM-P001 — 旧键盘回归的搜索 Client 夹具可能过时

- Routes: asset-discovery, asset-workspace
- Group: frontend
- Status: needs-reproduction
- Check: 核对当前查询 Client 与旧键盘夹具的完整接口，在隔离运行中确认是否仍因缺 searchAssetsPage 而超时；正确修复夹具后保留键盘行为断言并执行相关检查。

类型：测试夹具。责任：关联检索/素材工作区；当前无修复任务认领。证据日期/候选：2026-10-14 / dam-d96e08246b8b97c4。

[报告](../checkpoints/settings-integration-20261014/README.md#内部验证与缺口)记录旧脚本在素材按钮检查前超时。本轮静态核对 [旧夹具](../../scripts/asset-library-keyboard.test.ts)的 Client 定义与现有调用变化；未重新运行该 UI 失败，不认定当前产品键盘功能失效。需要分别证明夹具一致性和正式界面键盘路径。

<a id="dam-p002"></a>

### DAM-P002 — 后台 OCR 与视觉 AI 扩展回归未完整收尾

- Routes: ai-analysis, ai-runtime
- Group: host
- Status: needs-reproduction
- Check: 在隔离范围定位旧回归停在哪个阶段，区分断言等待、Worker 退出、Host 收尾与环境问题；保存超时证据并确认自有进程退出，不以最终断言输出替代执行结束。

类型：运行/验证待归因。责任：AI执行与测试生命周期；当前无修复任务认领。[历史报告](../checkpoints/settings-integration-20261014/README.md#内部验证与缺口)提到 OCR 扩展停在14个子项后、视觉 AI 回归挂起。未做本轮复现；测试挂起不能直接推断真实推理不可用。

涉及真实推理时只用现有模型，允许适用真实 Worker/外部推理，不下载模型。复验需记录对应候选、具体命令/正式步骤及退出结果。

<a id="dam-p003"></a>

### DAM-P003 — 空库加载与 Browser 404 的来源仍待归因

- Routes: desktop-shell, asset-workspace
- Group: integration
- Status: needs-reproduction
- Check: 从正式空 profile 的 Desktop/Browser 入口核对加载提示和404请求，记录非敏感请求类型及触发步骤，追到 Client/Host/资源消费者；区分预期空态、缺资源与真实失败后复验。

类型：诊断待归因。责任：共享界面/Host接线；当前无修复任务认领。[设置报告](../checkpoints/settings-integration-20261014/README.md#实际界面验证)保留 WARN；不因页面可打开就关闭。没有本轮运行证据，仍为待核实。截图和日志不能包含私有路径、账号或素材。

## 已解决项的保留方式

resolved 条目保留原因、修复候选、原失败和复验链接，路由不默认把它列成待处理问题。提炼经验时引用该 id 与证据，不复制一份问题状态；归档/不计划也要保留决定来源。不要用路由输出的建议自动执行历史任务。

<a id="dam-p004"></a>

### DAM-P004 — 经验积累后元数据预算会阻断整个源码路由

- Routes: agent-governance
- Group: common
- Status: resolved
- Check: 在隔离记录中增加足够长的相关问题与经验，确认源码路由仍成立、完整检查未截断、延后数量准确且预算不超限；必需上下文无法容纳时仍明确报错。

类型：开发工具行为。2026-10-15本任务认领并复现：各12条相关问题/经验、每条416字符检查，在原实现上实际返回BUDGET_UNSATISFIABLE，元数据估算8776 tokens超过4000上限。

原因：反馈只按条目数量截取，没有按路由输出字节预算收敛。修复在完整条目边界延后记录，保留各类至少一项，提示回原索引读取余项。证据与最终源码身份见[本轮结果](../checkpoints/development-feedback-20261015/README.md)。聚焦回归包含实际上下文路由及记录更新；这是工具资格，不是应用UI/模型验收。

<a id="dam-p005"></a>

### DAM-P005 — 检索路由仍把已接线的 Host 查询描述为未来实现

- Routes: asset-discovery, agent-governance
- Group: integration
- Status: resolved
- Check: 对照Library调用、useHostAssetSearch、共享Client和模块README核对路由说明；源码接线、模型资格与目标能力分别记录，不用旧导航摘要否定现有实现。

类型：上下文导航事实错误。2026-10-15静态核对发现路由仍描述为加载素材上的内存词法匹配，并把索引/向量/以图全部记为未来。当前源码明确通过searchAssetsPage和retrieval.query调用Host；本任务修正该路由说明，并将实际查询消费者与Host模块README纳入按需读取。

修复与路由检查见[本轮结果](../checkpoints/development-feedback-20261015/README.md)。仅修正导航事实，没有重新宣称真实模型、全规模或平台用户资格；其他路由的历史状态按相关任务继续核对。


<a id="dam-p006"></a>

### DAM-P006 — 文档与路由的旧交付摘要指向错误执行链

- Routes: agent-governance, asset-lifecycle, library-creation, capture-intake, ai-runtime, model-library
- Group: integration
- Status: resolved
- Check: 对照Main注册、生产Active Library工厂、managed模型/Runtime与子系统正文，确认普通入口不再指向旧全局删除或禁用Runtime；执行导航、条款保全和相关路由回归，保留产品资格差别。

2026-10-15本轮静态复现：旧路由把Active Library删除描述为全局hard-delete、Copy仅为tracer，模型管理全记未实现，Runtime旧IPC反记现行；ADR索引仍写仅内存词法检索。实际Main组合及Client消费不同。根因是多个手写交付摘要随实现演进失同步。已有DAM-P005是前次检索路由的独立修复，本项覆盖新发现的同类记录，不把重读同一事故当第三次。

本任务已修正相应摘要、建立子系统正文和正式读取/写回入口，并保留旧tracer/禁用通道的限定语义。最终复验与身份见[重建检查点](../checkpoints/documentation-rebuild-20261015/README.md)，源码/路径与完整治理回归均已核对；未重新宣称UI、模型或原生资格。
