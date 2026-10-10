# 02 — 确认后保存独立标签任务，并在重开后查看

**Status:** draft-awaiting-breakdown-approval；未发布。

## Parent

第一轮独立标签分析实施规格，当前待审。

## What to build

用户可审阅单素材标签操作、明确存储升级后保存任务；暂未具备执行条件时如实等待，关闭重开仍可查看。

## Acceptance criteria

- [ ] 主窗口/卡片范围经正式Preload与Main检查；卡片不能查看其他素材。
- [ ] 迁移有精确版本登记、一致备份、空间/失败处理，普通读取不升级。
- [ ] 同requestId相同输入只有一个意图；不同payload拒绝；session/lease与持久generation分开。
- [ ] 新schema下原OCR/笔记/工作集/下载等同库能力回归或安全拒绝规则明确，不凭标签通过放行。
- [ ] 临时库关开后任务可见但零自动网络请求；不访问真实库。

## Blocked by

01

## Testing

临时Managed库生命周期集成+最小正式Electron确认/任务读取；包含迁移回滚与旧profile拒写。

用户故事：2, 3, 4, 5, 13, 18, 19, 20, 24, 28。实施只限本票完整行为；上游结果未验收不能凭文件存在跳过依赖。
