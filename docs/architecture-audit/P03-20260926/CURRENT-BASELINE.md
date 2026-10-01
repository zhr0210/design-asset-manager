# P03｜从当前源码固化的兼容基线

事实来源：`visual-ai-controller.ts`、`openai-vision.transport.ts`、`vision-response.ts`、`ai-backend.ipc.ts`、`ModelServiceProbe`；机器记录见`recipes/visual-bundle.compat.json`与`profiles/current-service.compat.json`。这不是对用户当前配置或已运行服务的探测。

## 1. 输入、作用域与控制

| 环节 | 源码行为 | 抽取时应保留 |
| --- | --- | --- |
| 入口 | 已启用且capabilities.vision为true的选定服务；purpose为analyze/reverse | 不按模型大小/priority自动换服务；声明不是质量证明 |
| 模型 | trim(input.model或backend.defaultModel)，非空且≤256 UTF-16单元 | 不写死Qwen 8B，不覆盖用户模型 |
| 范围 | 每批1–8个不同素材ID；主窗口或当前可信卡片范围 | 不让Provider读取全库/原件路径 |
| 输入 | Host签发受控整张预览，输入字节≤32MiB、解码≤50,000,000像素 | 不是原件级全图、多页/视频或高分辨率OCR |
| 预处理 | Sharp.rotate()→inside缩至1024×1024且不放大→白底flatten→JPEG85 | 固定操作顺序；没有显式toColourspace调用，不能捏造已验证色彩转换证据 |
| 确认 | 冻结JPEG、SHA、服务配置、model、库identity/generation；5分钟单次receipt | 准备不发请求；run前配置指纹变动需重新确认 |
| 调度 | 控制器最多两个活动批次，各批按素材顺序执行 | 不是全局GPU资源调度或server parallel参数 |
| 时限 | 每素材timeoutMs有限值钳制到1000–120000ms，非有限回退120000 | 同一计时/AbortSignal覆盖两次请求，重试不重置时限 |

合法设置保存通常会先拒绝非有限timeout；Controller仍保留非有限回退，这是源码防御行为，不是允许用户输入任意非有限参数。

原运行批次使用prepare时冻结的配置，run开始时验证当前指纹；这不等于运行中每次请求重新读取配置。切库/撤销会取消，重试不能切换到刚修改的新服务。若需要更强运行中配置撤销规则，应单独设计和验收。

## 2. 当前请求协议

- 在已配置baseUrl的pathname末尾追加`/chat/completions`；不推断缺失的`/v1`，不把Ollama标签自动变成其native API。
- 接受HTTP(S)，拒绝URL内用户名/密码/hash；当前代码未拒绝search参数。连接与外发策略的进一步收紧不能冒充纯重构。
- POST，redirect=error；JSON body只有model、temperature=0.2、max_tokens、messages。top_p、seed、response_format、stream、tools均未显式发送。
- system为中文设计提示与对应长度后缀，user为analyze或reverse文字加同一冻结JPEG data URL。精确源码文本及digest已保存在Recipe，不抄成近似版本。
- response body每次最多512000字节；无body、外层JSON非法、HTTP错误等分别拒绝，不把HTML/流式SSE当作完成结果。
- localhost/127.0.0.1/[::1]目前仅决定local显示标签，不证明最终计算没有转发。Provider可见的URL/凭据通过受控Main绑定持有，不写进可共享Profile或日志。

## 3. 唯一兼容重试

第一轮1536 token。只有`AI_RESPONSE_TRUNCATED`可触发第二次完整重生成，预算3072，并采用更短中文描述/英文提示词/最多6标签的重试提示。不续写部分字段。

触发包括finish_reason=length，或内层文本有未闭合对象。闭合但无效JSON/字段不合约、HTTP401/429/5xx、响应过大等不自动重试。第二轮失败即结束；同一服务、模型别名、图片、授权、总时限不变。服务端在固定别名背后换了权重，当前代码无法保证探知，身份需记opaque/unknown。

## 4. 提示要求和硬校验分开

| 项目 | 提示要求 | 当前硬校验/输出处理 |
| --- | --- | --- |
| caption | 初次80–160中文字符；重试≤80 | string≤16000 UTF-16单元；可为空；未强制中文/目标长度 |
| prompt | 初次60–120英文词；重试≤60 | 非空白string≤16000 UTF-16单元；未强制语言/词数 |
| tags | 中文、不重复，初次≤8，重试≤6 | 数组原始长度≤30；各原始string≤80 UTF-16单元且非空白；trim后精确Set去重 |
| ocrText | 固定空串，专用OCR负责 | 必须为string≤16000；非空也可通过，不能在抽取时偷偷清空 |
| 附加字段 | 提示只要求四字段 | 未知字段丢弃；不是additionalProperties:false严格schema |
| 终止原因 | 完整结束 | stop/缺省/null可接受；length即便正文可解析也拒绝；其他原因拒绝 |

这里的“接受”只代表结构契约，不代表质量放行。错语言、过多但≤30标签仍可能结构成功；可记录质量不足，但纯兼容抽取不能无审批将它们全部改为失败。

## 5. 完整JSON兼容面

解析器取第一个choice。message为对象时只读message.content；message不是对象时才看choice.text。content可以是字符串，或全为`type=text`且text为字符串的非空数组。message对象存在但缺content时不回退choice.text。

直接完整JSON对象、完整代码块、带少量说明文字的单对象可以解析。结构扫描理解字符串内转义/花括号；歧义额外对象、数组顶层、不完整对象或必填字段缺失均拒绝。不把旧Provider的partial字段提取成功语义迁回。

旧`visual-ai-v1`证据可继续读取；现有返回形状、OCR优先级、手工描述保护、建议标签和Host保存规则不变。

## 6. 版本与不可完全复现项

正式请求没有读取模型权重/投影/分词器hash、Runtime build、context、线程、KV/cache、server seed等信息。兼容Profile用null/unknown保存这些未知值，不拿9月24日某次测试的8192/seed42替代所有实际配置。

历史2B/8B资料只从仓库已归档manifest/report读取：Q4_K_M、F16投影、llama.cpp b11057、macOS arm64/Metal。当前安装/文件仍存在/模型已运行都没有本轮证据。历史证据只有`visual-ai-v1`不能倒推出当时精确Prompt digest，新Recipe不得反向回填到旧结果。
