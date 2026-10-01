# P00｜当前状态审计

MODE=SPEC；2026-09-24；状态：ready_for_review。本文是源码/材料审计，不是业务测试报告。仅核查P00，不实施后续阶段。

## 1. 输入、优先级与出处

- 本轮用户明确授权：把包当作目标架构与参考索引；只做P00；不改业务代码、不启动应用/模型、不操作真实库、不覆盖未提交内容。
- `inputs/`为本轮选定包内文档的原样副本，不是仓库新的执行指令入口。原ZIP未修改；出处与SHA见[包清单](evidence/PACKAGE-PROVENANCE.json)。没有执行包内脚本或其他阶段prompt。
- S00：包内原交接稿与仓库`docs/handoff/PROJECT-ARCHITECTURE-HANDOFF-20260924.md`逐字节一致。S00的38个相对链接均找到文件；“文件存在”不等于38个文件全部内容已经审计。
- U01：包内用户需求作为目标输入；除本轮明确的P00/SPEC范围外，不产生实现或外部动作授权。
- 按P00阅读SYS-01、HOST-03、DEV-21、MIG-23及T01/T24所需VAL-22。公开Sxx引用未重新联网核验，也未继承包声称的30份资料审阅结论为本次事实。
- 已读真实AGENTS、TASK；CONTEXT共有5699行，是术语表，读取开头及本阶段的库权威、资源、分析意图、Recipe、证据、外发等相关条目，没有声称逐行审阅全部词条。

## 2. 工作区基线与保护

| 项目 | 本次核查 |
| --- | --- |
| 分支 | `codex/product-reassessment-20260905` |
| HEAD | `3fa00df3bbb605478da6d0af18724d64021e723c` |
| Git状态记录 | 1285条 |
| staged / unstaged / untracked | 18 / 775 / 506；可重叠，不能相加当作独立文件总数 |
| 现有源码/文档保护指纹 | 1686个文本文件；另记录index/staged diff/unstaged diff摘要 |
| 稀疏检出/子模块 | 本地检查未发现skip-worktree条目、稀疏启用配置或已登记submodule依赖 |
| 工作区取得状态 | 本机非稀疏工作区可读，P00所需源码与锁文件已取得，源码核查可进行；未制作完整可搬迁源码包 |
| 可复现性 | HEAD单独不足；未跟踪文件参与当前实现。完整路径/状态清单及内容摘要已保存，但摘要不能重建文件 |

完整已有staged/unstaged/untracked清单见[WORKTREE-BEFORE.json](evidence/WORKTREE-BEFORE.json)。未把diff内容、密钥、用户素材或模型文件打包；只记录源码相对路径及受控摘要。没有reset/clean/stash/checkout/add/commit。结束保护比对见[WORKTREE-PRESERVATION.json](evidence/WORKTREE-PRESERVATION.json)。

package-lock为v3；锁定Electron30.5.1、React18.3.1、TypeScript5.9.3、better-sqlite3 12.10.0、Sharp0.34.5、Playwright1.60.0。它们是锁文件证据，不代表本轮启动过运行时或验证过已安装依赖。S00列的是package.json声明范围，两种口径不冲突。

## 3. 已核实事实

| ID | 源码事实 | 证据入口/符号 | 审计限定 |
| --- | --- | --- | --- |
| F01 | 正式Main组合独立活动库、应用状态、工作窗、卡片、AI/OCR/下载 | `src/main/index.ts:139–162,231–283`；`setupIpcHandlers` | 静态接线，不是本轮运行成功 |
| F02 | 活动库写入使用Host-held binding/lease | `active-library-host.ts:159–179,490–513`；`run` | 未打开真实SQLite验证 |
| F03 | visual-ai任务/确认保存在内存Map | `visual-ai-controller.ts:20,73,93–101` | 保存结果是持久的；未完成任务不是持久Journal |
| F04 | 视觉结果为完整综合输出；同一次成功写证据和建议标签 | `visual-ai-storage.ts:26–41`；`commitVisualAiEvidence` | 未实现目标Job/Attempt/PhysicalInvocation+Outbox原子状态 |
| F05 | 专用OCR由Main选择Python，stdin受控预览，Host提交 | `ocr-runtime.ts`、`local-ocr-process.ts:6–30`、Host `commitOcr` | OCR独立证据不等于所有AI能力已独立 |
| F06 | 关库/退出先撤权取消，Host等待已开始操作再释放 | `index.ts:214–224,267`；Host `close:260–273` | 没有执行关库或杀进程测试；取消不证明外部物理计算已停止 |
| F07 | 主查询仍以列表读取和Renderer纯词法投影为主 | `active-library-asset-queries.ts`；`Library.tsx:167` | 未接目标Host分页/中文FTS/混合向量索引 |
| F08 | 工作集内容/布局经Host持久化；原生窗按token/成员范围调用 | `index.ts:149`；`work-window-controller.ts`；Host `writeWorkSet` | 不等于视频、跨软件原件拖出已交付 |
| F09 | 模型库Workspace正式可达，但发行目录输入为null | `model-library-workspace.composition.ts:65–89`；`official-model-catalog.release-input.json` | 源码会解析为missing；本轮未执行该模块或查看真实目录 |
| F10 | Eagle正式组合选择UnavailableProvider | `connected-library-runtime.ts:43–59` | 合成Adapter存在，不等于真实Eagle已配对 |
| F11 | Legacy正式只读入口存在 | `legacy-readonly-workspace.ts:37–106`；`readonly-library-database.internal.ts` | 只读opener当前显式限定darwin；旧资料库本轮未选择/打开 |
| F12 | 旧Worker/Runtime IPC受限；旧反推与旧删除明确拒绝 | `disabled-app.ipc.ts`；`active-library.ipc.ts:138–145` | 不是待自动恢复功能；不能删掉拒绝边界 |
| F13 | 主窗口sandbox=false；contextIsolation=true、nodeIntegration=false | `index.ts:102–106` | 不能宣传所有窗口均已沙箱化；不在P00修改 |
| F14 | localEndpoint按回环hostname给出local标记 | `visual-ai-controller.ts:12,70` | 不证明该服务没有进一步转发至云端；目标控制权/外发路由待设计 |

