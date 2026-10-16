# 文字、颜色、语义与图像检索

本页描述当前源码的跨层职责与运行路径；不是运行验收或目标全量交付声明。返回[子系统目录](README.md)，具体用户契约见[产品/目标规格](../product/README.md)与[交互目录](../design/README.md)。

## 职责与状态权威

Host拥有文字/颜色派生索引、分页快照及持久canonical向量；派生索引可重建，不取代原件、人工内容和证据。Renderer使用searchAssetsPage与retrieval.query，不在已加载几行素材上重建全库权威。

语义/图像的向量生成与模型/资源准入协作见[AI执行](ai-system.md#execution)，索引空间、查询、分页和命中解释仍由本搜索系统拥有；不能因共享模型而合并结果权威。

## 正式入口与运行链

Library搜索控件→useHostAssetSearch→共享Client→Host词法分页或已准备空间的semantic/image/mixed查询→硬条件复核→结果/命中说明。向量生成需明确选择范围，准备/暂停/恢复/空间切换与查询是不同动作。

## 失败、取消与兼容保护

文件夹/标签/颜色等硬条件在语义候选前过滤，异步后再核对生命周期/代际/权限。cursor有所有者/期限，旧查询不覆盖新代次；取消或失败保留已接受快照。有效无命中、索引等待、缺兼容模型和执行失败分别反馈。查询图由一文件一会话grant授予，不隐式收录或外发。

## 技术与平台边界

独立SigLIP2/Python执行与本地资源准入分别核对，不能用生成模型资格替代。Windows/macOS真实中英/混合/以图质量与规模证据独立；旧in-memory lexical-only说明不再代表当前单库链。

## 源码与详细机制

- [src/renderer/components/library/canvas/useHostAssetSearch.ts](../../src/renderer/components/library/canvas/useHostAssetSearch.ts)
- [src/main/asset-search/README.md](../../src/main/asset-search/README.md)
- [src/main/retrieval-workspace/README.md](../../src/main/retrieval-workspace/README.md)
- [src/main/retrieval-workspace/retrieval-runtime.ts](../../src/main/retrieval-workspace/retrieval-runtime.ts)
- [src/shared/workflows/asset-discovery.workflow.ts](../../src/shared/workflows/asset-discovery.workflow.ts)
- [src/shared/client/workspace-client.ts](../../src/shared/client/workspace-client.ts)

## 验证与维护

以下是相关聚焦检查入口，按改动风险选择，不自动执行整组：

- `npm run test-asset-discovery-workflow`
- `npm run test-scoped-asset-reads`

完整配置见[tests-map](../../.codeindex/tests-map.json)，实际命令以package.json/对应脚本为准。正式用户结果、保存重开、真实推理和原生专项按[真实验收](../agents/ui-ux-acceptance.md)；实际版本/缺口仅见[CURRENT-STATE](../handoff/CURRENT-STATE.md)，剩余责任见[主台账](../tasks/TASK-REGISTRY.md)。

改变这里的职责、接口、状态、运行路径、兼容或失败语义时同任务更新正文并描述前后行为；局部内部机制归源码旁README，运行证据归本任务报告，不在本页按日期追加PASS。
