# P18 SearchPlan、融合与解释（Proposed）

## 搜索计划
SearchPlan={queryKind:text|image|region,scope,filters,lexicalBranch,vectorBranch?,deadline,branchBudgets,rerank?}。文本默认词法可独立完成；向量编码器/预算不足可降级，branchStatus明确，不把无向量当无结果。图像/区域查询使用P06InputGrant和变换来源；修改输入使原plan失效，禁止传任意原件路径。
每分支在授权库/集合/Trash过滤下产生bounded候选及真实trace，合并前后复核内容revision和权限。排序若用户明确按时间/名称，则过滤与该排序优先，不擅自改相关度。有限时间内可先返词法，后续更新有queryId/planRevision，不让迟到上一查询覆盖新查询。

## 融合ADR
候选采用排名融合RRF基线（sum weight/(k+rank)），不用BM25/余弦原始值直接相加；k/权重是实验参数，不是已优化默认。缺分支仅按可用分支排序并标降级，重复ID合并但保留各自命中来源；同分用稳定assetId。可选reranker只重新排列已授权候选，输出不得新增ID/说明为事实。过期rerank/预算超时回基线，不阻塞普通查询。

## 解释格式
HitEvidence={branch,fieldKind,evidenceRef|overlayRef,contentRevision,matchedRange?,ocrRegionRef?,vectorSpace?,indexGeneration?,rank}。词法说明来自当前真实字段和offset；OCR坐标仅在P06变换可证时展示；AI标签与confirmed标签分别标注。向量分支只说“视觉/语义相似”，不生成“画面有某物”的确定断言；similarity不是事实置信度或百分比准确率。
query没有永久创作档案身份；只有显式保存搜索/加入工作集才生成用户持久意图，输入图片缓存沿P19受控生命周期。

## 评测集与结果边界
拟建立固定中文设计标注集：颜色/风格/主体/字体/OCR短词/版式/反推用途/否定条件，每类标注相关ID、无关反例、真实命中来源和授权范围。开发与验收集分离；词法/向量/混合各跑Recall@K、nDCG、解释来源正确率/过时率、P95及降级率。当前合成列表只能测融合/过滤，不能给出真实Recall或质量数字。
可执行模型验证RRF同分、单分支、拒绝未授权、全部失败退空降级；未来T02/T15/T16/T17/T23再做真实编码器/索引/正式界面。S15/S21沿P16/P17已核对资料，不继承外部系统排名。
拟改Host QueryPort与shared evidence契约，Renderer复用现有命中说明组件，模型不生成任意查询SQL。
