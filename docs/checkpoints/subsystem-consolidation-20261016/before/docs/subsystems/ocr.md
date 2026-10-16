# OCR执行、空结果与修正

本页描述当前源码的跨层职责与运行路径；不是运行验收或目标全量交付声明。返回[子系统目录](README.md)，具体用户契约见[产品/目标规格](../product/README.md)与[交互目录](../design/README.md)。

## 职责与状态权威

OCR控制器拥有识别生命周期，持久结果及人工修正归当前Library Host；结果中的文字、位置、语言/配方证据与人工文本分别保存。当前能力不由旧FastAPI OCR通道是否启用决定。

## 正式入口与运行链

正式详情/基础分析/后台OCR→受限asset-ocr动作→当前素材/预览/环境资格→资源准入→自有私有Worker→校验有效文字或有效空结果→Host保存→回读。安装/环境验证、执行资格和识别质量是不同状态。

## 失败、取消与兼容保护

已验证空结果不退回旧文字；失败/不支持不冒充空结果。人工修正优先，旧代次不得覆盖。取消与环境/库变更收敛真实进程，物理close前占用保留；输入/等待/失败反馈按UI规格检查。

## 技术与平台边界

RapidOCR等通过实际可信Python及已存在模型运行，Darwin与Windows资源测量/依赖分别验证。不因目录在场自动下载或安装依赖权重；测试缺模型仅保留对应缺口。

## 源码与详细机制

- [src/main/ocr/README.md](../../src/main/ocr/README.md)
- [src/main/background-ocr/README.md](../../src/main/background-ocr/README.md)
- [src/main/ocr/ocr-controller.ts](../../src/main/ocr/ocr-controller.ts)
- [src/main/ocr/ocr-runtime.ts](../../src/main/ocr/ocr-runtime.ts)
- [src/main/ipc/asset-ocr.ipc.ts](../../src/main/ipc/asset-ocr.ipc.ts)

## 验证与维护

以下是相关聚焦检查入口，按改动风险选择，不自动执行整组：

- `npm run test-ai-client-ipc-contract`
- `node scripts/run-ts-test.mjs scripts/ai-result-sync-projector.test.ts`
- `node scripts/run-ts-test.mjs scripts/ai-tag-suggestion-sync-sink.test.ts`
- `npm run ci:test-runtime-safety`
- `npm run test-node-host-platform-defaults`

完整配置见[tests-map](../../.codeindex/tests-map.json)，实际命令以package.json/对应脚本为准。正式用户结果、保存重开、真实推理和原生专项按[真实验收](../agents/ui-ux-acceptance.md)；实际版本/缺口仅见[CURRENT-STATE](../handoff/CURRENT-STATE.md)，剩余责任见[主台账](../tasks/TASK-REGISTRY.md)。

改变这里的职责、接口、状态、运行路径、兼容或失败语义时同任务更新正文并描述前后行为；局部内部机制归源码旁README，运行证据归本任务报告，不在本页按日期追加PASS。
