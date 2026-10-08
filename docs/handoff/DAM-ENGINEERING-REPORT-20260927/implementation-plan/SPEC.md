# First implementation spec: independent tag analysis

Status: Draft for review. MODE=SPEC. No implementation or publication performed.

## Problem Statement

当前正式视觉分析将描述、标签和反推绑定在综合结果里。用户无法用独立、可恢复的标签任务验证新架构是否可靠；任务主要留在内存，较早发起而较晚完成的结果缺少请求代次保护。已有人工内容与资料库权限必须保留。
本轮要把用户明确选择的素材完成“单独分析标签→保存建议→检索/AI文件夹使用→按需确认或拒绝→取消/重开可恢复”闭环。P00–P27是设计参考，尚未证明新实现可运行。

## Solution

在现有Inspector和主窗口批量动作中提供手动独立标签入口；原生卡片仅允许当前素材。用户确认输入、服务和存储升级范围后执行，结果立即作为AI建议显示和参与相应检索，确认关系由用户显式建立。失败/取消保留上次有效结果，重复操作不重复生效，重开显示未完成任务并在重新确认后继续。
沿用现有正式展示组件和受控服务配置，不新建独立简化UI。第一轮仅使用已配置、经本次动作授权的兼容视觉服务，不负责启动/安装模型，也不启用自动后台或云端自动重试。

## User Stories

1. As a visual creator, I want to request tags alone, so that unrelated analysis does not delay useful suggestions.
2. As a visual creator, I want to review the selected assets and provider before execution, so that the scope is clear.
3. As a visual creator, I want preprocessing to use controlled previews, so that my originals remain unchanged.
4. As a visual creator, I want missing models to produce an honest waiting state, so that basic asset management remains available.
5. As a visual creator, I want a storage-upgrade review before the first persistent request, so that compatibility consequences are visible.
6. As a visual creator, I want new tag suggestions to appear after commit, so that displayed success reflects durable data.
7. As a visual creator, I want suggestions to support AI folders and search, so that analysis is useful without mandatory confirmation.
8. As a visual creator, I want to confirm a suggestion explicitly, so that confirmed tags remain my decisions.
9. As a visual creator, I want to reject an unsuitable suggestion, so that the same source does not immediately reintroduce it.
10. As a visual creator, I want reruns to preserve confirmed tags, descriptions and OCR corrections, so that AI cannot erase my work.
11. As a visual creator, I want failed reruns to retain the previous valid suggestions, so that failures do not remove useful results.
12. As a visual creator, I want newer requests to outrank late older results, so that completion timing cannot undo my latest intent.
13. As a visual creator, I want repeated clicks to reuse the same request receipt, so that they do not create duplicate effects.
14. As a visual creator, I want an explicit force-rerun action, so that new work is distinguished from request retransmission.
15. As a visual creator, I want a bounded batch of selected assets, so that work does not expand to my entire library.
16. As a visual creator, I want successful batch items to remain available when others fail, so that progress is not all-or-nothing.
17. As a visual creator, I want cancellation to prevent later commits, so that stopped work cannot silently modify the library.
18. As a visual creator, I want library close or switch to revoke execution authority, so that old tasks cannot write into a new session.
19. As a visual creator, I want incomplete tasks to remain visible after reopening, so that progress is not lost.
20. As a visual creator, I want resumption to recheck the provider and content, so that stored intent does not become permanent authorization.
21. As a visual creator, I want a lost notification to leave committed results intact, so that retrying does not rerun successful inference.
22. As a visual creator, I want incomplete or invalid model responses to be rejected, so that fragments are not saved as successful analysis.
23. As a visual creator, I want raw service errors and credentials excluded from diagnostics, so that failure reporting does not expose private data.
24. As a visual creator, I want card-window actions limited to that card's asset, so that other library members are not exposed.
25. As a visual creator, I want the existing combined analysis and reverse-prompt workflows to continue working, so that a new capability does not remove established behavior.
26. As a reviewer, I want production-path test logs separated from synthetic design checks, so that implementation acceptance is evidence-based.
27. As a visual creator, I want unknown remote execution outcomes to be shown without blind resending, so that timeouts do not imply free retries.
28. As a maintainer, I want the implementation to preserve unrelated local work and support a compatible rollback, so that development does not damage the project or library.

## Implementation Decisions

全部为本轮具体提案，等待审阅；过去阶段未自动改成Accepted。

