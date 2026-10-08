# P25 诊断、原因码与评测（Proposed）

## Trace与原因目录
贯通plan/wait/load/input/infer/validate/commit/notify spans；Host生成traceId，绑定job/attempt/physical内部ID，跨窗口只给许可范围的投影。span status与Job成功分开：commit成功+notify失败仍Job成功，单独warning。
字段白名单：opaque ID、phase枚举、durationMs、status、reasonCode、资源估计/观测状态、模型/配方公共版本、usage可信度。原始message/details不得直接进入安全诊断流；在调用方构造固定code，未知异常只映UNKNOWN_ERROR，不拿regex替换当完整脱敏。P01trace规范延伸需版本化。
原因域：WAIT_MODEL/WAIT_RESOURCE/WAIT_AUTH/WAIT_BUDGET、SOURCE_CHANGED/SESSION_REVOKED、OUTPUT_TRUNCATED/OUTPUT_INVALID/QUALITY_HELD、COMMIT_UNCERTAIN、NOTIFY_FAILED、REMOTE_OUTCOME_UNKNOWN。每code定义阶段、是否可自动重试、用户动作、是否已有持久效果，不能仅凭“失败”重跑。

## 评测报告模板
runId/time/sourceRevision+dirtyDigest、command/exitCode/rawLogDigest、evidenceLevel、OS/hardware/runtime/model/recipe/profile、输入授权与去标识范围、开发/验收split、cold/warm/sampleCount、结构/语言/语义/资源/恢复独立结论、未覆盖项、资源/费用unknown。样例重复调参后不能沿用验收集名宣称泛化。
质量：标签相关性/语言/重复；caption无依据断言；OCR字符/区域/有效空与修订；prompt创作可复用性；检索Recall@K/解释真实率。资源：加载/稳态/峰值、swap/CPU/GPU、交互P95相对无后台基线。缺硬件/原始日志/实际命令就NOT_RUN或historical-reported，不升格PASS。

## 测试路由与现有入口
契约/纯逻辑选run-ts-test；SQLite选Electron Node；正式链路选Electron E2E；模型/平台包另按授权。contracts.proposed.json记录已核对package中的test-log-path-governance、test-active-library-host、test-visual-ai-download-integration、test-work-sets等，生产执行本轮全NOT_RUN。诊断UI只扩现有数据接口，不重设计页面。
可执行规格测试白名单、嵌套敏感字段丢弃、未知reason不透传、commit后通知失败保留成功、证据类型不冒充真实模型。不能因此宣称项目所有日志已脱敏；未来T05/T17/T22/T23/T24需要注入synthetic secret到各异常路径并扫描实际导出、trace开销实测与保留期清理。
Proposed决定：证据等级写进每项结论和机器报告，允许unknown而不捏造数字。来源S00/S27/S30为报告机制索引，无外部遥测服务部署/上传。
