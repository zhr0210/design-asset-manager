# P24 Windows专用能力适配（Proposed）

## 优先切片与依赖
先选择一专用OCR或Embedding模型，复用既有OcrObservation/EmbeddingSpace，而非强行统一全部VLM。Adapter冻结ONNX/opset、预处理尺寸/颜色、精度、EP顺序、设备LUID/启动身份、线程与内存预算。安装需独立Runtime包manifest（哈希/ABI/依赖/许可来源），现行requirements范围不是可重现锁；本轮不安装或补写假hash。

## OS/EP/硬件矩阵
| 路径 | 前置 | 本轮证据 |
| --- | --- | --- |
| ONNX CPU | 精确Runtime/模型算子兼容 | 未运行，无Windows就绪组合 |
| DirectML GPU | 支持的Windows/DirectX12设备、EP构建与算子限制 | 官方参考，未执行 |
| Windows ML优化GPU/NPU EP | Windows11 24H2 build26100+及对应硬件/驱动/EP条件 | 未取得目标硬件验证 |
| CUDA EP候选 | GPU/驱动/Runtime/CUDA依赖匹配 | 旧probe和范围依赖，不是交付证据 |

[Windows ML官方要求](https://learn.microsoft.com/en-us/windows/ai/new-windows-ml/overview)把CPU/DirectML支持与优化EP条件区分；[DirectML EP文档](https://onnxruntime.ai/docs/execution-providers/DirectML-ExecutionProvider.html)也列自身设备/执行模式限制。访问2026-09-26，滚动文档；不将这些要求泛化为DAM最低OS承诺或已测试兼容。实际Windows包/ABI/驱动清单待取得。

## 设备真实性与资源
get_available_providers只说明可创建候选，必须记录实际session EP、算子分配/回落及实测设备。指定NPU未执行则reportedDevice=CPU或mixed/unknown，不借requestedEP显示成功加速。fallback需符合用户策略及P08重新估算CPU/共享内存；禁止静默上云。
DXGI budget取实际Worker实例，Main/全设备free不能互替；集显共享RAM归P07统一pool，独显local/nonlocal分开。进程失联/取消请求不立刻归还驻留，卸载核对沿P09。

## 基准报告/验收
模型加载、预处理、推理、后处理、结果验证和Host提交全链；OCR记录空/中文/区域/修订兼容，Embedding记录finite/范数/空间一致与相关性。CPU基线与目标EP对比，数值公差/精度降级需样例与质量门槛；仅kernel吞吐不等于用户体验。
本轮真实Windows/模型/安装包基准全部NOT_RUN。规格模型测试OS优化EP门槛、实际fallback标记、不可用EP/策略拒绝，不能替代设备测试。未来T05/T10/T11/T12/T16/T23/T24需限定平台打包运行、算子失败、多GPU与睡眠/退出。
Proposed决定：能力/实际EP/硬件证据三维矩阵，优先专用模型；不因Windows支持方向自动下载驱动或启用NPU标签。
