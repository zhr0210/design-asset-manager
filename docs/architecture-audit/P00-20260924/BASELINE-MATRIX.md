# P00｜基线与历史证据矩阵

MODE=SPEC。本次业务测试、类型检查、构建、应用启动、模型执行、真实库访问均为NOT_RUN。仅执行Git/文本/JSON/摘要检查；静态检查不冒充L1–L6业务行为证据。

## 1. 证据口径

- SRC：当前源码入口/符号阅读；只能确认声明、调用和可见实现。
- HIST-Ln：历史报告声称的执行层级；本轮只核验文件/字段/一致性，不重新执行。
- 包VAL-22：L1类型/纯逻辑；L2临时SQLite/文件；L3合成Provider；L4正式Electron；L5指定真实模型/硬件；L6平台包/规模。
- 文档写“通过”但缺原始命令/exitCode时标reported，不自行补0。当前脚本的启动命令是复核到的入口，不能代替历史实际完整命令。

## 2. 历史报告核对（日期均为2026-09-24，非本轮PASS）

| 基线 | 取得的文件 | 历史报告内容 | 证据层级/限制 | 本轮运行 |
| --- | --- | --- | --- | --- |
| 2B生成4图 | `2b-generated-report.json` | 4/4保存，搜索/分类/恢复；约56.54秒 | HIST-L2+L5；非真实用户库 | NOT_RUN |
| 8B生成4图 | `8b-generated-report.json` | 4/4保存；约60.10秒，标签中文 | HIST-L2+L5；含场景推断，非语义质量放行 | NOT_RUN |
| 2B授权8图/8192 | `2b-real-eight-metrics.json` | 8/8，3份重试，中位4.96秒 | HIST-L5；脱敏transport测试，不经过私有库入库 | NOT_RUN |
| 2B授权8图/4096 | `2b-real-eight-4096-metrics.json` | 8/8，3份重试，报告称最终输出与8192相同 | HIST-L5；原文不在材料中，无法重新逐字段复核 | NOT_RUN |
| 8B授权8图分析 | `8b-real-eight-metrics.json` | 8/8首次完成，中位20.82秒 | HIST-L5；质量字段要求人工复核 | NOT_RUN |
| 8B授权8图反推 | `8b-real-eight-reverse-metrics.json` | 8/8首次完成，中位19.01秒 | HIST-L5；不是原Ollama配置复现 | NOT_RUN |
| 2B正式UI | `2b-ui-report.json` + `2b-ui-real-local-ai-report.json` | 17环节；两视觉任务记录、保护/取消/检索标志 | HIST-L4+L5；生成临时库，非用户真实库 | NOT_RUN |
| 8B正式UI | `8b-ui-report.json` + `8b-ui-real-local-ai-report.json` | 17环节；本次jobCompleted/hasEvidence | HIST-L4+L5；需配套模型专属报告辨认运行 | NOT_RUN |

以上文件都位于`docs/product/evidence/qwen-comparison-20260924/`。完整文件SHA与关键字段见[历史清单](evidence/HISTORICAL-REPORT-INVENTORY.json)。10份JSON均未包含完整command/argv或exitCode。报告存在且内容可读，不等于独立确认原进程exit=0。S00/TASK中的原文件SHA未变、服务停止等是历史陈述；本轮不查原件、不探测端口，也不访问模型缓存。

## 3. 真实脚本与复用条件

| 场景/关联T | 当前已核对脚本入口 | 层级目的 | 本轮结果/退出码 |
| --- | --- | --- | --- |
| 类型/构建，T24 | `npm run typecheck` / `npm run build` | L1/构建可执行性，不证明模型质量 | NOT_RUN / 无 |
| AI transport恢复，T05/T06 | `node scripts/run-ts-test.mjs scripts/visual-ai-transport.test.ts` | L1/L3，合成HTTP与解析边界 | NOT_RUN / 无 |
| AI/下载/Host，T02/T06/T07 | `npm run test-visual-ai-download-integration` | L2/L3，临时SQLite和合成服务 | NOT_RUN / 无 |
| 专用OCR存储，T02/T04/T07 | `node scripts/run-electron-node-test.mjs scripts/asset-ocr-storage.test.ts` | L2，空结果/修订/生命周期 | NOT_RUN / 无 |
| 正式UI，T19/T21 | `npm run test-library-canvas-electron` | L4；特定环境开关才执行真实AI | NOT_RUN / 无 |
| 生成图模型，T05/T24 | `node scripts/run-electron-node-test.mjs scripts/test-local-visual-ai.ts` | 默认只准备；显式执行参数才L5 | NOT_RUN / 无 |
| 授权8图模型，T05/T24 | `node scripts/run-electron-node-test.mjs scripts/test-authorized-visual-ai.ts` | 需显式opt-in、loopback、受限输入manifest | NOT_RUN；私有输入未取得 |
| 工作集，T19 | `npm run test-work-sets` / `npm run test-work-sets-electron` | L2/L4；不是全平台 | NOT_RUN / 无 |
| Eagle/Legacy，T02 | `npm run test-external-connected-library-core` / `npm run test-legacy-readonly-workspace` | 合成边界；不能据此开启真实连接 | NOT_RUN / 无 |
| 查询/旧通道，T01/T24 | `npm run test-scoped-asset-reads` / `npm run test-app-ipc-registration` / `npm run test-web-retirement` | 元数据/注册/源码规则 | NOT_RUN / 无 |
| Python，T24 | `npm run test-python-unittest` | 既有隔离offline启动器 | NOT_RUN / 无 |
| Windows/签名包/压力体验，T23/T24 | 对应平台工作流与真实环境需另行选择 | L6 | NOT_RUN；环境证据未取得 |

已读取package.json及锁文件，确认这些npm名称/脚本文件存在。SQLite测试启动器使用`ELECTRON_RUN_AS_NODE=1`运行Electron二进制；没有使用shell Node直接加载SQLite、没有重编依赖。没有运行`npm run dev`。

## 4. SPEC负向测试计划（仅计划，无PASS）

| 计划 | 对应T | 夹具/输入 | 必须得到的判断 |
| --- | --- | --- | --- |
| 只有HEAD，缺未跟踪模块 | T01 | 临时源码清单隐藏OCR/工作窗口文件 | 标工作区不足，不宣称完整架构审计 |
| 包目标目录不存在 | T01/T24 | 目标Orchestrator/Governor名称 | 标target，不能自动建空目录或标current |
| 缺报告或缺exitCode | T24 | 引用不存在/缺字段JSON | 标未取得/历史reported，不补PASS或0 |
| 模型HTTP仅返回models | T24 | 合成models列表 | 不认定图像推理ready |
| 历史模型不同平台/Runtime | T24 | M4+llama报告映射Windows/Ollama | 拒绝等价通过宣称 |
| 旧受限IPC和退休网页 | T01/T24 | active-library拒绝表/App路由表 | 不当作待恢复功能 |
| 真实Eagle未配对 | T24 | UnavailableProvider生产分支 | 不把synthetic Adapter结果升级为真实可用 |
| 任务持久化但旧权限失效 | T02/T07（后续） | 重开新generation的临时库 | 必须重新验证身份/授权，不复活旧receipt |

本阶段只把T01/T24的文档/源码判定作为当前检查。最后一项是后续契约验证需求，未开始P01或实施任务系统。
