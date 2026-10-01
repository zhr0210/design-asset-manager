# P03｜解析、Provider与兼容验证计划

全部运行结果均NOT_RUN。本轮不会import parser、运行合成服务、调用Sharp或读取模型/私有样本。

## 1. 已编制夹具

- `fixtures/request-goldens.json`：analyze/reverse × initial/retry，共4组body金样；图片字段为符号占位符，后续由生成测试JPEG替换，不能直接发送。
- `fixtures/parser-cases.json`：36组预期，覆盖完整JSON/代码块/说明、text parts、finish reason、空值、长度、重复、UTF-16、未知字段与不完整结果。
- `fixtures/provider-scenarios.json`：26项时限/取消/绑定/错误/就绪/身份/日志/单写场景。
- `fixtures/synthetic-provider.plan.json`：未来依赖注入的脚本化响应行为，没有创建实际mock服务。

## 2. 必须保留的负向场景

length正文即使完整也拒绝；未闭合JSON可重试一次但绝不保存部分字段；缺字段/闭合坏JSON/HTTP拒绝不自动重试；第二次不能换图片/模型/目的地或重置时限；取消和切库不发生晚到提交；提交后通知异常不反转成功。

兼容敏感场景包括：9个标签仍可能有效，31个重复标签在去重前即被拒绝，空caption/tags可接受，非空ocrText可接受，英文标签仍可能结构成功，message对象存在但无content不能用choice.text兜底。不得用更漂亮的归一化函数无意改变这些规则。

## 3. 层级与后续入口

| T | 未来检查 | 门槛 | 本轮 |
| --- | --- | --- | --- |
| T04/T05 | 旧parser与抽取后Validator跑同36份合成payload | 输出/错误完全一致；结构通过不当作语言/语义通过 | NOT_RUN |
| T05 | old/new request builder比较4个金样 | 除注入同一生成图片外body与顺序/缺省参数一致 | NOT_RUN |
| T05/T12 | 合成Provider注入各响应和取消点 | 至多2物理调用，共享deadline；无隐式Adapter重试 | NOT_RUN |
| T12 | Profile/server身份与配置变化 | 已审阅绑定一致；未知hash不伪造；不支持参数明确拒绝 | NOT_RUN |
| T24 | 仅models返回、loopback代理、历史profile | 不晋升视觉ready、verified-local或当前安装证据 | NOT_RUN |
| T04/T05 | 临时Host与旧VisualAiPanel/原生卡片 | 单次正式提交、用户内容保护、旧结果可读 | NOT_RUN |
| T24 | 指定新组合真实推理/资源/平台 | 需要版本锁定、输入授权和实际环境 | NOT_RUN |

可复用现有源码入口：`scripts/visual-ai-transport.test.ts`、`npm run test-visual-ai-download-integration`、`npm run test-ai-backend-restoration`、`npm run test-library-canvas-electron`。它们目前只覆盖既有实现，不能在新接口未实现时声称新框架回归已过。

如果新增schema loader，须按P01选择并锁定验证器，离线加载两份文档schema；本轮仅JSON解析与引用/digest检查，不是Schema引擎验证。Provider依赖图/权限仍须真实负向测试，字符串扫描不代表隔离证明。

## 4. 历史L5与本轮分开

2B/8B历史manifest与报告可读，已知报告限定M4/24GiB、b11057、Q4_K_M/F16及当时参数；原始私有输入/回复已清理，本轮未复核模型文件或运行服务。当前P03抽取尚未发生，因此不存在本轮新Provider的L1–L5通过结论。

多后端、MLX、新OCR、模型下载、云额度和真实用户库不属于本阶段。合成后端绝不作为产品失败fallback。
