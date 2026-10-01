# P03｜来源与版本

核对日期：2026-09-26。仅公开文档读取，无素材、端点配置、凭据或源码外发。

| ID | 来源 | 本轮使用 | 限制 |
| --- | --- | --- | --- |
| S00 | 原架构交接与P00/P01/P02记录 | 正式链路/旧实现/已知限制导航 | 当前源码再次核对，前序仍待审 |
| U01 / AI-05 / AI-06 | 架构包目标与本阶段任务卡 | Recipe/Profile/Provider分层和目标能力语义 | 不把后续独立能力/调度目标当当前实现 |
| S01 | [llama.cpp server master](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md) | 兼容HTTP、参数及结构化输出机制参考 | 滚动文档不证明已使用运行包支持所有新参数 |
| S02 | [llama.cpp multimodal master](https://github.com/ggml-org/llama.cpp/blob/master/docs/multimodal.md) | 视觉输入与模型/投影配套的边界 | 支持清单不是本机readiness |
| S01-PIN | [b11057 server文档](https://raw.githubusercontent.com/ggml-org/llama.cpp/b11057/tools/server/README.md) | 对应历史tag的资料入口 | tag资料读取不等于下载/执行/验证该二进制；不按文档默认重写现有请求 |
| S02-PIN | [b11057 multimodal文档](https://raw.githubusercontent.com/ggml-org/llama.cpp/b11057/docs/multimodal.md) | 历史组合的多模态参考 | 仍需实际模型/Runtime/硬件组合验证 |

实际当前协议与预算以本地transport/controller/parser为准，不从官方示例复制额外参数。新flags、JSON约束模式或加速机制若未来采用，须独立Profile与实测，而不是本阶段默认开启。

历史模型身份来自仓库`LOCAL-AI-EVALUATION-20260920.manifest.json`、`QWEN3-VL-8B-EVALUATION-20260924.manifest.json`和`QWEN3-VL-REAL-COMPARISON-20260924.md`。这里只读取脱敏文档，不访问对应下载目录或用户配置；文件sha字段为历史公开制品记录，非本次模型文件校验。
