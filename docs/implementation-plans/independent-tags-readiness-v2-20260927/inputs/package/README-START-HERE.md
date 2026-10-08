# Design Asset Manager：完整工程交接包

整理日期：2026-09-27

本包用于项目结构设计、AI 推理架构实施、工程评审，以及在上下文过长或切换其他 AI/开发者时恢复完整背景。

## 推荐阅读顺序

1. `README-START-HERE.md`：先理解资料层级、优先级和下一步。
2. `01-original-baseline/PROJECT-ARCHITECTURE-HANDOFF-20260924.md`：2026-09-24 工作区现状、已实现功能、证据边界与不可变产品语义。
3. `02-target-architecture/05-AI-CONTEXT-HANDOFF.md`：目标架构的最小上下文。
4. `02-target-architecture/01-OVERALL-ARCHITECTURE.md`：完整目标代码/AI/资源/任务/检索/移动端边界。
5. `02-target-architecture/04-TRACEABILITY-AND-DECISIONS.md`：需求、架构决策、未决事项及追踪关系。
6. `03-engineering-report/REPORT.md`：2026-09-27 工程规格与实施计划的当前状态。
7. `04-engineering-review/01-REVIEW.md`：对工程报告的复核、风险与需要收紧的实施条件。
8. `04-engineering-review/02-NEXT-AI-PROMPT.md`：下一轮 AI 编程/规格收敛入口。

## 文档层级与使用规则

### 1. 原始现状层
`01-original-baseline/` 描述 2026-09-24 的真实工作区与已有验证记录。它不是目标架构批准书。若与后续目标设计不同，不应直接改写历史事实。

### 2. 目标架构层
`02-target-architecture/` 描述希望演进到的模块、任务、资源调度、推理后端、数据和权限结构。默认是目标设计，不等于生产代码已经实现。

其中：
- `prompts/P00.md`–`P27.md`：分阶段 AI 编程/规格任务；
- `prompts/X01.md`–`X04.md`：未来扩展阶段；
- `manifests/`：需求、决策、阶段和参考资料的机器可读追踪；
- `templates/`：ADR、基准、执行配置和阶段报告模板。

### 3. 工程实施层
`03-engineering-report/` 是后续工程化结果。其 `implementation-plan/` 提供第一轮独立标签闭环的 SPEC、任务拆分、测试边界和证据；`architecture/` 包含 P00–P27 的进一步规格成果。

该层中的规格模型和测试 PASS 不应被解释为正式业务代码、真实模型、Windows/macOS 发布包或资源调度已经验收。

### 4. 最新评审层
`04-engineering-review/` 是对工程报告与规格模型的后续复核。实施前优先读取其中的 `01-REVIEW.md` 和 `02-NEXT-AI-PROMPT.md`。

评审提出的重点包括：
- 新旧标签路径在首次新写入前必须遵守单一 current 写入规则；
- 第一轮就需要最小共享资源准入，而不是等批量阶段才解决；
- `libraryGeneration`、Host 会话/lease、request generation、claim/attempt 必须保持不同语义；
- 规格模型仍需补“关闭后拒绝新提交”和“低优先级后台任务防饿死”等反例；
- 后台 AI 更新与分页快照/投影版本之间存在需要实测的交互风险。

## 当前推荐下一步

在没有新的真实源码快照之前，不应声称已经完成业务实现。

下一轮默认从：
`04-engineering-review/02-NEXT-AI-PROMPT.md`
开始，先完成首轮实施前的规格收敛。确认进入实现模式后，第一项代码切片仍以保留现有综合分析行为、抽取可替换推理入口为起点。

## 重要不变量

后续任何实现都应继续保护：
- Copy 不等于 Move；
- Original / Preview / Variant 所有权不同；
- Managed / Eagle / Legacy 三种库不能混写；
- 用户修改优先于 AI 重跑；
- AI 建议不是用户确认事实；
- 配置不等于外发授权；
- AI 不可用不能阻塞基础素材管理；
- Worker/Runtime 不直接取得任意资料库写权限；
- 持久任务不等于持久权限；
- 工作集保存引用，不删除素材原件。

## 完整性与来源

`MANIFEST-SHA256.txt` 列出本包所有文件（不含清单自身）的 SHA-256，可用于传输后校验。

`99-source-archives/` 保留本次整理时使用的原始 ZIP，不应将其内部旧文件误当成比 `04-engineering-review/` 更新的结论。它们用于溯源和完整复现。
