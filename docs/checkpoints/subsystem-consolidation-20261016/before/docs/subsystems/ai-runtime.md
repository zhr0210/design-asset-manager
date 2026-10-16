# 执行Runtime、资源与物理退出

本页描述当前源码的跨层职责与运行路径；不是运行验收或目标全量交付声明。返回[子系统目录](README.md)，具体用户契约见[产品/目标规格](../product/README.md)与[交互目录](../design/README.md)。

## 职责与状态权威

Host资源账本区分模型驻留、准备/计算及临时材料。具体运行器拥有自有进程、私有协议和真实释放句柄。Pi、GGUF、OCR、retrieval有不同执行路径，不能由统一ready标签授予全部能力。

## 正式入口与运行链

能力请求→当前配置/制品/环境指纹→完整预算→准入→自有进程加载/验证/执行→结果交给Host→物理close后释放。前后台共享预算，准备保护由真实拥有者finally解除，但不提前释放仍存活的驻留。

## 失败、取消与兼容保护

压力/未知采样拒绝新增危险准入；取消/超时发出停止后仍等真实close。旧launch清理不确认替代进程退出，退出未知保留隔离。idle回收和关库/退出有独立生命周期，失败不能假归还许可。

## 技术与平台边界

macOS使用Metal/共享RAM和libproc观测，Windows CUDA/CPU与原生Job等按实际路径；监测/终止不冒称硬OS上限。32个旧Runtime/branch/probe通道及通用Runtime Package生产入口由disabled-app拒绝；保留源码/测试不是当前入口。

## 源码与详细机制

- [src/main/services/ai-runtime/README.md](../../src/main/services/ai-runtime/README.md)
- [src/main/services/ai-runtime/managed-vision-runtime.ts](../../src/main/services/ai-runtime/managed-vision-runtime.ts)
- [src/main/local-ai-resources/resource-governor.ts](../../src/main/local-ai-resources/resource-governor.ts)
- [src/main/visual-ai/visual-admission.ts](../../src/main/visual-ai/visual-admission.ts)
- [src/main/retrieval-workspace/retrieval-runtime.ts](../../src/main/retrieval-workspace/retrieval-runtime.ts)
- [src/main/ipc/disabled-app.ipc.ts](../../src/main/ipc/disabled-app.ipc.ts)

## 验证与维护

以下是相关聚焦检查入口，按改动风险选择，不自动执行整组：

- `npm run test-ai-runtime-status-workflow`
- `npm run test-ai-console-status-module`
- `npm run test-ai-python-environment`
- `npm run test-ai-python-runtime-host-context`
- `npm run test-ai-runtime-host-context`

完整配置见[tests-map](../../.codeindex/tests-map.json)，实际命令以package.json/对应脚本为准。正式用户结果、保存重开、真实推理和原生专项按[真实验收](../agents/ui-ux-acceptance.md)；实际版本/缺口仅见[CURRENT-STATE](../handoff/CURRENT-STATE.md)，剩余责任见[主台账](../tasks/TASK-REGISTRY.md)。

改变这里的职责、接口、状态、运行路径、兼容或失败语义时同任务更新正文并描述前后行为；局部内部机制归源码旁README，运行证据归本任务报告，不在本页按日期追加PASS。
