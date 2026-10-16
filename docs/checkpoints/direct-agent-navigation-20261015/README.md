# AI开发入口职责归位

2026-10-15用户明确采纳：取消独立文档总入口层级，AGENTS直接按任务导航正文，文档维护方法归CONTRIBUTING，子系统目录保留。根README用于产品介绍、运行和必要开发链接。

## 具体变更与内容去向

| 原入口/内容 | 现在的归属 |
| --- | --- |
| docs/README.md的问题→权威→写回表 | AGENTS已有对应任务行；产品、机制、目标、设计、方法、状态、反馈、术语/取舍直接指向正文；补历史/交接的按需入口 |
| 文档读取链、迁移保全、目标/现状、无正文循环链接等方法 | CONTRIBUTING第7节；没有丢弃有效要求 |
| 根README中的详细开发导航表与工程流程口径 | AGENTS/CONTRIBUTING的既有权威；根README只保留必要产品/开发链接 |
| 总入口的现行入链与检查清单 | README、PROJECT、TASK、主台账、CURRENT-STATE、子系统/工程专题与检查脚本同步修正 |

已删除docs/README.md，不保留需要再跳一次的兼容入口。子系统/产品/设计目录仍承担各自领域导航；不是取消所有README。术语意义与产品功能没有改变，不新建产品ADR或修改词库。

## 保全与范围

baseline.json与before目录保存本轮13个文件的修改前身份/原文，其中包含已撤除的docs/README.md。前轮重建报告、冻结来源、manifest和旧检查结果保留原字节；其中指向docs/README.md的旧链接仅代表当时结构，历史引用的目标现可在本目录before/docs/README.md查到，不将旧报告改写成当前结果。

现行方案文件增加后续替代说明，访谈记录写入已确认决定；不批量重写历史材料。无产品源码、资料库、模型或原生资源变化，其他WIP保留；未提交、推送或发布。

## 验证

实际检查结果见本目录的structure.json、migration.json、context.json、documentation-tests.log、navigation.json及delivery.json。检查不代替产品UI/真实推理或原生验收；本任务没有改变这些资格。
