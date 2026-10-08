# P01｜兼容映射与拟议切换

状态：SPEC / Proposed。以下是未来需审批的实施步骤，不是已修改调用方列表。

## 1. 保留的公开表面

| 当前表面 | 当前行为 | 本轮/迁移期处理 |
| --- | --- | --- |
| 主窗口 `electronAPI.visualAi.confirmTag(input)` | unversioned DTO；ok/value或ok/error字符串 | 保留旧channel、返回形状和静态错误文案 |
| 原生卡片 `visualAiAPI.confirmTag(input)` | 同channel，Main校验卡片scope与asset | 保留同样可信窗口/token检查，不让新envelope绕过 |
| 新拟议 `confirmTagV1(envelope)` | 目前不存在 | 未来单独注册`visual-ai:confirm-tag:v1`，审批/验证后启用 |
| `VisualAiApi`其他方法 | prepare/run/inspect/cancel/results | 不改签名、不统一重写、不自动使用新schema |
| `asset-ocr:*` | ok/value或ok/error字符串；部分操作返回null是合法业务结果 | 仅登记后续兼容需求，不迁入本样本 |
| `active-library:*` | success/value或success/error/code | 只在已明确调用方需要时建立适配；不批量改根信封 |
| Model Workspace Result | 独立产品结果与受限状态 | 不通过一个全局Result强行抹平 |
| 旧Worker/删除/Runtime拒绝表 | 固定拒绝不支持的动作 | 原样保留，不当作回退路径 |

## 2. 拟议适配方向

```text
旧 DTO → 旧入口的既有校验 → 窄的确认意图
新 envelope → 新schema+权限校验 → 同一种确认意图
                                      ↓
                           同一Host确认标签事务
                                      ↓
                         可信结构化提交/错误事实
                   ┌──────────────────┴────────────────┐
          旧信封适配（保留void/文案）          新v1结果（trace/code/warning）
```

旧DTO到新内部意图可以补本地相关性ID，但ID不应返写库或变成授权。新旧入口不同时调用两遍Host；新增接口不是双写或影子推理模式。

不能先调用旧IPC拿到`{ok:false,error:"…"}`再靠中文字符串识别permission/retry/storage。当前通用错误已经丢失来源，只有明确的内部typed code和phase才能确定新分类；未能确认提交状态时用indeterminate，不能虚构安全重试。

## 3. 特殊兼容情形

- 旧confirmTag成功是JavaScript的`{ok:true,value:undefined}`；JSON中没有undefined，因此兼容夹具记录表达式，而不是伪造`value:null`。Electron结构化克隆行为需后续真实桥接检查。
- 旧页面只判断`response.ok`再读取error字符串。新code/kind不能直接替换error字符串，否则既有UI会显示对象或判断错误。
- 旧active-library的`code`信息可以按明确表映射；没有code的旧字符串只能在原formatter保留，不据此认定可重试。
- notification失败：旧入口仍成功；新入口在同一成功事实上加warning。新旧都不得反转为失败或自动重放事务。
- unknown version：返回支持版本的错误壳，不走旧方法“试一下”。功能开关关闭与请求不合法是两件事；不合法请求不能触发隐式降级。
- 旧接口容许的数据范围与新schema的收窄不同。实现前用合成边界数据核对；没有证据不能将收窄悄悄应用到所有旧调用方。

## 4. 拟改文件与责任（IMPLEMENT候选，当前未改）

| 文件/区域 | 最小拟改职责 | 不做 |
| --- | --- | --- |
| `src/shared/contracts/visual-ai.contract.ts`附近的独立版本契约 | 新样本DTO/规范引用，保留旧类型 | 不迁移全部contracts、不加运行副作用 |
| `src/main/ipc/visual-ai.ipc.ts` | 单独新handler，sender→schema→scope，明确结果适配 | 不暴露任意channel/SQL，不靠schema授予权限 |
| `src/main/visual-ai/visual-ai-controller.ts` | 将确认标签的提交/通知结果放在窄内部边界，旧方法适配 | 不改推理prompt/预算，不新增全局AIService |
| `src/main/library-lifecycle/active-library-host.ts`必要窄错误边界 | 仅传递可证实的领域/提交结果；保持已有公共映射 | 不绕过lease，不增加第二连接/全局DB |
| `src/main/visual-ai/visual-ai-storage.ts`必要错误/结果边界 | 明确建议不可用与事务事实，复用唯一事务 | 不改变schema，不重写确认关系规则 |
| `src/preload/index.ts`、`src/preload/asset-card.ts` | 新窄方法；旧方法不变；无event对象泄露 | 不开启`ipcRenderer.invoke(channel:any)`通用入口 |
| `VisualAiPanel.tsx`的局部调用适配 | 选择已启用的新方法或既有方法；保持交互 | 不重画UI，不将失败自动送到旧接口 |
| 受控测试入口 | 同schema夹具TS/Python对照、桥接/权限/事务/打包检查 | 不删除旧测试、不重新运行真实模型作为接口测试 |

本阶段不创建这些源码文件，不修改package/lock，不注册功能开关或新channel。所有公共seam修改仍需IMPLEMENT范围授权。

## 5. 未来实施与回退门槛

1. 先评审ADR、schema方言、Python验证环境、生产Ajv作用域、字段上限与错误目录。
2. 以当前旧行为保存兼容夹具；测试中仅用合成资产/临时库。
3. 新旧handler共享同一内部提交路径，先验证无权限/跨窗/切库/重复/事务回滚/提交后通知故障。
4. 验证生产构建中validator可用，不在开发机通过后遗漏打包依赖。
5. 一个消费面完成后再迁另一个，原生卡片仍独立检查；不要全仓替换Result。
6. 未达到门槛保持旧入口；回退撤下新channel和调用方配置，不删除已经提交的标签、不回滚库schema、不重启旧Worker。

持久任务、Outbox、Job/Attempt、Model Runtime控制和资源准入不是P01的实现范围；本样本为它们提供错误/权限边界参考，但不提前造空模块。
