# R00–R08 极细执行计划

状态：PROPOSED。批准本包后才可实施；本轮审阅没有应用这些变化。

## 优先级与范围

近期暂停扩展Provider/自动caption/全量Governor等新能力，先修复已明确的用户路径、账号反馈、重复控制台和仓库边界。不能用“架构路线还有十个阶段”拖延当下可用性。

顺序：`R00 → R01 → R02 → R03 → R04 → R05 → R06 → R07 → R08`。其中安全修复、CU工具取证可交错，但只有依赖满足的阶段才能验收。无CU工具可继续不依赖屏幕证据的安全代码；最终必须保持UX受阻，不虚构完成。

### 统一每切片执行流程

读取当前文件和调用方 → 明确可观察行为与不变量 → 建before/红灯或现有基线 → 最小修改 → 对应契约/SDK/Host验证 → 受影响界面CU → 保存证据与checkpoint → 同批下一切片。

不规定人为删除比例；也不把每阶段完成缩成一次“typecheck/build”。每条测试必须实际发现用例且日志对应当前代码。

### 授权分层

批准代码整合只包含指定源码、窄公共状态/导航契约的直接调用者、生成素材和临时库测试。真实账号登录、真实安全存储/个人配置变更、依赖安装、用户资料库、模型下载、付费推理、Git发布分别看明确授权。R07真账号未授权不阻塞其余合成验证，不自动继承历史登录授权。

### 运行约束

单一业务写者；测试默认串行；单条命令默认240秒上限，预期更长必须按当前任务提前明确原因及更小替代，不碰运气反复增加超时。同一问题最多三次有证据修复；连续两次同错无新证据，先最小复现/只读评审。修复次数跨会话保存。

真实阻塞只暂停依赖项；通过后不逐步询问“继续吗”。上下文不足写STATE/HANDOFF/当前before-after/未完成动作，不能承诺聊天会无限运行。进程是否退出依据本次拥有句柄，不能批量kill同名用户服务。

### 停止与回退

发现秘密外泄、真实库被触及、无法识别的并发写入、恢复无依据或授权超出立即停止相关动作。普通测试失败先按预算定位修复。目录迁移/删除必须有after匹配的逆向计划；遇到后续编辑人工逐块合并，不恢复旧完整文件。

## R00｜冻结现场、构建身份与安全恢复

**目标：**在任何迁移前辨认当前WIP、旧完成锚点和正在运行的构建，建立可回溯的单写者基线。

**依赖：**当前用户批准本计划。

**优先文件／直接调用方：**

- `AGENTS.md`
- `TASK.md`
- `.ai-run/LATEST.json`
- `package.json`
- `electron.vite.config.ts`
- `src/renderer/App.tsx`
- `src/main/index.ts`

### 具体动作

1. 只读复核最新TASK及其报告；将10月1日未入锚点修复列入本轮baseline，而非恢复旧DP01源码。
2. 记录HEAD/branch、index/staged摘要、涉及文件before/未跟踪状态；仅归档获准开发文件，不读取真实凭据/素材库。
3. 检查同一工作区是否还有写者；建立协作锁与原子checkpoint，不能因心跳过期就杀未知进程或抢锁。
4. 登记可运行构建身份：source manifest摘要、构建时间、entry位置、测试profile；如果缺少用户可见build信息，设计最小只读帮助入口。
5. 建立FEATURE-MAP、DELETION-LEDGER、AUTH-ISSUES，条目分别标事实/报告/推断；列出本批允许文件及动态入口待查项。

### 验收门槛

- 新的baseline覆盖当前源码而不是只有旧Git提交；before与索引摘要保存。
- 测试与运行app的构建身份能够核对；未知明确标UNKNOWN。
- 本批没有向原资料库、凭据、模型或Git历史写入；锁冲突不覆盖。

### 必交付

`BASELINE.json`, `FILE-SCOPE.json`, `WORKSPACE-RECOVERY.md`, `BUILD-IDENTITY.json`, `STATE.json`

### 禁止顺带做

- 不reset/clean/stash/add .；不把全部779个既有修改算成本批
- 不更新历史FINAL/manifest使其看似对应新源码

