# P01｜标签确认样本契约

状态：Proposed / SPEC。文件位于审计文档目录；没有生产入口使用这些schema。

## 1. 当前边界与样本范围

当前旧方法：`VisualAiApi.confirmTag(scope & {assetId,evidenceId,tag})`，返回`VisualAiResponse<void>`。主/卡片Preload均调用`visual-ai:confirm-tag`。主帧必须可信；卡片必须可信且scope/asset属于当前卡片。Controller校验库scope后调用Host；Host使用held lease，存储层复核当前有效证据并进行标签关系事务。

本样本不调用模型，不重新分析，不创建一般任务，不确认所有AI建议，不修改原件，不接受其他库或指定数据库连接。

## 2. 拟议请求与结果

请求schema：`schemas/confirm-ai-tag.request.v1.schema.json`。

```json
{
  "schemaVersion": 1,
  "operation": "visual-ai.confirm-tag",
  "requestId": "11111111-1111-4111-8111-111111111111",
  "payload": {
    "libraryIdentity": "library:fixture-a",
    "generation": "generation:fixture-1",
    "assetId": "design-asset:fixture-1",
    "evidenceId": "evidence:fixture-1",
    "tag": "几何"
  }
}
```

结果schema：`schemas/confirm-ai-tag.result.v1.schema.json`。成功示例：

```json
{
  "schemaVersion": 1,
  "operation": "visual-ai.confirm-tag",
  "requestId": "11111111-1111-4111-8111-111111111111",
  "traceId": "1234567890abcdef1234567890abcdef",
  "ok": true,
  "effect": "committed",
  "value": {
    "assetId": "design-asset:fixture-1",
    "evidenceId": "evidence:fixture-1",
    "confirmation": "confirmed"
  },
  "warnings": []
}
```

`effect=committed`表示Host已证实事务成功，关系处于已确认状态；重复确认不承诺插入新行，不新增changed计数。通知抛错时仍是此成功结果，只将warnings设为`["NOTIFICATION_DELIVERY_FAILED"]`。不能再返回失败让客户端重做写操作。

## 3. 版本、身份与限额

| 字段/规则 | 本样本拟议值 | 依据与限制 |
| --- | --- | --- |
| schemaVersion | 整数1，布尔/字符串不替代 | 未知版本拒绝；新channel局部版本，不是库schema或模型recipe版本 |
| operation | 固定`visual-ai.confirm-tag` | 拒绝把自由operation当作任意方法调用 |
| requestId | 小写UUIDv4，由调用方为一次逻辑提交生成 | 仅相关性；不是永久授权、去重表或Exactly Once保证 |
| traceId | Main生成非零32位十六进制 | 输入不接受；不从路径、素材ID或内容派生 |
| opaque ID | 1–256个白名单ASCII字符 | 拟议新入口约束，不对所有旧契约批量收紧 |
| tag | 1–80 Unicode码点、非ASCII纯空格、无ASCII控制符 | 与已存在建议精确匹配；不得静默trim、截断或改词 |
| 兼容语义检查 | 新样本tag仍不得超出当前视觉结果的80 UTF-16 code units | JSON Schema长度与JS.length不同；补充字符用跨语言同规则计算 |
| 消息大小 | 拟议规范化JSON UTF-8最多4KiB | 样本边界预算，未测性能承诺；入口校验不得导致未授权大对象遍历 |

ID/trace只是数据形状。合法UUID、合法assetId、已保存requestId均不能代替sender或当前库权限。JSON域在Main先做有界检查，拒绝Date/Map/Buffer/BigInt/函数/循环、非有限数和非Unicode标量内容；这些属于传输/语义条件，不能靠JSON Schema独自证明。

所有schema的`$id`使用`.invalid`离线命名空间。实现必须把本地schema注册到白名单resolver，不允许收到请求后自动下载远程`$ref`。不得采纳输入中的schema、$id或validator选项。

## 4. 处理顺序与不可越过的检查

```text
旧或新调用方
  → 独立窄Preload方法（不暴露任意channel）
  → Main校验实际sender/mainFrame或受控卡片token
  → 生成可信traceId，检查新版本与消息形状
  → 匹配当前Library identity/generation与卡片素材范围
  → 校验当前有效evidence和原标签精确匹配
  → Host在有效lease内复核并执行现有单一标签事务
  → 确认提交事实
  → 尝试通知（失败仅warning）
  → 构造并验证响应形状、返回
  → 客户端核对requestId/operation/assetId/evidenceId与仍活跃scope
```

不可信sender先拒绝，不回显其requestId，不读取素材或证据。可信sender且requestId本身有效时可以在校验失败响应中回显；ID无效/缺失则为null。错误响应始终使用当前支持的v1壳，绝不假装已经执行未知版本。

schema无法验证某asset属于某卡片，也不能在单个结果中证明它与请求相符。客户端配对检查失败意味着收到的响应不可用于当前界面，不能据此断言服务端事务回滚。

## 5. 错误目录与操作状态

