# P12 高级反推Recipe与批量恢复（Proposed）

## Recipe/Profile
AdvancedReverseV1只请求prompt能力，attribution=creative，另附输入范围/recipe/profile来源；解释“再创作推演”，不能承诺恢复原始生成提示词。Recipe声明语言、主体/构图/材质/光照结构、完整JSON与非空字符串/长度限制、受控整体或显式区域输入。较长输出预算是新profile参数，不直接沿用或突破P03的1536→3072兼容策略；首个高级预算数值必须由限定模型/上下文基准批准，本轮配置candidateOutputLimit=null/disabled。
用户固定模型也须质量/资源/授权满足；不足进入waiting，不静默换小模型或云。Profile包含实际context、输出上限与输入token估计；unknown不能当可支持长输出。截断整次失败，可依冻结策略有界重试，旧有效prompt保留。

## 批次
prepareManualReverse固定selectionId、assetId+contentKey、用途/范围、模型选择、外发额度与恢复policy；run用新的clientRequestId生成每素材prompt Job。超出当前8素材兼容批量时采用有界分页计划，不能拿后续动态“所有素材”扩大既有审阅。
暂停/取消按P05；resume只续未完成引用，已成功条目只重读。素材内容变化不自动把新版本纳入旧批次，要重新审阅；同generation重开仍新session。远端unknown先核对，不复制请求。
与基础分析可共享当前已验证驻留模型/相同授权输入，但不强制一起执行，不自动创建tags/caption/OCR Job；合并physical需相同边界，取消订阅独立。P13公平调度避免手动大批饿死OCR/交互；优先级只是策略，不绕过资源。

## 结果复用与验收
采用prompt到用户草稿保持显式追加，目标CAS currentDraftRevision，冲突保留草稿，不模型完成即覆盖。搜索结果带creative来源，旧combined prompt仍由P04兼容读取。
本轮参考模型验证手动门槛、固定范围、已成功过滤、资源等待、截断保留与独立prompt任务。未来T04/T05/T07/T12需正式批次状态、临时库重开、长输出/不同上下文真实模型，以及权限/预算失败矩阵；均NOT_RUN。
局部Proposed决定：高级预算与基础配方分别版本化，先禁用未知预算profile；不以空配置假装可执行。回退保留结果与人工草稿，不重新生成旧请求。
