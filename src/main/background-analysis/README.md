# 基础分析与后台执行

跨层职责与用户入口见[所属子系统](../../../docs/subsystems/ai-system.md#requests)。本文只解释局部当前机制；历史资格不在此累积，具体参数以当前源码/聚焦检查为准。

## 入口与拥有者

basic-analysis-controller、background-analysis-controller、独立标签与OCR在Main接到持锁Host，共用executor、资源账本与事务。持续执行需单独确认，旧收集计划不授权推理；只处理启用后的新素材，不隐式回填。

## 状态、提交与失败

v14持久请求/attempt、各能力证据/current、outbox、持续规则和每日调用预留。人工描述/确认拒绝/OCR修正优先，迟到结果留历史。资源不足等待不增attempt；跨会话未发送可新准入，已发送未确认保持unknown。暂停/关库/退出先撤新准入再收敛，通知重放不推理。

## 平台与保留接口

前台/后台共享真实资源；标签、描述、OCR独立，反推手动、embedding另行选择。旧B01只存计划是当时能力，不覆盖现行production executor；真实质量/费用未知与结构成功分别记录。

## 详细契约、来源与验证

[逐段技术契约](../../../docs/subsystems/ai-system.md#requests)保留命名接口/版本下的全部适用机制与保护。[迁移前完整技术/演进原文](../../../docs/history/documentation-rebuild-20261015/modules/src--main--background-analysis--README.md)保存全部细节、数字和当时上下文；其旧“当前/未验/禁用/下一步”只对应原日期，不能替代本页与实际源码。修改局部参数时精确查该来源及对应源码/测试，保留仍适用保护，不从摘要推导放宽。

实际命令见package.json、.codeindex/tests-map.json和子系统验证入口。用户功能按[真实验收](../../../docs/agents/ui-ux-acceptance.md)执行；UI/真实推理/原生/库资格分列，当前版本只见CURRENT-STATE，不把内部接线或本次重写当新PASS。
