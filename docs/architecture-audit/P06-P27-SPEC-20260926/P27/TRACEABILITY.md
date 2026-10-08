# P27 完整追踪矩阵

所有target改动仍为spec-only；现有已接线能力见P00，不被本表否定。规格测试不能替代T编号对应的完整生产验收。

## 需求

| ID | 需求 | 阶段 | 状态 |
| --- | --- | --- | --- |
| R01 | 保留本地优先与现有技术主线，不以目录整理代替架构优化 | P00, P01, P27 | spec-only |
| R02 | 面向macOS与Windows；不能将macOS验证推广为Windows通过 | P07, P22, P23, P24, P27 | spec-only |
| R03 | 资源预留比例、低配后台分析与正常交互 | P07, P08, P13, P26 | spec-only |
| R04 | 闲时加快、忙时放缓、温度/电池与缺失遥测 | P07, P13, P26 | spec-only |
| R05 | 自动/手动大小模型切换，质量与资源同时约束 | P03, P09, P13, P15 | spec-only |
| R06 | 用户可显式使用云API，不静默外发 | P14 | spec-only |
| R07 | 基础分析默认标签、描述、OCR，不默认反推 | P10, P11 | spec-only |
| R08 | 一键与单项触发并存，逻辑独立、允许物理合并 | P10, P11, P12 | spec-only |
| R09 | 单能力成功立即可用，失败独立提醒与重试 | P04, P10, P11, P12, P25 | spec-only |
| R10 | 高级提示词反推手动批量，明确是创作推演 | P12 | spec-only |
| R11 | 任务持久化、关库/崩溃后仅恢复未完成部分 | P05, P10, P11, P12, P26 | spec-only |
| R12 | 普通模式少量验证组合，高级模式开放配置并有手册 | P03, P09, P15 | spec-only |
| R13 | 原件/预览/派生物、Copy和三种库边界 | P02, P06, P19, P26, P27 | spec-only |
| R14 | 用户描述/确认标签/OCR修订不被重跑覆盖 | P04, P11, P20 | spec-only |
| R15 | 确定性配色与带来源的OCR区域 | P06, P11, P19 | spec-only |
| R16 | Host分页、中文词法检索与增量投影 | P16 | spec-only |
| R17 | Embedding/图文与区域相似，模型空间隔离 | P17, P18 | spec-only |
| R18 | 混合检索与可追溯命中说明 | P18 | spec-only |
| R19 | 派生谱系、缓存一致性与重复候选 | P06, P19 | spec-only |
| R20 | 组织/笔记/工作集/原生窗口稳定边界 | P20, P22 | spec-only |
| R21 | AI设计需求解析、比较与工作集提议 | P21 | spec-only |
| R22 | 收录/下载/图片工具/回收站不被AI统一队列破坏 | P11, P19, P26 | spec-only |
| R23 | 进程托管所有权、模型安装与能力验证分离 | P09, P15 | spec-only |
| R24 | IPC、沙箱、密钥与外部服务安全 | P01, P14, P22 | spec-only |
| R25 | 诊断、资源/能力质量基准与证据分级 | P07, P25, P26, P27 | spec-only |
| R26 | AI编码为主、允许并行新增功能、可跨会话接手 | P00, P01, P27 | spec-only |
| R27 | 未来开源：依赖/模型许可、平台产物与贡献治理 | P15, P24, P27 | spec-only |
| R28 | 未来iOS/Android收集管理、云推理与同步 | X01 | future-not-in-scope |
| R29 | 未来MCP、专业工具连接器、外部AI接入 | X02 | future-not-in-scope |
| R30 | 视频/帧/音频/录屏/抠图/可编辑层 | X03 | future-not-in-scope |
| R31 | 自托管推理与推测解码/KV压缩等前沿实验 | P23, P24, X04 | spec-only |
| R32 | 本轮只细化代码框架，不针对UI/UX或交付版本排期 | P00, P01, P27 | spec-only |

## 测试

