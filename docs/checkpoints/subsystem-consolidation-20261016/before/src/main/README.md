# 可信Main组合与命名业务

Main组合App状态、当前Library、连接/资源与原生拥有者；registerMainIpcComposition只注册命名能力。Desktop/Browser共享Host而保持角色，Native/Worker的scope更窄。

旧Runtime/branch/probe/通用Runtime Package生产通道由disabled-app拒绝。managed模型管理/专用OCR/Pi等使用各自现行入口，不能用旧通道状态否定它们。

## 入口与协作

- [index.ts](index.ts)
- [ipc/main-ipc-composition.ts](ipc/main-ipc-composition.ts)
- [active-library-runtime.ts](active-library-runtime.ts)
- [library-quiescence.ts](library-quiescence.ts)
- [local-host/README.md](local-host/README.md)

跨层关系、状态权威、平台及失败语义见[local-host](../../docs/subsystems/local-host.md)，局部详细保证见[模块接口约束](../../docs/subsystems/contracts/main.md)。使用当前命名Client和正式组合核对消费者，不从目录或类型推定启用。

## 验证与维护

按相关模块测试和[真实验收](../../docs/agents/ui-ux-acceptance.md)区分内部接线、Browser、Desktop/native与真实模型。修改行为写清触发/前后结果，更新唯一拥有者。视觉只由[DESIGN](../../DESIGN.md)维护；当前资格只见CURRENT-STATE，历史原文见本轮before.zip，不在本页按日期追加结果。
