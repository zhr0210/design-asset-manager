# AI 代理指南

保持启动上下文精简。本文件是稳定的操作指南；`TASK.md` 是当前工作账本。

## 启动

先读取以下文件：

1. `AGENTS.md`
2. `TASK.md`

明确任务边界后，再读取与任务相关的内容。需要路由文件时，可以使用 `.codeindex/module-map.json` 和附近模块的 `README.md`，但不要把路径列表当作检查代码本身的替代品。

## 项目结构

Design Asset Manager 是一个用于管理图片和设计资产的本地桌面工具。

- Electron 主进程：`src/main/`
- React 渲染进程：`src/renderer/`
- Preload 桥接层：`src/preload/`
- 共享契约和类型：`src/shared/`
- SQLite 本地数据：`src/main/db/`
- Python FastAPI AI Worker：`ai-service/`

## 工作方式

- 相比宽泛的预防性规则，优先依靠本地判断。
- 将改动限制在请求的工作范围内，但在需要时读取相关文档和代码。
- 除非用户明确要求修改，否则保留公共契约。
- 默认不创建长期规划文档。保持根文档简短，并把当前任务状态放入 `TASK.md`。
- 工作区可能已经是脏的。不要回滚、覆盖、清理或暂存无关改动。不要使用 `git add .`。
- Windows/macOS 默认共享主程序架构、产品工作流、共享契约和 UI 状态面；只有 OS 能力、AI 推理运行时、打包/原生依赖、路径/进程适配等真实平台差异才建立分支。
- Platform AI Branch Status 使用专用 AI Runtime IPC channel 暴露，macOS 和 Windows 返回同一 shared response shape；平台差异放进 runtime-lane evidence，不要把 Runtime Probe 当作 Real Model Path。

## 文档同步

新增、删除或实质性改变功能时，在同一次改动中更新最近的相关文档。优先更新模块 `README.md`、公共契约或 `TASK.md`，而不是宽泛的根文档。只有纯内部改动才可以跳过文档更新，并在最终报告中说明原因。

## 绝对隐私规则

绝不要在聊天、日志、提交、文档或生成的报告中暴露密钥或私有数据。即使用户授予了宽泛权限，本规则仍然适用。

包括：

- API key、令牌、密码、凭据、cookie 和认证 header
- 完整的敏感本地路径
- 完整的 base64 图片或二进制载荷
- 来自资产库、运行时数据库或下载文件的用户私有数据

应改为脱敏或摘要。

## 高风险操作

以下操作只有在用户针对具体操作和范围明确批准后才允许执行：

- 读取或修改用户资产库、下载文件夹、运行时 SQLite 数据库、模型缓存或模型权重
- 自动下载模型权重或启动外部模型服务
- 未经明确批准修改 IPC channel 名称、数据库 schema 语义、AI Worker HTTP API 或其他公共契约
- 大规模清理生成输出、批量移动文件或执行破坏性文件系统操作

执行已批准的高风险操作后，报告改动内容以及验证方式。

兼容性新增 IPC channel 或返回字段时，如果用户已经明确批准具体目标和范围，可以继续执行；必须同步更新 shared contract、preload/renderer 调用、最近相关文档和聚焦测试。不要借此重命名或改变既有 channel 语义。

## 任务账本

将 `TASK.md` 维护为当前工作账本。

- 开始前：如果目标、边界或验证计划已经过期，先更新它。
- 执行中：当方向、范围、阻塞点或验证策略发生实质变化时更新它。
- 完成后：记录结果、已运行的验证，以及跳过的验证和原因。
- 不要把它用作长计划、草稿纸或历史归档。

## 验证

改动后必须验证。

按改动范围选择检查，例如：

```bash
npm run typecheck
npm run build
python -m unittest discover ai-service/tests
python scripts/check-agent-context.py
python scripts/check-forbidden-paths.py
python scripts/check-docs-sync.py
```

尽可能运行聚焦的检查。如果某项检查无法运行，说明原因并指出剩余风险。
