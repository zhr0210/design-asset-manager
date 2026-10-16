# 有效详细规格与目标

这些契约来自已确认的决定/原规格，**不以源码存在或文档整理宣称已交付**。实现状态逐能力查CURRENT-STATE；当前明确任务看TASK。Proposed保留待确认状态，不能因重新编排变成Accepted。实际用户/设计新决定仅替代明确范围。

原Spec-candidate ADR详细正文已按能力集中提炼；段落标识和映射保全全部字句/数字/例外。未迁出ADR继续作为决定/契约来源，不重复抄写。原产品规格、交互规格仍由[产品目录](../README.md)导航，不被本集合全局覆盖。

| 决策范围/主题 | 详细要求 | 当前系统入口 |
| --- | --- | --- |
| 0001–0008 平台与执行边界 | 本组保留在ADR正文 | [platform-release](../../subsystems/platform-release.md) |
| 0009–0039 工作台与导航 | [详细契约](workspace.md) | [asset-workspace](../../subsystems/asset-workspace.md) |
| 0040–0076 筛选、审查与回收站 | [详细契约](review-trash.md) | [library-lifecycle](../../subsystems/library-lifecycle.md) |
| 0077–0104 批量操作与冲突 | [详细契约](batch-conflicts.md) | [organization](../../subsystems/organization.md) |
| 0105–0118 Candidate与入库 | [详细契约](capture.md) | [storage-intake](../../subsystems/storage-intake.md) |
| 0119–0150 预览、颜色与分析证据 | [详细契约](preview-analysis.md) | [ai-analysis](../../subsystems/ai-analysis.md) |
| 0151–0167 模型与扩展生命周期 | [详细契约](model-extension.md) | [model-library](../../subsystems/model-library.md) |
| 0168–0180 渐进分析与资源 | 本组保留在ADR正文 | [ai-analysis](../../subsystems/ai-analysis.md) |
| 0181–0184 解释检索与临时查询 | 本组保留在ADR正文 | [asset-discovery](../../subsystems/asset-discovery.md) |
| 0185–0222 备份、模型信任与安装 | [详细契约](backup-trust.md) | [model-library](../../subsystems/model-library.md) |
| 0223–0255 模型存储与清理恢复 | [详细契约](model-storage-lifecycle.md) | [model-library](../../subsystems/model-library.md) |
| 0256–0274 存储清理结果与可访问导航 | [详细契约](storage-review.md) | [model-library](../../subsystems/model-library.md) |
| 0275–0291 资料库身份与存储角色 | [详细契约](library-storage.md) | [library-lifecycle](../../subsystems/library-lifecycle.md) |
| 0292–0300 添加素材与来源保护 | 本组保留在ADR正文 | [storage-intake](../../subsystems/storage-intake.md) |
| 0301–0334 引用源操作与恢复 | [详细契约](referenced-operations.md) | [storage-intake](../../subsystems/storage-intake.md) |
| 0335–0350 Copy与复合原件 | [详细契约](compound-originals.md) | [storage-intake](../../subsystems/storage-intake.md) |
| 0351–0370 归属转换与元数据写回 | [详细契约](writeback.md) | [storage-intake](../../subsystems/storage-intake.md) |
| 0371–0382 元数据便携与合并 | [详细契约](portability.md) | [organization](../../subsystems/organization.md) |
| 0383–0412 导出、交付与性能 | [详细契约](export.md) | [media-handoff](../../subsystems/media-handoff.md) |
| 0413–0414 搜索优先组织 | 本组保留在ADR正文 | [organization](../../subsystems/organization.md) |
| 0415–0439 自定义字段与迁移 | [详细契约](custom-fields.md) | [organization](../../subsystems/organization.md) |
| 0440–0457 文本字段、检索与编辑 | [详细契约](custom-text.md) | [organization](../../subsystems/organization.md) |
| 0458–0464 数字字段、显示与精度 | [详细契约](custom-number.md) | [organization](../../subsystems/organization.md) |
| 0465–0471 手工编辑撤销与内存 | [详细契约](manual-undo.md) | [organization](../../subsystems/organization.md) |
| 0472–0481 布尔与缺失字段初始化 | [详细契约](missing-initialization.md) | [organization](../../subsystems/organization.md) |
| 0482–0493 现行核心、双端与原生取舍 | 本组保留在ADR正文 | [local-host](../../subsystems/local-host.md) |

修改契约前核对其来源、相互引用和明确替代范围。原文中的“当前项目没有/本次不运行”单独列为来源时代上下文，不当成长期禁令或当前事实。未来Custom Fields、复杂源操作/导出等依旧是目标，不扩张本次开发范围。
