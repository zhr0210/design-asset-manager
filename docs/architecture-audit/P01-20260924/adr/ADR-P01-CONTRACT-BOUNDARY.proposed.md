# ADR：待分配仓库ID｜用显式版本契约包围一个现有标签确认操作

状态：**Proposed**。日期：2026-09-24。作者：Codex；评审人：待用户/项目责任人确认。
关联：P01；R01/R24/R26/R32；DAM-A001/DAM-A020；T01/T02/T21/T22；S00/S18/S24/S30。

本文件是独立SPEC草案，不占用仓库ADR编号，不修改既有Accepted决定，不代表接口已经接入。

## 背景与证据

现行调用：`VisualAiPanel.tsx`的标签按钮→主Preload `visualAi.confirmTag`或卡片`visualAiAPI.confirmTag`→`registerVisualAiIpc`→Controller `confirmTag`→Host `confirmVisualAiTag`→storage `confirmVisualAiTag`事务。

现行Visual/OCR外层多为`{ok:true,value}|{ok:false,error:string}`；Active Library为`{success:true,value}|{success:false,error,code}`；部分旧AI接口会Promise reject。现有Host将不能识别的内部Error转成`library-operation-failed`，不能从中文错误文案准确反推是否可重试或是否已提交。视觉Controller在提交后吞掉通知异常，防止把提交报成失败，但不返回结构化warning。

真实锁文件：Electron30.5.1、Ajv6.15.0、TypeScript5.9.3；Ajv目前是devDependency，用于`.codeindex`的Draft-07检查。Pythonrequirements仅声明Pydantic>=2.0；没有统一的JSON Schema Python验证器锁定，也未证明它与现有Python/OCR环境兼容。

P00的来源、旧链路与证据限制继续适用。当前工作区与P00保护范围没有源码变化，本次未重新执行其历史模型/业务测试。

## 问题与不可破坏约束

需要一个有版本、能区分错误种类且可跨语言检查的序列化边界，避免把TS类型当作运行时校验。它必须保留Host写入权威、卡片成员权限、当前库generation、现有用户确认语义；不能把requestId当永久权限或幂等数据库，不得引入第二条SQLite写路径。

## 备选方案

| 方案 | 收益 | 代价/风险 | 本轮判断 |
| --- | --- | --- | --- |
| A 保留手写TS检查与独立Pydantic模型 | 不增加验证引擎，短期接入少 | 多份定义容易漂移；跨语言需另证明；错误仍分散 | 作为旧接口兼容基线保留，不足以成为新共同数据定义 |
| B Draft-07明确数据契约 + 现有Ajv6候选 + Python同方言验证 | 复用现有方言和已声明开发依赖；当前字段不依赖2020特性 | Ajv dev→生产必须明确打包或运行依赖方案；Python测试验证器需锁定；不等于已验证 | **本样本拟选**；最小范围，先完成离线一致性门槛 |
| C Draft2020-12 + 支持该方言的Ajv8入口/对应Python引擎 | 符合包推荐评估方向，具备新组合/动态引用能力 | 不能直接使用现有Ajv6；验证器/生成物/构建升级扩大范围 | 保留候选；有实际关键字需求或统一升级批准后再选 |

包CONTRACT-04对2020-12的表述是“优先评估”，不是已安装事实。查阅官方资料后，本样本仅需type、const、oneOf、required、additionalProperties、pattern等基础关键字，暂拟Draft-07。不能将schema换成2020的`$schema`字符串就当作完成引擎升级。[S24、S24-A、S24-B]

## 拟议决定

1. 仅为现有“确认AI建议标签”制定一对显式v1请求/结果；拟议新channel为`visual-ai:confirm-tag:v1`，旧channel和公开方法保持原契约。本轮不注册channel。
2. Schema是序列化形状的单一来源。TS类型可生成或与schema共同夹具核对；Python仅在开发一致性测试消费同份schema/fixtures，不给Worker开放该写操作。
3. 请求包含`schemaVersion/operation/requestId/payload`；traceId由可信Main生成，仅出现在结果和允许的追踪字段中。输入不接受senderId、权限标志、路径、SQL、URL、API key或模型参数。
4. 错误code/kind/category/retry/commitState/safeMessage使用封闭组合。等待、可确认的回滚失败、无权限、取消、提交不确定必须分开。通知失败仍返回提交成功，附固定warning。
5. 新旧入口最终调用同一Host标签确认事务。未知旧错误不能通过字符串猜测转成“已知回滚/可重试”；需要在能判断的位置产生结构化事实。
6. 只列实际模块依赖和拟议规则，保留Main组合注入、共享纯契约、Provider无库写权。不建立空的全局Service、资源调度器或未来SDK。
7. 日志仅本地白名单元数据；不记录标签内容、素材/库ID、receipt、图片、提示词、URL、密钥、堆栈或原始校验器错误对象。[S18、S30]

## 迁移与兼容

旧入口无版本视为legacy/unversioned，不回填`schemaVersion=0`到线上数据。采用新增channel隔离收紧校验，经过批准后再逐个迁移调用方；未知版本明确拒绝，不能改调旧接口绕过新校验。

已有Controller `confirmTag`返回void。旧成功桥接保留`value===undefined`的JavaScript语义，不能因新规范是JSON就改成null。旧错误格式和静态文案应以兼容夹具保留；本轮不改其他`success/error`家族。

新增结构化错误/警告需要窄内部结果适配；不能简单包装旧IPC已经压平的字符串。Host现有通用错误包装点的调整属于未来IMPLEMENT需审的兼容影响，本轮只列拟改边界。

无DB schema变更、无持久requestId表、无Outbox或全局Job Journal。标签事务和Host锁边界保留。状态未知通过授权后的只读查询核对关系，不盲目重放写操作。

## 验证

见`../VALIDATION-PLAN.md`与`../fixtures/`。类型/JSON结构检查不证明sender、generation、提交/通知和原件边界正确。跨TS/Python必须使用相同schema摘要及夹具，不手写两份“等价”测试数据。本轮语义/行为验证均NOT_RUN。

## 代价和已知限制

- Ajv6仅是已声明开发依赖，并非已交付的生产验证器；不得让打包产物意外依赖开发环境才能运行。
- Python jsonschema是候选开发依赖，本轮未安装/锁定/执行；不能使用机器上偶然存在的包证明受控环境兼容。
- 新v1的ID和标签上限是拟议收窄约束；旧接口保持原规则，历史长标签的兼容由样本和业务证据确认。
- JSON Schema不能验证当前权限、跨请求一致性或SQLite提交事实；这些必须由实际IPC/Host测试证明。
- 本轮借鉴Trace ID语义，不安装OpenTelemetry SDK、不承诺OTLP兼容，也不外发遥测。

## 撤销/替代条件

若评审选择2020-12，按新方言重建/验证全部夹具，不在同一验证器实例混用不兼容方言。未来IMPLEMENT可关闭新增channel和调用方开关，回到保留的旧调用链；不能自动删除已经确认的用户标签，也不能用git回退假装撤销数据库事实。

## 审核与实施状态

设计：ready_for_review；实施：not_started。用户仅授权继续P01 SPEC，尚未批准本ADR、具体新channel、字段上限、错误目录、验证器依赖或公共契约实施。
