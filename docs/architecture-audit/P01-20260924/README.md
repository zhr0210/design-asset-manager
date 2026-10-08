# P01｜模块边界、公共契约与错误信封

起草：2026-09-24；完成文档收尾：2026-09-25。目录沿用阶段起始日期。

模式：**SPEC**。设计状态：**ready_for_review**。实施状态：**not_started**。

用户在P00报告后明确要求“继续下一步”，因此本轮进入P01设计。该授权足以继续本阶段SPEC，不等于逐项签收P00、批准公共接口变更或允许模型/真实库运行。P00原报告和状态保持不变；当前状态保留这项前置说明。

本轮样本：现有`visual-ai:confirm-tag`，即用户确认一条AI标签建议。选择它是因为真实调用链跨越Renderer、Preload、Main IPC、Controller、Host和SQLite，能检验权限、单一写口、重复确认以及提交后通知失败，不需要模型或网络调用。

## 交付导航

- [契约ADR草案](adr/ADR-P01-CONTRACT-BOUNDARY.proposed.md)：现状、方案比较、待批准决定。
- [样本契约与执行语义](CONTRACT-SPEC.md)：版本、ID、权限、状态、错误、追踪和数据库边界。
- [兼容映射与切换计划](COMPATIBILITY-MAP.md)：旧调用方、不改变旧信封、单一写入路径、回退。
- [模块依赖与权限规则](MODULE-DEPENDENCIES.md)：真实模块和拟议规则，非已启用检查器。
- [测试计划](VALIDATION-PLAN.md)：56份结构夹具、20项行为场景、跨TS/Python对照，均NOT_RUN。
- [资料来源与版本](REFERENCES.md)：S00/S18/S24/S30与补充官方文档。
- [阶段报告](reports/P01-REPORT.md)：依照原包7节模板。
- `schemas/`：4个JSON Schema文档，只是Proposed规格；没有正式注册新IPC。
- `fixtures/`：合成实例、期望与兼容对照；期望不是测试结果。
- `manifests/`：模块清单、错误目录、阶段/需求状态。
- `evidence/`：工作区指纹与文档结构检查；不含素材、密钥、模型文件或业务测试日志。

本轮只做JSON语法、本地引用、目录/状态/文件保护等文档检查；未运行Ajv/Python schema语义验证、跨语言一致性测试、依赖AST规则、权限测试、npm typecheck/build、Electron或模型。既有正式接口仍按原行为运行。

下一步是审核本设计与前置缺口；完成后停止，不自动进入P02，也不切换IMPLEMENT。
