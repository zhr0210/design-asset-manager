# 深度分析、提示词反推与图片工具

本页描述当前源码的跨层职责与运行路径；不是运行验收或目标全量交付声明。返回[子系统目录](README.md)，具体用户契约见[产品/目标规格](../product/README.md)与[交互目录](../design/README.md)。

## 职责与状态权威

界面表达具体能力意图，Main拥有受控预览、review/执行与身份校验，Host拥有证据与提交。深度分析、反推、独立标签、基础描述不能因共用模型而混为一条无边界结果。

## 正式入口与运行链

素材详情/获授卡片→VisualAiPanel准备/确认→visual-ai-controller→按当前连接调用Pi/managed或既有传输→解析/验证→Host存证→回读。图片工具产生受控派生/新素材时复用Copy/variant入口，不覆盖Original。

## 失败、取消与兼容保护

冻结目标、来源、配方和配置；权限/代际/owner变化撤销review。未知远端结果不能标未执行重试，取消保留此前线性化提交；失败留旧有效结果和输入。反推文本命中不等于画面事实，用量/截断/实际调用次数如实表示。

## 技术与平台边界

Pi是协议执行Worker，本地推理由自有Runtime承担；不因为一个openai-compatible文件名推定全部厂商相同。共享UI、真实模型质量和原生卡片交互分别验收。

## 源码与详细机制

- [src/main/visual-ai/README.md](../../src/main/visual-ai/README.md)
- [src/main/visual-ai/visual-ai-controller.ts](../../src/main/visual-ai/visual-ai-controller.ts)
- [src/main/visual-ai/openai-vision.transport.ts](../../src/main/visual-ai/openai-vision.transport.ts)
- [src/renderer/components/asset/VisualAiPanel.tsx](../../src/renderer/components/asset/VisualAiPanel.tsx)
- [src/main/ipc/visual-ai.ipc.ts](../../src/main/ipc/visual-ai.ipc.ts)
- [src/main/image-tools/README.md](../../src/main/image-tools/README.md)

## 验证与维护

以下是相关聚焦检查入口，按改动风险选择，不自动执行整组：

- `npm run test-prompt-reverse-workflow`
- `npm run test-openai-compatible-provider`
- `npm run test-llama-openai-backend`
- `npm run test-python-unittest`
- `npm run test-ai-client-ipc-contract`

完整配置见[tests-map](../../.codeindex/tests-map.json)，实际命令以package.json/对应脚本为准。正式用户结果、保存重开、真实推理和原生专项按[真实验收](../agents/ui-ux-acceptance.md)；实际版本/缺口仅见[CURRENT-STATE](../handoff/CURRENT-STATE.md)，剩余责任见[主台账](../tasks/TASK-REGISTRY.md)。

改变这里的职责、接口、状态、运行路径、兼容或失败语义时同任务更新正文并描述前后行为；局部内部机制归源码旁README，运行证据归本任务报告，不在本页按日期追加PASS。
