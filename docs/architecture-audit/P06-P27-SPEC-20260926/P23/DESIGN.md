# P23 MLX可选适配与受控实验（Proposed）

## Adapter边界/兼容矩阵
拟经P09托管隔离Python Runtime，暴露P03 invokeOnce与P06输入handle，返回P04同能力值；不改素材业务层。Preset锁定MLX/MLX-VLM commit或release、Python/Metal/OS、权重/投影/tokenizer/量化与Profile，当前全部candidate、enabled=false、未选择实际版本。
| 条件 | 状态 |
| --- | --- |
| Apple Silicon + 精确安装/模型 | 尚未本轮核查/运行 |
| Intel Mac/Windows | 本MLX Apple Silicon实验不适用，不当ready |
| 视觉特征缓存 | 候选，需格式/key/内存验证 |
| 推测解码/KV压缩 | 默认关闭，只有所锁版本+模型支持证据才试 |

[MLX-VLM官方仓库](https://github.com/Blaizzy/mlx-vlm)为滚动main机制参考，不能把其所有模型/优化当DAM支持。[MLX memory limit](https://ml-explore.github.io/mlx/build/html/python/_autosummary/mlx.core.set_memory_limit.html)（页面0.32.2）是图执行内存指导值，不是应用/系统硬上限；P08资源约束与压力响应仍必需。访问均2026-09-26。

## 实验设计与报告
E0基线：同一授权合成/保留验收集、同能力语言/长度/分辨率、明确硬件/上下文/温度/seed可重复条件，现有后端重测。E1候选MLX无优化。E2只开视觉特征缓存；E3及后续每次仅一种已证支持优化。不同模型/量化/输入若无法完全等价，单列差异，不能将差异归因于Runtime。
记录冷启动到首有效结果、稳态P50/P95、加载/解码/推理/验证分段、峰值与稳定统一内存、swap、取消后在途占用、卸载确认、JSON/语言/事实错误。对照无后台基线交互延迟，输出token/s非唯一目标。净缓存收益需包括驻留内存，不为命中率无限保留。
本轮受控实验报告：E0–E3均NOT_RUN；无速度/内存/质量数字、无收益放行。仅规格参考模型测试实验门槛、单变量限制、跨库缓存不复用和质量回退。

## 决策与后续门槛
Proposed：可选MLX而非替换所有后端。P09/P13/P15/P19未实施，当前不能进入生产。未来T05/T10/T11/T12/T18/T23/T24需限定获准进程、材料权利、精确版本与退出码；硬件或授权缺失保持NOT_RUN，不能用“已有Mac”外推ready。S16/S28/S29前沿文献仅候选，不复述其效果为本项目收益。
