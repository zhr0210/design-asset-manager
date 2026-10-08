# 02 — 确认后保存独立标签任务，并在重开后查看

**Status:** revised-draft-awaiting-review；MODE=SPEC；未实施/未发布。

## Parent

首轮规格v1未改条款继续适用；冲突范围采用[当前契约补充](../ACTIVE-CONTRACT-ADDENDUM.md)与[替代索引](../SUPERSEDES.json)。

## What to build

用户可审阅单素材标签操作、明确存储升级后保存任务；暂未具备执行条件时如实等待，关闭重开仍可查看。

## Acceptance criteria

- [ ] 主窗口/卡片范围经正式Preload与Main检查；卡片不能查看其他素材。
- [ ] 迁移有精确版本登记、一致备份、空间/失败处理，普通读取不升级。
- [ ] 同requestId相同输入只有一个意图；不同payload拒绝；session/lease与持久generation分开。
- [ ] 新版程序对其升级后的已知目标profile必须保持原OCR/人工修订、Notebook、WorkSet、组织、下载/副本恢复可用并验证；旧二进制未知新profile安全拒写单列，不可替代新版兼容通过。
- [ ] 临时库关开后任务可见但零自动网络请求；不访问真实库。
- [ ] 相同libraryGeneration重开取得新hostSessionId/leaseIdentity；旧claim/attemptToken不能恢复授权，任务读取使用当前scope。

## 内部检查点

### 02A

- 最新工作区/profile及白名单核对
- 实际增量DDL/迁移ID/digest/版本分配依据
- 首写触发、备份校验/空间和提交失败语义
- 新版现有功能兼容矩阵与旧二进制拒写矩阵分开
- 代码模式回退与备份恢复数据损失说明

### 02B

- 获准IMPLEMENT范围内实现确认持久意图与重开读取
- 真实临时库执行迁移/事务失败/关开矩阵
- 现有能力保持可用而非统一安全拒绝



## Blocked by

01

## Testing

临时Managed库生命周期集成+最小正式Electron确认/任务读取；包含迁移回滚与旧profile拒写。

具体规则/最小反例/生产验收映射见[TEST-GATE-MATRIX](../TEST-GATE-MATRIX.md)。用户故事与标题保持原值；未经IMPLEMENT不得执行。
