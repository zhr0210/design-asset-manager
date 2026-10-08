# DAM 双客户端实施与验收证据矩阵

核对日期：2026-10-03。规格：[LOCAL-DUAL-CLIENT-SPEC.md](LOCAL-DUAL-CLIENT-SPEC.md)；
设计：[LOCAL-DUAL-CLIENT-DESIGN.md](LOCAL-DUAL-CLIENT-DESIGN.md)；
任务归属：[23 票拆分](LOCAL-DUAL-CLIENT-TICKETS.md)。

本文件记录完整 WIP 工作树的接线和已有验证，以及另行导出的选择性提交候选；
**不表示 23 票或 76 故事全部交付**。两份源码及其验证不能互相代用。
固定审查起点为 `107106cea9d4566b0fbf68dc2317825219dfb9de`；实施前源码快照在
`.scratch/local-dual-client/implementation-baseline/`。最终被测构建必须以 About 和
对应 CU 记录核对。实现仍在变动时，新增构建及复测结果需由主 Agent 汇总到本文件。

当前交付结论为 **PARTIAL DELIVERY**。最新独立冻结候选为
`dam-f8e1eb79e1650a98` / sourceCount658，测试tree
`eadec07017a1a2cf1f1b123f6f070d843ba3f59b`，277个选择文件；
typecheck/build与7个本轮受影响文件全部PASS。产品输入已与此冻结候选逐blob核对
完全一致，文档更新不借用旧工作树的构建身份。E46保留最终绑定及本机证据摘要。

Root已在正式Codex IAB复测：成功提交后丢回执的固定未知指导/权威回读、底层重发
拒绝、实际SSE断流保存拒绝/输入保留/校准后手动保存重开、640深浅外观与草稿提示
布局、2411字符长备注持久结果、960/1280菜单导航、关库取消恢复准确原草稿、
正常关开7素材/2草稿和正常退出Host89241 exit0，见E45。proxy53723也正常停止，
viewport还原、测试标签关闭。此前Luna/high已有有效限定业务CU见E19/E26/E35/E37；
无法访问IAB的轮次不归为Luna通过，Root补验已经用户批准。

6a9普通OCR页面选择/配置跨端同步、合成识别审查取消/确认与任务完成、双端OCR修订
冲突显式采用/保存重开及复制已留证，见E41/E42。fixture不证明真实模型运行。
6a9丢回执误报FAIL、114无库菜单遮挡FAIL、f6c草稿提示遮挡FAIL均保留；重发准入
和两处布局修复已分别在新构建复测，不能回写历史结果，见E43–E45。

完整selected安全套件仅在f44阶段运行一次：135隔离文件113PASS/22FAIL，另28语法
PASS、零timeout；19既有失败、Electron MockTimers、Pi默认分发前置和motion时序
分别保留。motion原runner及transitions普通Node独立复跑PASS，不改判原失败。
默认Pi0/5FAIL与既有Windowsfixture+实际Host5/5PASS独立；原gallery golden
1.097186%>0.5%FAIL未改阈值或baseline。context693/693PASS、router无关AI路由
断言FAIL均见E38/E32。最终7文件是增量验证，不冒称重跑完整安全计划。

完整历史WIP构建 `dam-793ad575ac817ce3` / source655的111/19安全套件与E29 CU，
以及早期e1/7b、efda/f44各候选均保留在原证据行，不绑定为最新f8e的执行结果。

**未闭合项**：完整业务逐项CU/所有草稿类型故障矩阵、完整缩放、安装包双入口、
真实账号/模型与连接库，以及原生置顶/跨屏/托盘/跨应用效果。当前工具没有原生
表面，系统专项为BLOCKED_UX_ACCEPTANCE；真实数据与外部动作超出合成授权而NOT_RUN。
Browser部分路径通过不能清除这些缺口，不宣称23票/76故事全部通过。旧schema/
AI evidence提取、Pi平台seal及其他无关WIP排除；本次实施检查点提交当前分支，不push。

下文 `.scratch` 报告/日志/截图链接是本机保留的未提交证据，clean checkout不会
自动拥有这些文件；本文保留操作、实际结果和限制摘要，不能把链接本身当作验收。

本次实施与产品验证只使用已登记合成范围；没有读取真实素材、凭据、模型权重或
Runtime 数据。真实库迁移、下载、认证和外发不在此次执行范围。

## 如何读取状态

| 状态 | 含义 |
| --- | --- |
| CODE | 正式 UI / Client / Host 路径在源码中存在；登记本身不证明执行结果 |
| ISO-P | 表内指定范围的隔离测试通过；不表示整票、整个故事或 CU 通过 |
| ISO-F | 已运行的相关隔离测试存在失败；保留实际失败及其限制 |
| CU-PENDING | Browser CU 正在汇总或该路径尚无最终构建复测证据 |
| NOT_RUN | 对应真实行为尚未运行；fixture 推理不计真实模型运行 |
| BLOCKED_UX_ACCEPTANCE | 所需 Browser / 系统表面或工具不能完成对应验收；明确阻塞路径，不覆盖其他缺口 |
| GAP | 有明确实施条款尚缺正式调用方、产品入口或所需操作链 |

下文的 CODE 与 ISO-P 可同时伴随 ISO-F、CU-PENDING 或 GAP。没有一个总通过计数
可以替代逐路径结论。历史 CU 结果只属于其记录中的构建；不得自动沿用到最终构建。

## 证据来源与已知限制