## 4. S00、目标包与当前源码的差异

1. **S00未丢失**：原稿字节一致，源码的主路径与其总体描述相符。S00不是最新运行验收，本次不自动沿用其中的“通过”。
2. **目标不是现状**：包中的`ai/planning`、`jobs`、`resources`、`egress`、`search`等逻辑模块不是现有正式统一执行层；P00不创建空目录。
3. **后台默认能力有规范差异**：包U01以标签/描述/OCR为默认基础分析，反推主动触发；仓库CONTEXT的Baseline Automatic Analysis Profile与ADR0169还包含Embedding。两者是目标/旧目标的待对齐事项，当前不据此启用任何后台队列，也不擅改ADR。
4. **资料库权威不能机械统一**：包“所有权威写入经Host”应解释为各数据域的权威边界。Managed资产经Active Library Host，Eagle原件属于Eagle，App DB存应用状态，Legacy不写。不能把所有数据库都迁入一个库连接。
5. **旧代码有局部价值但不代表正式入口**：旧Provider的中文策略/重试已经部分迁入新transport，旧全局数据库同步不能直接恢复。`ai-runtime-adapter.ts`是plan-only结构，不能称为完整推理网关。
6. **文档漂移仍在**：Renderer README旧段落仍写下载不可执行、工作集持久化待实现；当前组合/Host和v7模块已存在。Capture README保留早期未接线清单。P00只记录，不覆盖用户文档。
7. **数据结果与任务状态不同**：已保存AI/OCR结果可重开，不等于未完成推理可断点恢复；Eagle Outbox和下载Journal也不是目标AI Job Journal。

## 5. 缺口与影响

- G01：10份Qwen历史JSON均未内嵌完整原始命令和exitCode；缺历史工作区digest与所有环境变量的同一份运行包。保留reported结果，不给本轮PASS或严格可复现认证。
- G02：历史私有8图原件、临时manifest与模型原文不在审计材料内；此前文档声明已清理。本轮不查找原件或临时目录，事实质量与原文件保持不变只能引用历史报告，不能复核字节。
- G03：2B与8B UI总环节JSON内容相同且没有模型/时间字段，单独该文件无法标识某次执行；需配合同目录模型专属`*-ui-real-local-ai-report.json`。仍缺统一runId。
- G04：非AI模块聚焦测试脚本存在，但本轮未取得覆盖全部模块的原始stdout/exitCode。说明文档中历史“通过”只作为历史叙述，不冒充完整日志。
- G05：Windows、签名包、真实Eagle、大库/压力调度、云费用/最终计算位置未独立核验；均NOT_RUN或unknown。
- G06：`src/main/model-library-workspace/README.md`不存在；改从composition/workspace源码核查，未把缺README误判为缺模块。
- G07：未执行完整静态依赖分析，未穷举动态import、字符串生成SQL、全部隐藏调用方；MODULE-REACHABILITY是聚焦入口人工追踪，不是安全证明或删除许可。
- G08：不读取本机已安装权重、Runtime缓存或用户配置。锁文件/已归档校验清单不能证明此刻机器仍可运行相同模型。

源码核查范围不BLOCKED：本阶段所需工作区材料可读。以上证据缺口阻止新运行结论、平台/质量放行与后续直接实施，不阻止完成P00的SPEC报告。