## R01｜Computer Use基线与信息架构定稿

**目标：**把用户真实任务、入口位置、功能所有权和必要视觉变更固定下来，停止继续向旧控制台堆面板。

**依赖：**R00。

**优先文件／直接调用方：**

- `DESIGN.md`
- `src/renderer/components/layout/`
- `src/renderer/components/library/canvas/LibraryCanvas.tsx`
- `src/renderer/routes/Settings.tsx`
- `src/renderer/routes/AiConsolePage.tsx`

### 具体动作

1. 从普通启动的屏幕开始，分别检查未开库/ready/closed/recovery，记录AI入口、当前已存在的顶部补丁和原生遮挡；无CU能力则记BLOCKED_TOOLING。
2. 按03文档核对所有功能的主要页面；现有代码有而UI不可达的项单列，不通过内部路由补验。
3. 用现有Gallery & Glass组件制作最小导航/AI连接原型，明确不是正式数据验收；保留四视图、原生窗口和可见AI标签。
4. 冻结主要目的地、别名、返回上下文与正常/高级模式字段，更新DESIGN的适用变更，旧像素规则在修改范围内显式替代。
5. 定义U01–U32与A01–A03证据计划；建立不同证据层的状态，不让CU缺失隐藏到总PASS。

### 验收门槛

- 每个保留功能恰有一个主要归属；全局配置不依赖开库。
- 入口位置在1024/1440与明暗可评审；没有另建与批准风格无关的后台。
- CU工具状态真实；缺少基线不造假，仍可在明确未验收状态下做安全实现。

### 必交付

`FEATURE-ROUTES.json`, `UI-OWNERSHIP.md`, `CU-BASELINE.json`, `DESIGN-DELTA.md`

### 禁止顺带做

- 不打开真实账户页面录取秘密
- 不把原型保存或DOM selector点击算CU产品通过

## R02｜统一导航、上下文返回与App/库范围

**目标：**一个registry、多处一致入口；所有配置CTA进入同一目标并能安全返回。

**依赖：**R01。

**优先文件／直接调用方：**

- `src/shared/workflows/app-navigation.workflow.ts`
- `src/renderer/App.tsx`
- `src/renderer/components/layout/AppShell.tsx`
- `src/renderer/components/layout/WorkspaceRail.tsx`
- `src/renderer/components/layout/GlobalNavigationMenu.tsx`
- `src/renderer/components/library/canvas/LibraryCanvas.tsx`
- `src/renderer/routes/Library.tsx`
- `src/renderer/routes/Settings.tsx`

### 具体动作

1. 创建或改造现有导航registry，定义global目的地、library子视图和可用原因，避免新增另一份手写routes。
2. 接入明确的AI与模型入口；修改library菜单、全局menu、rail、设置摘要与原生卡片配置返回。
3. 实现旧/ai-console、/settings?section=ai、/model-library、/downloads别名映射；同一组件，不并存两个主编辑器。
4. 返回上下文只保留安全库身份/assetId/视图/筛选/scroll等；恢复前再核库会话，旧库或删除素材不强行回到失效对象。
5. 从全局账号流程移除无关的library就绪前置；不解除真实Host操作检查、UNKNOWN资源屏障与退出协调。
6. 加入路由契约和visible integration测试，执行CU导航子集；集成测试的只读核对不能改变CU页面。

### 验收门槛

- U01–U09的路径满足目标或明确BLOCKED；不存在只能代码进入的正常功能。
- 每个旧链接有明确alias，导航没有循环，返回不会覆盖草稿/选中/权限。
- 开库失败保留真实recovery状态，App账号/设置不被错误停用。

### 必交付

`NAVIGATION-DELTA.md`, `RETURN-CONTEXT-CONTRACT.md`, `navigation-evidence/`

### 禁止顺带做

- 不将受控原件路径或完整账号URL放入route state
- 不保留新的AI Hub与旧控制台各一份默认导航

## R03｜认证诊断、拒绝结案和账号生命周期修复

**目标：**用户能判断卡在哪一步；Main负责登录完整生命周期；浏览器返回与应用持久结果不再混淆。

