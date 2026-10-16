评估结论：已有可复用业务与权限基础，但未发现可直接接入其他软件的现成 MCP Client、MCP Server 或插件运行时。当前文档明确将它们列为目标架构，不能把内部 Client/IPC 当公开 SDK。

主要检索入口：

- `docs/subsystems/README.md`：先按五系统定位；本题主要进入 **应用 Host 与系统集成**。
- `docs/product/CAPABILITY-SCOPE.md:13`：插件、SDK 与 MCP 接入专门入口。
- `docs/adr/0484-extension-contracts-and-deferred-agent-development-access.md:3`：Accepted 不代表交付；MCP、公共契约、隔离插件运行时各自独立。
- `docs/product/specs/model-extension.md`：候选贡献面及权限细则。

可复用能力：

| 能力 | 当前依据 | 对接用途 |
|---|---|---|
| Host 唯一写入权威 | `src/main/local-host/README.md`、`src/shared/client/workspace-client.ts` | 让连接器通过命名业务操作进入 Host |
| Desktop/Browser 共用业务契约 | Shared Client → IPC / loopback HTTP → 同一 Main handler | 可作为未来适配层背后的内部业务接口 |
| 会话、角色、Origin/CSRF、撤权、未知提交保护 | `src/main/local-host/README.md` | 可复用部分准入、生命周期与故障语义 |
| 本地 Copy 收录、规划确认、幂等与原件保护 | `src/main/capture-intake/README.md` | 外部软件结果回流时复用 Host 管理的收录链；当前未授权任意 Producer |
| AI 请求、取消、结果验证和 Host 提交 | `src/main/ai-gateway/README.md` | 参考外部能力调用的生命周期；Pi 是推理传输，不是通用插件/MCP 执行器 |

核心缺口：

1. **方向尚需明确**：“DAM 调其他软件的 MCP 工具”需要出站 MCP Client；“其他软件通过 MCP 操作 DAM”需要入站 MCP Server。现有目标文本较多描述后者，不可视为前者已有实现。
2. 对外版本化业务契约、能力发现与兼容策略。
3. 外部软件身份、目的地、每次素材授权、工具参数/输出验证、资源限额与撤权。
4. MCP 协议与传输适配、连接管理、取消/断线/未知副作用处理。
5. 外部生成结果的受控 staging、审查与正式入库路径。
6. 如果还要在 DAM 内安装执行第三方插件，则另需隔离运行时、manifest、权限、更新与卸载机制；这不是接入 MCP 的自动附赠能力。

建议第一阶段只选一个明确外部软件、一个只读或结果提议工具，定义“选中素材 → 明确授权 → 有界调用 → 预览结果 → Host 确认入库”的窄闭环，暂不建设完整插件市场。不得重新开放已退休的网页采集/素材下载执行器。

仅在指定工作区做静态只读检查；未联网、修改文件或启动任何应用、模型、服务。以上为源码/契约评估，未验证实际互通。
