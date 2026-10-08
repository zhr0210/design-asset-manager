# Evidence契约与validator设计

状态Proposed；依据目标EVIDENCE-11、AI-06、S00 §9和U01。配方与配置的精确冻结承接P03，但P03兼容综合配方保持原行为；独立能力模式必须使用新的配方版本，不能悄悄改变旧parser。

## 存储对象与来源语义

Evidence是库内不可变结果；成功状态、当前选择与用户覆盖是不同对象。推荐局部接口仅为Host内部 `commitCapabilityResult(ticket, candidate)`、`readEffectiveAnalysis(assetIds)`、`applyUserDecision(scope, expectedOverlayRevision, action)`；其中ticket不是Renderer可任意构造的凭据。纯validator/selector作为内部可替换边界；SQL、历史适配、去重、代次与用户规则不散落到UI。

| 归因值 | 含义 | 本阶段用法 |
| --- | --- | --- |
| observed | 工具观测，仍可能误识别 | 专用OCR，不代表绝对事实 |
| measured | 确定性测量，范围/算法可追溯 | 配色接口预留语义；本阶段不创建配色Evidence实现 |
| inferred | 模型根据输入推断 | 标签、描述；历史视觉OCR也按推断文字处理 |
| creative | 再创作建议 | 反推prompt，不能标原始提示词 |
| user | 人工决定/文字 | Overlay及确认关系；不会伪装模型Evidence |

JSON文档schema只允许本阶段四种能力的匹配归因；不为measured/user硬造空Evidence能力。schema文件在 `schemas/analysis-evidence.v1.schema.json`，形状仅为提案；依赖语义检查的部分在下节，不声称仅靠JSON Schema即可保护权限。

新Evidence公共字段：evidenceId、libraryId、assetId、capability、sourceBinding、recipe、profile、execution、quality、attribution、value、createdAt。`sourceBinding`分开记录assetLifecycleRevision（提交防线）、contentKey（保守内容身份）、previewGeneration、inputArtifactDigest和inputTransformVersion。当前没有通用内容代次：最小实现使用Host验证的preview引用+素材版本构成opaque contentKey，另保存实际输入digest；不允许Renderer自报hash成为内容权威。P06后有可信内容身份再版本化接入。

`execution`含requestGeneration、attemptId、claimEpoch、jobId（尚无持久Job可null）、physicalInvocationId（若适配器无此身份可null）；Host签发/冻结。jobId缺失不影响单次Host门控，但不提供崩溃后恢复推理；P05未来接手意图、claim和恢复。createdAt只用于展示/审计，不做新旧请求排序。

新recipe须有id/version/digest；profile有id/version/digest并保留可知模型声明与unknown状态，weightsDigest可null；精确profile文档hash不等于模型hash。不能记录密钥、原图/base64、绝对素材路径或原始HTTP响应。Evidence结果文字只保存在相应库，不进入App统计/诊断日志。合成样例用虚构ID/hash，不能当真实模型身份。本schema的profile字段是最小追溯摘要；精确Profile/Recipe原文须在库内不可变配置快照中可按digest解析（可随Evidence受限内联或使用同事务配置记录，DDL评审时定一种），不能只留下指向易变App设置的引用。摘要不是完整运行参数重现承诺；不可取得的服务侧参数保持unknown。

## 能力值与有效空值

| 能力 | 值 | 基础结构约束/兼容界限 |
| --- | --- | --- |
| tags | labels:string[] | 每项trim非空；最多30项，每项80 UTF-16；规范化去重在独立配方定义；[]可表示无适用标签。中文/8标签是质量规则或新配方门槛，不能宣称现有parser已强制 |
| caption | text:string | ≤16000 UTF-16；兼容配方允许空；新独立配方通常要求非空以成为当前，不凭空承诺语言/事实质量 |
| ocr | 专用观测：engine/version/recipe/modelSha256、width/height/elapsedMs/threshold/blocks | 复用validateOcrObservation语义：500块，每块2000/总16000 UTF-16、归一化非退化四边形、score≥.5；[]为succeeded-empty，绝不能用空串包装异常 |
| prompt | text:string | ≤16000 UTF-16、trim非空；creative。只在显式请求的能力集合内提交 |

OCR区域坐标是本次受控输入的归一化坐标；没有原图变换证据时不得宣称原件坐标。现有blocks数组顺序仅是存储/拼接顺序，历史没有稳定regionId或验证reading order，不补造。新区域修订未来需evidenceId+稳定regionId+输入变换，P04先保留整段修订。

## 两层validator（设计，未实现）

1. 传输层先证明完整终止、响应字节有界、内层完整对象且不歧义。截断、残缺JSON或finish_reason=length整次失败，无任何能力成功。保持P03拒绝救残片规则。
2. 新独立配方声明能力字段后分别做结构、语言/格式和适用性检查。完整JSON中tags合格、caption失败，可以只提交tags；未请求字段即使合格也不提交。旧综合配方仍要求原四字段一次通过，不偷换其成功定义。
3. schema结构校验拒绝未知版本、额外字段、类型和大小异常；semantic validator校验UTF-16单位、ID关联、capability/attribution、hash引用、OCR非零面积/累计长度、归一化身份冲突、Recipe有效空值和质量规则。draft-07 maxLength的Unicode计数不能冒充JS .length，运行时须补UTF-16校验。
4. `quality`分别记录structure=valid、language与semantic的pass/fail/not-assessed/not-applicable、eligibility=eligible/held和有界reason codes。eligible是版本化配方允许进入投影，不等于语义真。若门槛不满足则held保存为非当前或拒绝保存，策略冻结在配方；传输/结构无效不能伪装held Evidence。
5. Host事务复核票据、当前库lease/generation、素材状态/版本、内容/输入绑定、代次/claim、取消、来源范围与升级许可。纯validator通过不授予任何写权限；Worker不传入可信“已校验”标志绕过Host。

历史对象使用单独的兼容投影类型，允许recipe细节、contentKey、requestGeneration、execution为空并携带unknownReasons；不硬塞进新Evidence schema填假值。只有源行确有的OCR模型hash/尺寸才能引用。

## 提交与错误

每能力独立同步事务：校验 → 去重/追加Evidence → 按CURRENT-SELECTION计算pointer → 递增投影revision → 提交 → 通知。同物理响应的多个能力可逐个提交；一个能力失败不回滚已经成功的另一能力。批次显示各项状态，不能将一个成功包装为全部成功。

P05未接线前不承诺“Evidence+持久Job+Outbox原子提交”；未来需把其成功转换和Outbox插入同一Host事务，不能提交后再独立记成功。通知失败保持已提交成功，通过重新读取恢复。

同`asset+capability+requestGeneration+attemptId+claimEpoch`重复提交：语义payload摘要相同返回原receipt，不再新增；不同则CONFLICT，不能INSERT OR IGNORE静默吞掉。摘要包括身份、来源、配方/配置、值与质量，排除Host生成的evidenceId/createdAt；提交结果可能未知时先查receipt，同一动作不自动再次推理。查receipt仍须当前有效库scope及同素材/请求权限；若能证明已提交的同一效果，只返回原回执，不因后来代次改变再写一次。尚未提交的旧代次仍一律拒绝。