| 编号 | 证据与范围 | 已有结果及限制 |
| --- | --- | --- |
| E01 | `local-dam-client.test.ts`、`local-dam-browser-library.test.ts`、`app-ipc-registration.test.ts` | ISO-P：命名 Client、真实临时 SQLite、Copy 与来源完整性、关开读取、选择 owner、跨端描述/标签基线；早期登记日志为 275 项。E21 首轮新登记检查发现 disabled controller fallback 漏两新 channel，主Agent修复后 E22 focused PASS 为 277 个唯一 invoke channel。HTTP 测试与 Desktop 命名适配器验证分开；登记数量不代表普通 UI 全程验收 |
| E02 | `local-dam-http.test.ts`、`local-dam-profile.test.ts`、`local-dam-fixture-boundary.test.ts`、`local-dam-receipts.test.ts` | ISO-P：一次性启动、同源/CSRF、每文档身份、撤权、合成目录/设置隔离、精确 fixture 端点、receipt 的 owner/用途/代际限制；不证明安装包双入口或真实账号 |
| E03 | `local-dam-browser-reconnect.test.ts`、`workspace-reconcile-store-failure.test.ts` | ISO-P：重连快照与挂载 UI 校准、未知读命令拒绝、校准失败不放开写入；不自动重放写命令。不等于实际断网 CU 已跑 |
| E04 | `local-dam-drafts.test.ts`、`workspace-recovery-queue.test.ts`、`asset-card-client-drafts.test.ts` | ISO-P：暂存与正式提交分开、重启读取、旧代际拒绝、活动 owner 防冒领、未送达旧输入保留、卡片草稿 owner 分离 |
| E05 | `local-dam-transitions.test.ts`、`library-quiescence.test.ts`、`active-library-shutdown.test.ts` | ISO-P：跨端审查模型、取消保留、审查期间新输入再次确认、排空及撤权的隔离边界。真正 Host 退出及系统锁释放仍需端到端专项 |
| E06 | `library-organization.test.ts`、`active-library-tags.test.ts`、`asset-tagging-workflow.test.ts`、`local-dam-settings-conflict.test.ts` | ISO-P：组织与标签正式领域路径、共享设置与 Backend 并发基线；不能推导所有字段/所有别名操作均有完整冲突 CU |
| E07 | `asset-notebook.test.ts`、`notebook-session.test.ts`、`work-sets.test.ts` | ISO-P：Notebook 来源/版本与 WorkSet 内容、成员引用、窗口权限的隔离边界。完整 Browser 参考表面及原生窗口 CU 另列 |
| E08 | `ocr-controller-lifecycle.test.ts`、`asset-ocr-storage.test.ts`、`ocr-draft-recovery-baseline.test.ts` | ISO-P：取消/迟到响应、OCR 权威存储、人工修订与恢复原基线；真实 OCR 环境执行 NOT_RUN。合成 fixture 识别只证明正式命令与界面结果链 |
| E09 | `external-connected-library-core.test.ts`、`external-connected-library-ipc.test.ts`、`connected-library-background.test.ts`、`scoped-asset-reads.test.ts` | ISO-P：连接库资格/索引与受限读取合成路径；真实 Eagle 原件未访问、未批准写入。`legacy-readonly-workspace.test.ts` 有 Windows 打开 SQLite 置换失败 |
| E10 | `asset-trash-lifecycle.test.ts`、`asset-trash-sqlite-persistence.test.ts`、`capture-intake-workflow.test.ts`、`capture-intake-sqlite-persistence.test.ts` | ISO-P：Trash 与 Capture 的合成持久结果；`intake-recovery.test.ts` 在 E16 曾失败，E21 当前重跑 PASS。该隔离结果仍不能替代失败收录恢复的完整 Browser CU |
| E11 | `auth-account-lifecycle.test.ts`、`pi-provider-admission.test.ts`、`pi-credentials.test.ts`、`pi-oauth.test.ts` | ISO-P：账号生命周期、准入与凭据 Adapter。E16 时 `pi-auth-prompts.test.ts`、`pi-runtime.test.ts`、`pi-ui.test.mjs` 有失败；E21 当前 Pi Runtime/UI PASS，`pi-auth-prompts.test.ts` 的 Windows mode 断言仍 FAIL。E16 历史记录保留；真实厂商登录与模型推理 NOT_RUN |
| E12 | `work-set-draft-recovery.test.mjs` | 单独补充 ISO-P，不并入原 88 数量：真实 React DOM + 私有 Electron profile 的组件/接线测试；目标缺失保留原基线，普通保存拒绝，显式另存失败保留，成功/放弃清除，普通新建保留。原三个回归切片红→绿；新增普通本地草稿的 Add 初始化/目标选择两条也红→绿，保留备注与原 CAS 基准并去重加入素材/颜色。另有当前源码通过回归：动态选择的 clean 旧恢复记录保留、核对并采用当前基准仍保留输入、关闭 X 暂存/重新打开/明确 Cancel 清除。Save As 后关闭 X 的源记录误标 loaded 先 red 后修复 green，两记录都保留且不再冒称正在显示，允许后续恢复/放弃。不是正式产品 CU |
| E13 | [首轮 CU](../../.scratch/local-dual-client/cu-initial.md) | 历史构建：普通入口、About、选择器新建库、Copy 两图、关开条目读取通过；Gallery 预览失败。后续源码修复及截图不能自行替代最终复测 |
| E14 | [第二轮 CU](../../.scratch/local-dual-client/cu-round2.md) | 该子任务无法绑定根任务 IAB，未确认构建/profile，记录 BLOCKED_UX_ACCEPTANCE。根任务后续 IAB 操作另行留证，不能把此轮改写为通过 |
| E15 | [根任务正式Browser CU补充](../../.scratch/local-dual-client/cu-root/REPORT.md)；后续2f6见E28、最终793见E29 | 报告按4d/b70分列正式React→HTTP/SSE→受控Host可见操作。4d默认下载、派生旋转保存重开、Trash恢复、OCR合成修订保存/正常退出重启重开通过；不证明真实OCR模型。b70关闭库审查两草稿→继续编辑→描述精确重开、菜单退出/保留草稿→Host exit0通过；未保存Settings拦截功能通过但一般失败文案FAIL，退出后连接status在inert root中不可访问/遮挡草稿banner FAIL。两问题已修源码及E27隔离回归，E29在793实际复测dirty明确文案和正常quit断连指导可访问/不重叠PASS；b70历史失败不改写。基础Gallery/建库/Copy及描述冲突历史结果保留，未覆盖项逐项另列 |
| E16 | [完整隔离套件](../../.scratch/local-dual-client/final-test-suite.md)、[执行历史](../../.scratch/local-dual-client/final-test-suite.json) | 完成时 88 个唯一隔离测试 PASS、33 FAIL；28 个语法检查 PASS，含复测共 162 次执行。数字是测试文件执行结果，不是 76 故事的通过比例 |
| E17 | `work-set-reference-view.test.mjs`、扩展 `work-sets.test.ts`、read/reconnect 与 `local-dam-transitions.test.ts` 回归 | ISO-P：组件脚本 11/11，真实 React DOM / `useWorkSets` / 私有 Electron profile，Client boundary 为合成实现；多参考预览与排序、引用移除、原 CAS、实际返回 catalog、远端冲突显式采用、恢复/返回重开、保存中新增输入、另存、定位、scoped 控制。新增 clean 旧恢复记录等于旧基准时仍须明确选择的回归通过，未执行旧代码 red。扩展 WorkSet 测试使用真实临时 SQLite / HTTP / SSE 与注入原生 ports：角色/代际/字段拒绝、dirty 与迟到草稿 close 保留、clean close 持久结果、flush 失败及 layout 故障；read/reconnect/typecheck 通过。后续 session 65896 exit 0：E12 全脚本与 transitions 复测通过；`busy()` 在 preparing/pending 为 true、cancel 后为 false、quit stopped 后继续为 true 的断言已执行，覆盖全局 close 互斥守卫使用的状态。不是完整 Host CU，也不证明原生屏幕效果 |
| E18 | `local-dam-download-intake.test.ts`、`owned-download-recovery.test.ts` | ISO-P：临时合成图片经正式 managed download / Copy intake / SQLite 投影；Windows 只读句柄 fsync 的 EPERM 先 red 后修复 green。owned download 恢复故障/重试/来源保留通过；不将 E16 的其他下载/恢复历史失败改写为通过，也不代表完整下载 CU |
| E19 | [Luna 第三轮 CU 报告](../../.scratch/local-dual-client/cu-luna-latest/REPORT.md)，附工作集/便签/文件夹截图 | 仅 `dam-4d0f68d8564b9dad win32/x64` 的受控合成 Host，版本由根任务 About 提供；Luna 用独立 Codex 内置浏览器标签真实操作。报告 8 步范围通过：恢复描述保留冲突输入、冲突保存阻止静默覆盖、核对/明确采用基准/保存并刷新重开；新建双参考工作集、重排/备注保存重开；Focus 便签保存重开；色板加色重开；读取已有文件夹的一项关联。截图已核对双参考顺序、已保存标识、重开便签与文件夹条目。未验桌面展开/逐窗控制或原生效果；不覆盖此后代码修复、新构建或其余故事 |
| E20 | [Pi 校验优化与复测](../../.scratch/local-dual-client/pi-verification/optimization-results.md) | ISO-P：`pi-runtime-verification.test.ts` 14/14、原 `pi-runtime.test.ts` 5/5、typecheck；有界完整校验、流式大文件 SHA-256、取消/失败等待 in-flight 收敛、无 Worker 提前启动、许可释放。原完整 manifest/tree/type/path/hash 检查及 15 秒请求预算保留；测试 Worker 只连接自有回环 SSE。完整 sealed bundle 两次测量条件不同，不推导固定速度提升。既不代表真实 provider/模型调用，也不将 E16 的全部 Pi 失败改为通过 |
| E21 | [当前安全套件](../../.scratch/local-dual-client/final-current-test-suite.md)、[执行记录](../../.scratch/local-dual-client/final-current-test-suite.json) | COMPLETE：111个唯一隔离测试文件PASS、19FAIL；28个syntax-only PASS、0FAIL；另1个focused case PASS，不能覆盖其整文件失败。159个唯一计划文件/检查、含28条实际外部执行共181条记录。保留E16及各次初败/红绿过程/原golden失败；补download/OCR/reconcile/Pi/WorkSet、Connection/expiry/Settings顺序、受控picker及E28页面确认回归并合并实际复跑。prior-five相同源码/日志SHA只补出处；Settings既有6个view/CAS、WorkSet已有文件复跑不增加唯一文件/用例数，Recovery新文件两次6/6只增一个唯一文件。未提供的执行时间/耗时不虚构。相对历史latest PASS无新增剩余失败。typecheck作为补充证据，未计成隔离用例；未跑真实profile/model/provider或可执行E2E。源码仍可变，记录逐项可查，不能将检查集合視为单一不可变产品构建 |
| E22 | [根任务与 Settings 补充检查](../../.scratch/local-dual-client/root-current-checks.md) | 主Agent实际观测的 focused registration PASS 277；WorkSet恢复与 transition复测 PASS，范围见 E12/E17。Settings Agent 的 `local-dam-settings-view.test.mjs` 6/6 PASS：正式 Settings route/store + 合成 CAS Client + 私有Electron profile，覆盖clean同步、dirty冲突、明确采用基准、CAS失败保留、unmount guard、保存中晚输入。是隔离验证，非正式Settings/profile或CU；registration复跑与Settings脚本作为两项外部记录并入E21，E16不变 |
| E23 | 根任务 `dam-b70ae88aba1de344` 双tab Settings CU；[冲突截图](../../.scratch/local-dual-client/cu-root/settings-conflict.jpg)、[重开截图](../../.scratch/local-dual-client/cu-root/settings-reopened.jpg) | 根任务报告受控合成正式链路通过：clean同步 → dirty冲突 → 展开当前内容 → 明确采用基准仍保留输入 → 保存 → peer刷新持久结果。只属于b70构建上述设置路径；当时尚未包含随后 disabled fallback 与 ActiveLibraryControls 安全guidance文案修复，主Agent仍准备下一构建复走。不代表所有设置字段、切库退出或全量CU已验 |
| E24 | 根任务 `dam-b70ae88aba1de344` 下载/旧素材只读/不可用状态/暗色 CU；[取消](../../.scratch/local-dual-client/cu-root/download-canceled.jpg)、[重试](../../.scratch/local-dual-client/cu-root/download-retried.jpg)、[旧素材检索](../../.scratch/local-dual-client/cu-root/legacy-search.jpg)、[重开](../../.scratch/local-dual-client/cu-root/legacy-reopened.jpg)、[模型](../../.scratch/local-dual-client/cu-root/models-unavailable.jpg)、[连接库](../../.scratch/local-dual-client/cu-root/connected-unavailable.jpg)、[暗色](../../.scratch/local-dual-client/cu-root/library-dark.jpg) | 根任务报告受控合成正式 IAB 链路：第二个独立 slow-image 任务准备/披露→确认→取消显示 canceled→重试→imported 通过；第一任务取消前已完成，不能计作取消验证，两张素材分别来自已完成首任务与第二任务重试，没有取消任务的重复提交。合成 legacy-cases 通过页面选择SQLite/来源目录→审查1素材/1标签/1关系→只读打开→标签检索→刷新仍1素材→关闭；未访问真实旧库。Eagle未配对检查及原因、模型目录未签名/存储禁用原因可见，OCR选择取消后仍未配置；只证明不可用/取消路径，不证明连接、安装或推理。暗色可读；viewport.set(960×720)与Ctrl+-未实际生效，DOM为1098×884/DPR1，尺寸/缩放验收记录工具限制，不计PASS。仅属b70上述范围，后续构建需按受影响路径复测 |
| E25 | [Settings / caption 测试修复复跑](../../.scratch/local-dual-client/test-logs-current/1790920732650-settings-and-display-results.json) | Agent实际执行四个脚本最终PASS：`settings-service-defaults.test.ts`、`settings-migration-ipc-contract.test.ts`、`settings-migration-panel-contract.test.ts`、`asset-display-workflow.test.ts`。仅修改测试以核对现行窄Client/禁用迁移/正式OCR配置与caption手工编辑语义，保留Main只读/拒绝保护；不改产品或放宽准入。panel先FAIL再PASS，共5条外部执行并入E21，各次日志保留。隔离/源码契约检查，不是CU |
| E26 | [新 Luna 正式 Browser CU](../../.scratch/local-dual-client/cu-luna-final/REPORT-new-agent.md)，同目录截图01–16；[旧预检阻塞](../../.scratch/local-dual-client/cu-luna-final/REPORT.md)保留 | 独立IAB标签、`dam-b70ae88aba1de344 win32/x64 · 受控测试`、合成browser-acceptance库；通过可见菜单核对About，报告1280×720浅色，16截图已复核。WorkSet备注未保存返回/重开、已有素材Add/Save As/保存重开3引用、移除成员后仍可选原素材再加入、双tab冲突保留B/核对A/明确采用/保存B并同步、编辑modal关闭X→本机草稿列表→恢复相同备注通过；截图06是采用后保存B状态，完整冲突步骤依据报告，不能把单截图当全过程。标签别名/父子层级创建、按别名找标签和已关联素材、空素材picker取消无新增、AI未配置原因与不可执行状态通过；未启动AI、未访问非测试来源。本轮越界picker拒绝及已启动AI取消NOT_RUN，后续793 root picker拒绝另见E29；原生结论独立。当时根任务核对WorkSet源码未变，随后E28修改WorkSet放弃/dirty目标选择为页面确认；历史通过不覆盖新代码。E29 root在793复测页面弃稿/Recovery及Main反馈/Settings/selector/transition的指定普通用户路径，不能归给Luna；modal目标切换、clean旧恢复、保存中迟到输入、重连/golden仍未全验。Host重启限定恢复见E28，视觉失败不改写 |
| E27 | [先前五项出处](../../.scratch/local-dual-client/test-logs-current/standards-prior-five-results.json)、[motion/AI单case/原golden复跑](../../.scratch/local-dual-client/test-logs-current/standards-latest-motion-and-parity-results.json) | prior-five源SHA/日志SHA逐项核对与E21现有PASS相同，只补佐证，不重新执行或重复计数。`workspace-motion.test.ts`改用现行canonical route/Shared Client合成读取后整文件PASS：普通/减弱motion、单挂载表面、设置键盘/草稿取消、AI链接导航、菜单Escape焦点/inert、明暗截图，无写动作/外部请求/页面异常；这是隔离UI检查，非正式CU。AI quiescence只执行具名Main委托/退出排空case 1 PASS，完整AI集成仍FAIL。原`check-gallery-parity.mjs`复跑FAIL：1.097186%通道差异超过<0.5%门槛；scratch只读诊断发现主要文本差异，不修改golden/阈值，不计golden PASS。实际三条执行并入E21，源/日志哈希与未运行范围保留 |
| E28 | [Luna 2f6 恢复/确认 CU](../../.scratch/local-dual-client/cu-final-transition-luna/REPORT.md)、[页面确认实际回归](../../.scratch/local-dual-client/test-logs-current/standards-final-page-confirmation-results.json)、[标准化元数据](../../.scratch/local-dual-client/test-logs-current/standards-final-page-confirmation-normalized-results.json) | About可见核对`dam-2f6f9008130d3493 win32/x64 · 受控测试`；重启后恢复原WorkSet备注/3引用、显式保存/重开一致，以及恢复原描述/取消回到未保存状态PASS。仅报告及CU inline截图/可访问状态，未导出截图文件。一次性合成草稿放弃打开JS确认后IAB输入/快照超时，未接受确认，不计放弃成功；随后工程定点停止合成Host不计正常退出CU。主Agent改Recovery/WorkSet放弃与dirty目标选择为页面确认；隔离WorkSet recovery脚本PASS、reference 14/14（11旧+3新）、新Recovery 6/6且实际复跑两次均PASS。4条实际记录并入E21，只新Recovery增1唯一文件；旧测试再跑不重复计用例。后续793 root正式复测见E29，Luna 793 namespace另行阻塞，不将root结果归给Luna；2f6历史BLOCKED_UX_ACCEPTANCE、native与真实模型结论保留 |
| E29 | [最终793 root正式Browser CU](../../.scratch/local-dual-client/cu-final-793-root/REPORT.md)，同目录14截图已复核；[Luna 793工具阻塞](../../.scratch/local-dual-client/cu-793-luna/REPORT-namespace-blocked.md) | 正式React→Shared Client→HTTP/SSE→受控Host；IAB主会话tabs4/6，About可见793/win32/x64/受控测试，合成profile/library已核对、无主桌面窗启动。页面picker越界/不存在拒绝、逐层打开6素材；Recovery取消保留/明确放弃后列表清空且原WorkSet不变；WorkSet页面弃稿Escape保输入/confirm回到已保存3引用；两tab Settings比较/明确采用保输入/保存同步/刷新持久/恢复原偏好；另一tab dirty阻止关库且明确中文说明；关库审查1草稿→取消→精确重开，正常关闭/重开6素材+1草稿；scoped窗口open/unpin/hide/restore/clean-close的Browser状态反馈；正常quit审查1草稿并保留→session55273 exit0，AX仅断连status可访问、业务冻结、顶部草稿banner与底部指导无重叠，指定路径PASS。备注精确值和完整时序依据报告/AX，截图核对可见3引用与已保存/未保存状态。Luna旧及fresh namespace无IAB/launch不可达，未执行业务；本轮root补做，不能算Luna通过。Host已正常结束，旧URL不可继续使用；modal dirty目标切换、断流/丢回执、完整尺寸缩放/长内容、安装包双入口仍NOT_RUN/CU-PENDING；native真实效果BLOCKED，真实模型/账号/provider/Eagle/旧库NOT_RUN |
| E30 | [选择性index候选最终结果](../../.scratch/local-dual-client/index-candidate-results/final-results.json)；候选导出位于`.scratch/local-dual-client/index-candidate/` | 独立构建`dam-e1d747797c875d55`/source656，root实际typecheck/build exit0；30个唯一聚焦文件latest PASS、0FAIL。首轮29PASS/1FAIL：recovery脚本因runner将ELECTRON_RUN_AS_NODE误置空而启动失败，原日志保留，unset环境重跑PASS；retained AI IPC测试恢复11条前轮源码断言后候选单独重跑exit0。30首轮+2followup实际记录保持在独立报告，未重复计成32唯一文件，也不并入E21。此记录形成时只增测试断言/README，产品源码未变；此后真实CU及Store修复另列E31。候选排除了此前schema/AI evidence提取及Pi seal等WIP，源码与793不同；E30记录时尚无Host/CU；随后e1刷新CU失败及新7b复测见E31。原生/真实Pi bundle仍未运行，不把793 CU、WIP111/19或真实Runtime证据归给候选，30聚焦PASS不等于全套产品/76故事通过 |
| E31 | [初版候选e1正式CU失败](../../.scratch/local-dual-client/cu-candidate-e1-root/REPORT.md)、[修复后7b正式CU](../../.scratch/local-dual-client/cu-candidate-7b-root/REPORT.md)；`settings-calibration-*.log` | e1普通建库/页面新建目录/Copy2图PASS，刷新后两图可见但业务冻结FAIL，console为SETTINGS_LOAD_SUPERSEDED；已核验Host工程停止exit1，不算正常quit。Store普通mount/event读取等待最新required-read，后required/save仍使旧barrier拒绝，identity清理；新增3协调情景旧实现红→绿，13/13及reconcile-failure/reconnect/settings-view(6/6)四文件复测PASS，不将普通后读成功当校准成功。重新构建7b/source656、typecheck/build exit0。Root IAB可见About/受控身份、逐层已有库打开2图、刷新无冻结且工作模式可操作；创建A2/B1，modal新草稿选A取消/Escape精确保输入，确认A去重；A脏改选B取消保A/confirm切B，取消加入后重开A/B原备注与2/1引用；页面弃稿Escape保输入/confirm恢复保存内容；Settings直接刷新、两tab比较/采用保输入/保存同步/刷新/恢复原偏好；关库审查1草稿取消精确重开，正常close/reopen2图+1草稿；正常菜单quit保留1草稿→session51027 exit0，AX仅连接指导、草稿banner与底部指导分开。关闭clean peer后立即关库曾被未回应保护拒绝，回收等待期后真实点击重试成功，不计瞬时恢复。Luna spawn/followup线程上限阻塞，实际root CU；部分截图备注低于视口，精确值以AX/报告核对。此轮未重新建库/Copy，不把e1步骤转作7b操作；完整断流/丢回执/尺寸缩放/长内容/安装双入口及其余业务未全验，native BLOCKED/真实模型NOT_RUN，原golden和19文件失败保持 |
| E32 | `index-candidate-results/context-check-budget-fix-v2.log`、`agent-context-router-budget-fix-v2.log`；Windows launcher精准修复 | context:check PASS，691/691owned、47excluded。原Windows npm.cmd直接spawn启动失败修成Node执行npm CLI argv；Desktop Shell以现有窄生命周期Interface作为first-pass必读，composition定位/安全ADR/全文件保守预算不变；AL-01旧详情完整搬至可查history，README现行约束保留。两条曾超预算路径通过。完整router仍在588行AI Runtime panel contract firstRead断言FAIL，没有改测试断言/预算或引入未暂存AI提取；root混合WIP的旧AI脚本未跟踪失败、初次导出无Git元数据失败和候选预算失败分别保留，不混作产品错误 |
| E33 | `index-candidate-results/draft-order-candidate-tests.json`、`draft-order-candidate-*.log`、`draft-order-candidate-transitions-node-retry.log` | Spec:148/200原缺入站草稿序号。现由workspace:ready注册文档writer，put/remove/recover/discard在用户动作时编号，Host串行执行时校验当前writer与scope高水位；低序号、同序号异内容、重载旧writer拒绝，remove/discard留顺序保护，跨owner恢复/放弃同时封锁旧/当前代际晚写。同mutation幂等，落盘失败不推进已接收序号，旧v1无序号记录仍可恢复；原保存基线及权限不变。Renderer握手共用Promise，挂起不发草稿，失败显式重试使用同writer/原序号；未送达输入原内容保留，显式恢复换当前order。Host真实合成持久化回归、queue握手/失败/迟到回归、OCR恢复、Recovery6/6、WorkReference14/14、WorkSetModal、Shared Client、注册、SettingsOrder13/13与reconnect通过。11文件首轮10PASS/1FAIL；transition由Electron Node MockTimers对clearTimeout(undefined)抛内部priorityQueuePosition错误，按原run-ts-test普通Node重跑4/4PASS，源码/断言未变；初失败留存。候选重新typecheck/build exit0，dam-070c96dd52503e41/source656；Luna/high正式IAB通过About/2素材、恢复后修改/刷新新writer恢复/保存重开、弃稿取消/Escape保输入、关库取消/保留关库后重开及正常菜单quit；session42746 exit0。Recovery确认弃稿后本地副本残留且重开再次暂存为FAIL，记录cu-draft-order-luna/REPORT.md及截图，Root已隔离复现修复，需新build复测。初AX索引点击close出现quit原因未定，fresh scoped/坐标重试未复现；初异常无截图，不把猜测当原因。原生BLOCKED/真实模型NOT_RUN及既有golden/19文件失败独立保留 |
| E34 | [407候选绑定记录](../../.scratch/local-dual-client/index-candidate-results/final-407-results.json)、[Root正式CU](../../.scratch/local-dual-client/cu-recovery-tag-407-root/REPORT.md) | 独立255文件/tree2c6候选407/source657，typecheck/build PASS；15唯一聚焦首14PASS/1FAIL，SharedClient普通Node错runner导致unopened而非ready，ElectronSQLite原runner重跑PASS；两日志保持。Root IAB About受控/2图、弃稿取消/Escape/确认后同document读saved note及reload无复活、双tabTag冲突compare/adopt保输入/save/peer重开、2276长备注首末/长度核对及恢复原note/2refs、正常quit1draft→session24195exit0限定PASS。About恢复未自动开editor为FAIL；请求960viewport未生效，实际1280×720/DPR1，尺寸NOT_RUN；末AX仍业务控件，不宣称完整freeze/AX。13JPG+2AX已独立看核对。Luna同轮provider阻塞无业务操作，此轮执行者Root。新修复须新build复测，不回写070c或407结果 |
| E35 | `final-affected-tests.json`、`final-affected-*.log`、`local-dam-recovery-navigation.test.mjs`、`local-dam-tag-conflict-view.test.mjs` | 新efda/source657独立typecheck/build PASS，16文件PASS：launch13/13、Mac shell7/7、Tag5/5、真实Library+Recovery3/3、Recovery7/7及queue/Hostdrafts/WorkSetModal/reference/SharedClient/registration/SettingsOrder/reconnect/transitions/HTTP/profile。Tag空raw颜色两项红→绿，raw CAS保留空字符串、dirty比较displayed基线；Library effect先scope撤旧再receive新navigation，About与已mounted恢复及scope撤销、原baseline通过。导航初红日志是由原CLI输出重建且注明，绿及最终候选日志直接输出；不伪称红日志原始tee。首次scratch npm launcher路径错误在95ms MODULE_NOT_FOUND，未启动typecheck；修正发行版npmCLI后真正检查通过，初日志保留。startup固定提示/批准退出走existing drain，Browser失败保Host/queue/retry与可见命令共owner，真实native dialog仍BLOCKED。GPT-6 Luna/high正式IAB通过About恢复打开原editor/保存重开、页面弃稿取消/Escape/确认并reload无复活、双tabTag比较/采用保留整个可见form/保存peer重开及quit指导；Root实际poll确认session27420 exit0。12PNG已逐张独立查看；恢复首瞬间/首Escape/弃稿及reload只有inline截图与AX，未保存的帧不由后续PNG补称。第二tab直接launch受工具限制，普通root URL标签路径完成，未注入业务。详见cu-efda-luna/REPORT.md和final-efda-results.json，当前修复未改变其它历史失败/视觉阈值 |
| E36 | [ff01独立绑定记录](../../.scratch/local-dual-client/index-candidate-results/final-ff01-results.json)、concurrent-edit-tests.json及12日志 | tree f9077aef6443fc3e1b166bfcbcfa52a17ebd908c、262选择文件，dam-ff01caae9e6d01cd/source658；独立typecheck/build和10唯一受影响文件PASS。Organization五项实际旧1PASS/4FAIL到新5/5；三Backend/Pi/Task配置表面16/16（保留旧1PASS/14FAIL、locator中间失败和二次adopt不render实错）；OCR correction晚回复4/4（旧3/1），NotebookSession reconcile当前输入/逆序/精确checkpoint/新session4/4（旧1/3）。正式调用方完整源码及bundle身份冻结，合成Client边界且无provider/模型/账号动作，不是CU。未启动Host，发现OCR晚adoption相邻缺口后继续修复；新5case/读顺序及Focus guard不属于本候选。旧efda CU、WIP111/19/golden/router均不改判 |
| E37 | [f44候选聚焦检查](../../.scratch/local-dual-client/index-candidate-results/read-order-tests.json)、read-order-*.log；实际组件红绿日志另留test-logs-current | tree8e381796e4ab4d982f37c025e11dac46b72c0830、266选择文件，dam-f44f868e2793fec6/source658；独立typecheck/build及12唯一相关文件PASS。Backend/Pi/Task全24/24：8新增晚list/settings/status与required校准/初始intent回放case旧8FAIL到新8PASS，旧初3FAIL及校准调整后固定旧blob3FAIL都保留；required只接受有效快照，普通刷新等待有效required，保存双fence，Pi intent一次消费。OCR9/9：晚adoption旧4PASS/1FAIL到5/5，后新增旧read覆盖保存/晚输入mismatch/明确adopt/逆序读旧5PASS/4FAIL到9/9；全component源码和bundle冻结。Focus/Canvas7/7：完成标注前阻止合并，pending时inert真实mouse/keyboard阻编辑/切图/关闭，失败释放及保存重开不退回旧map；固定7case旧2PASS/5FAIL到新7/7，初fixture名字被现有32字符规则截断的测试错另留。不计正式CU；Canvas SSR useLayoutEffect警告保留，不冒称hydration已验。f44正式Luna/high两份报告已结束，文件夹/色板、Pi/任务配置、Notebook冲突以及页面选择/Copy/下载/派生保存/Trash恢复按各自报告限定PASS，见final-f44-results.json（3报告、39PNG、266文件哈希）。早期Luna OCR选择generic失败为FAIL；Root后续同build ready库中picker打开并取消PASS，未配置/识别；没有证据将隔离OCR_BUSY诊断认作早期现场根因。Root普通quit保留2草稿、session72002 exit0。完整selected suite已结束见E38，不转用WIP111/19或历史CU |
| E38 | [完整selected安全计划](../../.scratch/local-dual-client/final-selected-suite/results.json)、[失败归因](../../.scratch/local-dual-client/final-suite-failure-triage.json)、[独立收敛复跑](../../.scratch/local-dual-client/final-convergence/results.json)、[Pi Windows fixture](../../.scratch/local-dual-client/pi-fixture-overlay-20261002/result.json) | f44初跑163唯一文件：135隔离文件113PASS/22FAIL，另28语法PASS、零timeout。19既有失败保留，17份测试SHA完全相同；AI acceptance与gallery源码已变化，不能声称整体同源。新导出tree2526c44e0ed76c5ff6d8766dcfa605bdfd1d38df产品摘要仍f44/source658；motion只修测试等待/同帧采样，原Electron runnerPASS，所有margin/inert/aria/pointer/detached断言保留；transitions普通Node4/4PASS，原Electron MockTimers失败不改判。context:check693/693PASS。默认Pi因平台生成清单、checkout字节及ignored分发物缺失0/5FAIL保留；4份Windows生成/prep旧WIP未纳入提交。独立fixture使用实际f44Host与已有Windows资源、固定已核验pin且保留全inventory/hash，11837文件/162018801字节verify及5loopback协议PASS；不是默认候选分发或真实推理通过。安装包NOT_RUN；历史WIP111/19及golden/router不混计 |
| E39 | [未知回执修复证据](../../.scratch/local-dual-client/unknown-receipt-working-results-20261002.json)、[OCR选择红绿](../../.scratch/local-dual-client/ocr-picker-diagnosis-20261002/ocr-page-picker-red-green-results.json)、[非ready护栏](../../.scratch/local-dual-client/ocr-picker-diagnosis-20261002/current-nonready-guards-results.json) | 专用WorkspaceConnectionError固定指导保留至7实际caller；9新unknown case固定旧源FAIL，新4组件48case及真实BrowserTransport→HTTP→Settings IPC→合成磁盘3/3PASS，不是SSE或CU。Quiescence completed non-ready idle cycle允许OCR环境选择恢复；识别仍校验active scope，failed-ready仍暂停。实际controller/page-selector旧3PASS/2FAIL→5/5，drain/preparation/maintenance护栏3/3；lifecycle/11 quiescence回归PASS。证据未转给f44，不访问真实环境 |
| E40 | [cf27独立候选](../../.scratch/local-dual-client/transport-ocr-candidate-results/results.json)、[447独立候选](../../.scratch/local-dual-client/ocr-sync-final-candidate-results/results.json) | cf27/271files dam-472d1a938a605afd/source658 typecheck/build及12文件PASS，未启动Host/CU。447/273files tree0f40549727f316e6ee70ea866a22704a9f526533 dam-44782a6fd0985f60/source658 typecheck/build及15文件PASS。Root仅普通IAB核About并无库正常quit，session68721 exit0；未做OCR/故障业务。不将它们的结果转给随后v2修复；完整历史f44与旧golden、Pi分发失败保持 |
| E41 | [6a9独立候选](../../.scratch/local-dual-client/ocr-sync-v2-candidate-results/results.json)、[正式OCR CU](../../.scratch/local-dual-client/cu-6a9-current-root/REPORT.md) | tree1cceb5b16a3206d7d971ed7b66b9e9b845eeba24、276选择文件，dam-6a9cf76914de7911/source658，typecheck/build及18文件PASS。Root正式IAB核About/当前登记profile、页面picker逐层选择fixture OCR、peer配置事件同步；审查取消/确认、识别1/1完成、双tab人工修订冲突保输入/比较采用/保存关闭重开、OCR复制限定PASS。只属合成fixture，不是Python/真实模型。8PNG/报告保留；上轮Host结束原因无法再poll，不推断正常quit |
| E42 | [6a9续接](../../.scratch/local-dual-client/cu-6a9-resumed-root-20261003/REPORT.md)、compare-controlled-receipts.mjs | Root/frozen/v2 receipt独立核对一致且syntheticVerified。较早Root793 profile纠正单列，不借用其结果。当前6a9普通重启→7素材/持久OCR B文字、颜色与OCR剪贴板实际“已复制”后准确PASS；过早clipboard读取false保留观察说明。成功回执丢失FAIL：底层2HTTP/成功1/丢1，UI误说未保存。正常保留2草稿退出97567 exit0、proxy1953 exit0。4PNG；该FAIL不改写 |
| E43 | [重发独立候选](../../.scratch/local-dual-client/replay-candidate-results/results.json)、[114故障CU](../../.scratch/local-dual-client/cu-114-root-20261003/REPORT.md)、command-replay-red/green与unknown-replay-green日志 | dam-114cc22b78760ef6/source658，treebda80e928eb00959e288d60d539142661a93b14d、277选择文件，typecheck/build与21文件PASS。正式Browser带文档单调X-DAM-Invocation；Host在auth/owner/channel检查后、effects前登记，1024窗口允许乱序但拒绝重复/过旧/失败重发，不存body/凭据/结果，不设自动重试队列。隔离真实HTTP红[200,200]→绿[200,409]，unknown4/4PASS。正式IAB丢回执固定未知指导/保输入/普通回读PASS，底层仍2HTTP但仅1成功；恢复原偏好另一次明确保存。两次SSE实际断流/恢复、断线真实保存拒绝、校准后手动保存重开PASS。退出92541 exit0/proxy11169 exit0；7PNG。无库菜单上部遮挡FAIL另留，后续f6c修复 |
| E44 | [f6c候选](../../.scratch/local-dual-client/menu-final-candidate-results/results.json)、[f6c CU](../../.scratch/local-dual-client/cu-f6c-final-root-20261003/REPORT.md) | dam-f6c77a313c3b6acc/source658，tree3e65f50ea2781d7658e10ac75178d0a3fe158cb3，typecheck/build与4文件PASS。只在dock popover打开时提高层级，正式无库960/640菜单点击AboutPASS；原Root407草稿准确恢复/X保留、新WorkSet2411字符+1引用正式保存关闭重开逐字PASS、关库取消准确恢复/正常关开7素材2草稿、quit90222 exit0。640深色恢复提示压住顶部操作FAIL；原10PNG保留，后续f8e布局修复单列 |
| E45 | [f8e最终候选](../../.scratch/local-dual-client/recovery-layout-candidate-results/results.json)、[f8e正式CU](../../.scratch/local-dual-client/cu-f8e-final-root-20261003/REPORT.md) | dam-f8e1eb79e1650a98/source658，treeeadec07017a1a2cf1f1b123f6f070d843ba3f59b、277选择文件，typecheck/build与7相关文件PASS。direct-stage恢复提示进入flex正常流，body连接提示独立。正式Root IAB复测成功回执丢失/未知指导/权威回读及明确恢复偏好，proxy2HTTP/1成功/1丢/1duplicate拒绝；恢复偏好另计3HTTP/2成功。640深浅提示和四操作无重叠、Root407准确恢复/X保留、2411长备注持久逐字、960/1280About、真实SSE断流点击保存拒绝/输入保留/重连不自动保存/手动保存重开、关库取消恢复/正常关开7素材2草稿/quit89241 exit0，proxy53723 exit0。13PNG+最终AX。缩放未验，原生BLOCKED，真实模型/账号/安装包NOT_RUN；不将其它旧CU转为f8e全量通过 |
| E46 | [最终源码/报告绑定](../../.scratch/local-dual-client/final-checkpoint-20261003.json)、[增量Standards审查](../../.scratch/local-dual-client/replay-standards-review-20261003.md)、[增量Spec审查](../../.scratch/local-dual-client/replay-spec-review-20261003.md) | 固定审查基准107106cea9d4566b0fbf68dc2317825219dfb9de；两轴补审覆盖重发及两处CSS，规范0违规/0可操作smell，Spec0确认错误/0范围扩张，审查时CU证据待补，E43–E45已补列明范围。最终index全部产品输入与被测f8e冻结tree逐blob一致、658源码摘要准确；文档/test哈希与各报告/PNG/log独立冻结。本机证据不提交，clean checkout不自带；完整旧suite/golden/Pi默认分发失败、原生/真实数据缺口仍保持 |

