# P01｜夹具与验证计划

**所有schema语义、跨语言、依赖强制和业务行为测试均NOT_RUN。** 本轮只对文档结构/引用/工作区保护做检查。JSON可解析不等于它符合schema；schema符合不等于权限正确。

## 1. 已编制的资料

- `fixtures/contract-cases.json`：56个结构实例，指向同一套4份schema。每条有两语言共同期望，但executionStatus全部NOT_RUN。
- `fixtures/behavior-scenarios.json`：20个有界场景，actualResult全部NOT_RUN。
- `fixtures/compatibility-examples.json`：旧DTO、新envelope、旧void成功的JavaScript断言及两类旧失败信封。
- `manifests/ERROR-CATALOG.json`：12种封闭错误组合及唯一提交后warning。

## 2. 实施时的层级门槛

| 层级/对应T | 方法 | 必须验证 | 当前 |
| --- | --- | --- | --- |
| L1 / T01,T21 | Ajv候选编译本地schema，Python同方言验证，逐case输出布尔 | 56条期望完全相符；两个引擎逐项一致；禁止默认值/强制转换/未知字段移除 | NOT_RUN |
| L1 / T01 | TypeScript AST解析少量真实模块，Python AST辅助 | D01–D08负向fixture，无法解析标UNKNOWN；type-only不能掩盖越层类型耦合 | NOT_RUN |
| L2/L3 / T02 | 临时Host/合成库，事务故障注入 | scope、evidence、重复、回滚/unknown区分；用户字段不变 | NOT_RUN |
| L3/L4 / T21 | 正式IPC/Preload与可信/伪造frame | 主窗、卡片A/B、关闭/换库、unknown版本/operation拒绝 | NOT_RUN |
| L3/L4 / T22 | 提交后通知失败、响应丢失、追踪内容哨兵 | 已提交仍成功；不盲重试；日志无用户内容/密钥/路径 | NOT_RUN |
| L4 / T01 | 旧VisualAiPanel和原生卡片兼容回归 | 旧void/result不变，旧success/error家族不被批量替换 | NOT_RUN |
| 打包可用性 | 已批准平台的bundle/生产依赖检查 | 开发依赖不会使打包后缺validator；不重编SQLite修环境 | NOT_RUN |

这些是未来IMPLEMENT的测试设计，不是当前已有测试已经覆盖新契约的声明。现有`test-visual-ai-download-integration`、`test-app-ipc-registration`、`test-asset-card`可作回归入口，但新增v1须先有实际实现与专门夹具调用。

## 3. 跨TS/Python共同输入

建议未来建立一个只读取schema与fixtures的离线runner：

```text
本地白名单schema registry（同SHA）
  + contract-cases.json（同SHA）
  ├─ TS runner / 明确Ajv版本和选项 → [caseId, valid, normalizedFailureKind]
  └─ Python runner / 明确Draft7Validator版本 → 相同格式
       ↓
  caseId集合一致 + 各自符合期望 + 两者逐项一致
```

不比较验证器原始错误字符串，不把完整错误对象写日志，不调用本样本的业务handler，不打开SQLite、不启动Python模型，不让测试Python进程取得标签写接口。

Python验证环境尚未选定/锁定，新增jsonschema依赖、Python版本兼容和其打包方式未批准。因此不能把机器上可能存在的库用于“临时通过”。现有Pydantic模型不是这对schema的消费方，不能声称已有跨语言验证。

## 4. 结构与语义刻意分开

Q20（41个补充平面字符）在schema码点长度规则下可合法，但新样本兼容规则要检查80 UTF-16单元；S14必须拒绝，不静默截断。R13形状合法但assetId与请求不一致；S17必须拒绝用于当前UI。sender/卡片/库generation不由JSON Schema判定。

safeMessage使用目录中固定值，因此带合成原文的R04/R06等被设计为不合法。trace schema只验证单条形状；phase/outcome与实际提交事实的一致性还要由行为测试判定。

## 5. 不属于本阶段的验证

没有真实模型、GPU/内存压力、跨OS安装包发布、真实Eagle、私有资料库升级或云费用测试。错误信封设计不能替代这些证据。旧历史模型8/8、UI17环节不计为P01新契约通过。

## 6. 实施前置与止步条件

ADR/字段/新channel审批，生产验证器依赖方案，Python离线一致性环境，P00待审结论的处理方式及P01 IMPLEMENT范围必须明确。任何缺口标NOT_RUN/BLOCKED；不能删负向夹具、放宽schema或改成mock“成功”来提高通过率。
