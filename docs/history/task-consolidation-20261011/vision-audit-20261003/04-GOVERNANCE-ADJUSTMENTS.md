# 04｜AGENTS、基础文件与代码约束调整提案

**此文件不是AGENTS的替换件，也不直接修改用户仓库。**保留当前174行根指南的有效边界，按下面责任做小范围修订。

## 1. 文件责任重新归一

| 文件 | 应负责 | 不再承担 |
|---|---|---|
| AGENTS.md | 稳定产品不变量、权限、修改/验证规则、当前入口 | 每批PASS流水、硬编码Agent型号、所有未来架构 |
| README.md | 产品概述、双端普通启动、环境要求、current入口 | 源机历史能力快照、过期单卡片/旧poller断言 |
| docs/handoff/CURRENT-STATE.md | 当前候选、WIP差异、范围/失败/下一步、有效证据指针 | 完整日志、各轮重复说明 |
| TASK.md | 活动批次、最近可恢复检查点、精确下一动作 | 数百行历史轮次重述；历史转保留索引 |
| CONTEXT.md | 领域词汇、关键不变量、模块索引 | 每个术语旁累加数千行实施历史 |
| PRODUCT-FOUNDATION / 已接受ADR | 稳定目标和不可逆取舍、替代关系 | 具体构建PASS状态 |
| RELEASE-ACCEPTANCE.md | 交付条件与明示范围 | 过期“仍Legacy/下一票#12”的当前事实 |
| 模块README | 正式入口、权限/副作用、当前支持/限制、聚焦测试 | 先写禁用后写已开启的多轮补丁叙事 |
| .scratch/run证据 | 原始日志、截图、故障、候选快照 | 自动成为clean checkout中存在的内容 |

已有current入口优先复用，不再同时增加`.ai-run/LATEST`、`.scratch/LATEST`、`STATE`、`REPORT`四份彼此手写的最新事实。可以保留历史run目录格式适配，但当前投影只指向一个明确完成候选。

## 2. 建议补入AGENTS的语义（经批准后逐块合并）

### 本机双客户端

Desktop与本机Browser是同一正式产品的两个客户端，共用UI和唯一Electron Local Host。客户端只发起命名业务动作；文件、资料库、凭据、推理与进程权威仍归Host。页面文件选择不是原件写入授权。Browser不等于被退休的网站采集，也不自动授权LAN/远程/多用户服务。

### 源码与执行身份

审阅和实施必须分开记录HEAD、当前WIP、测试候选tree、实际build、平台Runtime及模型资格。旧generated build ID或旧PASS不能证明当前进程。新增命令所需的未跟踪源必须进入所选候选闭包；不能依赖工作目录之外的偶然文件或测试override。

### AI与平台

Pi负责被允许的协议/账号适配，专用OCR/本地Runtime负责各自执行，Host拥有提交。旧Python队列/poller只在实际接线范围适用，不构成新链路唯一形式。平台差异进入可测Adapter/资格；未支持保持明确不可用，但局部不支持不应无故冻结无关能力。真实峰值超限与UNKNOWN继续保守占账。

### 交付与验证

一个任务映射至少一条当前用户结果或阻断该结果的故障。代码、隔离契约、Browser CU、原生效果、真实模型分别结论。严格门槛不等于无限增建验证基础设施。按最新批准的浏览器优先流程操作可见控件，不通过改route/IPC/Store代办用户步骤。没有工具/权限如实BLOCKED，不偷偷缩减完整承诺。

### 文档与删除

当前事实只维护一个投影，历史保持日期、来源和构建。静态未被产品入口到达不等于无用；检查CLI、测试、动态加载、打包和参考golden，再决定删除。保护现有用户WIP，不用批量清理/暂存换取索引全绿。

## 3. 哪些约束不能为了简化而削弱

Original/Preview/Variant所有权；Managed/Eagle/Legacy分界；用户已提交修改优先；会话/代次/角色校验；review/claim/receipt与持久数据区别；无静默云fallback；受控外发和费用；UNKNOWN不早放；旧库显式迁移；可恢复备份；源文件摘要；合成/真实证据区别。

文件数、模块大小、read-budget或某条源码正则，不应凌驾于上述行为约束。反过来，“优化体验”也不能用来取消这些保护。

## 4. 代码约束的优化方法

当前`ai-runtime-host-context.test.ts`同时有行为断言与实现字符串断言。禁止随意删除后者，但可逐项判断它在保护什么：

- 保护“不从Renderer传入任意可执行路径” → 应以正式Main边界拒绝行为验证。
- 保护“所有平台取值来自注入HostContext” → 用不同context和真实调用方证明，而非只检查某行变量名。
- 保护“不新增全局settings/SQLite读取” → 静态import边界检查可保留，并用副作用隔离测试补充。
- 只保护旧文件名/代码排版 → 在证明语义与替代测试后迁移，保留原因，不为了绿灯改名规避。

推荐层级：权限/数据行为约束 > 模块依赖和边界约束 > 代码风格。格式化只处理本票触及区域，不给压成单行代码记“减少复杂度”成果。

## 5. 最小current状态投影

使用现有入口增加以下字段即可，不建设新的治理服务：

```json
{
  "asOf": "YYYY-MM-DDTHH:mm:ssZ",
  "source": {"commit": "...", "workingTree": "dirty|clean", "candidateTree": "..."},
  "build": {"id": "...", "platform": "win32-x64", "artifactManifest": "..."},
  "scope": "准确的已验证用户路径",
  "completion": "partial",
  "gates": {"source": "pass", "platformAi": "blocked", "browserCu": "partial", "nativeCu": "not_run"},
  "openFindings": ["F01", "..."],
  "evidence": {"summary": "versioned-relative-path", "raw": "local-relative-path", "rawInCheckout": false},
  "nextBatchAuthorized": false
}
```

这是形状示例，不是现场已经存在的文件。具体属性与现有锚点v2适配；时间和verified/current不能永久静态写死。范围或源码变化，相关证据重新判定。

## 6. 面向开源的仓库卫生

`.scratch/`和`AIModels/`目前作为未跟踪记录出现。不要读取、打包或提交其中用户数据；先辨认源码夹具与本机运行数据。忽略规则应覆盖明确的模型/临时范围，必要的脱敏证据摘要和测试代码仍可版本化。修改ignore只影响新跟踪，不自动清除已有历史；避免把所有文档统统ignore导致交接断链。

可公开证据与本机原始记录分层：提交精简可追溯摘要；原始敏感或体积大证据留本机有摘要的包。每轮不重复打包全部历史ZIP，不给压缩包无限嵌套。