E27 补充限定回归：[Connection/Settings最新执行](../../.scratch/local-dual-client/test-logs-current/standards-final-connection-settings-results.json)
包含 Connection/Transition 7/7（portal保持可访问、独立inert ownership、取消后的迟到pending拒绝、最新计数/unmount），
Settings Store 11/11（读顺序、required校准屏障、迟到完整保存回执、一次提交后读取且不重发、已提交后读取失败不回滚、保留较新乐观输入）。
Settings order 三轮实际红→绿及先前 Connection 3/1→4/0→7/0日志保留；最新view 6/6、Host CAS与required-reconcile也实际复跑PASS。
[Host transition expiry回归](../../.scratch/local-dual-client/test-logs-current/1790921424179-transitions-expiry-regression-results.json)
验证confirm flush/operation期间不超时取消/解冻、变更/失败复核后恢复计时、idle到期取消、quit stopped拒绝新transition。
[本轮picker实际复跑及typecheck](../../.scratch/local-dual-client/test-logs-current/1790921588056-picker-focused-results.json)
只使用临时合成allowed/sibling/junction，验证越界路径在realpath前拒绝、链接不跟随、会话保留、允许内部新建/进入与取消；
本Agent只复跑当前green，旧代码red由根任务报告，不把本次补日志冒称red执行。
Settings最新修复后另有[实际typecheck PASS](../../.scratch/local-dual-client/test-logs-current/1790922541874-typecheck-after-settings.json)，没有build或启动Host，不并入用例数。
所有这些是隔离/接线证据，不是Computer Use；Settings/selector受影响普通用户路径已有E29最终793复测，
晚应答/校准/expiry故障仍只具上述隔离边界证据，不由E29普通成功流程推导。选择性候选另见E30。

