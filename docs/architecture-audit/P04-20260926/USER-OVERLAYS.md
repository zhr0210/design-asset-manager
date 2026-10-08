# 用户覆盖与决定

Proposed。用户状态单独有revision/CAS，不嵌入可被模型重跑替换的Evidence；旧用户表在切换前仍是唯一权威。不能同时更新旧列与新Overlay而没有同一事务和明确所有者。

## 描述

人工描述保存 `{text, revision, source:user}`；text=""表示明确清空，不是无覆盖。重跑默认不解除覆盖、不重写文字。为兼容当前“允许AI更新”，保留单独动作：释放编辑锁但保持当前文字，直到下一条eligible且允许选用的caption提交；它不同于“立即采用所选AI描述”。迁移时保存legacy-retained-text基线，避免解除锁定时瞬间显示另一段。

允许AI更新、立即采纳某Evidence、保留手工并重跑、固定某Evidence是四种独立意图；新动作需公共契约评审，不能改名后偷偷合并。编辑与AI同时完成：事务读取最新Overlay；AI可保留为建议，但人工effective不变。两个编辑窗口使用expectedOverlayRevision，冲突留草稿，不last-write-wins。

检索默认继续包括当前人工描述与不同的当前AI描述，但命中说明分别标“用户描述/AI画面描述”；不检索所有被替换的历史作为当前。用户清空人工字段仍保留空覆盖；是否另行隐藏AI检索是独立用户决定，不从空串推断。

## 标签

ConfirmedTag继续复用asset_tags/manual/confirmed关系；AI新成功仅形成建议，不写用户确认。确认、移除确认、拒绝建议是不同操作；用户拒绝AI建议不删除已确认关系。用户显式再确认相同来源建议时可在同事务解除该拒绝，必须能说明影响。

新拒绝记录提案：`assetId + contentKey + normalizedLabel + sourceFamily + normalizationVersion`，内容级、来源族级生效；sourceFamily是能力/Recipe族的稳定ID，不能用每次随机evidenceId或模型别名拼成永远新来源。同族模型换小/重跑/配方修订仍抑制；跨族不擅自扩大拒绝，需有明确来源提示。用户可显式撤回，清空模型缓存/强制重跑不会撤回。

新身份规范化候选 `label-key-v1 = trim → NFKC → locale-independent lower-case`，不移除中文标点、不做同义词合并。验证标签原始UTF-16长度在规范化之前；规范化后为空/冲突有明确错误或去重策略。该算法与现有确认toLocaleLowerCase存在差异，因此只是待审新规范，不重命名/合并既有tagId。

旧rejected仅能投影为对应evidence+精确label范围；历史未记录sourceFamily，不能自动扩大到全部未来模型。旧confirmed使用现有tagId/关系，不根据新规范化重建。对于新拒绝，raw label仍可在历史详情看来源，但不进入当前AI分类/默认建议搜索；已确认同名标签仍可正常检索。

## OCR

当前实现保护的是整段修订；本设计第一步也保留whole-text覆盖，新增独立基准引用以免每次重跑丢失其历史来源。`editedText:null`表示没有覆盖，`editedText:""`表示明确无文字；用户修订为null是显式恢复使用模型结果，不由重跑触发。

新Overlay记录baseEvidenceRef、contentKey、inputArtifactDigest、revision、text。相同内容重跑时修订有效且baseEvidenceRef不改成新证据，raw新结果可以独立保存/查看。不同内容/输入变换无法证明等价时不自动迁移，旧修订归档并提示needs-review；显式批准后才能建立新修订关联。

历史v8只有edited_text+当前evidence_id，若已有重跑，最初人工修订基准无法还原。投影保存文本、当前状态revision与currentEvidenceRef，`originalCorrectionBase:unknown`；不伪造关联。相同sourceRef可保留原有整段覆盖兼容；以后新编辑才建立可证明的新基准。旧异sourceRef修订按既有OCR_EDITED_SOURCE_CHANGED阻止自动新写，直到用户显式解决，不以迁移为由丢弃。

区域级修订未来必须使用旧evidenceId/regionId、坐标空间/变换；数组下标不是跨模型稳定身份。新模型500块变成200块不能按index逐项套旧文字。本阶段不交付自动对齐算法。

## 状态树（目标）

```text
Asset用户状态
├── 资产级：手工描述、确认标签（内容变化不自动删除）
├── 内容级：拒绝建议、OCR修订、固定证据意图
│   ├── content适用 → 正常生效
│   └── 不适用 → 保留历史并提示复核，不套给新内容
└── 组织/笔记/工作集：沿原领域权威，不随AI schema迁移重建
```

库关闭/切换使写入scope失效；内存草稿交由原UI保留规则，P04不承诺跨崩溃保存未提交草稿，也不重画界面。
