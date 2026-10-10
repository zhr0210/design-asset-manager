# 06 — 重启后只恢复未完成标签任务

**Status:** draft-awaiting-breakdown-approval；未发布。

## Parent

第一轮独立标签分析实施规格，当前待审。

## What to build

关闭或进程中断后，用户在重新审阅范围与服务条件后继续未完成标签；成功项不重复推理，未知远端状态明确待核对。

## Acceptance criteria

- [ ] 同libraryGeneration重开也新session/claim，旧worker结果拒绝。
- [ ] 认领前后、发送意图后、提交前后故障分别按持久事实恢复，不伪造成功。
- [ ] Outbox重投刷新结果且不重跑模型；重复消费者不重复效果。
- [ ] provider/model/content/auth变化要求重新核对；unknown结果不能通过暂停/恢复绕过。
- [ ] 热日志/损坏库保持安全恢复要求，不删sidecar来让测试过。

## Blocked by

05

## Testing

临时库+测试拥有的进程进行崩溃切点与正常重开；正式Electron重启恢复，不终止用户服务。

用户故事：18, 19, 20, 21, 27, 28。实施只限本票完整行为；上游结果未验收不能凭文件存在跳过依赖。
