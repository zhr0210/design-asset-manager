# 03 — 单素材标签分析成功后形成可读取的持久建议

**Status:** revised-draft-awaiting-review；MODE=SPEC；未实施/未发布。

## Parent

首轮规格v1未改条款继续适用；冲突范围采用[当前契约补充](../ACTIVE-CONTRACT-ADDENDUM.md)与[替代索引](../SUPERSEDES.json)。

## What to build

用户运行单素材标签任务，完整有效结果经Host提交后在原Inspector显示；失败、取消和通知丢失不清空旧结果。

## Acceptance criteria

- [ ] P03新Recipe与Profile冻结，受控输入/有界预算与已授权服务执行；缺条件进入waiting。
- [ ] Evidence/current/Job/回执/Outbox一次事务；重复结果只生效一次，不同payload冲突。
- [ ] 开始就具备requestGeneration、当前session/claim与cancel写前检查，不能把安全防线推迟到后续票。
- [ ] 模型输出仅写AI建议，不改变caption/OCR/prompt/confirmed用户状态。
- [ ] 完整性拒绝残片、空数组按配方表达；远端可能已执行的超时不盲重发。
- [ ] 首次新写前停止新旧视觉准入、撤销旧receipt、drain在途旧提交，切至唯一Host tags writer/current；正式综合路径与tags-only共用代次/效果规则，禁止双发或双写。
- [ ] 交叉路径验收：旧综合先发新标签后发，新标签先完成时旧响应不能夺回current；新标签失败仅保留此前已提交结果，不复活旧在途。历史bundle保持来源，不伪造混合结果。
- [ ] 首次并存前新旧路径共用Main最小准入：HTTP总槽上限2/新tags最多1、预处理槽1、冻结字节总账和有界等待/取消/释放；任务03必须用生产合成夹具确定有限AdmissionProfile参数，未知值禁止新写开启，不声称控制外部服务显存。
- [ ] 同libraryGeneration重开旧session/claim拒绝；closing屏障后拒绝新业务效果，关闭前私有协调记录与已提交效果只读须按AC-05区分，不用closed重复回执绕过授权。

## Blocked by

02

## Testing

产品意图→合成Provider→真实临时SQLite→Inspector重读；取消、源变化、通知失败及预算失败注入。 必须先通过G01/G02交叉路径及共享准入；现有generation/session/claim/cancel断言保留。

具体规则/最小反例/生产验收映射见[TEST-GATE-MATRIX](../TEST-GATE-MATRIX.md)。用户故事与标题保持原值；未经IMPLEMENT不得执行。
