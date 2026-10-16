# Shared契约、Client与纯投影

Shared保存命名业务契约、无副作用规则与可复用Client；不导入Main磁盘/数据库权威或Renderer全局副作用。接口变化同步正式调用方与测试替身，不以新增通用invoke回避边界。

运行探针、目录存在、下载完成、已验证执行和持久提交是不同事实。旧Platform AI投影仅服务保留lane，不证明当前页面挂载；素材下载投影已随执行器退休，旧存储字段仍兼容。

## 入口与协作

- [client/workspace-client.ts](client/workspace-client.ts)
- [client/workspace-read-commands.ts](client/workspace-read-commands.ts)
- [workflows/app-navigation.workflow.ts](workflows/app-navigation.workflow.ts)
- [workflows/asset-discovery.workflow.ts](workflows/asset-discovery.workflow.ts)
- [contracts/active-library.contract.ts](contracts/active-library.contract.ts)

跨层关系、状态权威、平台及失败语义见[local-host](../../docs/subsystems/local-host.md)，局部详细保证见[模块接口约束](../../docs/subsystems/contracts/shared.md)。使用当前命名Client和正式组合核对消费者，不从目录或类型推定启用。

## 验证与维护

按相关模块测试和[真实验收](../../docs/agents/ui-ux-acceptance.md)区分内部接线、Browser、Desktop/native与真实模型。修改行为写清触发/前后结果，更新唯一拥有者。视觉只由[DESIGN](../../DESIGN.md)维护；当前资格只见CURRENT-STATE，历史原文见本轮before.zip，不在本页按日期追加结果。
