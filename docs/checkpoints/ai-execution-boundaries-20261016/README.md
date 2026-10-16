# AI执行目标与调度职责：2026-10-16

用户确认一个AI一级系统、四项职责及按位置/控制权区分三类执行路径。本轮只明确文档与代码拥有者：自有本地Runtime、独立本机服务、远端服务；模型选择/路由、任务调度、驻留、资源准入。Host/Runtime权威、原绑定/语义、UNKNOWN/物理释放、云端许可与现有模型限制继续有效。

baseline.json/before保全八路径原字节；criteria.json在写入和派发前确定判据。CONTEXT只增加Task Model Binding与DAM Inference Target两项领域定义，既有概念保持；0492仍Proposed，本轮不批准整套设计或改产品代码。官方项目对照来源归AI正文参考表，不复制其实现/命令，不宣称已接入框架。

## 内容与边界

AI正文新增两轴三目标、四职责/实际代码拥有者、当前配置覆盖缺口和官方项目参考；架构/Runtime/网关README给入口，文档元数据增加现有load-plan/config文件。不拆新的一级系统/服务，不改变模型/输入/目的地许可，未把本机用户服务当自有进程。0492仍Proposed，本轮只确认用户选择的职责方向。

[terminology-check.json](terminology-check.json)核对原1408项定义未改，新增两项领域定义；domain.md将旧迁移数量明确为历史快照，原重建索引不改写。changes.diff相对此八路径原字节，不把既有WIP算本任务。

## 自主消费验证

三个全新低思考上下文只收dispatch.json里的自然短任务/工作区/只读限制，没有文件、关键词、阅读顺序或答案提示。主Agent查实际可观察工具返回与最终应用，见[evaluation.json](evaluation.json)、[probe-sessions.json](probe-sessions.json)及trace.json（不含隐藏思维）：

- [HTTP和控制权](ai_target_control.response.md)：实际到新三目标/四职责正文，结合源码区分自有Runtime、独立Ollama与云服务；客户端任务结束不等显存回收。
- [资源不足换模型](ai_model_policy.response.md)：实际消费新职责和绑定规则，区分选择与资源/排队；不能静默换小模型/量化/输入或转云，当前队列不冒充全部目标。
- [统一调度与取消ACK](ai_runtime_release.response.md)：从0173/0492/现有设计及源码核对实际回收与UNKNOWN，边界判断有依据；未直接读新正文，因此该项不计作新章节检索通过，仅保留为相邻保护理解证据。

必要正文实际可见，部分宽搜索/源码输出仍截断，不宣称全部代码已读。旧ExternalHTTP Provider的stop只为该类保留实现的静态反例，不证明当前生产启用。两个代表任务对新正文的三层检查通过；不把未验的新入口或任何模型/性能/真实释放资格混入结论。

[candidate-integrity.json](candidate-integrity.json)确认2640份候选与本地正文一致，TASK/本任务证据排除可收尾更新；历史/研究/旧答案/Git/运行数据不在候选，缺来源链接限制追溯。只读由指令/文件模式实现，不冒称OS沙箱。结构/链接、术语、上下文/ADR及显式路径同步通过，见[checks.json](checks.json)；没有运行产品测试或重复无关路由全套。

本轮文档目标完成。不运行应用/模型/服务，不下载权重，不操作资料库、提交或发布，实际重构与资格留具体后续任务。