- 使用现有可信Main控制器与Active Library Host边界。主要测试入口为产品意图（准备、运行、读取结果、确认/拒绝、取消、恢复）；Provider/时钟仅作为可替换测试依赖，不向Renderer暴露SQL、路径或执行token。
- 第一轮选择Managed库、手动tags、每批1–8个明确素材；主窗口和当前素材卡片保持原权限。Eagle/Legacy无新写口。描述、OCR、prompt独立化及自动Promotion订阅暂不纳入。
- 先内部抽取单次Provider与兼容协调，固定旧综合请求/重试/解析行为；新tags采用新Recipe与严格完整响应，不修改旧综合四字段成功定义。新Recipe最多8个非空标签，每项最多80 UTF-16，去重规则版本化；空数组结构有效但不声称素材不存在任何对象。中文是质量检查维度，不能用简单字符正则排除合法品牌名后宣称语义质量已通过。
- additive标签契约与逐能力summary，旧综合API保留。新标签结果覆盖有效AI标签投影，caption/OCR/prompt继续从原有效来源读取，不能拼装为一条虚构综合Evidence。旧路径在新模式写入标签时也必须经过同一代次/current规则；未完成适配前不允许两路同时更新当前标签。
- 每次明确新请求分配requestGeneration；同clientRequestId相同内容返回原回执，不同内容冲突。强制重跑新ID/新代次。attempt claim使用当前Host session/lease identity与epoch，不能假定libraryGeneration每次重开变化。
- 新功能schema采用增量升级并集中登记精确profile；现有v1–v8不改历史含义。首个已确认持久请求是升级触发点，普通读取不得升级。具体下一版本与DDL在任务02实现前再次核对并写评审记录，不能先在v8偷偷加表。所有现有同库读写能力须兼容新profile或明确安全拒绝；不能只让标签跑通却破坏OCR/笔记/下载。
- 迁移需一致备份和足够空间，备份先完成后进入同步DDL+请求首写事务；备份不是原件全量备份。目标为可安全打开的临时/新库实验，热日志/损坏库仍返回恢复要求。真实用户库升级不在本轮操作授权内。
- Evidence/current、Job成功、效果回执与Outbox同事务。提交后通知失败保持成功；重读或Outbox重投只更新展示，不重新推理。合法scope校验先于查询重复回执。
- 重跑/失败不清人工描述、confirmed标签和OCR修订。新拒绝记录绑定内容与标签来源族/规范化版本，同族重跑抑制，旧rejected仅保留原证据范围，不扩大为所有模型永久拒绝。已确认关系不被AI拒绝删除。
- 新标签物理调用首轮最多并行1个；批量顺序执行。原综合路径的现有最多2批行为保持，同时共享可控输入/请求资源计数，不能新旧各自无限叠加。预处理有界字节/像素/临时内存准入，缺必需预算等待；用户自管模型内存不能假称受DAM硬限制。自动模型路由、驻留管理、遥测调优另轮实施。
- 新输入仍为兼容1024/JPEG85受控预览，不隐式扩大原件/区域范围。共享deadline与最多一次截断重试，不偷偷添加HTTP通用重试、SDK重试或静默fallback。超时可能已远端执行时显示outcome_unknown，恢复不自动重发。
- 关库先停止准入/撤销token，收敛已开始提交，再释放Host。重开只显示未完成意图；首次实现采用ask-on-reopen，同generation也要新session，成功项不再执行。
- UI复用已批准共享组件与DESIGN规范，只增加任务和结果所需状态，不以简化UI代替正式集成。视觉/交互与持久数据链分别验收。
- 原未提交修改不暂存/提交/回滚；技能中的默认commit不能覆盖项目保护规则。发布到GitHub另按明确授权，当前只存本地草案。

## Testing Decisions

主要通过现有控制器/Host产品意图接口驱动，观察提交回执、重新读取的素材投影、搜索结果、确认关系和恢复状态；不以私有表结构或字符串扫描充当行为验收。Provider使用有界合成响应，时钟/延迟可控；只有传输协议测试直接测试invokeOnce。
参考既有视觉传输测试、临时Managed库视觉集成、OCR存储保护与Host生命周期测试；数据库测试使用匹配Electron ABI的仓库启动器。正式Electron用生成素材和临时库验证Preload、Inspector、卡片、搜索/AI文件夹、取消与重启；不把前端mock当入库。
必须覆盖重复请求/不同payload、先发后到、同generation重开、旧claim、用户编辑并发、空/无效标签、截断/持续截断、提交后通知失败、预算等待、权限撤销、旧综合/反推兼容及已有OCR/笔记/工作集同库回归。
每张任务先形成能失败的真实行为测试，再实现到通过，执行相关类型检查/回归并审查diff与规格。整轮结束运行适用的生产测试集合；不能无差别运行会访问真实数据或启动未授权服务的套件。
真实模型质量与L1–L4分开：按会话已明确授权的目标/素材范围重新核对后执行，不重复索取相同授权，但不扩展到新库、新模型/新云地址。L5缺条件则明确NOT_RUN，不将合成结果升格。

## Out of Scope

自动后台三能力、自动云fallback/计费供应商接入、完整GPU遥测/Runtime自动安装、MLX/Windows优化、FTS/向量引擎、全应用GC、设计助手、主沙箱迁移、旧代码删除、Eagle真实接入、真实用户库迁移、开源/签名发布以及X阶段。
P02的Eagle检查顺序等无关修复独立保留，不能夹在标签功能内扩大范围。旧已批准Qwen测试不是本轮已经执行的证据。

## Further Notes

架构包只是目标，205个合成规格测试仅验证参考模型。ADR0141/0483原自动基线含Embedding，而新目标包基础三能力未包含它；本轮手动tags不会改变该条款，后续自动分析需明确替代范围，不能默默改写ADR。
已完整读取相关AI产品、自动分析和共享展示ADR；它们不授予真实素材、安装或schema操作权限。实施者导航和实际命令另放SOURCE-MAP，规格与任务避免依赖易漂移的源码行号。
本规格的测试边界及任务拆分待用户确认；确认后再发布获准任务或明确切换IMPLEMENT。父规格不得由拆票流程自动关闭。
