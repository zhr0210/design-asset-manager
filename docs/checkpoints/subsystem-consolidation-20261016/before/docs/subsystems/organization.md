# 组织、标签、笔记与人工内容

本页描述当前源码的跨层职责与运行路径；不是运行验收或目标全量交付声明。返回[子系统目录](README.md)，具体用户契约见[产品/目标规格](../product/README.md)与[交互目录](../design/README.md)。

## 职责与状态权威

普通文件夹/色板/笔记/工作集保存在持锁Library，引用既有Asset，不移动原件。人工标签、编辑描述/OCR与AI证据分开；确认建议是人工决定，不是简单拷贝AI历史。

## 正式入口与运行链

工作台/详情/笔记/工作集控件→共享命名Client→当前库session→修订/成员检查→事务写入→回读与跨端通知。笔记有页/标注内容，工作集内容与设备窗口布局分开。schema首次升级走Host维护与备份，旧数据保留。

## 失败、取消与兼容保护

人工编辑优先，确认/拒绝与执行结果各有身份。冲突保留输入并显式恢复，A→B→A不能复活旧review；删除集合/成员不删除原素材。没有当前标签结果时不得用历史合并标签冒充，空内容与未执行分开。

## 技术与平台边界

产品Client两端共享，原生卡片/工作窗只可编辑当前获授成员。未来Custom Field长尾、批量迁移/undo等目标独立规范，不从现有标签/笔记推出已交付。

## 源码与详细机制

- [src/main/library-lifecycle/library-organization.ts](../../src/main/library-lifecycle/library-organization.ts)
- [src/main/library-lifecycle/asset-notebook.ts](../../src/main/library-lifecycle/asset-notebook.ts)
- [src/main/library-lifecycle/work-sets.ts](../../src/main/library-lifecycle/work-sets.ts)
- [src/main/library-lifecycle/active-library-tag-metadata.ts](../../src/main/library-lifecycle/active-library-tag-metadata.ts)
- [src/main/independent-tags/README.md](../../src/main/independent-tags/README.md)
- [src/shared/client/workspace-client.ts](../../src/shared/client/workspace-client.ts)

## 验证与维护

以下是相关聚焦检查入口，按改动风险选择，不自动执行整组：

- `npm run test-asset-card`
- `npm run test-asset-description-draft`
- `npm run test-app-navigation-workflow`
- `npm run test-native-open-dialog`
- `npm run test-asset-store-loading`

完整配置见[tests-map](../../.codeindex/tests-map.json)，实际命令以package.json/对应脚本为准。正式用户结果、保存重开、真实推理和原生专项按[真实验收](../agents/ui-ux-acceptance.md)；实际版本/缺口仅见[CURRENT-STATE](../handoff/CURRENT-STATE.md)，剩余责任见[主台账](../tasks/TASK-REGISTRY.md)。

改变这里的职责、接口、状态、运行路径、兼容或失败语义时同任务更新正文并描述前后行为；局部内部机制归源码旁README，运行证据归本任务报告，不在本页按日期追加PASS。