**依赖：**R02。

**优先文件／直接调用方：**

- `pi-runtime/openai-chatgpt-auth.mjs`
- `pi-runtime/worker.mjs`
- `src/main/ai-gateway/ai-connection-service.ts`
- `src/main/ai-gateway/pi-runtime-host.ts`
- `src/main/ai-credentials/credential-vault.ts`
- `src/main/ipc/ai-connection.ipc.ts`
- `src/shared/contracts/ai-connection.contract.ts`
- `src/renderer/components/asset/PiConnectionsPanel.tsx`

### 具体动作

1. 先添加无秘密阶段码和trace投影，保留旧通用错误兼容；任何真实用户故障根因未得证据前写UNKNOWN。
2. 对当前合法拒绝回调补红灯测试；按正确state分别结案拒绝，不让无关错误回调中断合法登录。
3. 补browser callback received→token→identity→Vault→final状态；只有持久成功才显示已连接，模型调用仍需单独许可。
4. 将页面unmount的无条件cancel改为取消订阅而非取消App任务；显式cancel/身份或目标变化/退出仍撤销。
5. 为重开页面/重启提供安全账号与plan状态投影；保护刷新、新登录、登出串行与失败保留旧账号。
6. 对照固定Pi源码与官方流程决定最小覆盖项，不盲升级或重抄OAuth；真实SDK＋假网络覆盖每种受支持动作。
7. 修改Worker或依赖配置后按原流程重新封印并核查resources，不只改release摘要掩盖差异。

### 验收门槛

- 合法拒绝立即终止且厂商调用零；错误state不误杀合法操作。
- 换令牌/身份/保存错误区分，原账号和用户数据未被破坏。
- U14–U24合成契约与界面路径分别验证；真实账号未测保持NOT_RUN。
- 不解除Google/Copilot/不受支持订阅的安全限制；所有新错误字段均白名单。

### 必交付

`AUTH-STAGE-CONTRACT.md`, `UPSTREAM-COMPATIBILITY.md`, `AUTH-ROOT-CAUSE.json`, `auth-evidence/`

### 禁止顺带做

- 不为登录成功删JWT/nonce/state/目的地限制
- 不打印token/code/callback URL；不读取浏览器Cookie；不自动发模型请求

## R04｜迁移AI功能并退休重复配置容器

**目标：**一个连接编辑实现，任务、模型、后台与诊断各归其位，旧状态轮询退出正常产品。

**依赖：**R03。

**优先文件／直接调用方：**

- `src/renderer/routes/AiConsolePage.tsx`
- `src/renderer/components/asset/PiConnectionsPanel.tsx`
- `src/renderer/components/asset/AiServiceAcceptancePanel.tsx`
- `src/renderer/components/asset/BackgroundAnalysisPanel.tsx`
- `src/renderer/components/asset/BackgroundOcrPanel.tsx`
- `src/renderer/components/settings/AiBackendSettingsPanel.tsx`
- `src/renderer/modules/ai-console-status/`
- `src/renderer/routes/Settings.tsx`

### 具体动作

1. 逐项列出旧控制台的设置字段/消费者/实际IPC状态；用户有值但新链不消费的字段保留数据并说明，不继续提供虚假有效操作。
2. 把连接列表/编辑器/账号状态/模型目录/任务分配拆为必要组件和hooks，复用一个Main service，不新建第三套配置库。
3. 将后台计划与OCR许可放入后台页明确库范围；本地模型目录与API模型目录分开。
4. 模型验证保留普通显式入口，工程服务验收预算/故障注入移高级诊断或开发工具，不直接挂在默认连接页。
5. 迁移有效模板和runtime摘要；移除旧安装/GPU清理/Worker轮询面板的默认挂载和事件订阅；无源头能力不保留可点假按钮。
6. 改旧AiConsole为薄alias或最小组合入口，删除第二CRUD；回归旧连接、task assignments、metadata与credentialRevision不丢。

### 验收门槛

