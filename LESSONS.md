# DAM 开发经验

本页保存可执行经验与证据，按共通、界面、Host、跨端分组。入口为 `npm run context:route -- --task "具体任务" --json` 的 `feedback.lessons`；相同事故只保存一条主记录，可以关联多个路由。读取后把 `Check` 转成本任务检查，不只声明已读。

每项有唯一 `DAM-LNNN`、适用路由、职责、状态与检查。`Status` 为 active/superseded/archived；Routes 的 `*` 只用于所有任务都适用的共通要求。详细失败留原报告，本页不保存另一份产品进度。维护方法见[CONTRIBUTING](CONTRIBUTING.md#9-本地开发反馈闭环)。

## 复盘与提升

事件、上海复盘日期、严重性、已提升引用与暂缓理由按CONTRIBUTING§9记录，路由返回promotion。三个不同日期有新事故才列候选，严重安全/数据/越权立即处理；重复阅读/重试不增加日期。已确认规范可以直接建立，不为它伪造三次事故。正文原事件保留，提升后只引用唯一规则/检查，不复制第二份约束。

## 共通工程

<a id="dam-l007"></a>

### DAM-L007 — 经验增长应延后完整条目，而不是阻断源码导航

- Routes: agent-governance
- Group: common
- Status: active
- Check: 修改上下文或反馈输出时，用积累后的长记录验证总预算；检查完整检查不被截断、延后数量可见、必需源码仍可读，不能只验证初始少量记录。
- Events: [{"id": "DAM-P004", "reviewed": "2026-10-15", "evidence": "docs/checkpoints/development-feedback-20261015/README.md"}]
- Promoted: scripts/development-feedback.test.mjs

适用：上下文路由、问题/经验索引与预算变化。事故[DAM-P004](docs/agents/DEVELOPMENT-PROBLEMS.md#dam-p004)在隔离增长输入中实际复现；原实现超限后使任务路由关闭。行为回归见[scripts/development-feedback.test.mjs](scripts/development-feedback.test.mjs)，执行证据见[本轮结果](docs/checkpoints/development-feedback-20261015/README.md)。Seen dates: 2026-10-15。

<a id="dam-l001"></a>

### DAM-L001 — 失败、未运行与旧候选资格必须分别记录

- Routes: *
- Group: common
- Status: active
- Check: 验证记录绑定当前候选、客户端和实际环境，分别列通过、失败、未运行与阻塞；未复现或未验根因/修复效果的问题不能关闭，旧证据不转记到新候选。
- Promoted: docs/code-standards.md#candidate-identity

适用：所有开发任务。[设置整合报告](docs/checkpoints/settings-integration-20261014/README.md)保留夹具、挂起和控制台缺口，[真实验收](docs/agents/ui-ux-acceptance.md)规定各层证据不能替代用户结果。这是已确认工程要求及历史案例，不是本轮重新验收产品。

## 界面与交互

<a id="dam-l002"></a>

### DAM-L002 — 每次 UI/UX 改动都检查受影响的正式路径

- Routes: asset-workspace, asset-discovery, asset-lifecycle, capture-intake, ai-analysis, prompt-reverse, ai-runtime, model-library, model-library-product-pilot, runtime-package, settings-paths, desktop-shell, work-mode
- Group: frontend
- Status: active
- Check: 判断本次是否改变可见布局、交互或等待/错误/恢复反馈；若涉及UI/UX，按DESIGN及交互规格从正式入口检查受影响状态，缺陷须复现并验证根因和修复效果，动态问题保留适用连续帧。
- Promoted: docs/code-standards.md#ui-verification

适用：实际影响 UI/UX 的变更，不由文件扩展名决定。基准：[DESIGN](DESIGN.md)、[工作台交互](docs/design/WORKSPACE-INTERACTIONS.md)、[工作窗交互](docs/design/WORK-WINDOW-INTERACTIONS.md)。用户于2026-10-15明确要求。纯文档/未影响界面的内部变更不运行无关 UI。

<a id="dam-l003"></a>

### DAM-L003 — 分类转场不能卸载并丢失尚未保存的草稿

- Routes: settings-paths, desktop-shell
- Group: frontend
- Status: active
- Check: 调整页面生命周期或转场时，用未保存输入切换分类并返回，再检查取消、保存、离开与重开；确认草稿没有因组件卸载消失。
- Events: [{"id": "settings-transition-draft-20261014", "reviewed": "2026-10-15", "evidence": "docs/checkpoints/settings-integration-20261014/README.md#内部验证与缺口"}]

历史案例：[设置整合报告](docs/checkpoints/settings-integration-20261014/README.md#内部验证与缺口)记录并修复分类转场丢草稿，最终候选复验。当前机制见 [Settings](src/renderer/routes/Settings.tsx)与[草稿生命周期测试](scripts/library-view-draft-lifetime.test.ts)。历史修复不代表后续候选自动通过。

## Host 与执行

<a id="dam-l004"></a>

### DAM-L004 — 真实推理只用现有模型，检查取消直到物理退出

- Routes: ai-analysis, prompt-reverse, ai-runtime, model-library, model-library-product-pilot, runtime-package
- Group: host
- Status: active
- Check: 适用真实验收允许现有真实Worker和外部推理，仅用现有模型不下载；保存正式请求、结果、提交/回读和取消保护证据，资源释放以实际进程退出为准，缺模型只阻塞对应范围。
- Promoted: docs/code-standards.md#resource-lifetime

来源：2026-10-15用户明确限制，[真实验收](docs/agents/ui-ux-acceptance.md#6-真实ai与异步任务)、[资源执行](src/main/local-ai-resources/resource-governor.ts)。测试/验证进程结束问题另见 [DAM-P002](docs/agents/DEVELOPMENT-PROBLEMS.md#dam-p002)。应用内部使用已有安全机制，Agent不读取秘密。

## 跨端与完整路径

<a id="dam-l008"></a>

### DAM-L008 — 导航实现状态必须沿实际消费者核对

- Routes: asset-discovery, agent-governance
- Group: integration
- Status: active
- Check: 改变模块导航时对照正式调用者、Client/Host链和模块README；旧摘要与当前源码冲突就修正所属索引，区分源码接线与实际模型/用户资格，不复制另一份完成状态。
- Events: [{"id": "DAM-P005", "reviewed": "2026-10-15", "evidence": "docs/checkpoints/development-feedback-20261015/README.md"}, {"id": "DAM-P006", "reviewed": "2026-10-15", "evidence": "docs/checkpoints/documentation-rebuild-20261015/README.md"}]
- Promoted: docs/code-standards.md#semantic-review

本轮案例：[DAM-P005](docs/agents/DEVELOPMENT-PROBLEMS.md#dam-p005)。检索导航曾把Host查询描述成内存匹配并将已有单库向量/图像接线记为未来；现已修正该项读取入口与说明。没有因此重验或改判旧产品资格。Seen dates: 2026-10-15。

<a id="dam-l005"></a>

### DAM-L005 — 修改 Client 接口要检查所有消费者和测试夹具

- Routes: asset-discovery, asset-workspace, ai-analysis, desktop-shell, settings-paths
- Group: integration
- Status: active
- Check: 改变共享Client方法、返回形状或事件时，搜索正式调用者与测试替身，检查所有受影响分支；夹具必须满足当前契约，修正后运行行为验证，模拟通过不代替正式界面结果。
- Promoted: docs/code-standards.md#engineering-scope

历史依据：[设置整合报告](docs/checkpoints/settings-integration-20261014/README.md#内部验证与缺口)记录旧搜索夹具缺项；当前仍需复现的具体问题为 [DAM-P001](docs/agents/DEVELOPMENT-PROBLEMS.md#dam-p001)。模块关系见[检索](src/main/asset-search/README.md)、[共享Client](src/shared/client/workspace-client.ts)。

<a id="dam-l006"></a>

### DAM-L006 — 清理初始化接线时核对相邻注册与退出消费者

- Routes: desktop-shell, agent-governance, source-discovery
- Group: integration
- Status: active
- Check: 删除或移动初始化调用时，核对前后注册段、启动/退出顺序与实际消费者；执行注册保护并从正式入口验证受影响功能，不能仅以无残留文本作为完成证明。
- Promoted: docs/code-standards.md#engineering-scope

历史案例：[设置报告](docs/checkpoints/settings-integration-20261014/README.md#内部验证与缺口)记录拆除下载初始化时误删相邻注册并修复。结构检查入口为 `npm run test-app-ipc-registration`，普通功能验收仍按实际影响选择。
