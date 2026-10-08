# 阶段报告：P00

## 1. 身份与范围

- 阶段ID/模式：P00 / SPEC。
- 时间/执行者/责任人：2026-09-24；Codex；用户/项目责任人尚未审阅签收。
- 需求：R01、R26、R32；目标决定：DAM-A001/002及相关边界，均作为包内目标引用；测试追踪：T01、T24。没有把目标决定改写为仓库Accepted ADR。
- 工作区：`codex/product-reassessment-20260905`；HEAD `3fa00df3bbb605478da6d0af18724d64021e723c`。本机可见非稀疏工作区可读，未制作含私有内容的源码包。
- 用户已有修改：1285条Git状态，staged 18、unstaged 775、untracked 506（计数可重叠）。保护清单、index/diff摘要、1686份原有文本指纹见`../evidence/WORKTREE-BEFORE.json`；结束比对见`../evidence/WORKTREE-PRESERVATION.json`。
- 实际读取：包05、CURRENT-STATE、U01、P00、通用约束、报告模板，01的SYS-01/HOST-03/DEV-21/MIG-23/VAL-22，S00/U01索引与相关阶段/需求登记；仓库AGENTS/TASK、CONTEXT相关术语、package/lock/.codeindex；Main/IPC/Preload/Renderer各关键调用方；Host、AI/OCR、查询、工作集、外部库、模型Workspace实现；聚焦测试脚本和10份历史Qwen JSON。详见三份配套审计文档。
- 未取得材料：历史完整命令/stdout/exitCode与运行时工作区digest、已清理私有输入/原文、真实Eagle/Windows/安装包/规模与新调度测试证据；不为本轮补跑或重新寻找私有素材。
- 前置设计/实现：P00无阶段依赖；包初始均not_started。可进行源码审阅，不据此把任何后续阶段标为已reviewed/accepted。

## 2. 事实、提案与批准分开

已核实事实见[当前状态审计](../CURRENT-STATE-AUDIT.md) F01–F14和[模块可达性](../MODULE-REACHABILITY.md)：

1. 正式Main把visual-ai、OCR、查询、工作集接到Active Library Host；库写入使用有效binding/lease。
2. 视觉/OCR任务控制仍各自位于内存；结果持久化不能代表持久Job Journal/Outbox/全局资源调度已实现。
3. 模型Workspace生产目录输入为null，Eagle生产Provider不可用；旧AI/Runtime/删除通道受限。
4. S00与仓库同名字节一致，38个链接文件存在；10份历史Qwen JSON已读取，其结果只作为历史reported证据。
5. 主窗口sandbox=false、回环地址local标签不能证明最终计算位置；这是现状审计，不是本轮漏洞修复或配置变更。

设计提案：后续以当前正式入口与唯一数据权威为迁移基线；先对齐U01三基础能力与旧ADR含Embedding的目标差异，并定义可追溯runId/命令/工作区digest。P00只登记，不设计或实现P01接口。

尚未批准的取舍：新增公共契约、schema/Outbox、统一Job/资源许可、后台默认值、云服务/费用、模型切换、sandbox迁移、平台/性能阈值。

已批准变更：用户仅批准本轮SPEC审计与报告。只新增独立目录；没有业务改动。原包内容是参考资料；包内“进入后续阶段”或其他模式并未产生授权。

关键决定：本轮没有新增不可逆架构决定，因此不向仓库ADR新增Accepted条目。记录的是证据分类/范围决定，不伪造架构审批。

## 3. 变更

SPEC拟改模块/接口/状态机/事务：**本阶段均无业务变更**。仅描述现有prepare→run→terminal、Host-held提交和关闭撤权，不新增端口、SQL、Provider、队列、目标空目录或迁移开关。后续需要评审的能力/任务/资源模块只标target。

实际新增：`CURRENT-STATE-AUDIT.md`、`MODULE-REACHABILITY.md`、`BASELINE-MATRIX.md`、本报告；独立`inputs/`参考副本、`evidence/`审计清单与静态校验记录、`manifests/`阶段状态/需求追踪。原ZIP、仓库AGENTS/CONTEXT/TASK与业务源码保持原样。

调用方及权威保留：VisualAiPanel/DedicatedOcrPanel/Library/WorkSetWindow及原IPC保持不变；Managed写入经Host，App DB/Eagle索引/Legacy只读各守边界。不启用旧全局DB写入，不恢复网页能力。

外部副作用与授权记录：无网络请求、无模型/应用启动、无依赖安装、无真实库/缓存访问、无用户服务终止。仅用户指定ZIP和仓库源码/文档读取、受控摘要与新审计文档写入。

## 4. 验证记录

本表PASS只指静态/文档核查，不是DAM业务测试。审计方法和退出码保存在`../evidence/STATIC-CHECKS.json`。