- R01功能地图的每项明确完成/受限/待实现，迁移期间不悄悄掉功能。
- 默认AI页不调用disabled-app通道；订阅与轮询可卸载，不产生重复计时器。
- 普通设置中不再有另一份账户/连接CRUD；旧连接数据与手动AI链仍可使用。

### 必交付

`FEATURE-MIGRATION-MATRIX.md`, `SETTINGS-CONSUMERS.json`, `disabled-call-regression/`

### 禁止顺带做

- 不只拆长文件却保留三套配置状态
- 不通过重新启用旧全局DB通道让旧控件看似有效

## R05｜按证据删除与隔离废弃代码

**目标：**减少生产路径复杂度，安全移出测试/原型，实际清理已经被证明无用的模块。

**依赖：**R04。

**优先文件／直接调用方：**

- `src/renderer/components/`
- `src/renderer/hooks/`
- `src/renderer/routes/refactor-prototype/`
- `src/renderer/routes/work-mode-prototype/`
- `scripts/`
- `electron.vite.config.ts`
- `package.json`

### 具体动作

1. 补齐27候选的脚本/动态入口/打包/CSS/测试/golden引用，按04文档判定而非将AST结果直接删除。
2. 先做旧壳与旧素材布局小批，再做未用hooks与对话框；每批先记录before和替代关系，运行受影响测试。
3. 将in-memory adapter与fixtures迁入test support；将批准原型保留为有出处的reference/golden，不放正式路由。
4. 核查AssetPromptReversePanel等条件分支；只有全部真实调用者迁移后才删除实现，保留手工字段和历史模板。
5. 对ai-service和Main legacy模块本批只删已证明的部分；复杂runtime核心待证据，不泛化。
6. 出具实际删除、迁移、保留和未决列表，重新运行生产图与bundle入口检查；不制造空壳兼容层永远不删。

### 验收门槛

- 每个删除项有完整证明和可回退before；生产无悬空import/worker资源。
- 原型视觉证据仍可回溯；安全拒绝、当前OCR、Eagle/旧库只读等不被误删。
- 测试用例没因代码删掉而悄悄消失；替代场景有映射。

### 必交付

`DELETION-LEDGER.json`, `REMOVAL-PROOF.md`, `PRODUCTION-GRAPH-AFTER.json`, `COVERAGE-MIGRATION.json`

### 禁止顺带做

- 不按“legacy”名称批量删目录
- 不删模型缓存/真实数据库/历史用户文件；不git clean

## R06｜固化验证规范、文档入口与产物边界

**目标：**让后续AI不再用内部跳转冒充人为验收，也不因长上下文反复生成重复结构。

**依赖：**R05。

**优先文件／直接调用方：**

- `AGENTS.md`
- `DESIGN.md`
- `TASK.md`
- `.codeindex/`
- `docs/agents/`
- `scripts/ai-handoff-anchor.py`
- `package.json`
- `scripts/`

### 具体动作

1. 将06文档的证据层/禁止捷径写入实际Agent与测试规范；历史测试仅重分类，不篡改旧日志。
2. 按risk登记测试入口，确保CU不是只输出一条空PASS；类型/构建/实际case数量单独记录。
3. 缩短活跃文档导航，维护唯一ARCHITECTURE/FEATURE-MAP和当前TASK；历史保留索引，不递归附全部ZIP。
4. 锚点校验读取时再算current/stale，添加buildId可见入口；签收scope与NOT_RUN随终态保留。
5. 审查extraResources与脚本，不批准范围的打包裁剪只列候选；需要裁剪时保留所有运行依赖和许可证并验证。
6. 触及文件按清晰职责格式化与补类型，行为diff独立；禁止无限增加小framework。

### 验收门槛

- 后续Agent指令明确禁止route/IPC shortcut作为UX通过；CU不可用有硬阻塞状态。
- 当前build可识别，stale anchor不宣称current；无秘密进报告。
- 生产包/测试/reference分区有可检查规则，而非靠文件名猜测。

### 必交付

`TEST-REGISTRY.json`, `AGENT-PROTOCOL-DELTA.md`, `ACTIVE-DOC-INDEX.md`, `ARTIFACT-SCOPE.md`

### 禁止顺带做

