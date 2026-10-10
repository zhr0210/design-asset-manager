# 首轮当前契约补充 v2

**MODE=SPEC；Proposed / ready_for_review；未实施、未签收。** 本文件是本次修订后的首轮设计入口，限定替代关系见SUPERSEDES.json；“当前契约”指应采用的设计解释，不是当前生产能力。历史文件不改写。用户明确的默认三能力不再重新提问。

## AC-01 身份与认领

| 字段 | 唯一语义 / 所有者 | 变化与恢复 |
| --- | --- | --- |
| libraryIdentity / libraryGeneration | 持久库身份/控制代次，Host核对 | 普通重开可以不变，不承担会话令牌职责 |
| hostSessionId | 本次成功open生成的Host私有会话身份 | 每次open新建，绑定实际leaseIdentity，重开不恢复旧值为有效授权 |
| leaseIdentity | 实际独占锁实例身份 | acquire产生新值，只有held且绑定当前Host才可用 |
| requestGeneration | 同库/素材/content/能力的逻辑新请求序号 | force-rerun递增；相同请求重投不递增 |
| claimEpoch / attemptId | 同一逻辑请求的执行认领代次/实例 | 新attempt换ID、增加epoch，旧尝试失效；不是content版本 |
| attemptToken | 当前进程registry里的短时不可预测凭据 | 不持久恢复；DB内ID、epoch或hash都不是Bearer权限 |

提交先校验当前scope/lease/session，再查已提交效果回执；查已有结果不需要再次推理许可，但关闭后不持旧连接读DB。无回执的新效果必须同时满足requestGeneration、claim、内容、取消和输入绑定。重开以新session授权读取既有结果，旧attempt不可因此提交。[S-HOST/S-OPEN/S-LEASE；B-P05-CONTRACT 20–50]

本规则替代P04 CURRENT-SELECTION第7行对libraryGeneration/claimEpoch的混称、第11行activeLeaseGeneration歧义和第25行“重开新generation”的假设。采用P05 CURRENT-BASELINE纠正及Journal“claim的唯一权威”规则，保留P04关于失败留旧有效结果与旧claim拒绝的其余约束。[B-P04/B-P05-FACT]

## AC-02 首次新标签写入前的单写门槛（任务03）

任务03原有generation/session/claim/cancel防线全部保留，新增“新旧路径交叉验证后才能开新writer”门槛。范围包括当前正式综合analyze/reverse中产生的标签和新的tags-only，不恢复退休Worker。

切换屏障：停止这两个入口的新prepare/run准入→撤销未消费receipt→drain已开始的旧请求及短提交→初始化经过审阅的历史current种子→一次切换Host写模式。失败保持旧模式且不开新写；禁止影子双推理/双提交。新模式两入口都由同一Host事务边界控制tags current、代次和建议投影，旧storage直接写tags的路径不再绕过该规则。

新模式下每个新旧逻辑请求在发出前取得同一tags requestGeneration。迟到旧代次不得新增tags Evidence/建议效果或改current；新任务失败保留此前**已提交**有效标签，不复活旧在途响应。旧综合完整历史、caption/prompt/OCR保持各自原契约来源；不能用旧综合时间排序重新覆盖新tags current，不能将混合来源拼成新bundle。若兼容实现选择保留旧完整bundle作为历史，其标签字段只作历史数据，不是额外的独立tags Evidence/current/建议写入；必须有隔离断言，且不突破整条scope/content/cancel拒绝。

如果暂时无法证明旧综合与新tags同时运行可满足上述规则，则保持新写关闭，而不是把唯一writer补到任务04。04只消费已唯一化的current并完成搜索/确认/拒绝整合；无03↔04依赖环。[B-R01/B-T03/B-T04；S-WRITE/S-CURRENT]

## AC-03 最小共享准入（任务03，非完整资源平台）

所有者：Main唯一VisualAdmission实例；作用域：当前应用进程中正式综合与tags-only所有主窗口/卡片请求，permit绑定当前Host session。不是每控制器各一个计数器，也不是跨应用资源管理。OCR/下载等全应用协调仍归后续资源专题。

冻结可控制的规则：

| 维度 | 首轮契约 | 依据/未覆盖 |
| --- | --- | --- |
| HTTP物理请求槽 | 新旧共用总上限2；其中新tags最多1，重试仍在同一逻辑预算内 | 2取当前最多2个视觉批次、逐素材顺序执行的兼容并发基线；是提案上限，不是性能最优值 [S-RUN/S-EXEC] |
| 解码/转换槽 | 新旧共享一次最多1份解码/转换；等待时不先解码 | 首轮保守调度决定，不改预览格式语义；须合成生产测试 |
| 单份源预览 | 32MiB、视觉50M解码像素、1024/JPEG85白底兼容策略 | 当前源码值 [S-PREPARE]；Source Reader必须在分配前执行有界读取，现有readFile后检查不足以证明分配峰值 [S-READ] |
| 本地材料账 | 源buffer、正在转换的受控中间buffer、已冻结JPEG、序列化/base64副本都计入同一账 | 不能只数HTTP槽，也不能忽略多张receipt缓存 |
| request等待/取消 | 等待取消立即移队；已持buffer须实际释放/解除所有引用后释放该buffer预算 | abort Promise不等于底层停止分配；重复release无副作用 |
| 外部服务 | DAM只限制自己预处理与本地请求占用 | 不声称限制user-managed模型驻留/显存；未知远端执行保持P05 unknown |

