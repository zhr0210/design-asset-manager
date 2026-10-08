# 下一位 AI / 开发者从这里开始

请把本目录视为历史现状、目标架构、工程规格和最新评审的组合交接包，而不是“全部已经实现”的证明。

阅读顺序：
1. `README-START-HERE.md`
2. `01-original-baseline/PROJECT-ARCHITECTURE-HANDOFF-20260924.md`
3. `02-target-architecture/05-AI-CONTEXT-HANDOFF.md`
4. `03-engineering-report/REPORT.md`
5. `04-engineering-review/01-REVIEW.md`
6. `04-engineering-review/02-NEXT-AI-PROMPT.md`

执行规则：
- 有真实源码时先核验调用链、工作区状态和测试证据；文档不能替代源码事实。
- 默认先以 SPEC 模式收敛当前阶段，不自动跨阶段实现。
- 不因目录名或“旧”字样直接删除代码，先证明可达性与替代关系。
- 不运行真实模型、上传素材、迁移真实库、下载大模型、调用付费 API 或终止用户进程，除非获得明确授权。
- 实施时保持 Library Host 单写权限、用户编辑优先、库会话/lease/request/claim 分离和结果幂等。
- 每次阶段结束记录：输入版本、修改范围、执行过的测试、未覆盖风险、回退点和下一步。

下一任务入口：`04-engineering-review/02-NEXT-AI-PROMPT.md`。
