# AI材料三层行为验收：2026-10-15

用户采纳三层标准及不达标修正闭环。唯一方法正文为CONTRIBUTING的document-retrieval-validation章节；开发规范与工程专题保持简短引用，不新增产品ADR或领域术语。

- baseline.json / before：本轮四个文件的原字节，保全既有WIP。
- criteria.json：派发前依据已确认要求确定的独立判据。
- candidate.json：固定第一方文本候选及排除范围；不向代理提供评分、旧回答或检查点。
- dispatch.json：简短自然任务、工作区和只读边界原文。

## 结果

主Agent已核对实际工具调用/返回正文及最终回答，四项场景在本次范围内通过，逐层依据与局限见[evaluation.json](evaluation.json)，身份/设置见[probe-sessions.json](probe-sessions.json)。全部尝试及原始可观察工具轨迹保留在trace.json，不含隐藏思维；最后一项另有dispatch-attribution.json，不给代理评分或阅读提示。

- [规范精简计划](quality_maintenance.response.md)：自主消费三层标准与失败闭环，按职责保全、分批迁移，并把既有摘要漂移问题转成检查。
- [四次测试如何收尾](quality_closure.response.md)：拒绝只取最后成功，要求归因与新候选复验，关键缺口不能关闭。
- [纯排版边界](quality_format.response.md)：只做适用结构/差异检查，不机械追加行为Agent。
- [普通回答如何归因](quality_attribution.response.md)：先取得具体错误证据，再区分材料、任务、工具与Agent判断，不靠堆全局约束迎合答案。

部分批量读取仍有截断，必要条款在实际返回中可见，未把调用请求冒称全部已读。本次只验证协议可发现、可理解和用于计划；未人为造错并执行修改演练，不保证所有未来材料优质。没有关键误判需修改，因此不进行无依据重跑。

[candidate-integrity.json](candidate-integrity.json)确认2632份固定文本与本地正文无漂移；TASK及检查点在排除范围内，收尾可更新。方法/规范/工程职责差异见changes.diff，结构及显式路径同步检查见[checks.json](checks.json)。只改四个文档及本任务证据，不运行产品、UI、模型或服务，不操作资料库，不提交/推送/发布。
