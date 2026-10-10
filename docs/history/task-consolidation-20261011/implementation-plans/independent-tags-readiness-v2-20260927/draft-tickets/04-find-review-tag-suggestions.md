# 04 — 标签建议可检索、分类、确认与拒绝

**Status:** revised-draft-awaiting-review；MODE=SPEC；未实施/未发布。

## Parent

首轮规格v1未改条款继续适用；冲突范围采用[当前契约补充](../ACTIVE-CONTRACT-ADDENDUM.md)与[替代索引](../SUPERSEDES.json)。

## What to build

新建议立即用于现有搜索与AI文件夹；用户确认/拒绝后所有正式表面一致更新，旧综合证据继续可读。

## Acceptance criteria

- [ ] AI建议和confirmed关系独立，只有显式确认增加用户关系。
- [ ] 拒绝按内容/来源族生效，同族重跑不立即重复；旧拒绝不被错误扩大。
- [ ] 新标签和旧caption/OCR/prompt保持各自来源，不生成假的综合Evidence。
- [ ] 复用任务03已验收的唯一tags writer/current及切换屏障；此票只增加用户决定/检索分类与共享展示整合，不延后03门槛，不增加03依赖04。
- [ ] 确认、拒绝、搜索与分类在临时库重开后保持一致，删除/复制素材零副作用。

## Blocked by

03

## Testing

Host用户决定与纯检索投影对照，正式Electron搜索/AI分类/卡片权限回归。

具体规则/最小反例/生产验收映射见[TEST-GATE-MATRIX](../TEST-GATE-MATRIX.md)。用户故事与标题保持原值；未经IMPLEMENT不得执行。
