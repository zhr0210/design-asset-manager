# P03｜旧策略继承与当前兼容对照

三列必须区分：旧Provider代码、目前正式链路、未来抽取后的目标。不是把旧接口原样恢复。

| 策略 | 旧Provider | 当前正式链路 | P03设计 |
| --- | --- | --- | --- |
| 调用/数据权威 | 旧Worker/AI Client，含全局DB路径 | 独立visual-ai控制器+Active Library Host | 保留当前入口和Host；不恢复旧IPC/全局DB |
| 输入来源 | filePath经旧ImageMetadataService解析 | Host提供当前素材受控预览 | Provider仅接冻结输入，不获得路径/查库权 |
| 编码/尺寸 | 默认1024 PNG，可配768/1024/1280 | 1024 JPEG85、白底、像素/字节有界 | 固化当前操作顺序，不照搬PNG或放大到原件 |
| 提示 | 中文设计长模板、多个细分字段 | 中文紧凑描述/标签/英文prompt，OCR留给专用入口 | 精确文本/digest/目的/重试变体成为Recipe |
| 采样 | 默认temperature0.6、top_p0.9 | temperature0.2，不显式top_p | 保持当前，不按旧默认“优化” |
| 输出上限 | 至少1536，疑似截断提高到至少3072或两倍 | 固定1536→3072，最多2次物理调用 | 由兼容协调层独占重试，Provider一次调用 |
| 重试判定 | 指定旧字段的疑似未闭合JSON | finish_reason=length或当前对象扫描判为未闭合 | 保持现状；不是所有错误都重试 |
| JSON容忍 | 可从部分结果提取字段、兜底原文成为prompt | 完整结构才可保存；兼容完整代码块/单对象说明 | 继承完整格式兼容，拒绝partial成功 |
| 时间限制 | 每次chat独立AbortSignal.timeout | 每素材共享计时，两次请求共用 | 保持共享时限，不重置第二次预算 |
| 取消/切库 | 不能以旧路径代替新库边界 | owner/scope/AbortSignal，Host提交前复核 | 保留当前语义，不承诺用户服务物理停止 |
| HTTP重定向 | 旧fetch未显式redirect:error | 明确拒绝重定向 | 不放开 |
| 输出语言 | 中文模板但未等于质量已验收 | 提示中文；结构validator未强制语言 | 软要求与硬验证分别记录，严格语言profile另批准 |
| 来源版本 | 旧templateId及返回模型字段 | 固定visual-ai-v1，缺精确Recipe/Profile来源 | 新attempt版本化；旧记录不可回填伪精确来源 |

## 抽取顺序（未来IMPLEMENT候选）

1. 先让合成金样证明当前HTTP body/两轮提示/解析结果和错误与文档一致。
2. 在现有visual-ai目录抽出不可变Recipe/Profile解析，不改输入与默认值；只有明确参数进入body，未知值标unknown。
3. 将单次HTTP适配放在Provider.invokeOnce，协调层保留统一重试和同一个deadline。
4. Controller的prepare/run/inspect/cancel和Host save仍作为兼容入口；旧runVisionRequest签名可以作为受控委托，不再拥有第二层重试。
5. 在批准的范围补新来源字段与双向兼容，不把结果保存交给Provider。不同时建设MLX、OCR新链路或模型安装器。
6. 单写切换只让一个执行路径服务一次动作；失败不自动调用旧Provider重做。回退返回“重构前当前正式transport策略”，不是退休的全局Worker。

## 拟改文件而非已修改文件

- `visual-ai-controller.ts`：从已审阅Profile/Recipe冻结执行计划，现有作用域/确认/提交保持。
- `openai-vision.transport.ts`：拆单次请求Adapter与兼容协调，保留旧签名委托。
- `vision-response.ts`：初次不改判定；通过固定解析夹具后再考虑独立能力Validator。
- 新内部Recipe/Profile/Provider契约文件：只在实际接线时创建，不扩展通用任意工具执行。
- `ai-backends`：继续管理配置与GET模型列表；不把配置布尔值当真实就绪。
- `visual-ai.contract.ts`与读取投影：仅在批准来源扩展时同步，不为SPEC自动更改。

P01错误信封和P02迁移编排都仍是SPEC，不假定它们已实现。旧caller继续可用的具体条件必须通过未来L1–L4检查，而非目录改名推断。
