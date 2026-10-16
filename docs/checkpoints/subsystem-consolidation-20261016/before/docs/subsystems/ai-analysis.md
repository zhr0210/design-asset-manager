# 基础分析、独立标签与后台任务

本页描述当前源码的跨层职责与运行路径；不是运行验收或目标全量交付声明。返回[子系统目录](README.md)，具体用户契约见[产品/目标规格](../product/README.md)与[交互目录](../design/README.md)。

## 职责与状态权威

Host拥有持久请求、attempt、每能力证据/current、决策及outbox；Main控制器负责输入/调用/提交协调。标签、短描述、OCR是可独立完成/重跑的基础能力；反推不是基础分析自动附带输出。

## 正式入口与运行链

正式详情单项/一键基础分析或设置后台规则→命名IPC→冻结能力/来源/配置→资源准入→实际executor→验证→claim-fenced事务证据/回执→事件回读。后台启用有独立确认，只处理规则范围的新素材，不因旧收集开关自动回填。

## 失败、取消与兼容保护

人工编辑/确认/拒绝优先，迟到结果可历史保留但不抢current。资源不足等待，不凭空增加attempt。已发送未确认保持unknown，重开不自动重发；未发送可按新session重新准入。暂停/关库/退出撤销新准入并收敛子任务，成功回读/通知重放不再次推理。

## 技术与平台边界

手动/后台共享实际执行与资源账本，本地OCR可独立准入。历史Worker poller只是旧lane，不能套到全部Pi/managed执行。真实质量、用量未知和取消费用分别记录。

## 源码与详细机制

- [src/main/background-analysis/README.md](../../src/main/background-analysis/README.md)
- [src/main/independent-tags/README.md](../../src/main/independent-tags/README.md)
- [src/main/background-analysis/basic-analysis-controller.ts](../../src/main/background-analysis/basic-analysis-controller.ts)
- [src/main/background-analysis/background-analysis-controller.ts](../../src/main/background-analysis/background-analysis-controller.ts)
- [src/main/ipc/main-ipc-composition.ts](../../src/main/ipc/main-ipc-composition.ts)

## 验证与维护

以下是相关聚焦检查入口，按改动风险选择，不自动执行整组：

- `npm run test-ai-client-ipc-contract`
- `node scripts/run-ts-test.mjs scripts/ai-result-sync-projector.test.ts`
- `node scripts/run-ts-test.mjs scripts/ai-tag-suggestion-sync-sink.test.ts`
- `npm run test-python-unittest`

完整配置见[tests-map](../../.codeindex/tests-map.json)，实际命令以package.json/对应脚本为准。正式用户结果、保存重开、真实推理和原生专项按[真实验收](../agents/ui-ux-acceptance.md)；实际版本/缺口仅见[CURRENT-STATE](../handoff/CURRENT-STATE.md)，剩余责任见[主台账](../tasks/TASK-REGISTRY.md)。

改变这里的职责、接口、状态、运行路径、兼容或失败语义时同任务更新正文并描述前后行为；局部内部机制归源码旁README，运行证据归本任务报告，不在本页按日期追加PASS。