E16 的失败包括 Windows 生产备份/codec 未取得资格、旧源码布局断言、POSIX mode /
signal 和打开 SQLite 置换差异、Pi fixture 超时、运动/UI 与批准视觉截图比较失败。
E21 当前仍有 19 个隔离文件失败，另1个AI委托具名单case通过不覆盖完整AI失败；
intake/owned download recovery、图片工具、Pi Runtime/UI、现行路由motion
及部分静态契约已复跑通过，逐项见当前报告。历史失败保持可查，不将平台原因改写为通过，
也不在本轮放宽生产准入。E2E/flow 脚本的 syntax-only
PASS 不表示脚本运行；真实模型、外部账号、真实连接库和原生系统行为均无此替代证据。


## 正式调用链覆盖

共同入口为 `src/renderer/main.tsx`：普通主表面先安装 Shared Client，再导入正式 App /
Store；Desktop 从 preload 取得同一工厂生成的 `damClient`，Browser 安装
`browser-transport.ts`。双方都使用 `App.tsx` / `AppShell.tsx` 与正式路由注册。
原生 Card / Work Window 使用受限表面入口，不给它们普通主表面的完整 Client。

Host 在 `src/main/index.ts` 用 `registerWorkspaceCommand` 收入唯一 handler map，
Desktop IPC 和回环 HTTP 都进入该编排。领域 registrar 由
`src/main/ipc/main-ipc-composition.ts` 组合；Active Library 的命名命令落到
`src/main/local-host/active-library-commands.ts`，而非旧全局数据库写入。

