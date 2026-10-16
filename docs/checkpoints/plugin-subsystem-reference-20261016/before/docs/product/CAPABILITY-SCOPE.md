# 能力范围、可选目标与退休边界

本页是开发/交付指南或产品范围说明，不是软件运行子系统；产品目标、当前实现与运行验收分别维护。软件结构见[五个子系统](../subsystems/README.md)。

## 职责与状态权威

产品基准拥有核心/可选/远景范围。Custom Field长尾、复杂导出/恢复、扩展SDK、录屏producer等按有效目标规格保存；不由目录/ADR存在判定交付。

## 正式入口与运行链

未来明确任务先读对应目标规格与重大取舍，核对当前实现消费者，再决定具体实施。当前本地Copy/理解/检索/工作集复用不依赖完整生态、云开发/MCP或每项未来状态机先完成。

### 插件、SDK与MCP接入

扩展接入首先核对[0484的现行边界与阶段](../adr/0484-extension-contracts-and-deferred-agent-development-access.md)及[0483核心/可选能力范围](../adr/0483-ai-plus-core-product-and-extension-boundaries.md)：公共能力契约、MCP工具/资源适配与隔离插件运行时各有职责，Accepted目标不等于已有公开API。具体贡献面/权限设计按[扩展面详细契约](specs/model-extension.md#adr-0154)和[扩展决定目录](../adr/indexes/topics/model-extension.md)选择适用条款；讨论稿仅保留来源，不取代现行修订。

当前可复用的业务/权限边界从[Local Host](../subsystems/local-host.md)及源码旁README核对，不把现有WorkspaceClient/内部IPC当公共插件SDK。模型制品与插件包不同，前者的当前实现归[模型专题](../subsystems/ai-system.md#models)。

## 失败、取消与兼容保护

目标未实现不等于可以删要求，Accepted不等于Implemented。退休只替代被明确点名的能力/条款；来源隐私/原件/事务保护仍按适用范围保留。不得通过文档整理重新开放网页采集、素材下载执行或任意插件权限。

## 技术与平台边界

已退休嵌入式网页/网站登录/外部网站搜索与素材任务下载，保留本地Copy、模型下载产品能力及既有用户数据/schema兼容。模型权重下载产品能力不等于本轮验收允许下载。

## 源码与详细机制

- [docs/product/PRODUCT-FOUNDATION.md](PRODUCT-FOUNDATION.md)
- [docs/adr/README.md](../adr/README.md)
- [docs/product/PLUGIN-PLATFORM-DISCUSSION-20260913.md](PLUGIN-PLATFORM-DISCUSSION-20260913.md)
- [docs/product/WEB-COLLECTION-RETIREMENT-20260913.md](WEB-COLLECTION-RETIREMENT-20260913.md)

## 验证与维护

以下是相关聚焦检查入口，按改动风险选择，不自动执行整组：

- `npm run test-web-retirement`
- `npm run test-asset-authority-baseline`

完整配置见[tests-map](../../.codeindex/tests-map.json)，实际命令以package.json/对应脚本为准。正式用户结果、保存重开、真实推理和原生专项按[真实验收](../agents/ui-ux-acceptance.md)；实际版本/缺口仅见[CURRENT-STATE](../handoff/CURRENT-STATE.md)，剩余责任见[主台账](../tasks/TASK-REGISTRY.md)。

改变这里的职责、接口、状态、运行路径、兼容或失败语义时同任务更新正文并描述前后行为；局部内部机制归源码旁README，运行证据归本任务报告，不在本页按日期追加PASS。
