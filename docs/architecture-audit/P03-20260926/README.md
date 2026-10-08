# P03｜分析配方、执行配置与 Provider

2026-09-26；MODE=SPEC。设计状态：ready_for_review；实施状态：not_started。

本轮“继续”授权开展P03设计。直接前置是P01，不是P02；P02为最近已完成的SPEC背景。P01/P02仍待审，未回写为reviewed/accepted，也未批准公共接口、模型或库变更。

## 交付导航

- [Recipe/Profile/Provider契约](RECIPE-PROFILE-PROVIDER.md)
- [当前兼容基线](CURRENT-BASELINE.md)
- [旧策略继承与迁移对照](LEGACY-STRATEGY-MAP.md)
- [ADR草案](adr/ADR-P03-VISION-PROVIDER-SEAM.proposed.md)
- [验证与合成后端计划](VALIDATION-PLAN.md)
- [资料、版本与证据口径](REFERENCES.md)
- [阶段报告](reports/P03-REPORT.md)

`recipes/`保存从当前源码提取的兼容Recipe；`profiles/`包含一份未绑定服务的兼容Profile及2B/8B历史组合记录，全部disabled；`schemas/`两份Proposed文档格式，尚未语义验证；`fixtures/`含4个请求金样、36项解析场景、26项Provider场景和合成后端设计。

没有新Provider生产注册，没有新模型/Runtime/OCR安装，没有改变默认选择、推理参数或已有数据。没有真正启动合成HTTP端点。设计中的独立能力提交、持久任务、资源调度、外发治理保留为后续范围。

本轮只做文档结构/摘要/引用与工作区保护检查，解析器、schema引擎、Provider、HTTP及真实模型测试均NOT_RUN。完成P03后停止，不自动进入P04。
