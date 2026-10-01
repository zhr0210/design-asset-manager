# 项目基础文档审查 · 2026-09-07

## 结论与范围

基础文档的主要问题是重复、过期和读取规则冲突，不是缺少完整索引。
现有 Context Router 可继续使用，无需新增强制启动协议、全库扫描步骤
或第二套任务系统。本次仅修改文档；运行时代码、配置与数据未变动。

审查基线为 `3fa00df`：保存上一轮尚待独立审查的功能改动的 WIP 提交。
它不是发布版本。本次未继续旧目标或 AL 阶段任务。

## 发现与处理

| 问题 | 影响 | 本次处理 |
| --- | --- | --- |
| 根 AGENTS 重复模型/存储/发布验证细节 | 普通任务也支付领域专项阅读成本，且多份快照易漂移 | 根入口保留产品不变量、关键接线禁区和权限；详细事实原文移至 implementation-status.md |
| domain.md 要求先路由、根指南允许局部探索 | Agent 易把路由当成每任务固定流程 | 统一为先看近邻；语义不清才选 ADR/术语 |
| TASK 描述上一轮实现；旧目标/Issue 队列可能被自动续跑 | 最新请求可能被阶段惯性覆盖 | 更新当前任务，明确旧队列不再决定工作，记录继承 WIP |
| Main/Renderer README 混入未来规则；三个模块堆积日志 | 未来功能可能被当作已交付；路径定位增加无关上下文 | 分离按需 ADR 参考与历史日志，保留全部搬移原文 |
| Main 对 Model Library/Capture 的描述落后于局部证据 | 容易误以为尚无 SQLite/验证存储 tracer，或把 installed 当事实 | 指向本地证据，区分生产数据库接线、generated-byte verified-stored 与真实安装 |
| tracker 指南把 skill 的 publish 直接映射为创建 Issue | 只读评估可能引发不必要外部变更，旧依赖被误当新任务 | 区分使用约定与授权；限定相关读取，多行文本用 body-file |
| CONTEXT 和 ADR 入口缺少一致的按需阅读说明 | 容易整库加载或把 glossary 当当前实现清单 | 添加短说明，不改术语或 ADR 的定义与分类 |

## 内容保全位置

- 根指南的详细事实：
  [implementation-status.md](implementation-status.md)。
- Main 的 26 条未来规则：
  [Main ADR reference](../../src/main/ADR-REFERENCE.md)。
- Renderer 的 58 条未来规则（含补查的状态中心、恢复与 Text 规则）：
  [Renderer ADR reference](../../src/renderer/ADR-REFERENCE.md)。
- 原 Main/Renderer/Shared Change Log：
  [Main](../history/main-readme-changelog.md)、
  [Renderer](../history/renderer-readme-changelog.md)、
  [Shared](../history/shared-readme-changelog.md)。
- 原根 README 版本摘要：[Root history](../history/root-readme-changelog.md)。

这些位置不是新启动必读。未来规则仍以 canonical ADR 为准；
本次搬移不退休任何决定。已用基线文本逐条比对搬移内容。

## 阅读成本

按 UTF-8 字节测量，不把字节数当精确模型 token 数。
根 AGENTS 从 14,987 字节降至约 8.2 KB；
Main/Renderer/Shared README 从合计 112,453 字节降至约 26.7 KB，
常用模块入口文本减少约 76%。总仓库文档不以删除为目标；
完整参考仍然存在，但不会随普通入口自动读入。

## 配置审查与保留

- `.codeindex/` 已提供一方源码归属和受预算约束的路由，不新增索引层。
  本轮只验证；不会把索引成功当作文档语义一致的证明。
- `package-lock.json` 已跟踪；`tsconfig.json` 对 src 开启 strict。
  本轮不改依赖、编译/打包规则。脚本测试不在普通 src typecheck 的范围内，
  后续功能验证需使用其专用测试入口。
- `.gitignore` 已排除数据库、模型、生成物和 `docs/archive/`；
  保存历史使用可跟踪的 `docs/history/`，避免误以为已备份而未入 Git。
- 现有 `check-docs-sync.py` 主要检查改动路径，不能证明每项行为说明正确；
  因此增加本轮人工/独立语义审查，而不是把 PASS 当成内容完整证明。
- `docs/agents/triage-labels.md` 的映射没有发现本轮需改的冲突，原样保留。

## 验证与后续

验证：搬移文本与基线比对、相对链接检查、Context Router check/tests、
ADR 分类检查、Agent context、forbidden paths、docs sync、Git diff 检查。
结果与恢复点记在 TASK.md。没有为纯文档搬移重新跑模型、数据库或整套产品测试。

上文记录继承的文档整理及其验证陈述，不等于本轮重新执行或独立审查。
新的开发选择以本次请求和下方重新核验为准；不再将继承 WIP 的审查安排
设为自动执行的前置任务。若继续压缩局部规则，应逐域对照当前调用方。

## 本次请求下的重新核验

在已有文档改动上继续审查，保留暂存区与无关改动。新增发现与修正：

| 发现 | 修正 |
| --- | --- |
| README 仍将 09-05 评估优先级指定为当前方向 | 改为本轮独立代码/测试评估入口，明确建议不自动成为队列 |
| 根 Features 未充分区分 AI 入口、可用模型、Trash 与隔离入库 | 加入能力边界；记录已接线的解释性词法搜索 |
| TASK 保留继承任务的下一步安排 | 按本次范围重写，仅保留恢复定位及工作区保护 |
| Capture README 要求 Node/Electron ABI 来回重编 | 按 package.json 的 Electron Node 启动器修正命令 |
| Library README 将 authority 切换绑定旧 Issue | 保留接线约束，将编号明确为历史上下文 |
| dev 命令容易被当成无副作用验证 | 依据 main/index.ts 披露启动数据库迁移与调色扫描；本轮使用隔离测试 |

AGENTS 增加简短的开发判断原则：按用户收益、数据安全、完整调用链和
可观察验收选择小范围工作。CONTEXT、ADR 分类与领域含义不改动；
package/lock/TypeScript/Vite/CI 配置本轮只审查，不为文档优化升级依赖。

多维评估、代码证据及本轮实测结果见
[开发重新评估](../product/DEVELOPMENT-REVIEW-20260907.md)。
本轮没有重新做全量搬移原文保全审计，前述字节数属于继承记录，
不能用作本次修改后的精确体积或新的验证结果。