| 功能组 | 正式 Renderer 调用方 | Shared Client → 命令族 | Host registrar / 权威入口 | 证据与尚缺部分 |
| --- | --- | --- | --- | --- |
| 启动、身份、连接 | `main.tsx`、`AboutPage`、`WorkspaceConnection` | `buildIdentity` / `capabilities` / `openBrowser`；`app:*`、连接状态与校准 | `index.ts`、`local-dam-server.ts`、`launch-local-dam.mjs` | CODE、E01–E03；普通入口当前 CU 待汇总，安装包快捷入口未验 |
| 文件选择 | `FileSelectionOverlay`、各业务选择调用方 | `files.pending/browse/createDirectory/confirm/cancel`；`files:*` | `file-selection.ts`；`configureProductOpenDialog` 与 purpose/owner 适配 | CODE、E01/E02；盘符/长目录/取消超时/链接逃逸完整 UI 路径待汇总 |
| Library / Copy | `ActiveLibraryControls`、workspace session、`asset.store` | `library.*`、`listAssets`；`library:*`、`assets:list` | `active-library.ipc.ts` → Active Library commands / lifecycle / Capture | CODE、E01/E10；完整基础 Browser CU 待汇总 |
| Trash / 入库恢复 | Library delete/Trash、`IntakeRecoveryPanel` | `library.trash*`、`libraryRecovery.*` | Active Library commands / Trash / recovery | CODE；E10/E21当前隔离通过，完整恢复CU待验；不可用 `assets:delete` 不复活 |
| Gallery / Focus / 搜索 | `LibraryCanvas`、`LibraryFocus`、`LibraryDetails`、`asset.store` | `listAssets`、tag search、`mediaUrl/readPreview` | Active Library 查询/preview resolver；HTTP `/media/active` | CODE、E01、canvas/loading tests；最终视觉对照 FAIL 仍保留，尺寸/主题/长内容未全验 |
| 文件夹 / 色板 / 配色 | `useLibraryOrganization`、Organization modal、LibraryCanvas palette | `library.organizationRead/Write/previewColors` | Active Library commands → organization / preview colors | CODE、E06；E19 的 4d 构建色板加色重开/已有文件夹关联读取通过，其余整理、配色复用及新构建 CU 待汇总；旧 palette extraction disabled |
| 标签 / 别名 / 层级 | `TagManagerPage`、`TagEditDialog`、Asset tag dialogs、`asset.store` | `tag*`、`assetTag*`、`tagSearch*` | Active Library commands → checked tags | CODE、E01/E06；E26 b70别名/父子层级创建、关联素材与按别名检索通过，关系并发/取消及其余操作CU待验；旧 tag delete/merge、旧 AI confirm/reject disabled |
| 描述 / 提示词 | LibraryView Store、`AssetCaptionPanel`、`AssetCardPanel` | `updateAssetCaption/resetAssetCaptionEdited`、`drafts.*`、Card draft | Active Library checked caption + workspace drafts / Card controller | CODE、E01/E04；E19 的 4d 构建恢复描述冲突、显式采用/保存/刷新重开通过，其余及新构建 CU-PENDING；提示词暂存不等于正式来源事实 |
| 图片 Notebook | `LibraryFocus`、`notebook-session`、原生 WorkSetWindow；Browser 参考 view 的 preview 经 `Library.openQuick` | `library.notebookRead/Save`；`library-notebook:*` | Active Library Notebook；原生 `work-window:note-*` 有成员校验 | CODE、E07/E04；ordered IDs 在 E17 验证，E19 的 4d 构建 Focus 便签保存重开通过；恢复/来源冲突及新构建全程 CU 待汇总 |
| 工作集内容 | `useWorkSets`、`WorkSetModal`、LibraryCanvas work landing → `Library` 的 `WorkSetReferenceView`；与原生共用 `WorkReferencePanel` | `workSets.read/write`；`work-sets:*` | `work-set.ipc.ts` → work-window controller / Active Library WorkSet | CODE、E07/E12/E17/E28/E29；G01共享展示已接，旧4d/b70与2f6限定通过保留。793页面弃稿Escape/confirm、Recovery取消/清除、关库取消精确重开PASS；modal dirty目标切换在7b的E31指定路径PASS，clean旧恢复/迟到输入仅隔离PASS，golden视觉FAIL |
| 原生工作窗口 / 单卡片 | `WorkSetReferenceView`、LibraryCanvas、`WorkSetWindow`、`AssetCardWindow` | 主端 `workSets.windows/control/open/restore/recover/hideLibrary`、`assetCard.open/draft`；受限 native API | `work-set.ipc.ts`、`asset-card.ipc.ts`、native window ports | CODE、E17；G02 已接按 scope/id 的状态及控制，Browser 不得取得 native token/draft 或隐式 discard；真实原生屏幕效果 BLOCKED_UX_ACCEPTANCE |
| 图片工具 | `ImageToolsPanel`（Card 保留窄桥）、Library tools | `imageTools.prepare/save/discard/onSaved` | `image-tools.ipc.ts` → controller → Active Library derived save | CODE；`image-tools.integration.test.ts` E21当前 ISO-P，E16失败保留；完整 Browser 派生保存与原件核对待验 |
| 本机恢复草稿 | `WorkspaceRecovery`、各编辑器、`workspace-drafts` 的本地 current draft map | `drafts.*`、`onDraftsChanged` | `index.ts` → profile-owned `workspace-drafts.ts` | CODE、E04/E08/E12/E17；E26 b70参考view返回重开及modal X→列表→恢复相同备注通过；完整刷新/Host重启、放弃/成功清除CU仍需核对持久输入与原基线 |
| 同步 / 冲突 / 切库退出 | AppShell、Stores、`WorkspaceTransitions`、transition participant | 变更事件、`transitions.*`、`workspace:*` | `index.ts`、workspace transitions、quiescence / shutdown；逐窗 close 的全体 flush/freeze | CODE、E03/E05/E06/E17；断线参与者保留，正式已提交通知失败不撤销回执；逐窗 close 后检查原生未保存状态、release 解冻；跨端完整退出/释锁待专项 |
| 设置 / 模型摘要 | `Settings`、Backend/TaskModel settings、`ModelLibraryPage` adapter | `settings*`、`aiBackend*`、`modelLibraryWorkspace.*` | `settings.ipc.ts`、`ai-backend.ipc.ts`、model Workspace handlers | CODE、E06；模型存储 suite 有 ISO-F；摘要不是安装/验证激活，旧 Runtime 面板 disabled |
| 账号 / Provider | `PiConnectionsPanel`、`AuthActivity` | `aiConnections.*`、`aiBackend*` | `ai-connection.ipc.ts` / service / credential vault / Pi Host | CODE、E11/E20；Pi 完整校验与回环 Worker 回归通过；真实厂商认证 NOT_RUN，不能由 Browser fixture 或回调证明凭据已提交 |
| 视觉 / 标签 AI | `VisualAiPanel`、IndependentTagIntent/Decision/Batch、AI background | `visualAi`、`independentTags`、`tagExecution/Batches/Recovery/Decisions`、background | 相应 registrar → controller → checked Host writes / AI gateway | CODE、E11；codec、备份与多个集成 ISO-F；真实模型 NOT_RUN，逐动作外发仍须原授权 |
| OCR | `OcrEnvironmentSettings`、`DedicatedOcrPanel`、background OCR panel | `assetOcr.*`、`backgroundOcr.*` | `asset-ocr.ipc.ts`、`background-ocr.ipc.ts` → OCR controller/runtime | CODE、E08；已有 OCR 选择与 fixture CU 待汇总；旧 OCR 自动安装接口 disabled |
| 下载 | `DownloadQueue`、`download.store` | `managedDownloads.*`、保留的历史 download 方法 | `download.ipc.ts` → managed download / App Download SQLite | CODE、E18/E21；managed-resume / Store / production Copy intake / owned恢复当前通过，persistent/space当前 ISO-F；b70限定披露/取消/重试/入库CU通过见E24，其余持久恢复与新构建待验 |
| Eagle 连接库 | `ConnectedLibrariesPage` | `connectedLibrary.*`（shared connected factory） | `external-connected-library.ipc.ts` → independent index/journal | CODE、E09；仅合成证据，真实 Eagle 未接入验收、原件写入未授权 |
| 旧素材只读 | `LegacyLibraryPage` | `legacyReadonly.*` | 同上 → legacy read-only workspace | CODE、E09/E21中旧SQLite swap ISO-F；E24的b70合成只读审查/检索/刷新/关闭CU通过，真实旧库迁移不在本轮 |
| 文字复制 | ColorSwatch/LibraryCanvas/OCR/Pi diagnostics/WorkSetWindow 等可见入口 | 浏览器 `navigator.clipboard.writeText`；不绕到任意 Host clipboard API | 浏览器/桌面 WebContents 的实际权限 | CODE；相关入口有失败反馈；真实剪贴板结果和权限拒绝 Browser CU 待验，原生跨应用效果另验 |

## 命令目录、角色与禁用状态

本次源码核对中，三份 Shared Client 工厂经 TypeScript AST 与契约常量解析到
**264 个不同命令 channel**，无未解析业务 channel。新增的两项是
`work-windows:list/control`；此前 262 项与 275 项登记日志属于旧快照。这是 channel 数，
不等于公开方法数；别名方法可以复用同一命令。加上 6 个 native-only 命令、5 个旧
`ai-client:*` 禁用兼容别名和 2 个 Active Library 禁用入口，当前静态目录共对应 277 项。
E21 首次登记检查发现无 controller 的 disabled fallback 漏两新命令；修复后
主Agent focused 登记复测 PASS 277（E22）。数字不能用于宣称全部功能或最终版本已验收。
新增调用方时必须更新目录并验证其实际链路；本目录不因列出一个名字就赋予权限。

下表以“前缀 + `:` + 后缀”给出全部 Shared Client 命令；`D` 标记正式组合根禁用。
无 `D` 仅表示已登记，仍受角色、Library、receipt、模型/Runtime、资源和操作授权检查。
普通主表面 Browser/Desktop 共用命名 Client，不能通过目录任意 invoke。

| 前缀 | 后缀（`D` 为禁用） |
| --- | --- |
| `ai-acceptance` | `cancel`, `confirm`, `discard`, `prepare`, `status` |
| `ai-backend` | `delete`, `health-check`, `list`, `list-models`, `save` |
| `ai-connection` | `active-logins`, `answer-login`, `auth-diagnostic`, `cancel-login`, `clear-credential`, `confirm-validation`, `credential-status`, `current-login`, `discard-validation`, `login`, `login-status`, `migrate-credential`, `open-auth-url`, `prepare-validation`, `set-api-key` |
| `ai-model` | `D cancel-download`, `D delete`, `D download`, `D list`, `D verify-compatibility` |
| `ai-runtime` | `D get-macos-ai-branch-status`, `D get-windows-ai-branch-status` |
| `ai-worker` | `D clear-gpu-memory`, `D get-gpu-status`, `D run-prompt-reverse` |
| `ai` | `D enqueue-tag`, `D model-status`, `D model-unload`, `D process-batch`, `D routing-preview` |
| `aiRuntime` | `D getActiveRuntime`, `D getClipSiglipOnnxStatus`, `D getMacOSCapabilities`, `D getPythonCudaStatus`, `D getPythonMpsStatus`, `D getRuntimeState`, `D getWindowsCapabilities`, `D healthCheck`, `D healthCheckAll`, `D listRuntimes`, `D probeOcrRealEvidence`, `D probeOnnxModelLoad`, `D probePythonCudaExecution`, `D probePythonMpsExecution`, `D restartRuntime`, `D selectActiveRuntime`, `D startRuntime`, `D stopRuntime`, `D updateRuntimeConfig` |
| `app` | `build-identity`, `capabilities`, `open-browser` |
| `asset-card` | `draft`, `open` |
| `asset-ocr` | `cancel`, `configure`, `correct`, `prepare`, `read`, `run`, `status` |
| `asset-tag` | `add`, `batch-add`, `batch-remove`, `D confirm-ai`, `list-by-asset`, `D reject-ai`, `remove`, `replace` |
| `assets` | `D apply-path-migration`, `D extract-palette`, `D get-custom-category`, `list`, `D path-governance-report`, `D path-migration-report`, `reset-caption-edited`, `D save`, `D save-custom-category`, `D trigger-extract-save`, `update-caption` |
| `background-analysis` | `change`, `confirm`, `discard`, `prepare`, `read` |
| `background-ocr` | `confirm`, `discard`, `prepare`, `read`, `revoke` |
| `connected-library` | `cleanup-candidates`, `confirm`, `confirm-cleanup`, `conflicts`, `disconnect`, `index-next`, `inspect`, `list`, `media-preview`, `operations`, `prepare`, `prepare-file`, `prepare-new`, `queue-lifecycle`, `queue-metadata`, `resolve-conflict`, `search`, `sync` |
| `cooperative-model` | `D cancel-download`, `D delete`, `D download`, `D list` |
| `doctor` | `D clearLastReport`, `D getLastReport`, `D listChecks`, `D repairCheck`, `D runAll`, `D runCheck`, `D runChecks` |
| `download` | `cancel`, `clear`, `enqueue`, `jobs`, `list`, `prepare`, `retry`, `save` |
| `downloads` | `D get-path-plan` |
| `drafts` | `discard`, `list`, `put`, `recover`, `remove` |
| `files` | `browse`, `cancel`, `confirm`, `createDirectory`, `pending` |
| `image-tools` | `discard`, `prepare`, `save` |
| `independent-tags` | `confirm`, `prepare`, `read` |
| `legacy-readonly` | `close`, `confirm`, `inspect`, `list`, `media-preview`, `prepare`, `search` |
| `library-notebook` | `read`, `save` |
| `library-organization` | `preview-colors`, `read`, `write` |
| `library-recovery` | `list`, `prepare`, `run` |
| `library-trash` | `dispatch`, `inspect`, `list`, `prepare` |
| `library` | `add:dispatch`, `add:inspect`, `add:prepare`, `close`, `create:confirm`, `create:prepare`, `inspect`, `media:read-preview`, `open`, `reopen` |
| `llama-runtime` | `D cancel-install`, `D create-install-plan`, `D detect-hardware`, `D get-status`, `D health-check`, `D list-local-models`, `D open-install-root`, `D start-install`, `D start-server`, `D stop-server`, `D test-server` |
| `macos-ai` | `D install-deps` |
| `model-library-workspace` | `configure-storage`, `summarize` |
| `ocr` | `D cancel-install`, `D check-environment`, `D get-install-log`, `D install-compressed-tensors`, `D install-easyocr` |
| `runtime-package` | `D execute-selection`, `D get-execution-status`, `D select-local-manifest` |
| `settings` | `load`, `save`, `select-folder` |
| `settingsMigration` | `D analyze`, `D createPlan`, `D dryRun`, `D listBackups` |
| `tag-batch` | `cancel`, `discard`, `inspect`, `prepare`, `run` |
| `tag-decision` | `confirm`, `discard`, `prepare` |
| `tag-execution` | `cancel`, `discard-review`, `inspect`, `prepare`, `read`, `run` |
| `tag-recovery` | `list`, `prepare`, `receipt` |
| `tag-search` | `D ai-pending`, `assets`, `untagged` |
| `tag` | `create`, `create-alias`, `D delete`, `get`, `list`, `D merge`, `remove-alias`, `search`, `set-parent`, `update` |
| `visual-ai` | `backends`, `cancel`, `confirm-tag`, `discard-review`, `inspect`, `prepare`, `results`, `run` |
| `work-sets` | `read`, `write` |
| `work-windows` | `control`, `hide-main`, `list`, `open`, `recover`, `restore` |
| `workspace` | `flush-ack`, `quit`, `ready`, `transition-cancel`, `transition-confirm`, `transition-pending` |