完整封闭组合见`manifests/ERROR-CATALOG.json`和`common.v1.schema.json#/definitions/commandError`。每个code绑定kind/category/retry/commitState/safeMessage，不能自由交叉组合。

| 状态 | 样本code | UI/调度含义 | 重试 |
| --- | --- | --- | --- |
| waiting | LIBRARY_NOT_READY / LIBRARY_BUSY | 未执行写入，条件未满足；不假装任务已排队 | after-condition；重新核对当前scope和用户意图 |
| failed | INVALID_REQUEST / UNSUPPORTED_VERSION | 形状/版本错误，不能自动降级调用旧channel | never |
| failed | UNTRUSTED_SENDER / SCOPE_DENIED | 权限拒绝，不能换窗口重放规避 | never |
| failed | LIBRARY_SCOPE_CHANGED / SUGGESTION_UNAVAILABLE | 当前上下文或证据变化 | 刷新/重新选择后才可产生新请求 |
| failed | STORAGE_WRITE_FAILED | 只在明确已回滚、未提交时使用 | bounded资格；本轮不引入自动重试策略/次数 |
| cancelled | CANCELLED | 在提交前取消/撤权，未完成本次写入 | 不自动重试 |
| failed | INTERNAL_FAILURE | 只在可证明尚未提交时使用 | 不自动重试 |
| indeterminate | COMMIT_OUTCOME_UNKNOWN | 不知道是否已提交，不能叫失败或成功 | reconcile；先授权读取当前关系 |
| succeeded + warning | NOTIFICATION_DELIVERY_FAILED | 已提交，刷新通知未完成 | 只能刷新结果，不重新提交 |

本样本的waiting是**本次命令未获准执行**，并不引入持久任务系统。retry是分类，不是自动重试指令。若Host正在关闭或generation已经变化，以scope失效为准，不能等busy解除后复活旧权限。

提交后取消不撤销已确认标签。现有SQLite标签事务同步完成；未来异步包装要保留“提交之前”和“提交之后”的判定点。正常成功与通知异常都不得进入写重试循环。

若IPC响应丢失，客户端没有拿到Host的traceId/commitState，不能编造一份“收到的错误响应”。客户端单独进入等待核对的展示状态，用已有合法读取路径刷新当前确认关系；若库已关闭则等待重新开库授权，不保存旧执行权。结果核对只说明当前关系，不证明全部历史尝试次数。

## 6. 单一事务与副作用

复用Host `confirmVisualAiTag`和`visual-ai-storage.confirmVisualAiTag`：读取有效证据、检验标签、创建/复用标签、插入确认关系、更新建议状态与使用次数。Provider、Renderer、Worker不能接收SQLite或自己提交。

重复点击不靠requestId去重：现有关系唯一性/INSERT OR IGNORE及同一Host事务保证已存在关系不重复。P01不宣称提交事件、通知或创建任务Exactly Once；不添加Outbox表和Job状态表。

领域错误应在检查点给出可识别原因，存储错误还要给出确定的事务结果；当前Host泛化错误会丢失一些信息。IMPLEMENT需窄化该传递边界而非从文案猜测，原公开错误映射必须保留。

## 7. 跨语言契约策略

本样本仍是Renderer→Main写命令，**不发送给Python执行**。让TS/Python验证相同序列化夹具，是为后续Worker契约提供一致性基线，不扩大Python权限。

- 暂拟Draft-07，四份schema离线注册；请求/结果/trace使用共同definitions。
- TS候选Ajv6配置：不coerceTypes、不useDefaults、不removeAdditional；schema必须可编译且无未知关键字，禁止不受控远程加载。生产打包可用性另验收。
- Python候选`jsonschema.Draft7Validator`，从同一schema清单本地注册；独立开发环境锁版本和Python兼容后再用。不能用现有宽松Pydantic模型默认为等价。
- 所有语言消费同一UTF-8 JSON夹具、相同schema摘要；要求真假布尔/整数、空值、附加字段、Unicode边界判定一致。JSON形状、领域规则、权限测试各自有预期，不能混为一个“valid”。
- 当前Pydantic>=2.0并非精确环境锁；OCR以前使用的环境不能被本阶段偷偷升级。新验证器和任何依赖作用域变化均待IMPLEMENT明确批准。

## 8. 追踪与隐私

`safe-trace-event.v1.schema.json`只接受schemaVersion、固定operation、traceId、requestId、phase、outcome、durationMs和受限code。未知字段一律拒绝；不直接写完整请求/响应、Ajv errors对象或异常stack。

标签、素材/库身份、用户文字、API地址、密钥、headers、receipt、图片摘要均不是此样本日志必需字段。requestId可能来自不可信调用方，只有来源可信且形状有效才写入；traceId由Main生成。持久保留期、日志路径、SDK/Collector部署本轮不决定、不实施。默认无遥测外发。

S30的Trace上下文只作为相关性概念参考；字段形状不等于产品已集成OpenTelemetry或已形成分布式链路追踪。
