# 当前任务

## 目标

将 AI Console 的信息架构重构为有用的运行时驾驶舱：改进模型行选择的可读性，将 Qwen3-VL 做成可展开的已安装版本集合，把后端管理重命名为推理服务，移除独立的 VRAM Guard 标签页，并让概览页与模型页区分开。

## 状态

已完成。已将 AI Console 重构为运行时驾驶舱，包含独立的概览页、可读的模型选择状态、可展开的 Qwen3-VL 已安装版本集合、重命名后的推理服务区域，以及保留在模型工作区内的内存策略。

## 边界

- 保持 IPC channel 名称、数据库 schema 语义和 AI Worker HTTP API 稳定。
- 不读取或修改用户资产库、运行时数据库、模型权重或模型缓存内容；已有的安全模型列表 IPC 检查除外。
- 使用内置模型元数据中的官方发布日期；不要增加网络查询。
- 保留现有 AI 设置和后端契约；除非显示元数据需要窄范围类型扩展。

## 验证计划

```bash
npm run typecheck
npm run build
python scripts/check-agent-context.py
python scripts/check-forbidden-paths.py
python scripts/check-docs-sync.py
```

UI 验证：实现后检查 `/ai-console`，确认浅色/深色模式可读性、Qwen3-VL 已安装版本展开、推理服务命名、已移除 VRAM Guard 标签页、已保留内存策略控件，并且概览页和模型页有明确区分。

## 验证结果

已通过：

```bash
npm.cmd run typecheck
npm.cmd run build
C:\Users\kilian\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe scripts/check-agent-context.py
C:\Users\kilian\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe scripts/check-forbidden-paths.py
C:\Users\kilian\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe scripts/check-docs-sync.py
```

说明：

- 由于本地执行策略阻止了 `npm.ps1`，`npm run typecheck` 无法通过 PowerShell 运行；`npm.cmd run typecheck` 已通过。
- `npm.cmd run build` 首次在沙箱内失败，因为 esbuild 无法读取 Electron Vite 配置。同一个构建在沙箱提权后通过。
- 因为 `python` 不在 PATH 中，所以 Python 检查使用了 Codex bundled Python。
- 曾两次尝试通过 in-app Browser 对构建后的 `/ai-console` 路由进行渲染验证，但 in-app Browser 的 Node runtime 在本地沙箱设置阶段失败，错误为 `windows sandbox failed: spawn setup refresh`；未使用备用浏览器。

补充：素材库右侧素材详细分析抽屉已改为固定在 viewport 右侧，高度为 `95vh`，上下保留 `2.5vh` 间隙；素材库主滚动区、抽屉内部滚动区和 AppShell 主滚动区已隐藏侧边滚动条。补充验证已通过：

```bash
npm.cmd run typecheck
npm.cmd run build
```

补充：素材库顶部的当前筛选横条已移除；搜索筛选横条已改为固定在 viewport 顶部 `2.5vh`，与右侧素材详细分析抽屉顶部对齐。补充验证已通过：

```bash
npm.cmd run typecheck
npm.cmd run build
```

补充：素材库页已隐藏全局 Topbar，移除顶部“本地素材库”、SQLite 状态、安全加密状态以及 Topbar 底部分隔线；其他路由仍保留 Topbar。补充验证已通过：

```bash
npm.cmd run typecheck
npm.cmd run build
```

补充：定位到 GGUF / OpenAI-compatible 反推路径在模型输出 JSON 被 `max_tokens` 截断时没有字段级恢复逻辑，会把整段截断 JSON 落入 `englishPrompt`。已为外部推理 provider 增加 partial JSON 字段恢复，并覆盖截断 `usageTags` 的回归测试。补充验证已通过：

```bash
npm.cmd run test-openai-compatible-provider
npm.cmd run typecheck
npm.cmd run build
```

补充：反推默认输出 token 上限已从 512 提高到 1536；当 native Qwen 或 GGUF/OpenAI-compatible 反推输出疑似 JSON 截断时，会自动把上限提高到 3072 并重试一次。外部推理 provider 已增加自适应重试回归测试。补充验证已通过：

```bash
npm.cmd run test-openai-compatible-provider
npm.cmd run typecheck
npm.cmd run build
```

补充：AI 控制台的“推理服务 / Llama 本地推理服务”已恢复前端安装管理 UI：安装方案候选模型选择、开始安装、取消安装、安装进度条和终端日志输出重新接回现有 llama-runtime IPC。补充验证已通过：

```bash
npm.cmd run typecheck
npm.cmd run build
```

补充：Llama 安装方案候选已从展开卡片列表改为下拉选择，并保留当前选中方案摘要，避免候选模型全部铺开撑高面板。补充验证已通过：

```bash
npm.cmd run typecheck
npm.cmd run build
```
