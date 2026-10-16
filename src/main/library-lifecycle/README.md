# 持锁资料库与Host维护

跨层职责与用户入口见[所属子系统](../../../docs/subsystems/library-lifecycle.md#library)。本文只解释局部当前机制；历史资格不在此累积，具体参数以当前源码/聚焦检查为准。

## 入口与拥有者

createActiveLibraryHost组合inspection、独占lease、私有SQLite、存储角色与path-free动作。createActiveLibrarySession将Capture与存储/连接不可拆分绑定；Main注册open/create、Asset/Tag、Copy/Preview/Trash与受控schema维护。

## 状态、提交与失败

runWhileHeld包住完整异步动作，失锁/代际/角色不符拒绝；authority变化由library-quiescence冻结/排空/撤权，shutdown持独立barrier。私有schema维护保留事务、备份、修订、幂等与committed-but-unacknowledged语义，settlement未知封存权威。Original/Preview/Variant分离，旧v3下载表仅兼容数据，不恢复执行器。

## Host-private schema maintenance

[`host-schema-maintenance.internal.ts`](host-schema-maintenance.internal.ts)的createHostSchemaMaintenance只在Host内组合五类维护、六个固定意图。普通无升级确认/拒绝仍走短事务，不扩大公共接口。

维护在Host生命周期队列上拒绝已有business hold，关闭普通及协调准入，allSettled排空在途快照，再进入实际runWhileHeld lease。版本相关备份、增长上限、事务/schema校验和领域hook顺序由写入拥有者保持；lease未完成或pragma恢复失败隔离Host，提交后的不确定ACK仍是已提交。只释放自身准入门，不释放其他持有者。

## 平台与保留接口

Windows本地NTFS/原生备份与macOS卷资格各有适配器。源码inspection上限、备份上限、实测规模是不同事实，具体数字和版本查当前实现与报告。LIBRARY-START保留planner/tracer局部接口，不把它当正式Host缺失；未来旧库formalization不由只读找回自动交付。

## 详细契约、来源与验证

[逐段技术契约](../../../docs/subsystems/library-lifecycle.md#library)保留命名接口/版本下的全部适用机制与保护。[迁移前完整技术/演进原文](../../../docs/history/documentation-rebuild-20261015/modules/src--main--library-lifecycle--README.md)保存全部细节、数字和当时上下文；其旧“当前/未验/禁用/下一步”只对应原日期，不能替代本页与实际源码。修改局部参数时精确查该来源及对应源码/测试，保留仍适用保护，不从摘要推导放宽。

实际命令见package.json、.codeindex/tests-map.json和子系统验证入口。用户功能按[真实验收](../../../docs/agents/ui-ux-acceptance.md)执行；UI/真实推理/原生/库资格分列，当前版本只见CURRENT-STATE，不把内部接线或本次重写当新PASS。
