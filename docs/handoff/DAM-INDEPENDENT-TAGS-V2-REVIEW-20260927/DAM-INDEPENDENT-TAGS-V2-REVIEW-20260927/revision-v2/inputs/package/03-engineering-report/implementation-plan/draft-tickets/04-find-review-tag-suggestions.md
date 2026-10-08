# 04 — 标签建议可检索、分类、确认与拒绝

**Status:** draft-awaiting-breakdown-approval；未发布。

## Parent

第一轮独立标签分析实施规格，当前待审。

## What to build

新建议立即用于现有搜索与AI文件夹；用户确认/拒绝后所有正式表面一致更新，旧综合证据继续可读。

## Acceptance criteria

- [ ] AI建议和confirmed关系独立，只有显式确认增加用户关系。
- [ ] 拒绝按内容/来源族生效，同族重跑不立即重复；旧拒绝不被错误扩大。
- [ ] 新标签和旧caption/OCR/prompt保持各自来源，不生成假的综合Evidence。
- [ ] 新旧入口更新current标签只有一个权威，切换前drain；原卡片/Inspector共享展示。
- [ ] 确认、拒绝、搜索与分类在临时库重开后保持一致，删除/复制素材零副作用。

## Blocked by

03

## Testing

Host用户决定与纯检索投影对照，正式Electron搜索/AI分类/卡片权限回归。

用户故事：7, 8, 9, 10, 24, 25。实施只限本票完整行为；上游结果未验收不能凭文件存在跳过依赖。