| T ID / 场景 | 证据等级 | 实际命令或检查方法 | 环境/输入范围 | 结果PASS/FAIL/NOT_RUN | 退出码与日志路径 |
| --- | --- | --- | --- | --- | --- |
| T01 工作区身份/已有改动 | SRC/仓库元数据 | Git branch/rev-parse/status/ls-files；内容摘要 | 当前仓库，不打开库数据库 | PASS | 0；WORKTREE-BEFORE.json、STATIC-CHECKS.json |
| T01 正式与旧入口 | SRC/人工聚焦追踪 | Main→composition→IPC→controller→Host及Renderer/Preload调用方 | 已列源码；非全程序证明 | PASS | 文本读取0；MODULE-REACHABILITY.md |
| T01 S00与材料可读 | DOC | ZIP指定成员读取、S00字节比较、38相对链接存在性 | 用户指定包/仓库文档 | PASS | 0；PACKAGE-PROVENANCE.json、S00-LINK-INVENTORY.json |
| T24 历史证据不冒充当前通过 | DOC/HIST | 读取10份JSON，区分reported字段和缺失command/exitCode | 仓库脱敏报告 | PASS | 0；HISTORICAL-REPORT-INVENTORY.json |
| T01/T24 原有工作保护与状态边界 | DOC/SRC | index/diff与原1686份文本摘要比对；P00-only状态检查 | 原工作区与新增文档 | PASS（以校验JSON为准） | 0；WORKTREE-PRESERVATION.json、STATIC-CHECKS.json |
| T01/T24 业务基线/类型/构建 | L1–L4 | 未运行npm/test/应用；命令仅核对存在 | 无执行输入 | NOT_RUN | 无 |
| T24 模型/平台/质量基准 | L5/L6 | 未启动模型、未访问私有素材或平台包 | 无执行输入 | NOT_RUN | 无 |

SPEC测试夹具设计和判定条件单列于[BASELINE-MATRIX](../BASELINE-MATRIX.md)第4节，未放进PASS业务表。历史8/8、17环节不计为本轮测试成绩，也未补写历史exitCode=0。

## 5. 故障、安全与兼容

- 关库/取消/晚到结果：源码可见epoch、scope与AbortSignal、Host关闭前等待inFlight；本轮未触发真实race或关库，不承诺外部服务物理计算同步停止。
- 恢复：当前AI结果与未完成任务分开；目标持久意图不得携带旧generation/receipt。下载恢复和Eagle Journal不替代AI任务恢复。
- 用户状态：视觉事务仅更新非手工描述，标签为建议；OCR有独立修订；该源码规则与历史报告一致，非本轮真实库证明。
- 资源准入：现有批次数/Worker内存逻辑不是目标全局多资源原子许可；此目标仍待设计。
- 授权：模型配置和localhost分类不证明最终本地执行或永久外发许可；本轮不读取密钥/用户配置。
- 旧接口/旧数据：保留拒绝表、Legacy只读、三库分离，不执行任何schema升级/真实旧库迁移。
- 未覆盖：原图事实质量、Windows/签名安装、真实Eagle、大库、后台共存、云费用、模型驻留与资源释放，见审计G01–G08。

## 6. 回退

- 停准入/drain：本轮未启动业务执行，无运行中的本轮应用/模型需要drain；不停止用户外部服务。将来实施必须沿现有关闭顺序验收。
- 源码/配置回退点：原工作区没有业务修改；不用git reset/checkout恢复。审计目录可独立保留、归档或由用户移除。
- 数据兼容/恢复：没有schema或用户数据变化，不存在数据回滚；Git回退不能被描述为数据恢复。
- 临时制品/授权：新文件全部在独立P00目录；辅助定位文件仅记录审计输出位置。原ZIP和包内初始状态保持不变。
- 不能自动回退的影响：无业务/外部动作影响；本报告不授予后续实施权限。

## 7. 结论与接手

- 设计状态：**ready_for_review**，不是reviewed。
- 实施状态：**not_started**，不是evidence_ready或accepted。
- 源码核查：限定P00范围已完成，可追溯；没有把整个仓库标成全面安全审计通过。
- 阻塞：无阻止P00出稿的源码缺失；历史原始日志/私有输入/平台证据缺口影响重现和后续实施放行，明确保留为G01–G08。
- 用户/责任人审核：尚无本报告审阅/接受记录。
- 下一阶段：候选P01依赖P00评审；目前只满足“材料可读、报告已起草”，未满足“设计已reviewed”，也未获P01实施授权。
- 更新状态：独立`../manifests/CURRENT-STATE.json`、`stages.json`、`REQUIREMENT-TRACE.json`；不覆盖包原文件或仓库TASK。
- **本阶段结束，停止；不自动启动P01。**
