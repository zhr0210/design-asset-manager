# 05 — 有界批次、强制重跑及乱序结果保护

**Status:** revised-draft-awaiting-review；MODE=SPEC；未实施/未发布。

## Parent

首轮规格v1未改条款继续适用；冲突范围采用[当前契约补充](../ACTIVE-CONTRACT-ADDENDUM.md)与[替代索引](../SUPERSEDES.json)。

## What to build

用户手动选择1–8素材批量标签分析，独立显示成功/失败/等待；重跑新意图不会被旧任务迟到覆盖。

## Acceptance criteria

- [ ] 范围冻结，重复点击不新增代次；force-rerun才产生新requestId/代次。
- [ ] 基于任务03已生效的共享准入扩展1–8批次与混合压力测试：新tags最多1、新旧总槽2、预处理/保留字节预算不超，等待取消和重复释放可验证；不是此票首次增加准入。
- [ ] 一个素材失败不撤销其他已成功结果；取消只阻止未提交任务。
- [ ] 两请求先发后到、取消/commit竞争、scope切换均保留用户最新意图。
- [ ] 进度与当前有效结果分开，旧成功在重跑失败时继续可用。

## Blocked by

03

## Testing

可控延迟合成Provider+临时库并发故障，正式批次进度与取消；不跑高负载真实基准。

具体规则/最小反例/生产验收映射见[TEST-GATE-MATRIX](../TEST-GATE-MATRIX.md)。用户故事与标题保持原值；未经IMPLEMENT不得执行。
