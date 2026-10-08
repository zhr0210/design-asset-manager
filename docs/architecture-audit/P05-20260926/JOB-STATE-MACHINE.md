# 身份、状态机与重试

全部为Proposed。起点是P04每能力提交规则，不创建通用下载/Capture/图像工具队列，也不在本阶段启用自动后台分析。

## 四种身份与三个去重维度

| 身份 | 粒度 / 生命周期 |
| --- | --- |
| batchId | 一次明确素材/能力选择或未来后台扫描批；聚合状态由子Job推导 |
| jobId | 一素材×内容×能力×requestGeneration的逻辑工作；已成功或终结后不原地复活 |
| attemptId | 一Job的一次后端执行尝试；新尝试新ID/claimEpoch，保留前次结果状态 |
| physicalInvocationId | 一次真实Provider调用；可绑定多个兼容Job各自的attempt，初期不跨库 |

`clientRequestId`为某一入队操作的重投身份。库内唯一request记录保存canonical intent digest及原batch/jobs回执。相同ID+相同digest返回原回执；同ID不同scope/内容/能力/模式/选择策略digest为冲突。重复请求只做授权后的查询，不重复分配代次，也不重开取消任务。

`reuseKey`包含库身份、素材contentKey、能力、recipe选择策略及其版本、execution选择策略版本。仅用于reuse-valid/合并兼容在途Job，不作为实际模型输出缓存键；缓存还需实际Profile/输入digest/授权域。跨库不共享任务或缓存。批次可引用同一Job，需要batch_jobs关联；取消一个批次只撤销该批订阅，最后一个有效意图取消才取消共享Job。

`force-rerun`必须新的clientRequestId；在同一入队事务递增P04该能力requestGeneration，创建新Job、将旧在途Job设superseded并撤销旧claim。新一代失败也保留上次已提交证据，不允许旧在途Job夺回当前。显式重试failed_final/cancelled等终态同样新请求/代次，旧记录保留；自动有界重试只在未终结的同一Job内换attempt，不递增requestGeneration。

Journal保留有限大小的意图元数据，不存图片/base64、原始模型回复、密钥、cookie或原件路径。后台大批次的分页扫描/公平调度属于后续阶段；接口要求bounded page与稳定游标，不承诺百万任务驻内存。

## Job状态

| 状态 | 意义 / 可离开条件 |
| --- | --- |
| queued | 意图已持久；未证明当前可执行 |
| waiting_condition | 缺资源/模型/授权/预算/配置复核/输入/兼容schema；等待不是失败 |
| ready | 当前调度认为可尝试；不是持久授权，claim/send前仍复核 |
| running | 当前claim已绑定attempt，可能已开始物理调用 |
| validating | 当前attempt已收到完整响应，正在按能力校验；重开不凭该状态宣告成功 |
| committing | 仅事务内/进程内瞬态，不单独持久提交此状态 |
| retry_wait | 明确可重试失败且策略/次数/截止时间仍允许；nextEligibleAt仅调度提示 |
| paused | 用户暂停或关库中断；原意图保留，恢复须重新准入 |
| remote_outcome_unknown | 可能已发给远端、结果/费用不明；不得按普通失败无限重发 |
| succeeded | 已有同事务效果回执，可为成功空OCR或复用既有有效结果 |
| failed_final | 当前策略无进一步重试；已有有效证据保留 |
| cancelled | 用户取消，拒绝该Job未来结果；物理费用状态仍可独立unknown |
| superseded | 已被新的requestGeneration取代；不再参与当前结果竞争 |

主路径：queued → waiting_condition/ready → running → validating → committing → succeeded。
任意未提交Job可因关库paused或因取消cancelled；新内容/新代次使superseded。running/validating可retry_wait、failed_final或remote_outcome_unknown。只读调度无权将terminal改running。

批次展示计数：成功/失败/取消/被替代/等待/暂停/未知分别聚合；有成功且其他未成功显示partial，不能因一个标签成功报整批完成。没有活跃任务但存在remote_outcome_unknown时仍显示需处理，不伪装全完成。聚合计数不作为重复执行依据。

## Attempt与物理调用

Attempt记录claimEpoch、hostSessionId（审计值）、冻结recipe/profile/input摘要、开始/结束状态及脱敏reason。一个attempt最多绑定一个PhysicalInvocation；新网络尝试生成新attempt。一个physical可服务tags与caption的两个attempt，成本/资源只在physical层计一次。

P03的invokeOnce负责单次请求；1536→3072截断兼容重试由协调器生成第二attempt/physical，保持同一素材、服务、模型、输入与共享deadline，最大两次。P05不增加Provider内部重试、HTTP错误重试或切云。新策略如429退避须冻结版本和授权，不能从目标SEC-10直接改变旧transport。

完整物理响应的各Job可以先后独立提交；tags成功后caption失败不回滚tags。传输截断时所有订阅者均不能救片段。单Job取消从physical订阅中移除，仍有其他有效Job时不必取消底层；全部失效才发abort。重复用户意图的订阅与物理共享的订阅是两个层次，不能用同一引用计数误取消。

无论本地或远端，计时器到期/claim失效都不证明物理进程停止或资源释放；本地资源协调P08/P09以后负责核对，P05只提供in-flight/unknown信息。
