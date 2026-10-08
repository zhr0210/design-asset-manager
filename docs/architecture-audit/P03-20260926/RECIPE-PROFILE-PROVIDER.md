# P03｜Recipe、ExecutionProfile、Provider契约

状态：Proposed。实际源码未抽取；文档schema未注册或通过运行时验证。直接前置P01设计待审，本阶段不要求其新错误信封已上线。

## 1. 对象责任

| 对象 | 拥有的内容 | 明确不拥有 |
| --- | --- | --- |
| ModelServiceConfig | endpoint、用户配置模型别名、凭据引用、超时、声明能力 | 权重真实性、质量结论、素材外发授权 |
| AnalysisRecipe | 输入变换、精确提示、完整解析/验证规则、语言要求、重试变体、投影语义 | 瞬时资源、数据库连接、选择其他服务 |
| ExecutionProfile | Recipe引用+Provider版本+请求预算+可知的模型/Runtime/资源属性 | 永久授权、密钥值、默认模型变更 |
| ResolvedAttemptContext | 本次冻结的服务句柄、输入、模型/参数、scope和剩余时限 | 可序列化到持久任务的活跃权限 |
| ProviderAdapter | 将一次请求/响应与协议对应，保持受限transport | DB写入、任务重试调度、Runtime安装/启停、素材扫描 |
| ReadinessEvidence | 配置/连通/模型列表/视觉执行/输出质量分别记录来源和时点 | 把单一health成功变成所有能力ready |

Recipe/Profile的documentFormatVersion是文档格式，recipeVersion/profileVersion是行为标识，user_version是库结构，Runtime version是执行器版本；四者不能互代。新字段含义改变须新版本/digest，不只更新显示名称。

## 2. 当前目标接口位置

```text
VisualAiController：继续持有确认、批次、取消和Host提交
  → resolveCompatibilityPlan（服务快照 + Recipe/Profile）
  → materializeControlledInput（原有Sharp顺序，冻结字节）
  → runCompatibleVision（共享时限、至多两次物理调用）
       → Provider.invokeOnce（单次HTTP，无内置重试）
       → Recipe.decodeAndValidate（沿用当前完整输出规则）
  → Host复核与saveVisualAiEvidence（唯一权威）
```

这些是职责位置，不要求立刻创建全部目录。先在现有`visual-ai/`内部建立可替换边界，保持现有controller入口和结果契约。不要为每个函数再包一层工厂。

## 3. Provider最小端口示意

```text
ProviderDescriptor
  adapterId / adapterVersion / protocol
  supportedParameterNames / cancellationSemantics
  ownership: dam-managed | user-managed | remote | unknown
  executionLocation: verified-local | remote | unknown

invokeOnce(
  reviewedServiceHandle,
  frozenModelAlias,
  frozenInputView,
  recipeRequestVariant,
  requestBudget,
  sharedAbortSignal
) -> BoundedWireResponse | TransportFailure
```

这是Main内部接口，不是Renderer可调用的JSON RPC。`reviewedServiceHandle`只能由可信宿主建立，携带已授权目的地/凭据访问；`frozenInputView`只提供已冻结的本次字节，不接收任意路径或用于查库的回调。AbortSignal和文件/连接句柄不能序列化给Renderer。

首次实现可让BoundedWireResponse保留受限、未信任的外层JSON交给现有`parseVisionOutput`，避免归一化时丢掉message对象存在性、finish_reason或choice.text差异。最多512000字节响应，原文只短时保留用于验证，不持久记录/日志输出。

Provider不能造evidenceId、替代Host的assetRevision检查或保存标签。失败只报告稳定code与必要HTTP status，不传无限stderr、headers、URL查询参数、密钥或原件路径。P01拟议错误信封可由边界适配，不能要求旧IPC马上改格式。

ModelServiceProbe在当前阶段继续是独立的显式GET模型列表/连接检查。它没有权限发图像探测或调用invokeOnce。将来增加真正视觉probe也必须是单独披露的动作，不能把保存配置或打开页面变成推理。

## 4. 重试和取消的唯一所有者

