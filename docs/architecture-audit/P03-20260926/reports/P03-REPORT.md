# 阶段报告：P03

## 1. 身份与范围

- 阶段ID/模式：P03 / **SPEC**。
- 时间/执行者/责任人：2026-09-26；Codex；用户/项目责任人待审。
- 需求/决定/测试：R05/R12；DAM-A003/DAM-A004为目标参考；Proposed ADR `P03-VISION-PROVIDER-SEAM`（仓库ID待分配）；T04/T05/T12/T24。
- 工作区：`codex/product-reassessment-20260905`，HEAD `3fa00df3bbb605478da6d0af18724d64021e723c`。开始时1366条Git状态，staged 18、unstaged 775、untracked 587（可重叠）；保护1772份既有文本与index/diff指纹。
- 保护方式：只新增P03独立目录，不覆盖P00/P01/P02、AGENTS/CONTEXT/TASK或业务文件，不自动暂存/提交/清理。前后记录见evidence。
- 实际读取：P03任务卡/模板、包AI-05/AI-06及前序CONTRACT-04、S00/S01/S02、R/DAM-A；P01直接前置设计与P02最近报告；现行controller/transport/parser、settings/probe/IPC/type、旧Provider/提示常量、历史脱敏manifest/report和聚焦测试源码；公开llama.cpp master及b11057文档。
- 未取得/未验证：当前实际服务配置、模型/投影/Runtime文件和已安装状态、私有样本/原始模型回复、完整历史运行快照、新Provider的运行证据。没有从同名模型或历史manifest补造当前已验证hash。
- 前置设计：直接依赖P01，仍ready_for_review；用户在P02结束后“继续”授权开展P03 SPEC，不改写前序审阅/实施状态。
- 前置实现：均not_started。P03可基于源码开展设计，不假定P01新信封或P02迁移已接线。

## 2. 事实、提案与批准分开

核实事实：

1. 当前prepare冻结受控JPEG与服务/模型/库scope，1024/JPEG85/白底、32MiB和5000万像素限制；既有执行最多两个批次、每素材共享最多120秒。
2. transport使用中文固定提示、温度0.2、1536→3072一次截断重试；未显式发送top_p/seed/response_format/stream/tools，不自动切Provider。
3. parser要求完整结构，length即使正文完整也拒绝。提示最多8/6中文标签，但硬限制为30标签、每项80 UTF-16；不强制语言，caption/tags可为空，ocrText可非空。
4. ModelServiceProbe只调用models列表。回环地址、配置vision布尔、模型列表成功不是最终本地执行或视觉质量证明。
5. 旧Provider的中文/输入/重试有策略价值，但partial成功、独立每次超时和旧全局DB不能整体恢复。

设计提案：不可变兼容Recipe/Profile，Provider单次请求边界，上层唯一重试/取消协调；配置、模型/Runtime身份、就绪和授权分开。冻结本次可知版本；远端不可知记opaque/unknown。旧证据保持可读，不伪精确回填Recipe hash。

未批准：新Provider生产注册、Profile装载/默认选择、公共结果来源扩展、严格语言验证、新后端/模型/OCR安装、资源/云端调度。此阶段不改变默认模型或静默增加能力。

已批准：用户“继续”仅授权P03 SPEC交付；没有IMPLEMENT或本轮L5执行授权。P02发现的两处源码问题继续保留，未顺手修复。

## 3. 变更

实际仅新增：契约设计、兼容基线、旧策略继承表、ADR、验证计划、来源、报告；1份兼容Recipe、1份未绑定服务兼容Profile、2份历史组合记录（均disabled）；2份Proposed文档schema；4请求金样、36解析夹具、26Provider场景及合成后端设计；阶段/需求/决定和保护记录。

SPEC拟改边界：现有visual-ai内部抽取request variant、Profile resolver、invokeOnce、兼容协调，controller与Host单写入口保持；需要来源持久化时再审批evidence_json/公共类型兼容。不创建全部未来目录，不实现独立能力提交/全局Job/资源许可。

事务/状态：Provider返回受限未信任响应，上层完成解析与scope检查后由Host一次提交。外部取消物理效果未知；提交后通知失败不反转成功。当前schema升级时机、用户修改优先和旧IPC信封保留。

外部副作用：仅查询公开技术文档；没有发送图片、读取用户配置/模型缓存、启动模型/合成HTTP服务、安装依赖、操作资料库或终止用户服务。

## 4. 验证记录

