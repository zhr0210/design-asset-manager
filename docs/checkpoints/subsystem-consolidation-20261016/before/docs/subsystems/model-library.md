# 模型制品、正式库存与签名目录

本页描述当前源码的跨层职责与运行路径；不是运行验收或目标全量交付声明。返回[子系统目录](README.md)，具体用户契约见[产品/目标规格](../product/README.md)与[交互目录](../design/README.md)。

## 职责与状态权威

正式managed模型库存/来源/恢复传输归App Host；模型制品是数据，Runtime包是执行依赖。独立签名Catalog核心/registry/pilot有各自受限Seam，不能把其未交付安装能力推断为正式managed库存不存在。

## 正式入口与运行链

设置→本地模型与OCR→Main命名动作→目录/固定revision与完整SHA→受管恢复传输/只读引用或复制→完整校验→库存→单独加载/验证/启用。签名官方目录走独立release pin与信任根校验；开发缺签名输入时相应页面fail closed，不否认其他managed入口。

## 失败、取消与兼容保护

下载完成、结构正确、预计适合、运行支持、真实执行通过是不同事实。损坏/环境漂移/撤信任拒绝，临时远端不可用不删除旧内容。暂停/重开不自动恢复，升级失败保留旧制品；不执行仓库代码/pickle/隐含下载。

## 技术与平台边界

正式来源依既有境内镜像策略逐跳校验，旧huggingface文件名仅兼容命名。平台、量化、CPU/GPU/Metal方案分别验证；本轮开发验收只使用已有权重，不触发模型下载。签名发行仍受独立发布范围。

## 源码与详细机制

- [src/main/model-library-workspace/README.md](../../src/main/model-library-workspace/README.md)
- [src/main/model-library-workspace/managed-model-library.ts](../../src/main/model-library-workspace/managed-model-library.ts)
- [src/main/model-library-workspace/china-model-mirror.ts](../../src/main/model-library-workspace/china-model-mirror.ts)
- [src/main/model-library-workspace/model-file-transfer.ts](../../src/main/model-library-workspace/model-file-transfer.ts)
- [src/main/model-library/README.md](../../src/main/model-library/README.md)
- [src/main/model-library-workspace/model-library-workspace.composition.ts](../../src/main/model-library-workspace/model-library-workspace.composition.ts)

## 验证与维护

以下是相关聚焦检查入口，按改动风险选择，不自动执行整组：

- `npm run test-legacy-model-management-containment`
- `npm run test-model-acquisition-local-only`
- `npm run test-model-artifact-readiness`
- `npm run test-model-artifact-readiness-display`
- `npm run test-model-library-catalog-admission-tracer`

完整配置见[tests-map](../../.codeindex/tests-map.json)，实际命令以package.json/对应脚本为准。正式用户结果、保存重开、真实推理和原生专项按[真实验收](../agents/ui-ux-acceptance.md)；实际版本/缺口仅见[CURRENT-STATE](../handoff/CURRENT-STATE.md)，剩余责任见[主台账](../tasks/TASK-REGISTRY.md)。

改变这里的职责、接口、状态、运行路径、兼容或失败语义时同任务更新正文并描述前后行为；局部内部机制归源码旁README，运行证据归本任务报告，不在本页按日期追加PASS。