- 不把包校验数量算为产品行为通过
- 不增加无人值守无限循环或写任务自动授权

## R07｜屏幕路径验收与用户辅助真实认证

**目标：**证明用户从首页能完成配置、登录、返回和主要素材操作，而不是只有代码执行成功。

**依赖：**R06。

**优先文件／直接调用方：**

- `测试证据目录（非业务源码）`
- `当前正常启动的测试构建`
- `用户明确批准的单个受控账号profile`

### 具体动作

1. 在最终候选构建上完成U01–U32适用CU用例，场景/分辨率/主题分组执行但不遗漏起点；无工具不能用Playwright补成CU。
2. 独立只读核对动作后的持久数据与用户状态，后台检查与屏幕动作分开。
3. 真实账号前单独确认Provider/账号范围/同机浏览器/保存位置/仅认证不推理；用户自己输入秘密，截图脱敏。
4. 执行A01–A03适用真实登录场景，指出成功证据是哪层；若未授权或不可用，保持AUTH_REAL_NOT_RUN并列最小恢复入口。
5. 任何新改动使受影响测试STALE，修复后重跑相应CU和后台检查，不沿用旧截图。

### 验收门槛

- 导航发现、单一配置、可解释登录、重开状态有真实屏幕轨迹。
- 真实账户若未验证不得关闭用户登录故障；不能只把按钮禁用算成功。
- 全局权限/原件/手工结果回归无损，敏感信息没有写入普通日志或导出。

### 必交付

`CU-RUNS.json`, `REAL-AUTH-ACCEPTANCE.json`, `screenshots-redacted/`, `ACCEPTANCE-SUMMARY.md`

### 禁止顺带做

- 不通过代码跳路由/写token/改Store代替用户动作
- 不让真实登录自动顺带触发图片推理或付费模型

## R08｜独立签收、增量交接与后续恢复

**目标：**交付真实可用边界、清理证据与一个可接续的版本，不扩大到下一轮架构。

**依赖：**R07。

**优先文件／直接调用方：**

- `TASK.md`
- `.ai-run/<new-run>/`
- `.ai-run/LATEST.json`

### 具体动作

1. 独立只读review直接审代码与实际证据，尤其拒绝回调、凭据补偿、delete ledger、生产引用图和CU起点。
2. 对最终source/build/lock/runtime摘要绑定，核对baseline保护、staged/index与范围外变更；前后补丁只代表本批WIP。
3. 产出一份增量包：源码差异/必要before、来源、测试、屏幕轨迹索引、NOT_RUN、余留问题；不再内嵌全部历史包。
4. 更新TASK首段和完成锚点；完成状态分别表示implementation/contract/CU/real-auth，不生成一个误导总PASS。
5. 本批结束STOP、nextBatchAuthorized=false；只有UI与用户登录核心问题解决或明确保留阻塞后，再另拟DP主线下一批。

### 验收门槛

- 不能出现“代码完成”覆盖CU失败或真实登录未测；声明范围准确。
- 所有实际删除有证据；回退指令不会覆盖用户WIP/credentials/library。
- 下一位AI能从START-HERE/TASK/manifest直接知道位置、限制、恢复动作。

### 必交付

`FINAL-HANDOFF.json`, `REPORT.md`, `REVIEW.md`, `SOURCE-MANIFEST.json`, `DELTA.json`, `MANIFEST-SHA256.txt`

### 禁止顺带做

- 不自动开启DP02、模型下载、其他Provider或发布
- 不改历史证据让旧构建看似通过新验收

## 最终完成判定

本批必须分别报告：`implementation`、`contractEvidence`、`uiIntegration`、`computerUse`、`realAuthentication`、`safeCleanup`。任何一项NOT_RUN/BLOCKED不能被另一个PASS抵消。

可交付“代码和合成测试完成、CU工具受阻”或“CU完成、真实账号未运行”的中间成果，但不能将其命名为“用户所有问题已解决”。结束当前会话和完成产品验收是不同状态。

下一阶段恢复独立描述/资源调度时，应复用本次唯一AI功能归属和验证规范，不能再把面板塞回已退休控制台。
