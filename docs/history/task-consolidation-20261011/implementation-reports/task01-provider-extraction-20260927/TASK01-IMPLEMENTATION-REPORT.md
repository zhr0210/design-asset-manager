# 任务01实施报告：保持综合分析兼容，抽取单次Provider

2026-09-27（Asia/Shanghai；原始日志使用UTC）。**MODE=IMPLEMENT，仅任务01；完成，证据就绪，待工程师复核。**

## 1. 范围、授权与工作区

用户在任务01限定范围说明后要求“开始实施”。执行单次Provider/内部时钟抽取，完成必要回归与本票审查；不自动进入02A。输入依据为V2评估包任务01提示、原任务01及当前真实调用链。
分支`codex/product-reassessment-20260905`，HEAD `3fa00df3bbb605478da6d0af18724d64021e723c`。开始时1856条Git状态：staged18、unstaged775、untracked1077（可重叠），2258份原文本摘要。本票不是该巨大工作区全部改动的作者；所有测试/差异相对本票开始时实际工作文件记录。

## 2. 实际改动

| 文件 | 本票变化 |
| --- | --- |
| src/main/visual-ai/openai-vision.provider.ts | 新增Main内部VisionProvider.invokeOnce和默认OpenAI HTTP实现；一次请求、受限响应读取、无重试/DB/私有计时器 |
| src/main/visual-ai/openai-vision.transport.ts | 保留兼容prompt/endpoint/输出预算/解析与唯一重试，委托可注入单次Provider |
| src/main/visual-ai/visual-ai-clock.ts | 新增now与可取消计时依赖，默认仍Date.now/setTimeout |
| src/main/visual-ai/visual-ai-controller.ts | 增加可选provider/clock依赖；所有确认/证据时间与每素材计时走同一时钟，原取消与Host提交保留 |
| scripts/visual-ai-provider.integration.test.ts | 新增8项真实临时Host/SQLite行为测试；不启动HTTP或模型，替换单次Provider |
| scripts/visual-ai-transport.test.ts | 强化实际HTTP请求断言：精确1536/3072、温度0.2、字段集合和合成Authorization |
| src/main/visual-ai/README.md、TASK.md | 同步实际接线、验证/限制与本票恢复点，保留历史 |

共修改5个既有文件、新增3个源码/测试文件；另新增本报告与证据。没有修改shared公共契约、Preload、IPC handler、Renderer/UI、schema、解析器、Host存储、Main组合根或依赖文件；摘要核对见[保护记录](evidence/WORKTREE-PRESERVATION.json)。

## 3. 抽取前后与生产接线

```text
抽取前：
Main → Controller（每素材timer/signal）
     → runVisionRequest（prompt + fetch + bounded reader + parse + retry）
     → Host.saveVisualAiEvidence

抽取后：
Main（装配调用未变）
  → Controller（默认systemVisualAiClock，每素材唯一timer/signal）
  → runVisionRequest（prompt / 唯一一次截断重试 / parseVisionOutput）
  → openAiVisionProvider.invokeOnce（一个HTTP请求 + bounded reader）
  → Controller复核取消/素材 → 原Host事务保存
```

生产Main没有注入替身，默认Provider实际由既有临时库+loopback集成测试走通。可选provider用于单次调用替换；保留原transport整体替身兼容入口且优先，测试与生产边界清楚。
重试唯一负责人是runVisionRequest；仍1536→3072、温度0.2、相同图片/模型/服务和signal，截断最多重试一次，不新增HTTP错误重试。总时限唯一负责人是Controller，继续使用原1000–120000ms夹取及默认120000ms策略；Provider没有另起倒计时。

## 4. 基线、红绿测试与最终结果

修改前7组transport、原视觉/下载集成、OCR存储及typecheck均PASS。原基线不存在本票需掩盖的失败。
新增Provider注入测试在实现前失败：期望completed，实际failed，因为旧控制器忽略provider注入并走测试内被禁止的HTTP路径；不是缺文件/编译错误伪造红灯。实现后同用例PASS，随后扩展到8项。原失败日志[保留](evidence/red-provider-injection.log)，退出码1；新接口首次转绿[记录](evidence/green-provider-injection.log)，退出码0。

