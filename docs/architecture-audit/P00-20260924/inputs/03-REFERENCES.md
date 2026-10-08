# 03｜参考资料与证据索引

版本：1.0.0｜核查日期：2026-09-24｜目的：跨 AI、跨会话可回溯。

## 使用规则

本包中的 `[Sxx]` 是稳定资料 ID，可在本文件查到标题、原始链接、借鉴范围和限制。`[U01]` 表示用户明确需求；`[S00 §x]` 表示原交接稿相应章节；没有外部来源标记的“建议/应当/目标”是 DAM 目标设计，不是第三方已实现能力。

外部资料只归档链接和有限摘要，不复制完整网页。除明确版本化规范外，`master/main/latest` 都是可变化资料；“2026-09-24 已读”不等于获取了不可变源码快照。实施阶段必须记录实际 release/commit、模型文件哈希和访问日期。链接不可访问时保留原记录并标记“未能复核”，不可虚构参数或支持状态。

本轮没有访问完整 DAM 工作区，也没有运行新模型推理、测试真实资料库或测量资源性能。上一轮对话中的临时引用符号不作为资料 ID；本包重新建立了可移植链接。框架参考只证明某个机制存在，不证明 DAM 已接入。

## 项目与用户来源

### S00｜项目现状交接稿

- 文件：[PROJECT-ARCHITECTURE-HANDOFF-20260924.md](sources/PROJECT-ARCHITECTURE-HANDOFF-20260924.md)
- 来源：用户上传；快照日期 2026-09-24。
- 重点章节：§2 不变量；§3 交付状态；§5 进程与权限；§7 数据权威/schema；§9 AI 与历史测试；§10 证据等级；§11 评审问题；§13 源码导航。
- 限制：当前工作区含未提交改动，仅提交 `3fa00df` 不足以复原。正文所链接的其他私有文件未随本包取得，不能声称已经读过。
- 原件字节哈希见 `manifests/package-manifest.json`。

### U01｜用户需求

- 文件：[USER-REQUIREMENTS-20260924.md](sources/USER-REQUIREMENTS-20260924.md)
- 来源：本次对话明确约束的整理；不是外部技术资料。
- 原则：新技术建议不能覆盖用户已确定的产品行为。

## 外部一手资料

### S01｜llama.cpp HTTP Server

- 原始资料：[llama.cpp HTTP Server](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)
- 发布方/版本范围：项目维护者；滚动 master 文档。
- 定位：Features；--fit；threads；schema response；monitoring。
- 借鉴：本地 HTTP 推理、参数适配和结构化输出的参考。
- 不代表：仅据文档确认机制；未锁定当前提交，不能直接把 latest 参数用于旧 b11057。
- 关联：AI-05、AI-06、RES-08；P03/P09/P23。

### S02｜llama.cpp Multimodal

