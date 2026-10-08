# 兼容读取、单写切换与P02交接

Proposed，schema版本号 **未分配**。增量登记提案保存在本阶段 `manifests/MIGRATION-ADDENDUM.proposed.json`；只引用P02原登记，不修改前序交付，不谎称已合入或已批准。

## 旧证据投影

| 原来源 | 虚拟稳定引用 / 能力 | 保留 / 不可推定 |
| --- | --- | --- |
| visual_ai_evidence | tagged ref `{kind:legacy-visual,id,capability:tags/caption/prompt/ocr}` | 保留原id/model/backendId/purpose/inputSha256/preview/时间与recipe字面量；不生成新DB行，不补新recipe digest/requestGeneration |
| 旧visual tags/caption | inferred，按原当前匹配/排序种子 | 值结构通过兼容验证；语言/事实质量not-assessed；空caption仍保留原ai_caption列行为 |
| 旧visual prompt | creative；无论原purpose=analyze或reverse | 历史可读不等于新基础任务可以继续默认生成prompt |
| 旧visual ocrText | legacy-inferred-text，不具备专用OCR blocks/坐标 | 非空可做既有回退；空只表示旧字段为空，不能认定“已完成专用OCR且无文字” |
| asset_ocr_evidence + asset_ocr_state | `{kind:legacy-ocr,id,capability:ocr}`；state指针为种子 | 保留模型hash/观测/有效空值/edited_text/状态revision；不把elapsedMs当整任务耗时；原修订基准unknown |
| assets人工描述 / asset_tags | 复用原人工字段/confirmed关系 | 不转换为AI归因，不丢空字符串，不重建既有tagId |
| tag_suggestions rejected | 原evidence和精确标签范围 | 不编造跨模型拒绝来源，不宣称正式reject入口已存在 |

虚拟ref为判别对象，不用简单字符串拼接冒碰撞风险；跨库/素材校验在Host，旧模型正文视数据，不能触发工具调用。

旧visual列表JSON可能损坏：只读适配返回该记录unavailable与本地脱敏reason，继续展示其他能力/记录；不能救出损坏JSON标签。为避免兼容审查偷换现状：现行readVisualAiEvidence会直接JSON.parse，摘要query选中坏行后返回undefined，不自动扫下一条。新降级策略是待审改进；选择器首次legacy seed保持原选中行，损坏时不偷偷把更早行称为原current。

## 最小增量集合

1. `analysis_evidence`：追加本阶段四能力值，unique效果键，库内外键及索引。
2. `analysis_capability_state`：内容/能力代次、活跃claim与auto引用、selectionRevision；不承担P05队列。
3. `analysis_user_decisions`：仅新增拒绝范围/固定引用/可证明的OCR修订关联等当前表缺失语义。人工描述/confirmed标签原权威继续复用，不能同义复制整套用户表。

逻辑外键(ref可指legacy或new)不能假设一个SQL FK能指两张表；新表引用用FK，legacy引用由受控判别列+Host复核和迁移后审计保证。任何物理删除与级联策略要单独对齐Trash/Permanent Delete，P04不新增清理器。

P02采用inspect→plan→review→backup-verified→同步DDL/首写→verify。升级计划明确from profile、to profile（待分配）、feature `independent-analysis-evidence`、最低读写者、实际DDL digest、备份覆盖、旧行保留。普通读取不得建表。不能在v8精确profile下偷偷加表而不更新版本/inspection。

## 切换步骤（未来IMPLEMENT门槛）

- A：先接无副作用兼容读与纯validator/selector合成验收；生产仍旧写。新shape没有完全适配旧调用方前不能开放独立新写。
- B：P02批准增量并通过临时库升级/旧版拒写测试；关闭该库的分析准入，撤销prepare receipts，drain旧任务和Host in-flight。该屏障由外层协调，不等待自己持有的事务。
- C：持lease完成迁移、旧当前种子/现有人工状态核对；同一库写模式选定为新。旧IPC可保留，但其确认运行也通过兼容Adapter转唯一Host writer。旧存储函数不再生产调用；禁止一边写旧综合表一边写新能力表作为两个current。
- D：旧VisualAiEvidence/results仍读取原综合历史。新独立结果走additive `analysisSummary`/新结果契约，旧bundle API不拼接来自不同模型/时间的字段伪造一条VisualAiEvidence。Inspector/词法搜索/AI文件夹须同时消费逐能力引用；旧客户端不支持则限制新功能，而非静默丢掉成功结果。
- E：OCR旧read/correct入口适配统一effective与CAS；保留旧返回约定、revision/session检查、空值和reset语义。兼容快照可在同一权威事务更新派生缓存，但不是第二写口。新区域修订暂不暴露。

如果P05未实施，P04只能提供手动执行下持久结果与请求防护，不宣称任务崩溃续跑。P05随后接入时，Evidence、Job成功和Outbox需同事务；单写切换必须覆盖上述两个控制器，不能只换visual留下OCR覆盖层双权威。

## 回退

本轮只有文档，无数据回退。未来新写开启前可关闭功能返回原实现；开启后旧二进制对新schema必须拒写，不能改user_version降级。可回退到兼容新schema的旧功能模式，并保留新Evidence/用户决定；投影切回前比较各能力有效值、有效空、固定/拒绝/修订，存在无法表达状态则禁止无损回退声明。

备份恢复与代码回退分开；旧备份不能覆盖后来人工更改。确需恢复时先披露将丢失的后续结果/用户状态并按范围授权。Eagle索引及Legacy永远不能使用该Managed迁移；不改原件/Preview/Variant所有权。
