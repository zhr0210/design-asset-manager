# AI UI “规划中”状态审计

UI 状态必须描述当前证据，不用 Git 提交状态或静态路线定义推断功能完成度。

| 路线 | 审计分类 | UI 状态 |
| --- | --- | --- |
| Qwen3-VL GGUF / llama.cpp | 由 Llama 服务、模型 artifact 和健康检查判定；Worker 不负责验证 | Worker 矩阵显示“证据不足”，实际 Llama 面板显示运行、可加载或缺失 |
| Qwen3-VL MLX | ADR-0007 已移除独立产品路线；未来只有具备完整生命周期和真实推理证据的 provider 才能重新进入状态面 | 不再显示 |
| CLIP/SigLIP ONNX | 依赖探测可确认缺失或可用，但不等同于真实模型已加载 | “依赖缺失”或“依赖可用” |
| RAM++ / Florence-2 / WD14 / OCR | Worker 探测依赖，模型 readiness 单独判定权重和真实加载 | “依赖缺失”“依赖可用”“可尝试加载”或“真实模型路径” |
| Platform AI Branch workflow | 没有运行时或模型证据时不能视为规划功能 | “证据不足” |

`planned` 只保留给产品代码中确实尚无完整执行路线的能力。静态架构元数据、运行时未启动、探测尚未执行、依赖缺失和模型 artifact 缺失必须使用各自状态。