这 264 项中静态标记 83 项 D；正式禁用依据是 `disabled-app.ipc.ts` 与组合根的额外
拒绝入口，不根据“有页面/有类型”推断可执行。保留的旧方法并非恢复产品权限。

| 另外的命令 / 角色 | 限制及验收条目 |
| --- | --- |
| `asset-card:inspect`、`asset-card:action` | 仅真实可信 Asset Card sender/token；普通 Browser 的 HTTP allowlist 排除。Card内容/动作隔离证据 E04；系统效果 T23 BLOCKED |
| `work-window:inspect`、`work-window:action`、`work-window:note-read`、`work-window:note-save` | 仅真实 Work Window sender/token，并检查当前工作集成员、Library代际；普通 Browser 排除。E07/E17 覆盖隔离权限；主端通过独立的 scoped `work-windows:list/control`，不能冒领 native-only 角色 |
| `ai-client:enqueue-tag/process-batch/model-status/model-unload/routing-preview` | 5 个兼容别名正式 D，不能当新 Shared Client 能力 |
| `assets:delete` | Active Library 固定拒绝；必须经 `library-trash:*` |
| `assets:apply-path-migration-plan` | 正式 D，不授权旧库迁移 |
| Native draft participant | Card / Work Window 仅可 `drafts:put/remove`、`workspace:ready/flush-ack`；内容、类型与成员权限仍检查。不会获得 `drafts:list/recover/discard` 的完整主端角色 |
| Card 内的受限 AI / image tools | `nativeCardChannels` 固定集合，经可信 sender 与 Card controller 成员授权；窄桥仍有正式调用方，保留它不等于普通主端回退未清除 |

## 事件目录与双端验收条目

普通 Desktop IPC 与 Browser SSE 由同一事件出口传播已提交变化。事件只是触发读取，
不授予写入权限。Browser 重连须先读取 Host 快照并完成已挂载 UI reconcilers。
`app:capabilities` 当前枚举命令；本节补足静态事件、角色与验收归属，**不要求为了目录
新增运行时 API**。登记测试日志的“0 event channels”是该测试 registrar 的统计字段，
不是下述事件不存在或事件交付已通过的证据。

| 事件 / callback | 生产者 → 正式消费者 | 角色 / 两端条目 | 证据与待验 |
| --- | --- | --- | --- |
| `workspace:changed` | Host authority/assets changed → AppShell session、WorkspaceRecovery | 主端 Desktop/Browser | E01/E03；Library、素材变化同步 CU 待汇总 |
| `workspace:navigate` | Host locate/discovery 导航 → AppShell | 主端 Desktop/Browser；导航不是业务提交 | 可见入口与迟到导航 T21/T22 待验 |
| `workspace:connection` | Browser transport 本地状态 → AppShell、WorkspaceConnection | Browser 本地；Desktop connectionState 由适配器提供 | E03；真实断网/重连 CU 未汇总 |
| `workspace:flush` | transition 或逐窗 close 的 flush round → participant / nativeDraft bridge | 主端及可信 native，各自 owner ack | E05/E17；断线/未回复阻断切库或保留窗口，实际全退出另验 |
| `workspace:transition-state` | Host freeze/review 或逐窗 close release → WorkspaceTransitions、participant/native | 主端及可信 native | E05/E17；冻结期间 UI 操作/取消恢复 CU 待验 |
| `workspace:transition-review` | Host → 发起者 WorkspaceTransitions | 发起 owner；其他端不能确认其 review | E05；E29 793另一tab dirty拒绝及1草稿关库取消/正常quit限定CU PASS，原生/账号/晚输入等其余参与者待验 |
| `drafts:changed` | profile draft mutation → WorkspaceRecovery | 主端 Desktop/Browser；读取投影仍含 owned/activeElsewhere | E04；刷新/重启/恢复放弃 CU 待验 |
| `files:requested` | file-selection notify → FileSelectionOverlay | 选择 owner 的 Desktop 主窗或 Browser client | E01/E02；窗口取消/失效 CU 待验 |
| `settings:changed` | settings/backend save → AppShell、已挂载配置编辑器 | 主端 Desktop/Browser；clean刷新、dirty保留原基线 | E06；对开表单同步冲突 CU 待验 |
| `connected-library:changed` | connected/legacy 已提交操作 → 两个正式页面 | 主端 Desktop/Browser | E09；真实 Eagle NOT_RUN，合成完整 UI 待验 |
| `download:imported` | managed download 完成 → AppShell session | 主端 Desktop/Browser；带库身份与代际 | download Store/owned恢复当前 ISO-P；b70第二任务取消/重试/入库CU见E24，其余持久恢复待验 |
| `image-tools:saved` | derived save → AppShell session；Card 内 state refresh | 主端 Desktop/Browser，Card受限状态 | 图片工具集成E21当前 ISO-P；派生保存重开CU待验 |
| `asset-ocr:changed` | OCR权威写入 → AppShell / DedicatedOcrPanel | 主端 Desktop/Browser，Card/Work刷新各自 scope | E08；fixture UI 部分已观察，终轮待汇总 |
| `visual-ai:updated` | visual/tag controller commit → AppShell、VisualAi/TagExecution | 主端 Desktop/Browser；Card使用自身 state投影 | code接线；多个真实Host集成 ISO-F、真实模型 NOT_RUN |
| `asset-card:changed` | Card controller → 对应主端的 workspace session | 目标 owner；metadata变化另触发广域 workspace changed | E04；不把别端的草稿同步成自己的草稿 |
| `asset-card:return` | Card返回 → workspace session | 对应主端 owner、库代际 | session/lifetime ISO-P；Browser入口与迟到返回 CU待验 |
| `work-sets:changed` | WorkSet提交/窗口变化 → useWorkSets、WorkSetReferenceView 的 scoped window state refresh | 主端 Desktop/Browser | E07/E12/E17；E26 b70内容同步、E29 793指定窗口open/unpin/hide/restore/clean-close的Browser状态反馈PASS，dirty/其它状态及原生效果待验 |
| `work-sets:locate` | Work Window locate/add → AppShell、Library work navigation | 主端 Desktop/Browser检查代际；来自可信 native | E07隔离；可见返回/添加路径与原生 CU待验 |
| `asset-card:state` | native Card port → AssetCardWindow、其受限AI/工具 | 只属真实 Card，普通 Browser没有该角色 | E04；原生 CU BLOCKED |
| `work-window:state` | native Work port → WorkSetWindow | 只属真实 Work Window，包含权威真实几何 | E07；原生 CU BLOCKED，不能以网页坐标证明 |
| `ai:task-synced` | 保留旧 Client 订阅 | 对应旧执行 channel已D；不是现行visual/tag事件的证明 | disabled拒绝路径；无现行执行交付声明 |
| `ocr:install-log` | 保留旧 OCR安装订阅 | 对应旧安装/环境channel已D | 不运行安装，不以日志订阅证明可用 |
| `llama-runtime:install-progress:*` | 保留逐任务Runtime安装进度订阅 | 执行通道D；名称来自契约helper | NOT_RUN / disabled，不恢复安装权限 |
| `ai-model:download-progress:*` | 保留逐模型订阅 | 下载执行D | NOT_RUN / disabled |
| `cooperative-model:download-progress:*` | 保留逐模型订阅 | 下载执行D | NOT_RUN / disabled |
| `onReconcile` callback | Browser transport → AppShell及挂载页面读取 | Browser校准回调，非Host事件；Desktop no-op | E03：等待完成后才准入写命令 |

## 23 票归属与当前交付限制

T 编号沿用批准拆分的含义；本矩阵不自动发布、关闭或修改 Issue。
所有票的 Browser必需路径由 T22 汇总，涉及原生系统效果由 T23 汇总。

| 票 | 故事归属 | 当前接线 / 隔离证据 | 尚缺最终验收或实施 |
| --- | --- | --- | --- |
| T01 共享业务入口 | 2,3,19,64 | CODE、E01 | 实际双端普通路径及完整契约CU待汇总 |
| T02 双入口唯一Host | 1,4–9,12,48,61–63,72 | CODE、E02/E13/E29 | 793无主桌面窗的普通受控Browser启动/About PASS；安装包双入口、重复启动、关标签/主窗、重启旧grant仍待验；E30早期无CU，候选7b限定CU见E31 |
| T03 选择器与库生命周期 | 13–15,17–20,31,63 | CODE、E01/E02/E29 | 793页面picker越界/不存在拒绝、逐层打开、正常close/reopen6素材+1草稿PASS；其余位置/失效/取消UI分支待验；真实旧库未操作 |
| T04 Copy与Gallery检索 | 16,21,25–26,30–31,36,50,56 | CODE、E01/E10/E15 | Gallery/Focus最终复测、检索、权限失效、视觉证据待汇总 |
| T05 文件夹色板配色 | 23–24,36–39,58,67 | CODE、E06/E19 | 4d已有文件夹关联读取/色板加色重开通过；其余整理/复制/并发、长内容与新构建CU待验 |
| T06 标签与AI文件夹 | 23,36–39 | CODE、E01/E06/E26；b70别名层级创建/关联/检索通过 | 关系并发/取消、其余整理与动态AI引用完整CU待验 |
| T07 Trash与收录恢复 | 22,76 | CODE、E10/E21；recovery当前ISO-P；E15限定4d派生素材Trash恢复CU | 4d恢复重开通过；最终受影响路径及失败收录恢复结果仍需核对 |
| T08 描述与恢复草稿 | 27,37–39,41–46,49 | CODE、E01/E04/E15/E19/E28/E29 | 4d/2f6历史限定保留；E35恢复/弃稿复测，E43/E45实际断流输入保护与校准后手动保存重开PASS；其余编辑器故障矩阵待验 |
| T09 Notebook恢复 | 27,37–39,41–46 | CODE、E07/E04/E19 | 4d Focus便签保存重开通过；冲突、来源失配、恢复与新构建CU待验 |
| T10 WorkSet内容 | 33–34,37–39,41–46 | CODE、E07/E12/E17/E19/E26/E28/E29/E31 | E26/E28/E31历史限定保留；E44新2411字符WorkSet保存重开，E45原草稿准确恢复/X保留及长备注逐字读取PASS；迟到/失败完整矩阵与golden独立 |
| T11 原生参考/单卡片 | 32,35,60,73 | CODE、E04/E07/E17/E29 | G02指定WorkSet窗口open/unpin/hide/restore/clean-close的Browser状态反馈PASS；dirty close/其余窗口待验，真正置顶/跨屏/几何/单卡片效果BLOCKED |
| T12 图片工具 | 74 | CODE、image-tools E21当前ISO-P；E15限定4d旋转派生保存重开CU | 4d 360×240→240×360副本正式读取通过；其余工具/失败恢复/最终受影响路径待验 |
| T13 设置模型摘要 | 57,70–72 | CODE、E06/E22、model workspace部分ISO-P/ISO-F；b70 E23/E24、793 Settings/About E29 | E29/E31两tab设置历史限定保留，E43/E45真实丢回执未知指导/权威回读/恢复原偏好PASS；其余模型摘要/存储review待验，安装NOT_RUN |
| T14 账号生命周期 | 51–53,55,59 | CODE、E11/E20 | Pi校验/回环Worker隔离通过；真实认证NOT_RUN，凭据提交不能从回调或fixture推导 |
| T15 视觉标签AI | 54–57 | CODE；codec/backup/tag/Pi集成ISO-F | 真实模型NOT_RUN；Browser授权/取消/结果全程CU待验 |
| T16 OCR识别修订 | 28,37–39,41–46,54 | CODE、E08/E15；4d合成OCR人工修订/退出重启重开，b70选择取消E24；background集成ISO-F | E41正式页面OCR picker/peer配置同步、合成识别审查取消/确认/1/1完成及双tab修订比较采用/保存重开/复制PASS；E42同profile重启持久读取PASS。真实OCR Runtime NOT_RUN，完整故障矩阵待验 |
| T17 下载 | 29,49–50 | CODE、E18/E21；Store/resume/production Copy intake/owned恢复 ISO-P，persistent/space当前 ISO-F | b70第二任务披露/取消/重试/入库CU通过E24；其余恢复与新构建CU待验 |
| T18 连接库 | 69 | CODE、E09；b70未配对不可用路径E24 | 合成完整连接CU待验；真实Eagle NOT_RUN，不改ownership |
| T19 旧素材只读 | 75 | CODE、legacy suite ISO-F；b70合成只读CU E24 | b70选择/审查/检索/刷新/关闭通过；新构建受影响路径待验，真实旧库不迁移、不写入 |
| T20 全局切库退出 | 10–11,31,40,48,68 | CODE、E05/E03/E04/E27/E28/E29；历史b70与2f6分别保留 | E29跨tab dirty拒绝限定保留；E43/E45原2草稿保留正常quit均exit0。E45关库取消原草稿精确恢复、页面关开7素材2草稿PASS；原生dirty/账号/未送达全参与者矩阵及系统锁专项待验 |
| T21 契约与故障闭合 | 36,39,47–50,62–64 | CODE、E01–E06/E17；本文264项Shared Client静态目录 | E43/E45实际丢回执和SSE断流/校准后手动保存指定路径PASS；漏事件/重启完整矩阵及其它写命令故障未全验，277静态登记不等于全部功能闭合 |
| T22 Browser完整验收 | 1–76的Browser必需部分 | E13–E28历史限定保留；E29最终793 root指定路径PASS，14截图复核；Luna793工具阻塞 | PARTIAL DELIVERY；E41–E45各构建限定正式CU完成。f8e重发/断流/布局/长备注/关开退出PASS；完整缩放、安装包双入口及其余表内业务未全验，golden ISO-F/原生阻塞独立 |
| T23 原生专项复测 | 8–11,32,35,58–60,66,68–69,73–74的原生部分 | 原生命令与Adapter存在；隔离部分通过 | BLOCKED_UX_ACCEPTANCE：当前工具不能核实真实屏幕系统效果；网页成功不替代 |

