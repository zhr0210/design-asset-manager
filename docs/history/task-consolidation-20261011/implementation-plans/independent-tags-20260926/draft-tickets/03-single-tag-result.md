# 03 — 单素材标签分析成功后形成可读取的持久建议

**Status:** draft-awaiting-breakdown-approval；未发布。

## Parent

第一轮独立标签分析实施规格，当前待审。

## What to build

用户运行单素材标签任务，完整有效结果经Host提交后在原Inspector显示；失败、取消和通知丢失不清空旧结果。

## Acceptance criteria

- [ ] P03新Recipe与Profile冻结，受控输入/有界预算与已授权服务执行；缺条件进入waiting。
- [ ] Evidence/current/Job/回执/Outbox一次事务；重复结果只生效一次，不同payload冲突。
- [ ] 开始就具备requestGeneration、当前session/claim与cancel写前检查，不能把安全防线推迟到后续票。
- [ ] 模型输出仅写AI建议，不改变caption/OCR/prompt/confirmed用户状态。
- [ ] 完整性拒绝残片、空数组按配方表达；远端可能已执行的超时不盲重发。

## Blocked by

02

## Testing

产品意图→合成Provider→真实临时SQLite→Inspector重读；取消、源变化、通知失败及预算失败注入。

用户故事：1, 3, 4, 6, 10, 11, 12, 17, 21, 22, 23, 27。实施只限本票完整行为；上游结果未验收不能凭文件存在跳过依赖。