| ID | 对应阶段 | 生产验收 |
| --- | --- | --- |
| T01 | P00, P01, P27 | NOT_RUN（本轮） |
| T02 | P01, P02, P04, P06, P10, P11, P14, P16, P18, P19, P20, P21, P22, P26, P27 | NOT_RUN（本轮） |
| T03 | P02, P27 | NOT_RUN（本轮） |
| T04 | P03, P04, P10, P11, P12 | NOT_RUN（本轮） |
| T05 | P03, P04, P06, P10, P11, P12, P15, P23, P24, P25 | NOT_RUN（本轮） |
| T06 | P04, P05, P10, P11, P20 | NOT_RUN（本轮） |
| T07 | P02, P05, P09, P10, P11, P12, P14, P17, P19, P21, P22, P26 | NOT_RUN（本轮） |
| T08 | P05, P10, P11, P16, P17, P26 | NOT_RUN（本轮） |
| T09 | P07, P08, P10, P13, P26 | NOT_RUN（本轮） |
| T10 | P08, P09, P13, P15, P19, P23, P24, P26 | NOT_RUN（本轮） |
| T11 | P07, P08, P13, P23, P24, P26 | NOT_RUN（本轮） |
| T12 | P03, P09, P12, P13, P23, P24 | NOT_RUN（本轮） |
| T13 | P05, P14, P21 | NOT_RUN（本轮） |
| T14 | P15 | NOT_RUN（本轮） |
| T15 | P16, P18 | NOT_RUN（本轮） |
| T16 | P17, P18, P24 | NOT_RUN（本轮） |
| T17 | P16, P18, P21, P25 | NOT_RUN（本轮） |
| T18 | P06, P19, P23, P26 | NOT_RUN（本轮） |
| T19 | P20, P21, P22, P26 | NOT_RUN（本轮） |
| T20 | P21, P22 | NOT_RUN（本轮） |
| T21 | P01, P14, P20, P22, P27 | NOT_RUN（本轮） |
| T22 | P01, P07, P13, P14, P25 | NOT_RUN（本轮） |
| T23 | P13, P16, P17, P18, P23, P24, P25, P26, P27 | NOT_RUN（本轮） |
| T24 | P00, P03, P07, P09, P15, P17, P22, P23, P24, P25, P27 | NOT_RUN（本轮） |

## 关键决定

| ID | 决定 | 状态 |
| --- | --- | --- |
| DAM-A001 | 保留模块化单体宿主，计算隔离但不先微服务化 | Proposed；未签收 |
| DAM-A002 | Library Host保持权威；Managed/Eagle/Legacy独立 | Proposed；未签收 |
| DAM-A003 | 能力逻辑独立，完整响应可复用物理执行 | Proposed；未签收 |
| DAM-A004 | Recipe/Profile/Backend/Runtime/Readiness分别版本化 | Proposed；未签收 |
| DAM-A005 | 持久任务采用可重试执行与幂等结果效果 | Proposed；未签收 |
| DAM-A006 | 证据、成功状态和Outbox在Host事务提交 | Proposed；未签收 |
| DAM-A007 | 持久任务意图不携带永久库/外发权限 | Proposed；未签收 |
| DAM-A008 | 资源预算是DAM约束，非操作系统全局硬预留 | Proposed；未签收 |
| DAM-A009 | 原子多资源准入与驻留/计算双许可 | Proposed；未签收 |
| DAM-A010 | 规则与迟滞优先，模型路由受质量/授权/资源约束 | Proposed；未签收 |
| DAM-A011 | 托管本地、用户本地、远端服务的控制权不同 | Proposed；未签收 |
| DAM-A012 | 不可变AI证据与用户覆盖层分离 | Proposed；未签收 |
| DAM-A013 | 输入/缓存按内容与授权域识别，不仅按路径 | Proposed；未签收 |
| DAM-A014 | 查询在Host，索引可重建且空间/代际隔离 | Proposed；未签收 |
| DAM-A015 | 设计助手先提供证据与提议，再用户确认写入 | Proposed；未签收 |
| DAM-A016 | 先使用验证组合；前沿优化为可回退实验 | Proposed；未签收 |
| DAM-A017 | 手机共享领域契约，不共享Electron进程和活动DB文件 | Proposed；未签收 |
| DAM-A018 | AI实施按小切片与证据推进，设计完成不等于代码通过 | Proposed；未签收 |
| DAM-A019 | 资源协调覆盖所有DAM负载，但不替代各域恢复状态机 | Proposed；未签收 |
| DAM-A020 | 安全升级和平台依赖必须按实际锁版本验证 | Proposed；未签收 |