- 原始资料：[llama.cpp Multimodal](https://github.com/ggml-org/llama.cpp/blob/master/docs/multimodal.md)
- 发布方/版本范围：项目维护者；滚动文档。
- 定位：多模态输入与模型支持范围。
- 借鉴：视觉后端能力探测、投影制品配套与兼容矩阵。
- 不代表：支持清单需对实际模型与 Runtime 版本复核。
- 关联：AI-05；P03/P15。

### S03｜MLX-VLM

- 原始资料：[MLX-VLM](https://github.com/Blaizzy/mlx-vlm)
- 发布方/版本范围：项目维护者；滚动 main README。
- 定位：Vision Feature Caching；Server；KV cache；Speculative Decoding。
- 借鉴：Apple Silicon 候选后端与同图视觉特征复用的参考。
- 不代表：文档中的模型、默认值与缓存实现可能变化；不沿用其路径键作为 DAM 的完整权限/内容键。
- 关联：AI-05、DATA-13；P19/P23。

### S04｜MLX Unified Memory

- 原始资料：[MLX Unified Memory](https://ml-explore.github.io/mlx/build/html/usage/unified_memory.html)
- 发布方/版本范围：MLX 官方文档；本次页面标记 0.32.2。
- 定位：Unified Memory。
- 借鉴：统一内存池的资源核算参考。
- 不代表：这里不是对所有 macOS 设备的架构描述；Intel Mac 另行能力检测。
- 关联：RES-08；P07/P08。

### S05｜MLX set_memory_limit

- 原始资料：[MLX set_memory_limit](https://ml-explore.github.io/mlx/build/html/python/_autosummary/mlx.core.set_memory_limit.html)
- 发布方/版本范围：MLX 官方 API 文档；本次页面标记 0.32.2。
- 定位：memory limit guideline。
- 借鉴：内存限制是指导值，不能据此给出进程总占用硬保证。
- 不代表：实际行为与 MLX/Metal 版本、交换空间及分配路径有关。
- 关联：RES-08；P08/P23。

### S06｜ONNX Runtime Execution Providers

- 原始资料：[ONNX Runtime Execution Providers](https://onnxruntime.ai/docs/execution-providers/)
- 发布方/版本范围：ONNX Runtime 官方文档。
- 定位：Execution Providers。
- 借鉴：OCR、Embedding 等专用模型的硬件适配参考。
- 不代表：执行提供程序可用不代表模型全部算子、格式和精度均受支持。
- 关联：AI-05；P24。

### S07｜What is Windows ML?

- 原始资料：[What is Windows ML?](https://learn.microsoft.com/en-us/windows/ai/new-windows-ml/overview)
- 发布方/版本范围：Microsoft Learn；滚动文档。
- 定位：System requirements；Execution Providers。
- 借鉴：Windows 专用模型执行候选；按硬件、OS 与 EP 建能力矩阵。
- 不代表：硬件优化 EP 对 Windows 11 24H2+ 有条件；CPU/DirectML 路径支持范围不能与其混淆。
- 关联：AI-05、RES-08；P07/P24。

### S08｜DirectML Overview

- 原始资料：[DirectML Overview](https://learn.microsoft.com/en-us/windows/ai/directml/dml)
- 发布方/版本范围：Microsoft Learn；滚动文档。
- 定位：Summary：sustained engineering。
- 借鉴：DirectML 仍受支持；新功能开发转向 Windows ML。
- 不代表：不据此删除现有兼容后端；取舍应依据实际支持矩阵。
- 关联：AI-05；P24。

### S09｜DXGI_QUERY_VIDEO_MEMORY_INFO

- 原始资料：[DXGI_QUERY_VIDEO_MEMORY_INFO](https://learn.microsoft.com/en-us/windows/win32/api/dxgi1_4/ns-dxgi1_4-dxgi_query_video_memory_info)
- 发布方/版本范围：Microsoft Learn；Win32 API。
- 定位：Budget；CurrentUsage；CurrentReservation。
- 借鉴：Windows 显存预算和进程使用量的语义参考。
- 不代表：应用预算不等于全设备空闲；宿主查询不能直接代替外部 Worker 所在进程的预算。
- 关联：RES-08；P07/P08/P24。

### S10｜LM Studio Idle TTL and Auto-Evict

- 原始资料：[LM Studio Idle TTL and Auto-Evict](https://lmstudio.ai/docs/developer/core/ttl-and-auto-evict)
- 发布方/版本范围：LM Studio 官方文档。
- 定位：Idle TTL；Auto-Evict for JIT loaded models。
- 借鉴：借鉴按需加载、闲置卸载及模型切换管理。
- 不代表：Auto-Evict 的 JIT 作用范围不能泛化到全部模型或其他服务。
- 关联：AI-09；P09/P13。

### S11｜Ollama FAQ

- 原始资料：[Ollama FAQ](https://docs.ollama.com/faq)
- 发布方/版本范围：Ollama 官方文档。
- 定位：keep_alive；concurrent requests；local-only mode。
- 借鉴：外部本地服务驻留、并发与是否启用云功能的接入参考。
- 不代表：只使用对应小节；不继承页面中所有可能滞后的硬件/默认值描述；localhost 不证明最终本地计算。
- 关联：AI-05、SEC-10；P09/P14。

### S12｜ComfyUI model_management.py

- 原始资料：[ComfyUI model_management.py](https://github.com/Comfy-Org/ComfyUI/blob/master/comfy/model_management.py)
- 发布方/版本范围：ComfyUI 项目源码；滚动 master。
- 定位：reserve_vram；extra_reserved_memory；模型释放。
- 借鉴：参考显存余量和模型释放机制，不引入整套节点框架。
- 不代表：本次定位了相关实现，不是对整个 ComfyUI 资源系统的源码审计。
- 关联：RES-08；P08/P13。

### S13｜Immich Environment Variables

- 原始资料：[Immich Environment Variables](https://docs.immich.app/install/environment-variables/)
- 发布方/版本范围：Immich 官方文档。
- 定位：MACHINE_LEARNING_MODEL_TTL；Worker/线程选项。
- 借鉴：借鉴后台分析服务的运行配置和空闲卸载。
- 不代表：服务器配置不能照搬为桌面默认值。
- 关联：AI-09；P09/P13。

### S14｜Immich Remote Machine Learning

- 原始资料：[Immich Remote Machine Learning](https://docs.immich.app/guides/remote-machine-learning/)
- 发布方/版本范围：Immich 官方指南。
- 定位：远程预览输入；安全提醒；版本一致性。
- 借鉴：借鉴推理与素材管理分离、最小输入传送。
- 不代表：文档说明其内部服务没有公网安全措施；DAM 不能直接公网暴露同类裸服务。
- 关联：SEC-10、EXT-20；P14/X01/X04。

### S15｜Immich Searching

- 原始资料：[Immich Searching](https://docs.immich.app/features/searching/)
- 发布方/版本范围：Immich 官方文档。
- 定位：Smart Search；CLIP models；更换模型后重新处理。
- 借鉴：参考图文检索和向量模型切换后的重建机制。
- 不代表：不复用其模型排行榜或测量数值作为 DAM 性能结论。
- 关联：SEARCH-14；P17/P18。

### S16｜vLLM Speculative Decoding

- 原始资料：[vLLM Speculative Decoding](https://docs.vllm.ai/en/latest/features/speculative_decoding/)
- 发布方/版本范围：vLLM 官方文档；滚动 latest。
- 定位：工作负载条件；Method Selection；兼容限制。
- 借鉴：推测解码/MTP 作为实验性执行配置和未来服务器候选。
- 不代表：收益依赖模型、硬件、负载与采样；不作 DAM 通用加速承诺。
- 关联：AI-05、VAL-22；P23/P24/X04。

### S17｜SGLang Documentation

- 原始资料：[SGLang Documentation](https://docs.sglang.io/)
- 发布方/版本范围：SGLang 官方文档；由 docs.sglang.ai 重定向。
- 定位：Serving/runtime documentation。
- 借鉴：未来自托管推理服务候选。
- 不代表：没有在 DAM 安装或验证；不作为桌面核心依赖。
- 关联：EXT-20；X04。

### S18｜Electron Security

- 原始资料：[Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)
- 发布方/版本范围：Electron 官方文档；滚动 latest。
- 定位：安全清单；IPC sender；sandbox；contextIsolation。
- 借鉴：Preload、IPC 与进程边界加固参考。
- 不代表：当前工程 Electron 声明版本较旧，须检查锁文件、迁移影响和实际 API。
- 关联：SEC-10、HOST-03；P01/P22。

### S19｜Electron utilityProcess

- 原始资料：[Electron utilityProcess](https://www.electronjs.org/docs/latest/api/utility-process)
- 发布方/版本范围：Electron 官方 API。
- 定位：utilityProcess.fork；IPC/生命周期。
- 借鉴：计算隔离执行的候选机制。
- 不代表：utilityProcess 是 Node 子进程机制，不是直接启动任意 Python 的统一 API，也不自动提供完整 OS 沙箱。
- 关联：HOST-03、AI-09；P09/P22。

### S20｜Electron powerMonitor

- 原始资料：[Electron powerMonitor](https://www.electronjs.org/docs/latest/api/power-monitor)
- 发布方/版本范围：Electron 官方 API。
- 定位：空闲、电源、thermal-state-change、speed-limit-change。
- 借鉴：设备策略的部分信号来源。
- 不代表：thermal-state-change 标记为 macOS；缺失读数必须为 unknown。
- 关联：RES-08；P07/P13。

### S21｜SQLite FTS5

- 原始资料：[SQLite FTS5](https://www.sqlite.org/fts5.html)
- 发布方/版本范围：SQLite 官方文档。
- 定位：Tokenizers；Query；External content。
- 借鉴：主进程受控查询与可重建词法索引候选。
- 不代表：中文分词/片段映射、实际编译选项与查询语法安全需验证。
- 关联：SEARCH-14；P16。

### S22｜SQLite Online Backup API

- 原始资料：[SQLite Online Backup API](https://www.sqlite.org/backup.html)
- 发布方/版本范围：SQLite 官方文档。
- 定位：Online backup API。
- 借鉴：迁移前一致性元数据备份参考。
- 不代表：数据库备份不自动包含 Original、派生物及文件系统状态。
- 关联：DATA-12；P02/P27。

### S23｜SQLite Write-Ahead Logging

- 原始资料：[SQLite Write-Ahead Logging](https://www.sqlite.org/wal.html)
- 发布方/版本范围：SQLite 官方文档。
- 定位：WAL limitations；checkpointing。
- 借鉴：恢复、文件备份和关闭流程的核查依据。
- 不代表：不把活动数据库文件直接云同步当作多端一致性协议。
- 关联：DATA-12、EXT-20；P02/P05/X01。

### S24｜JSON Schema Draft 2020-12

- 原始资料：[JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12)
- 发布方/版本范围：JSON Schema 官方版本化规范。
- 定位：Core 与 Validation。
- 借鉴：跨 TS/Python/未来移动端契约来源候选。
- 不代表：草案版本是建议的契约基线；具体验证库仍须结合仓库选择与锁定。
- 关联：CONTRACT-04；P01。

### S25｜LangGraph Persistence

- 原始资料：[LangGraph Persistence](https://docs.langchain.com/oss/python/langgraph/persistence)
- 发布方/版本范围：LangChain 官方文档；原 durable-execution 链接重定向至此。
- 定位：Checkpointers；Stores。
- 借鉴：多步设计助手状态持久化的机制参考。
- 不代表：不是 DAM 事务、资源调度或任务授权的替代；暂不强制引入依赖。
- 关联：DESIGN-17；P21。

### S26｜Model Context Protocol Specification

- 原始资料：[Model Context Protocol Specification](https://modelcontextprotocol.io/specification/2026-07-28)
- 发布方/版本范围：MCP 官方版本化规范；本次 latest 重定向版本。
- 定位：Overview；tools/resources；JSON-RPC。
- 借鉴：未来外部工具与资源接口参考。
- 不代表：协议不授予资料库权限；实施时显式锁定兼容规范及 SDK。
- 关联：EXT-20；X02。

### S27｜Effective harnesses for long-running agents

- 原始资料：[Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- 发布方/版本范围：Anthropic 工程报告。
- 定位：增量任务；进度记录；端到端验证。
- 借鉴：AI 编程会话交接、单任务执行与证据检查参考。
- 不代表：是作者的工程经验，不保证任意 AI 自动正确；DAM 加入工作区保护和权限门槛。
- 关联：DEV-21；所有 P 阶段。

### S28｜TurboQuant: Redefining AI efficiency with extreme compression

- 原始资料：[TurboQuant: Redefining AI efficiency with extreme compression](https://research.google/blog/turboquant-redefining-ai-efficiency-with-extreme-compression/)
- 发布方/版本范围：Google Research；2026-03-24 发布的研究介绍。
- 定位：KV/向量压缩研究。
- 借鉴：列入实验候选，区分 KV 缓存压缩与整个应用资源占用。
- 不代表：作者研究结果不能直接外推到 DAM 多模态短任务。
- 关联：AI-05、VAL-22；P23/P24/X04。

### S29｜A First Comprehensive Study of TurboQuant: Accuracy and Performance

- 原始资料：[A First Comprehensive Study of TurboQuant: Accuracy and Performance](https://vllm.ai/blog/2026-05-11-turboquant)
- 发布方/版本范围：vLLM 博客；Eldar Kurtić 等；2026-05-11。
- 定位：Accuracy；Performance；实验设置。
- 借鉴：参考容量、延迟、吞吐和精度之间的取舍，作为技术复测问题来源。
- 不代表：结果限于其模型/硬件/实现；不把不同 TurboQuant 实现当成同一性能。
- 关联：AI-05、VAL-22；P23/P24/X04。

### S30｜OpenTelemetry Traces

- 原始资料：[OpenTelemetry Traces](https://opentelemetry.io/docs/concepts/signals/traces/)
- 发布方/版本范围：OpenTelemetry 官方文档。
- 定位：Trace/Span/Context。
- 借鉴：执行追踪的字段语义参考；默认本地脱敏记录。
- 不代表：不要求部署收集服务器，不默认上传素材或完整提示内容。
- 关联：OBS-18；P01/P25。

## 实施时追加资料的最小格式

`ID / 标题 / 发布方 / URL / 定位章节 / 发布日（未知则写未知）/ 访问日 / release或commit（未锁定则明示）/ 借鉴点 / 不适用条件 / 关联ADR / 实验报告`。

依赖版本证据优先于浮动网页：先确认仓库锁文件与实际二进制，再检查与其匹配的文档。不以搜索摘要、Stars、榜单或构建成功替代兼容验证。