| 场景 | 证据等级 | 实际命令 | 结果/退出码 | 原始日志 |
| --- | --- | --- | --- | --- |
| 原/强化传输契约：7组 | L1/L3 合成HTTP | `node scripts/run-ts-test.mjs scripts/visual-ai-transport.test.ts` | PASS / 0 | [final-transport](evidence/final-transport.log) |
| 新Provider与时钟：8项 | L2/L3 真实临时Host/SQLite+注入Provider | `node scripts/run-electron-node-test.mjs scripts/visual-ai-provider.integration.test.ts` | PASS / 0 | [final-provider-behavior](evidence/final-provider-behavior.log) |
| 默认装配视觉/下载集成 | L2/L3 生成素材+loopback | `npm run test-visual-ai-download-integration` | PASS / 0 | [final-default-integration](evidence/final-default-integration.log) |
| OCR/修订存储回归 | L2 真实临时SQLite | `node scripts/run-electron-node-test.mjs scripts/asset-ocr-storage.test.ts` | PASS / 0 | [final-ocr](evidence/final-ocr.log) |
| 应用类型检查 | L1 | `npm run typecheck` | PASS / 0 | [final-typecheck](evidence/final-typecheck.log) |


这些是生产控制器/Host/transport模块的真实隔离测试，区别于此前205项独立规格模型。SQLite通过Electron Node启动器运行；没有重编better-sqlite3，没有安装依赖。
最终只运行本票适用的完整检查集合，遵循任务提示“按风险补跑，不无依据跑全套高成本/真实模型集”；全仓库测试总集未运行。

重点断言：

- prepare零Provider调用，原五分钟receipt由可控时钟过期拒绝；analyze/reverse均真实保存完整字段。
- 一次截断后成功产生一个新Evidence；持续截断/缺字段/401/未知异常不覆盖上次有效结果。
- 假时钟第一次调用消耗900ms后，重试只余100ms；只调度一次1000ms timer，后续超时无提交。
- Provider忽略abort仍迟到返回时，cancel-job/owner释放/库invalidate并同generation重开均零晚写。
- 人工caption、confirmed tag、专用OCR修订及关库重开保持；合成源文件hash不变。
- onChanged故意抛错仍completed，已经保存的证据可从真实Host重读。
- 默认HTTP路径检查token预算、温度、请求字段、授权头trim、响应上限、重定向拒绝、错误不额外重试。

## 5. 审查、保护与未覆盖

[代码审查](REVIEW.md)分别核对正确性/项目标准与任务规格；主Agent直接审查，未声称独立外部审查。未发现本票新增阻塞问题。
原Git index和staged diff保持，HEAD/分支不变；2258份基线文本中仅5个本票文件变更，其余2253份保持，3个新源码/测试和本报告目录以外没有新Git可见路径。旧SPEC/评审包与01–07草案未改，不把后续任务标完成。

**NOT_RUN：**正式Electron GUI/窗口交互、真实模型/语义质量、Windows/签名包、用户真实资料库、外部云API。本轮只用生成素材、临时库、注入Provider或自建loopback合成服务；没有启动/安装/更换模型，没有对外发送素材。

## 6. 交接与最小回退

仅本票相对开始时工作文件的补丁：[TASK01-ONLY.patch](evidence/TASK01-ONLY.patch)。它不包含用户所有未提交改动，也不是从HEAD即可复现的完整工程。每个修改文件的before/after SHA见保护记录。
回退前核对after摘要，若文件有后续编辑则逐块合并反向本票改动；不可reset/stash/覆盖整个文件或自动删除其他人的新内容。未改schema，因此无数据降级；已保存的原有证据不删。无需停止用户模型服务。

任务01已完成并具备隔离验证证据；未提交、未推送、未发布Issue。后续候选02A需独立明确范围，本轮到此停止。
