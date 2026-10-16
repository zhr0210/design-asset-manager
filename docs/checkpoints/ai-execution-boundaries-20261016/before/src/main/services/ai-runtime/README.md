# 自有推理Runtime与保留诊断

跨层职责与用户入口见[所属子系统](../../../../docs/subsystems/ai-system.md#execution)。本文只解释局部当前机制；历史资格不在此累积，具体参数以当前源码/聚焦检查为准。

## 入口与拥有者

managed-vision-runtime管理可信Python/原生GGUF执行，managed-gguf-packages校验平台运行包；OCR、retrieval、Pi使用独立拥有者，共享资源准入而非共享任意allocator。

## 状态、提交与失败

模型/解释器/依赖/runner指纹冻结到实例；准备保护由消费者finally解除，驻留要等实际close。每次launch物理退出与异步文件清理分开，旧清理不能确认新进程。UNKNOWN保持隔离/占用；资源可用不恢复已撤销业务权限。

## 平台与保留接口

Mac Metal共享RAM只算一池，libproc观测绑定创建身份；Windows CPU/CUDA及原生约束按实际配置。32个旧Runtime IPC仍禁用，platform-ai-branch-evidence的record/readStatus仅是保留Seam，不启动模型或授予资格。

## 详细契约、来源与验证

[逐段技术契约](../../../../docs/subsystems/ai-system.md#execution)保留命名接口/版本下的全部适用机制与保护。[迁移前完整技术/演进原文](../../../../docs/history/documentation-rebuild-20261015/modules/src--main--services--ai-runtime--README.md)保存全部细节、数字和当时上下文；其旧“当前/未验/禁用/下一步”只对应原日期，不能替代本页与实际源码。修改局部参数时精确查该来源及对应源码/测试，保留仍适用保护，不从摘要推导放宽。

实际命令见package.json、.codeindex/tests-map.json和子系统验证入口。用户功能按[真实验收](../../../../docs/agents/ui-ux-acceptance.md)执行；UI/真实推理/原生/库资格分列，当前版本只见CURRENT-STATE，不把内部接线或本次重写当新PASS。