任务03实施前必须形成版本化AdmissionProfile，填实`maxPreparedBytesPerReceipt`、`maxPreparedBytesTotal`、`maxLocalPreparationBytes`、`maxPendingReceipts`及解码/编码额外开销依据；本稿不造整机GB上限，数值未确定时**禁止开启新旧并存路径**。单份兼容上限与默认参数的字节/像素边界可沿用，但Sharp native缓存/临时分配需实测或受控实现证明，不把像素公式当进程RSS硬上限。

记账上界定义为source + 已冻结输出 + 序列化拷贝 + 已明确表示的raw中间区 + codec额外预算，全部先原子reserve、后物化。维度未知/估计失效→等待或受控拒绝，超额后停止新准入并记录误差，不能宣称事后检查预防了OOM。新旧路径均纳入；未消费review的冻结字节有TTL/owner撤销清理，waiting本身不持无界像素代理。

跨源和请求槽的申请不能持一部分无限等另一部分：先材料有界准入、释放解码槽，保留明确计费的JPEG再排请求；队列/receipt总量同样有限。HTTP结束/reader取消确认后才释放本地request槽；已发远端是否结束另列unknown，释放本地槽不得当外部内存归还。任务05只增加批次/混合负载验收，不首次补这一边界。[B-R02/B-P08/B-T05]

## AC-04 schema两检查点与兼容结论（任务02）

02A：基于届时真实源码重新确认已知profile、所有依赖白名单/DDL增量/索引/约束、下一版本分配、迁移ID/digest、首写触发、一致备份可验证性、空间峰值与恢复方案。当前源码已知1–8、DELETE/FULL，仅证明本次基线；本轮不预占v9。缺任一项不得转02B。

02B：在获准IMPLEMENT后实现“确认后持久意图”和正式读取；使用真实临时库验证迁移前/中失败、首写回滚、同generation关开、未知高版本旧程序拒写以及**新版对自己升级profile的现有功能保持可用**。

OCR及人工修订、Notebook、WorkSet、组织、下载/副本恢复分别有运行断言。旧二进制面对未知新profile安全拒写是通过条件；新版升级后让原本支持的能力整体不可用是兼容失败，不能以安全拒绝计PASS。确有产品限制需独立明确影响决定，不能用一条模糊例外完成02B。[B-R04/B-T02/B-SPEC 55；S-SCHEMA]

回退分为：兼容目标schema的旧功能模式；已验证一致备份恢复；不兼容旧二进制拒写。备份会丢失之后写入时必须披露差异与授权，不能称无损；代码回退不降user_version、不删用户增量。[B-P02/B-P04-CUTOVER]

## AC-05 关闭写入类别（任务03基础拒写；任务06完整恢复）

目标协调状态与实际Host状态分开：`accepting`→`suspending`（应用admission关闭、普通新业务撤权，但Host尚ready且lease held）→`quiescing`（调用Host.close，等待已开始操作）→`closed`。

| 操作 | accepting | suspending且Host仍ready | quiescing/closed |
| --- | --- | --- | --- |
| 新业务Evidence/标签/用户操作提交 | 当前scope/claim/content全部成立才可写 | 拒绝新业务写 | 拒绝 |
| 已开始同步DB事务 | 按事务边界完成 | 若事务已先于关闭屏障线性化则保留成功；不为异步旧claim续命 | 仅drain实际先开始工作，不开新事务 |
| 关闭协调记录 | 不作为普通公共入口 | 仅Host私有close-cycle许可，限pause/unknown/claim-revoke，不能插业务Evidence | 不得再走普通run补写；失败在重开核对 |
| 已提交效果重读 | 当前scope授权后只读 | 只有未关连接且明确保留的当前只读权限；不绕过Host实际状态 | 不读旧DB；可展示已授权内存快照，重开新scope后才能重新查询 |

duplicate效果检查也先校验当前scope，不允许closed commit借“已存在”回执 bypass。评审反例只证明P26参考模型没写该校验；真实Host有非ready拒绝，不能报告生产漏洞。[B-COUNTER；S-HOST/S-CLOSE]

## AC-06 后续公平性放行条件

P13有上限aging只是排序偏好，不是无饥饿证明。后续资源专题须选择明示保底规则：例如每K个可调度非临界dispatch机会至少1个后台配额，后台能力间轮转。保证前提：授权有效、任务持续eligible、预算在对应机会可满足、在途任务在有限时间归还机会、后台队列长度有界；无限pressure/无法取消长任务/权限缺失时不能保证完成。

在稳定M个eligible后台项和单次服务有界条件下，上述参考规则给出最多K×M个可调度机会内被选中的界；不是无限墙钟/绝对吞吐承诺。K/M生产上限待P13基准，当前小示例K=4只是反例对照，不写产品默认。首轮手动标签不实现完整公平调度，也不因该问题阻塞任务01。[B-P13/B-COUNTER]

## AC-07 已定产品答案与延期事项

默认基础目标为tags/caption/OCR；反推手动可批量；Embedding在明确启用语义检索且模型/资源/授权满足后成为独立任务。该目标仅替代旧ADR自动基线“Embedding默认启用”的范围，不废弃Embedding能力，不删历史向量/已有意图；后续P11/P17落实ADR变更和迁移策略。原ADR保留，状态见SUPERSEDES，不伪造新ADR Accepted。[B-REVIEW §5 REV-08；S-ADR]

P16分页失效风险、v8 reader最小复现、Eagle独立初始化复现登记于DEFERRED-REGISTER；不挪成任务01通用前置。v8 reader若进入任务02新profile兼容路径，必须有针对性回归结论，不能被全局“已知版本”表掩盖。
