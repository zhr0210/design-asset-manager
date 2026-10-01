# P27 目标—实际差异与交接验收（SPEC）

## 总体判断
P00–P27目标设计已按阶段形成，P06–P27新增可执行合成规格测试；设计review状态仍ready_for_review，实施not_started。现有正式视觉/OCR/Host等已有功能的源码/历史证据与目标实现分栏，不因新报告存在标新架构已完成。完整阶段、R/T/决定追踪见本阶段生成的TRACEABILITY与HANDOFF总览。

| 目标领域 | 当前证据 | 交接状态 |
| --- | --- | --- |
| Host/Copy/三库/用户优先 | 现行源码+历史报告，保护不变 | 必须保留；新兼容变更待实施 |
| 独立Evidence/Job/Outbox/session fence | P04/P05设计；当前视觉综合/内存任务 | spec-only |
| 输入谱系/资源/Runtime/自动计划/云预算 | P06–P15规格与合成规则测试 | spec-only，无真实新执行 |
| Host FTS/Embedding/混合检索 | 当前全量/词法；P16–P18设计 | spec-only，engine/tokenizer未定 |
| 缓存GC/组织/助手/沙箱 | 现有部分保护；新P19–P22方案 | spec-only；主sandbox=false未改 |
| MLX/Windows优化EP | 官方资料与旧probe | spec-only；真实测试NOT_RUN |
| 诊断/全负载/性能 | P25/P26规格 | spec-only；无吞吐/质量放行 |
| X01–X04 | 包未来阶段 | 未执行，不属于连续P授权 |

## 删除/保留证据
旧Worker/llama aliases虽disabled，但替代全部行为与外部调用方未逐项生产验收，因此保留。旧Python队列仍可能被脚本/实验使用，仅主IPC不可达不能证明全仓库无调用。Tracer、历史测试/报告用于追溯，不能按legacy/test目录批量删。实际删除清单为空。
后续每个删除候选必须同时具备入口可达性调查、所有调用者清单、替代行为与兼容契约测试、可恢复独立补丁和用户明确清理范围；拒绝用删除测试换通过。

## 尚需设计师决策
最终schema版本/DDL与一致备份恢复；P05新session如何绑定既有lease（不能改错libraryGeneration含义）；P04标签来源族/质量门槛；资源保留与迟滞实测参数；FTS中文/向量引擎；候选Preset版本与平台证据；云费用/授权政策。P02已发现v8 intent reader遗漏及Eagle检查顺序仍未修复；真实崩溃热日志先由P02安全恢复，不跳过数据库检查。

## 可修改性抽查
后端变更样本：新增MLX仅触P03 Provider/P09 Runtime/P15 Preset/P23 adapter和相关能力报告，业务Host/WorkSet无须另一个写口。能力变更样本：单独调整OCR预处理涉及P06transform/Recipe+validator与P04来源版本，P05取消/幂等不重写。此为设计依赖审查，非代码diff或可运行扩展证明。

## 活跃文档与开源准备
AGENTS规定SPEC不更新TASK；因此只交付导航/更新建议，不覆盖AGENTS/CONTEXT/TASK或旧模块README。后续IMPLEMENT再按实际交付同步，不能把目标写进当前入口。真实命令以package.json路由为准。
package声明MIT不证明所有权重/Runtime可重新分发；根LICENSE/NOTICE/SECURITY/CONTRIBUTING本次路径检查未找到（不等于全repo无许可文本）。依赖/模型/Runtime分别登记license source、版本、归属、分发方式、notice义务待审；SBOM候选应包含npm lock、Python环境精确锁/轮包、原生DLL/动态库和模型清单。Python范围依赖尚非可重现release锁。
CI含Windows/macOS与签名候选工作流，但本轮没触发CI/签名/发布。安全报告入口与贡献文档列为开源前缺口，不替用户选择新的许可证或公开私有源码。

## 最终测试/交接
本阶段规格模型测试证据分类、删除门槛与依赖局部性。随后全局核对22阶段测试日志/退出码/阶段顺序、全部32需求/24测试ID/20架构决定映射、前序报告链接、源码/工作区指纹、交接包CRC/摘要；这些仍不是业务L1–L6测试。交接包仅选文档、契约、合成规格代码/夹具与测试记录，不包括用户素材/模型/DB/源码工作区/密钥。
P27结束后停止，不进入X或IMPLEMENT；交付者不得把spec-only自动改成implemented或reviewed。
