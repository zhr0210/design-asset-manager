# 06 — 重启后只恢复未完成标签任务

**Status:** revised-draft-awaiting-review；MODE=SPEC；未实施/未发布。

## Parent

首轮规格v1未改条款继续适用；冲突范围采用[当前契约补充](../ACTIVE-CONTRACT-ADDENDUM.md)与[替代索引](../SUPERSEDES.json)。

## What to build

关闭或进程中断后，用户在重新审阅范围与服务条件后继续未完成标签；成功项不重复推理，未知远端状态明确待核对。

## Acceptance criteria

- [ ] 同libraryGeneration重开也新session/claim，旧worker结果拒绝。
- [ ] 认领前后、发送意图后、提交前后故障分别按持久事实恢复，不伪造成功。
- [ ] Outbox重投刷新结果且不重跑模型；重复消费者不重复效果。
- [ ] provider/model/content/auth变化要求重新核对；unknown结果不能通过暂停/恢复绕过。
- [ ] 热日志/损坏库保持安全恢复要求，不删sidecar来让测试过。
- [ ] 完整恢复验证区分关闭前私有pause/unknown记录、普通业务提交、旧DB关闭后拒读、新会话合法回执重读；不能一律禁止关闭前协调写，也不能允许close后新效果。

## Blocked by

05

## Testing

临时库+测试拥有的进程进行崩溃切点与正常重开；正式Electron重启恢复，不终止用户服务。

具体规则/最小反例/生产验收映射见[TEST-GATE-MATRIX](../TEST-GATE-MATRIX.md)。用户故事与标题保持原值；未经IMPLEMENT不得执行。
