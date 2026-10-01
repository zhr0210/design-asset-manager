# Current Task

## 已完成：Astra 持久化指令精简（2026-09-12）

用户已批准审查稿的项目内与共享技能修改。范围是 8 个项目文件、9 个共享
技能的 13 个文件，以及本任务记账与历史保留；不继续旧重构任务。

- 已应用候选差异：AGENTS 精简、TASK 按需读取、Router 校验与聚焦用例、
  README/商业目标过期快照修正、历史请求说明，以及技能流程校准。
- 权限段落、产品不变量、已有工作区与暂存区改动保留。
- 删除机械委派/假设/提交数量、重复阅读与测试流程；保留完整交付、
  实现证据和真实数据/公共契约授权。共享技能修改影响其他使用它们的项目。

## 本轮验证

- `npm run test-agent-context-router` 通过：268 个路由评估任务及新增启动
  列表用例；AGENTS 单独与旧 AGENTS+TASK 均有效，非法列表仍拒绝。
- `npm run context:check` 通过，已跟踪一方源码归属 550/550。
- 9 个实际技能的 quick_validate 与已改 Markdown 引用检查通过。
- 根隐私/高风险段落逐字保留，TASK 历史原文字节保留；最终差异及暂存区
  检查通过，无关已跟踪改动不变。未提交或暂存本轮修改。
- 相对审批稿只修正一个新增测试断言：非法列表由 schema 提前拒绝，
  预期错误码应为 SCHEMA_VALIDATION。修正后相关测试通过。
- 没有运行模型行为 A/B、真实素材库或整套 Electron 验证；本轮不声称
  Token/费用实测下降。没有修改业务功能、模型配置或命令权限规则。

## 前次任务恢复

前次 TASK 原文完整保留于
[重构任务记录](docs/history/task-before-astra-instruction-audit-20260912.md)。
档案保持原文，其中相对路径仍以仓库根为基准。当前恢复入口：
[功能恢复进展](docs/product/REFACTOR-FUNCTION-MAP-20260911.md)、
[Visual AI](src/main/visual-ai/README.md)、[下载](src/main/managed-download/README.md)。
原重构尚未完成；该历史记录和旧请求不自动授权续跑。

## 本轮依据

已完整阅读并据此审查：
[OpenAI 官方模型指南](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-6-astra)、
[Eric Provencher 原文](https://x.com/pvncher/status/2095991462416490862)。
