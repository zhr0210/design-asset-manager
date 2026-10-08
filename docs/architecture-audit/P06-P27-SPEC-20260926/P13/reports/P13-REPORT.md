# 阶段报告：P13｜闲忙自适应、模型路由与公平调度

## 1. 身份与范围

P13 / SPEC；2026-09-26；Codex执行，用户/架构设计师待审。需求R03, R04, R05；决定DAM-A008, DAM-A010, DAM-A019；测试T09, T10, T11, T12, T22, T23。
分支`codex/product-reassessment-20260905`，HEAD `3fa00df3bbb605478da6d0af18724d64021e723c`。保护原1865份文本及Git index/diff；只写独立连续交付目录。
直接前置：P11, P12, P07, P08, P09，设计均按前序报告待审，实施未开始；用户明确授权持续SPEC到P27并逐阶段测试，不提升为reviewed/accepted。
实际读范围见evidence/SOURCES.json、任务卡及DESIGN；AGENTS现行约束、CONTEXT/TASK按需导航。未取得：新实现、真实运行/模型/平台或真实库证据；不补造。

## 2. 事实、提案与批准分开

旧Python队列具有priority字段与恢复逻辑，BatchScheduler主要按队列数触发；并非新的Host资源许可/质量授权联合路由。P07–P09均仍为规格。

详细契约/取舍见[DESIGN](../DESIGN.md)与contracts.proposed.json。目标包只作参考。所有新增参数、接口、ADR决定均为Proposed；继续SPEC不批准生产接线、依赖安装或数据迁移。

## 3. 变更

实际仅新增设计、契约、合成夹具、可执行规格参考模型、测试记录与报告。拟改源码边界及唯一写入权威见DESIGN；没有业务代码或根TASK改动。
外部动作：无；未启动模型/应用/服务，未操作数据库、权重或真实资料库。

## 4. 验证记录

| T / 场景 | 证据等级 | 实际命令/检查 | 输入 | 结果 | 退出码/日志 |
| --- | --- | --- | --- | --- | --- |
| 本阶段规则 8 场景 | SPEC-EXEC | python3 -B evidence/spec-model.py | 合成数值/身份/状态 | PASS | 0；evidence/SPEC-TESTS.json |
| 契约/模板/引用/前序与工作区 | DOC/SRC | stdlib JSON/reference/hash/Git checks | 本阶段文档及源码摘要 | PASS | 0；evidence/STATIC-CHECKS.json |
| 生产实现、集成、真实模型/平台 | L1–L6生产验证 | 未运行 | 无 | NOT_RUN | 无 |

规格参考模型只验证设计决策，不import生产模块，不代表正式行为已通过。拟实施验证与负向场景见DESIGN；历史报告不算本轮执行。

## 5. 故障、安全与兼容

idle必须同时低压力且遥测可信；手动固定仍受预算/授权约束；不得因本地不足暗中上云。

## 6. 回退

关闭自适应，使用已获准保守固定Profile低并发；保留P08硬准入和等待原因。
本轮仅文档，无DB/进程回退；既有工作区保持。数据恢复不能用git回退冒充。

## 7. 结论与接手

设计ready_for_review；实施not_started。本阶段SPEC与对应规格测试完成，仍需设计评审及获批实施后验证生产链路。状态见STATE.json。
用户已授权连续推进，测试通过后继续下一P；不自动进入X阶段、不改变SPEC模式。