## 76 故事逐项矩阵

“P(E…) / F”只指对应隔离证据范围；所有 CU-PENDING 项都须绑定最终构建的实际
用户路径复测。表内 `N-BLOCKED` 指原生必需部分；`REAL-NOT_RUN` 指真实账号/模型/
真实连接库等尚未运行，不是产品能力一定缺失。CODE 不自动清除这些状态。

| 故事 | 用户可观察结果 | 归属票 | 当前代码/隔离证据 | Browser / 系统待验与限制 |
| --- | --- | --- | --- | --- |
| 1 | 正式Browser日常管理 | T02,T22 | CODE；P(E01,E02) | CU-PENDING，非完整日常全量通过 |
| 2 | 两端同一界面流程 | T01,T22 | CODE，共用App/组件 | CU-PENDING；批准视觉比较F |
| 3 | 共用素材库与任务状态 | T01,T22 | P(E01) | CU-PENDING，完整任务同步未全验 |
| 4 | Browser入口无需主窗 | T02,T22 | CODE，browser-only启动；E29 793无主桌面窗受控普通启动PASS | 源码受控入口限定通过；安装包入口NOT_RUN；E30 e1建库/Copy/刷新失败及E31 7b修复后限定CU独立记录 |
| 5 | Desktop正式入口 | T02,T22,T23 | CODE | 主窗普通启动/关开N-BLOCKED |
| 6 | 再启动发现唯一Host | T02,T22 | CODE，single-instance/profile | 重复启动CU-PENDING |
| 7 | 测试与正式profile隔离 | T02,T22 | P(E02)，Host边界；E29 About/receipt/合成profile与库核对 | 793受控身份/合成范围核对通过，无真实数据；其它隔离拒绝仍按E02限定，不由界面标识独自推导 |
| 8 | 关标签仅关闭当前端 | T02,T22,T23 | CODE，pagehide撤document | 后台/账号持续结果CU-PENDING |
| 9 | 关主窗不退出Host | T02,T22,T23 | CODE，window-all-closed保留Host | N-BLOCKED |
| 10 | 明确退出审查全端 | T20,T22,T23 | P(E05)，CODE；E15 b70正常quit，E29 793审查1草稿/保留→Host exit0 | 793退出指导可访问/业务冻结/恢复banner不重叠PASS；原生dirty/真实账号/全部参与者未全验，候选7b限定CU见E31 |
| 11 | 取消切库退出保留编辑 | T20,T22,T23 | P(E05)；E15 b70描述精确重开；E29 793关库审查→继续编辑→WorkSet精确重开 | 793限定取消保库/原输入PASS；其余对开/原生表面/退出取消分支待验 |
| 12 | 无法连接时可恢复说明 | T02,T22 | CODE，bootstrap/connection提示；E29正常quit后AX可访问指导与分离banner | E29正常退出指导与E43/E45实际断流/恢复指导限定PASS；冷启动失败/旧授权全部矩阵仍待验 |
| 13 | 逐层盘符目录选择 | T03,T22 | CODE；P(E01,E02)；E29合成根逐层打开browser-acceptance PASS | 793合成目录流程通过；正式盘符/其它用途和完整选择器矩阵未全验 |
| 14 | 输入路径与错误反馈 | T03,T22 | P(E01,E02)；CODE；E29合成越界/不存在路径拒绝PASS | 793明确拒绝文案/返回允许根后打开通过；无权限/长路径等其它分支待验 |
| 15 | 明确新建目录 | T03,T22 | CODE；历史E13 | 最终构建复测CU-PENDING |
| 16 | 支持范围多文件选择 | T04,T22 | P(E01)；b70空picker取消E26 | 两图Copy已观察E15；空选择取消无新增通过，过滤及其余分支CU-PENDING |
| 17 | 取消超时失效不执行 | T03,T22 | CODE owner/expiry/cancel；b70空选择取消E26 | 取消无新增通过；UI超时/失效选择CU-PENDING |
| 18 | 选后仍检查资格权限 | T03,T22 | P(E01,E02,E08) | 各用途UI拒绝CU-PENDING；不扩权限 |
| 19 | 库创建打开关开协议 | T01,T03,T22 | P(E01)；E29 793正常close/reopen6素材+1草稿PASS | 793已有库正常关开限定通过；创建/迁移/其它故障未全验，WIP host suite部分F，候选7b限定CU见E31 |
| 20 | 仅查看不静默迁移 | T03,T22 | CODE，review/allowUpgrade | 合成旧版拒绝/取消CU-PENDING，真实旧库未动 |
| 21 | 默认Copy保留原件 | T04,T22 | P(E01,E10)，来源字节核对 | Browser Copy已观察E15，终轮汇总待完成 |
| 22 | Trash恢复不绕保护 | T07,T22 | P(E10)；E15 4d合成派生素材Trash恢复重开 | 限定恢复通过；其余保护拒绝/失败与最终受影响路径CU-PENDING |
| 23 | 文件夹标签别名层级 | T05,T06,T22 | P(E06)；CODE；E19已有文件夹关联读取，E26 b70别名/父子层级创建及素材关联 | E26限定标签路径通过；文件夹组织写入、关系冲突/取消及其余分支CU-PENDING |
| 24 | 色板配色与占比 | T05,T22 | CODE；P(E06)部分；4d色板加色重开E19 | 确定性占比、配色复用及新构建CU-PENDING；旧palette channel D |
| 25 | 一致检索及命中解释 | T04,T22 | CODE；discovery workflow P；E26 b70别名找规范标签/单一关联素材与标签元数据 | 别名检索限定路径通过；其余词法/结构化及命中解释CU-PENDING，真实增强模型NOT_RUN |
| 26 | Gallery/Focus/检查比较 | T04,T22 | CODE；canvas P | 最新Gallery已观察E15；Focus/比较/视觉F待复测 |
| 27 | 笔记描述提示词保存区分 | T08,T09,T22 | P(E04,E07)；CODE；4d描述/Focus便签保存重开E19 | 提示词、其余编辑器分支及新构建CU-PENDING |
| 28 | OCR读取运行取消修订 | T16,T22 | P(E08)；background集成F；E15 4d合成修订正式保存/Host重启重开 | E41正式合成OCR配置/审查取消与确认/识别1/1/双端修订保存重开/复制，E42同profile重启读取PASS；fixture不证明真实模型，已启动任务取消未全验 |
| 29 | 下载披露进度取消一致 | T17,T22 | CODE；Store/owned恢复P(E18,E21)，persistent/space F；b70限定下载CU E24 | 第二任务披露/确认/取消/重试/入库通过；首任务取消前完成不算取消证据，其余恢复与新构建CU-PENDING |
| 30 | 授权预览不公开硬盘 | T04,T22 | CODE，scoped media；P(E01,E09) | 最新Gallery/权限失败CU-PENDING；非通用文件服务 |
| 31 | 切关库旧媒体请求失效 | T03,T04,T20,T22 | CODE代际双检；P(E01,E02)部分 | 旧URL/CU快速关开未全验 |
| 32 | 工作窗口仅访问成员 | T11,T22,T23 | P(E07)；native roles | Browser不能冒领；真实窗口N-BLOCKED |
| 33 | Browser工作集参考内容 | T10,T22 | 共享 `WorkReferencePanel` / `WorkSetReferenceView` CODE、P(E07,E12,E17,E28)；4d E19/b70 E26/2f6 E28，793页面弃稿/关库取消精确重开E29 | 793 Escape保输入/confirm返回已保存3引用PASS；793未验modal目标切换，7b的E31指定路径PASS，clean旧恢复/迟到输入仅隔离PASS，golden视觉F与候选7b限定CU独立 |
| 34 | 保存删除成员不删素材 | T10,T22 | P(E07)；CODE；E26 b70移除test-image→仍可选原素材→再加入/保存 | 成员移除不删除素材的限定UI路径通过；其余成员/保存失败分支CU-PENDING |
| 35 | Browser控制真实工作窗 | T11,T22,T23 | scope/id list/control 与 open/restore/recover CODE；P(E17)；E29 scoped窗口可见操作 | 793指定窗口open/unpin/hide/restore/clean-close的Browser反馈PASS；dirty close/其它窗口待验，真实系统效果N-BLOCKED |
| 36 | 保存后另一端刷新 | T04,T05,T06,T21,T22 | CODE统一事件；P(E01,E03,E06)部分；b70Settings E23/WorkSet E26，793 Settings同步/刷新E29 | 793指定偏好保存后peer同步与刷新持久PASS；其余多域同步CU-PENDING，E31候选7b限定CU分列 |
| 37 | 并发冲突保留各端草稿 | T05,T06,T08–10,T16,T22 | P(E01,E06,E07,E08,E12)；4d描述E19、b70Settings E23/WorkSet E26；793 Settings E29 | 793 A已存/B保留、比较/采用保输入/保存同步/刷新PASS，历史其它限定结果保留；其余编辑器/关系冲突待验 |
| 38 | 读取最新后明确复核 | 同37 | 描述/OCR/WorkSet显式采用基线CODE；P(E08,E12,E17)；E19/E23/E26及793 Settings E29 | 793指定设置展开已保存偏好/明确采用仍保留输入再保存PASS；clean旧恢复保留原基准仅隔离PASS，其余分支待验 |
| 39 | 迟到应答不覆盖新输入 | T05,T06,T08–10,T16,T21,T22 | session/lifetime P；E03/E08/E12；E27 Settings读/保存顺序及transition late pending隔离P | 新Settings/transition回归PASS；快速重复、晚回执正式CU仍待最终受影响构建，不能由隔离PASS推导 |
| 40 | 切库退出检查其它表面 | T20,T22 | CODE；P(E05)，断开participant保留；E29另一tab dirty拒绝关库与1草稿审查 | 793两Browser参与者限定检查PASS；原生dirty/账号/未送达等完整参与者矩阵未验，native N-BLOCKED |
| 41 | 本机定期暂存及接收状态 | T08–10,T16,T22 | P(E04)；CODE banner；E26 b70WorkSet返回/X后显示本机暂存提示 | E26限定离开后暂存提示通过；周期与其余编辑器接收状态CU-PENDING |
| 42 | 刷新重进Host重启恢复 | T08–10,T16,T22 | P(E04)；E26 b70恢复、E15 4d已保存OCR读取、E28 2f6原草稿重启恢复；E29 793 close/reopen保留1草稿 | 历史各类恢复限定保留；E41/E45原Root407恢复准确，E42同profile重启读取已保存OCR，E45关开7素材2草稿PASS；未宣称Host崩溃或所有编辑器重连通过 |
| 43 | 恢复核对实体来源基线 | T08–10,T16,T22 | P(E07,E08,E12)，Notebook来源拒绝；4d描述恢复冲突/基线复核E19 | 其余来源失配/目标缺失及新构建CU-PENDING |
| 44 | 用户恢复放弃成功清除 | T08–10,T16,T22 | P(E04,E12,E28)；CODE；历史恢复E19/E26/E28，最终793页面确认E29 | 793 Recovery保留后记录仍有/明确放弃后清空且保存内容不变、页面弃稿Escape/confirm PASS；2f6历史JS阻塞保留，其余编辑器/失败清除待验 |
| 45 | 按库编辑者类型隔离草稿 | T08–10,T16,T22 | P(E04)，Card owner分离 | 多tab/native覆盖CU-PENDING |
| 46 | 未发输入标为未暂存 | T08–10,T16,T22 | P(E04)；connection banner CODE | 真实断线/崩溃前输入CU-PENDING |
| 47 | 重连快照校准再操作 | T21,T22 | P(E03)；E27 Settings required load屏障与reconcile failure复跑P | 只证明隔离校准阻断/失败；真实SSE漏事件/重连CU-PENDING |
| 48 | Host重启旧会话grant失效 | T02,T20,T21,T22 | P(E02,E04)部分；CODE | Host重启旧token完整CU-PENDING |
| 49 | 丢响应结果未知不重发 | T08,T17,T21,T22 | BrowserTransport CODE，P(E03)部分 | E43/E45正式成功提交后丢回执→固定未知指导/输入保留/普通回读准确PASS；浏览器底层2HTTP只执行1次，后端拒绝重复编号。未扩大到全部写命令CU |
| 50 | 通知失败不撤已提交结果 | T04,T17,T21,T22 | CODE，安全事件出口 | Host相关AI integration F；通知故障CU未验 |
| 51 | Host唯一账号状态 | T14,T22 | CODE；P(E11) | REAL-NOT_RUN，双端账号观察CU待验 |
| 52 | 离页解绑明确取消收敛 | T14,T22 | P(E11) | 真实厂商回调NOT_RUN；fixture不能代替认证 |
| 53 | 用户亲自厂商认证 | T14,T22 | CODE登录计划入口 | REAL-NOT_RUN；不记录完整认证地址/凭据 |
| 54 | 同一权威AI/OCR结果服务 | T15,T16,T22 | CODE；P(E08)，AI多集成F | fixture与真实模型分列；REAL-NOT_RUN |
| 55 | 每动作披露授权不静默外发 | T14,T15,T22 | CODE，review/receipt；P(E02,E11)部分 | 实际授权/取消完整CU-PENDING；真实外发NOT_RUN |
| 56 | 无模型可基础整理检索 | T04,T15,T22 | P(E01)，CODE；E26 b70无AI配置仍WorkSet/标签别名检索通过 | 上述限定基础业务通过；其余基础路径CU-PENDING |
| 57 | 同一能力/前提/不可用原因 | T13,T15,T22 | CODE，app命令目录+本文事件/禁用目录；b70模型/连接库E24、Inspector AI未配置E26 | 限定不可用说明通过；不证明已启动AI取消/真实推理，其余能力文案及最终小fixCU-PENDING，D接口不恢复 |
| 58 | 两端文字复制失败反馈 | T05,T22,T23 | 可见入口CODE | Browser权限/真实复制CU-PENDING；跨应用N-BLOCKED |
| 59 | 已准入系统动作Host执行 | T14,T22,T23 | CODE，auth-url/open/native commands | 真实系统效果N-BLOCKED；无任意进程API |
| 60 | 布局来自真实窗口 | T11,T22,T23 | WorkWindow port.bounds CODE；P(E07)部分 | 原生几何/跨屏N-BLOCKED；Browser坐标不能替代 |
| 61 | 本机入口无需账号/CA | T02,T22 | P(E02)，loopback会话CODE；E29 793受控普通/launch入口 | 793普通本机入口无账号/CA PASS；安装包双入口未验，E31候选7b限定CU分列，历史Mesh方案不复用 |
| 62 | 拒绝其它网站未知角色 | T02,T21,T22 | P(E02)，角色检查CODE | 拒绝界面与旧会话CU-PENDING |
| 63 | 验收强制合成profile | T02,T03,T21,T22 | P(E02)，Host边界CODE | 每轮CU核对环境；不能以userData一项证明隔离 |
| 64 | 方法事件禁用逐项验收目录 | T01,T21,T22 | 历史275登记P；当前264 Shared/277目录，fallback修复后登记P(E22) | 目录已建立，逐路径验收仍待；数字不等于全部功能通过 |
| 65 | 普通入口可见控件验收 | T22 | 历史E13–E28保留；E29 793 root普通入口/可见控件指定路径PASS，14截图复核 | Luna与Root各轮按实际报告分列，E41–E45普通入口可见控件指定路径PASS；最终f8e限定复测，不计后台API/Store注入，不冒称76故事全部通过 |
| 66 | Browser/native/后台分别结论 | T22,T23 | E13–E32分列；E29完整WIP793 root限定CU，E30选择性e1聚焦测试，E31 7b修复及限定CU | Browser PARTIAL DELIVERY/CU-PENDING，native N-BLOCKED；WIP E21的111/19+1focused与候选30latest PASS不混算，793 CU不覆盖候选；历史2f6/Luna793工具阻塞保留 |
| 67 | 尺寸缩放主题长内容可用 | T05,T22 | 共享样式CODE；b70暗色可读E24；现行路由motion隔离P(E27) | E44菜单960/640通过但恢复提示遮挡FAIL保留；E45修复后640深浅/提示操作无重叠、960/1280About、2411字符逐字读取PASS。缩放未验，golden1.097186%FAIL不变 |
| 68 | 退出冻结排空释锁 | T20,T22,T23 | CODE；P(E05)部分；E15 b70正常quit，E29 793 1草稿审查/保留→session55273 exit0 | E45原2草稿审查保留→Host89241 exit0、业务控件退出AX且指导可访问PASS；全部参与者排空、系统锁/原生效果仍待专项 |
| 69 | 连接库资格索引同步等价 | T18,T22,T23 | P(E09)；CODE；b70未配对不可用原因E24 | E24不算连接成功；合成完整CU-PENDING，真实Eagle NOT_RUN |
| 70 | 模型摘要存储诊断 | T13,T22 | model Workspace部分P、storage F；b70未签名/存储禁用原因E24 | E24仅不可用状态；其余摘要CU-PENDING，不是安装/真实推理证明 |
| 71 | 设置共用且处理冲突 | T13,T22 | P(E06,E22)，clean同步dirty保留CODE；b70 E23、最终793 E29 | 793两tab比较/采用保输入/保存同步/刷新持久/恢复原偏好及dirty阻止关库PASS；其余字段/故障/取消仍待验，候选7b限定CU见E31 |
| 72 | 可见构建环境标识 | T02,T13,T22 | About CODE；历史E26/E28，最终793 root可见菜单/About与截图E29；候选e1/656 E30与修复后7b/656 E31 | 793与7b/win32/x64/受控测试可见核对分别PASS；候选7b的About与限定CU见E31，不转用793其余结果 |
| 73 | 单卡片兼容入口动作 | T11,T22,T23 | CODE，受限AssetCardWindow | Browser入口待验；真正Card交互N-BLOCKED |
| 74 | 图片工具审查派生保存 | T12,T22,T23 | CODE；image-tools E21当前P；E15 4d下载图旋转审查/派生保存重开 | 限定360×240→240×360副本读取通过；其余工具/失败/最终受影响路径待验，系统部分N-BLOCKED |
| 75 | 旧素材只读找回 | T19,T22 | CODE，legacy suite F；b70合成只读选择/审查/标签检索/刷新/关闭E24 | b70限定路径通过，新构建受影响路径待验；真实旧库NOT_RUN，无迁移授权 |
| 76 | 失败收录恢复安全重试 | T07,T22 | CODE，intake-recovery suite E21当前P | 安全重选来源与结果全程CU-PENDING |

