# 专用OCR与修正

跨层职责与用户入口见[所属子系统](../../../docs/subsystems/ai-system.md#ocr)。本文只解释局部当前机制；历史资格不在此累积，具体参数以当前源码/聚焦检查为准。

## 入口与拥有者

ocr-controller冻结库scope、source/preview/OCR修订与运行指纹，ocr-runtime调用自有stock Worker。prepare/configure/run分别授权，状态回读/通知不触发识别；后台复用同一资源/UNKNOWN门，不伪造手动review。

## 状态、提交与失败

有效空结果优先于旧视觉OCR；修正有独立修订且模型重跑不能静默覆盖。close/transport分开，stdout/终态不等于物理close；SIGTERM后按实际持有ChildProcess升级终止，不信号已退出PID。最大输入、流字节、超时/close与drain边界由运行器源码/聚焦测试核对；UNKNOWN继续占材料和进程许可。

## 平台与保留接口

可信环境选择不等于任意执行沙箱，缺模型不下载；Darwin与Windows资源测量/依赖分别验证。runtime-changed无payload通知使两端刷新可用状态，不复活旧review或改写修正草稿。

## 详细契约、来源与验证

[逐段技术契约](../../../docs/subsystems/ai-system.md#ocr)保留命名接口/版本下的全部适用机制与保护。[迁移前完整技术/演进原文](../../../docs/history/documentation-rebuild-20261015/modules/src--main--ocr--README.md)保存全部细节、数字和当时上下文；其旧“当前/未验/禁用/下一步”只对应原日期，不能替代本页与实际源码。修改局部参数时精确查该来源及对应源码/测试，保留仍适用保护，不从摘要推导放宽。

实际命令见package.json、.codeindex/tests-map.json和子系统验证入口。用户功能按[真实验收](../../../docs/agents/ui-ux-acceptance.md)执行；UI/真实推理/原生/库资格分列，当前版本只见CURRENT-STATE，不把内部接线或本次重写当新PASS。
