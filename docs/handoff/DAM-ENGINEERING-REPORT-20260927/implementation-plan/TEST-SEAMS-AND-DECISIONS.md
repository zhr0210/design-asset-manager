# 测试边界与范围确认稿

## 主要入口

以当前Visual AI控制器调用Active Library Host的产品意图为主要行为测试边界。Provider/时钟在内部注入；真实临时库负责验证事务、代次、回执与用户状态。少量单次transport测试验证有界HTTP/完整JSON，正式Electron测试验证sender/Preload/UI实际展示。
这比为每张新表或每个私有辅助函数创建测试接口更接近用户行为。纯规格模型只可作预期来源，不能作为实施验收替身。

## 本轮决策与未批准部分

- 范围：Managed库、手动标签、1–8素材、主窗口及当前素材卡片；新tags物理并行1，服务已配置/外发逐动作审阅；不安装模型。
- schema：现行最高已知v8；候选下一版本必须开工复查和集中登记，未占用版本。首个确认持久意图触发升级；纯读不升级。
- 单写：新旧标签current更新必须同一Host规则；旧综合响应的caption/OCR/prompt保持原契约，新summary不伪造bundle。
- 恢复：ask-on-reopen；重新核对权限、内容、服务、预算，旧token不能复活。
- 质量：新标签最多8；语言/语义判定分离结构合法，质量实测后再签收。
- 真实资源：用户自管服务的物理驻留不是DAM硬预留；第一轮有界准入不假装完成P07–P09全平台治理。
- 执行模式/发布：当前仍SPEC。尚未明确IMPLEMENT；未创建远端Issue、提交代码或更改根TASK。

## 需要确认的原因

用户本轮要求按此前建议顺序推进，允许完成规格和任务草案，但未具体审核这些测试边界/任务粒度。
`to-spec`要求“Check with the user that these seams match their expectations.”；`to-tickets`要求“Iterate until the user approves the breakdown.”。因此先交付本可审结果，再一次确认边界/拆分；不把既有“按顺序”冒充对尚未展示细节的签收。
仓库issue-tracker说明技能发布步骤不自动提供远端修改权限。本轮先本地草案；若需要GitHub发布需明确目标范围授权。实施技能的commit默认同样不覆盖AGENTS对已有未提交工作保护。