## 当前明确缺口与完成条件

| 编号 | 实际缺口 / 未覆盖 | 影响与完成条件 |
| --- | --- | --- |
| G01 | 共享参考、页面弃稿及7b modal目标切换限定CU通过，余边界/视觉未完成 | G01正式共用`WorkReferencePanel`已接；E26 b70 Add/Save As/成员不删素材/冲突/modal X恢复与16截图、E28 2f6重启恢复保存重开保留。后续WorkSet确认源码已变；E29最终793页面弃稿Escape保输入/confirm恢复原3引用和已保存备注、Recovery取消/清除不改保存内容、关库取消后精确草稿重开PASS，14截图复核，精确值依据报告/AX。793未验modal目标切换，7b的E31指定路径PASS；clean旧恢复/Save As loaded/迟到输入仅E12/E17隔离PASS，重连/失败与golden视觉未闭合。E30早期无CU，候选7b限定CU见E31，不转用793结论 |
| G02 | scoped逐窗Browser反馈通过，dirty/系统验收未完成 | `work-windows:list/control`检查scope/id后给无token/draft状态；close全体flush/freeze检查原生dirty/Notebook，不能隐式discard。E17含SQLite/HTTP/SSE与注入ports，`busy()`各阶段互斥守卫仅隔离PASS。E29最终793指定WorkSet窗口open/unpin/hide/restore/clean-close的Browser状态反馈PASS；尚未观察实际置顶/隐藏/找回/几何/跨屏效果，dirty close及其它窗口分支未验。T23真实系统效果仍BLOCKED，网页状态不替代 |
| G03 | 最终f8e故障/恢复布局/相关生命周期已复测，完整业务CU仍未闭合 | E41–E45按各自构建补OCR/复制/未知回执/实际SSE/相关尺寸主题/2411长备注/关库取消精确恢复/正常关开与quit。E45当前f8e为最终受影响范围，不转用旧结果作为全量验收；完整缩放、安装包双入口、其它逐项业务及所有编辑器故障矩阵仍NOT_RUN/CU-PENDING。旧产品FAIL与修复后PASS分列；整体PARTIAL DELIVERY |
| G04 | 原生系统验收受工具限制 | E29只核对Browser指定窗口命令和状态反馈；不能用该证据证明真实桌面置顶/隐藏/找回/关闭、跨屏/几何/托盘/跨应用效果，T23仍BLOCKED_UX_ACCEPTANCE。后台Adapter及合成port通过只证明对应边界；候选无原生运行，均不清除此项 |
| G05 | 完整WIP19文件失败与原golden视觉漂移，候选聚焦证据分列 | E21完整WIP111隔离文件PASS/19FAIL、28仅语法PASS、另1具名AI委托case PASS；181执行/159唯一项，历史E16的88/33与162执行保留。E27 motion整文件PASS、AI单case不覆盖整文件FAIL、原golden1.097186%仍FAIL。E29最终793受影响普通CU限定PASS，不覆盖这些失败。E30不同源码候选的30文件latest PASS只属聚焦验证，初29/1启动失败与unset重跑保留，不加入E21或改写WIP/golden结果。生产backup/codec、Windows权限/fsync/SQLite置换限制不改为PASS、不放宽准入 |
| G06 | 真实账号、模型、Runtime与连接库未运行 | 本轮只允许合成profile/指定fixture；真实厂商认证由用户输入，真实模型/外发/真实Eagle与旧库须各自已有授权。未交付的禁用安装/Runtime能力不补齐、不虚报 |

完成声明分别给出Browser各路径、Desktop/native、隔离测试与未运行项目。
G01/G02已有正式接线，最终f8e受影响范围CU见E45，完整旧范围按原构建报告保留；
G03中的其余必需用户路径、G04原生专项、G05既有失败和视觉比较仍未闭合，当前为部分交付。
选择性候选E30/E31独立验收：e1刷新FAIL保留，7b复测指定路径PASS；30早期聚焦与4文件复测不替代全量套件或完整CU。
E26/E28历史限定结果、原生系统结论和真实模型证据继续独立报告。