兼容协调层runCompatibleVision拥有最多两次调用策略。Provider/SDK必须关闭自动重试，避免“上层一次重试×底层多次重试”扩大开销。每次请求开始前和读取结束后检查同一signal，第二轮只使用剩余时限。

取消说明分两层：本地停止等待/传输和阻止晚到提交是当前可控制行为；用户管理或远端服务可能仍计算，不承诺abort即物理算力停止/费用为零。没有Runtime控制权就不能kill用户服务或把资源当已释放。

兼容重试不是新用户授权：同一冻结图片、同一purpose、服务和模型别名，确认页已经披露一次重试。不得借重试改成另一模型、发原件、扩大素材范围或切云。换profile/目的地属于新计划与授权范围。

## 5. Recipe与Profile格式

`recipes/visual-bundle.compat.json`保存当前完整提示/预处理/解析与软要求；`profiles/current-service.compat.json`保存执行预算与未知运行属性。两者含版本、canonical JSON SHA-256 contentDigest；算digest时排除contentDigest自身。提示digest只覆盖源码中固定提示，不包含用户素材或识别内容。

`schemas/recipe-document.v1.schema.json`和`profile-document.v1.schema.json`是Draft-07候选文档格式，沿用P01的拟议方言；enabled固定false，说明它们当前不能当作生产配置加载。新生产loader/身份校验仍需IMPLEMENT审批及测试。

Profile为null的模型/Runtime属性不能默认推断。例如用户选了名为qwen的服务并不证明Q4_K_M；server alias也不能当作不可变权重身份。具体可核验字段记录来源为已验证本次、服务声明、历史记录或unknown，不能跨层升级证据。

未知参数不能默默透传或忽略。本兼容请求只使用当前四个body字段和固定消息；新增response_format、top_p、context、threads、cache等须形成新profile并证明实际后端/版本支持，不借“统一Provider”自动启用。

## 6. 能力就绪与默认行为

就绪证据至少分：configured、model-list observed、vision invocation observed、structural compatibility、language/semantic quality、runtime/artifact availability。每条绑定服务配置代际、模型标识、Recipe/Profile、观察时间和证据等级。

历史报告/配置声明/模型列表不能直接置为verified-ready。本次三个Profile记录均disabled，没有改产品默认模型或自动切换规则。当前显式视觉入口只要求配置声明vision并由用户确认；兼容抽取不能偷偷新增“必须先通过所有probe”的阻塞流程，也不能利用新就绪对象降低授权要求。

localhost只是端点位置。最终计算未知时记录unknown，不授予verified-local或Runtime控制权；如何改善现行“本地”确认文案/外发策略属于后续审批的Egress行为变化，不把它伪装成参数重构。本阶段不发送请求。

## 7. 结果来源与旧证据兼容

既有VisualAiEvidence输出四字段和`recipe:'visual-ai-v1'`保持可读，不重分析旧资产，不伪造旧Recipe hash。新attempt可在内存冻结真实解析出的Recipe/Profile/Provider与模型身份快照。

未来若批准持久来源扩展，建议在现有evidence_json中增加有版本的可选executionProvenance，保留现有必需字段，由Host注入可信来源，不接受Provider自报“已验证hash”覆盖事实。虽然可能不新增SQL表，仍改变公共结果语义，必须同步TS/Preload/读投影和兼容测试；P03 SPEC未作此改动，不分配v9。

新来源记录应区分requested alias、provider reported model、verified artifact digest、vision projector/tokenizer、Runtime build和未知字段。后端未报告或无法核验时保留unknown/opaque，不能拿同名模型的公共下载hash冒充当前远端实际权重。

## 8. 合成Provider

`fixtures/synthetic-provider.plan.json`只是一份开发注入设计，没有实现mock生产服务。未来L1–L3可编排成功、截断重试、HTTP拒绝、无效外层/内层JSON、大小超限、延迟取消；它只捕获调用计数、别名/输入相等性和预算，不输出素材字节或密钥。

合成后端不得注册为产品可选Provider、失败fallback或“模型ready”证据。与旧实现对比只能用合成离线样本；不能为影子比较双倍发真实素材、双写或双计费。