PASS仅指文档一致性，不是解析/Provider实际运行。完整日志见`../evidence/STATIC-CHECKS.json`。

| T ID / 场景 | 证据等级 | 实际命令或检查方法 | 环境/输入范围 | 结果PASS/FAIL/NOT_RUN | 退出码与日志路径 |
| --- | --- | --- | --- | --- | --- |
| T04/T05 当前兼容资料 | DOC/SRC | 固定源码提示提取、digest、金样/版本引用检查 | 仓库源码文本和P03 JSON | PASS（文档） | 0；STATIC-CHECKS.json |
| T12/T24 身份与就绪边界 | DOC | disabled/unknown/historical标签和引用检查 | 公开制品manifest与文档 | PASS（文档） | 0；STATIC-CHECKS.json |
| 工作区/阶段保护 | DOC/SRC | Git index/diff和原1772份文本摘要对照 | 原工作区和独立P03目录 | PASS（以保护日志为准） | 0；WORKTREE-PRESERVATION.json |
| T05 parser与请求等价 | 计划L1/L3 | 未import或执行parser/transport | 36解析夹具、4金样只是期望 | NOT_RUN | 无 |
| T12 Provider/超时/取消/绑定 | 计划L3 | 未启动合成Provider或HTTP端点 | 26场景只是设计 | NOT_RUN | 无 |
| T04 Host/旧UI/单写 | 计划L2–L4 | 未运行应用/SQLite/业务测试 | 无 | NOT_RUN | 无 |
| Profile/Recipe schema语义 | 计划L1 | 未运行Ajv或跨语言validator | 文档JSON语法检查不等于schema验证 | NOT_RUN | 无 |
| T24 新真实模型/平台/质量 | L5/L6 | 未执行 | 无授权输入/二进制读取 | NOT_RUN | 无 |

历史2B/8B测试只作参考，与P03未实施Provider的结果分开。没有把合成计划、JSON解析或文档查阅写成新框架测试通过。

## 5. 故障、安全与兼容

超时/取消/恢复：保持同一批次/图片/服务/别名与共享signal，不重新开始完整超时；不承诺网络abort等于用户服务停止或费用归零。旧receipt不跨重开获得权限。

失败/重复：仅截断允许一次兼容重试；HTTP/格式/字段错误不增加隐式调用；SDK/Provider禁内置重试以防倍增；单写开关不双推理或双提交。

用户状态/旧数据：Host检查原版本/预览；手工描述/确认标签/专用OCR修订保留；旧visual-ai-v1照常读取，不补造精确历史digest。现有结构上限与软语言要求保持区别。

授权/资源：Provider无DB/任意路径/安装/进程终止能力；config/modelList不等于授权或ready。新Recipe不能借抽取扩大输入范围、偷偷发原件或切云。

未覆盖：新接口运行兼容、实际模型版本/上下文支持、物理取消/驻留释放、云费用/最终计算位置、Windows/打包/语义质量。本轮不作放行。

## 6. 回退

当前没有业务改动，无需停止模型或回退数据库；独立文档目录可归档，原工作区保留。

未来IMPLEMENT若等价门槛未过，停新准入并按当前Host drain；回到“抽取前的正式transport策略”，不恢复旧Worker/全局DB。已提交证据保留，不自动重分析或删除用户状态。

Profile/Recipe修改保留版本来源，配置回退不能承诺远端同别名还是同权重。未来来源字段扩展需要兼容旧读者，不借git回退掩盖数据语义变化。

临时制品：仅文档生成/检查辅助，无用户素材临时副本，无模型/合成服务进程。不可自动回退影响：本轮无业务副作用。

## 7. 结论与接手

设计状态：**ready_for_review**；实施状态：**not_started**。

P03 SPEC交付完成，当前行为、抽取边界、未知身份和旧策略继承可追溯。Provider/loader/schema语义/解析/业务执行均未实现或未运行。

前置限制：P01设计仍待审；P02非本阶段直接依赖且其发现未修。公开规范、历史模型报告不能替代新抽取后的兼容/质量证据。

用户审核：仅本轮续行SPEC授权，无本ADR或IMPLEMENT签收。下一候选P04，本轮不开展；后续仍按明确任务和模式继续。

更新路径：本目录契约/配置/夹具/报告，`../manifests/CURRENT-STATE.json`、stages、REQUIREMENT-TRACE、DECISION-TRACE及evidence；未改仓库TASK/AGENTS或前序阶段。

**本阶段结束，停止，不自动进入P04。**
