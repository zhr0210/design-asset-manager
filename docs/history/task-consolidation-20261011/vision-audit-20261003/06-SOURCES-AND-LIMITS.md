# 06｜来源、定位与证据限制

## 现场与日期

Windows `G:\antigravity\Design Asset Manager 1001`，Remote设备`DESKTOP-3573AOS`。
2026-10-03现场，HEAD `b5cc954f90d248694aedc2d6ca1aa5188fa0aa11`，但本次代码读取主要来自**有未提交修改的工作区**。不能用HEAD单独代表所有引用的字节。

以下是私有仓库路径引用，不是互联网搜索结果。重点文件的现场SHA-256保存在 [SOURCE-FINGERPRINTS](manifests/SOURCE-FINGERPRINTS.json)，用于后来核对，不能替代审阅或复制源码。

## 仓库来源索引

| ID | 路径/定位 | 本次使用范围 |
|---|---|---|
| S01 | `AGENTS.md`；尤其产品、修改/权限、RUX2026-10-02段 | 全文阅读；产品/开发/最新CU规则 |
| S02 | `docs/product/PRODUCT-FOUNDATION.md` | 全文；AI+、工作模式、原件和后续边界 |
| S03 | `docs/product/COMMERCIAL-DEVELOPMENT-GOALS.md` | 全文；消费者结果与目标，不是实测承诺 |
| S04 | `PROJECT.md`、`ORIGINAL_REQUEST.md` | 历史属性；后者标题/相关条款定位，不作为新授权 |
| S05 | 既有2026-09-30/10-01规划 | 本包baselines中原Markdown；受后续批准覆盖 |
| S06 | `docs/adr/0491-local-clients-share-one-host-and-product-workspace.md` | 全文；用户确认的本机双客户端 |
| S07 | `docs/product/LOCAL-DUAL-CLIENT-SPEC.md` | 全文；Q1–Q9、双端、Host、草稿和验收 |
| S08 | `docs/product/LOCAL-DUAL-CLIENT-IMPLEMENTATION.md` | 头部及E01–E46记录；不是全部日志/截图重放 |
| S09 | `TASK.md` | 最新和历史段落审阅；PARTIAL、候选、已知失败与授权 |
| S10 | `README.md` | 全文；旧单卡片、设计入口、旧poller等过时描述 |
| S11 | `docs/handoff/CURRENT-STATE.md`、`docs/REHOST.md` | 全文；原跨机状态与当前本机提交的差异 |
| S12 | `docs/agents/implementation-status.md` | 状态文档及分段更新；与当前代码对照 |
| S13 | `docs/product/RELEASE-ACCEPTANCE.md` | 全文；交付门与末段过时“当前事实” |
| S14 | `CONTEXT.md` | 标题、结构和相关术语定位；未全文逐条审计 |
| S15 | `docs/agents/ui-ux-acceptance.md`、`DESIGN.md` | 现行验收流程/设计定位；未执行本次视觉验收 |
| S16 | `src/shared/workflows/app-navigation.workflow.ts` | 全文；canonical routes与兼容别名 |
| S17 | `src/renderer/App.tsx` | 全文；正式路由装配 |
| S18 | `src/renderer/routes/AiConsolePage.tsx`、`AiWorkspace.tsx` | 全文；兼容壳与单一AI分区 |
| S19 | `src/preload/index.ts` | 全文；命名共享Client桥 |
| S20 | `src/main/index.ts`；重点1–240、475–603 | 信任/单Host/共享命令、543后资源与Controller组合、574资格 |
| S21 | `src/main/local-host/local-dam-server.ts`、同目录README | 全文；session/Origin/CSRF/command/replay边界及限制 |
| S22 | `src/main/visual-ai/visual-preparation.ts:8–10, 27–32` | 全文；Mac-only生产资格与codec检查 |
| S23 | `src/main/visual-ai/visual-admission.ts` | 全文；共享账本、prepare异常、resume和OCR/探测申请 |
| S24 | `src/main/independent-tags/tag-intent-backup.ts:48–60`及后续backup | 全文；OS/APFS/SQLite/native资格、备份/恢复 |
| S25 | `src/main/background-analysis/README.md` | 全文；plan-only与无默认推理 |
| S26 | `src/main/background-ocr/README.md` | 全文；资格null、有限恢复、DP01观察撤权 |
| S27 | `src/main/ai-gateway/PROVIDER-MATRIX.md`、README | 全文；实际允许/受限/真实服务未测 |
| S28 | `src/main/ai-gateway/pi-runtime-host.ts` | 资格/校验/并发相关定位；未完整独立重放其测试 |
| S29 | `src/main/services/ai-runtime/platform-ai-branch-evidence.internal.ts`及README | 全文；旧分支提取仍无生产消费者 |
| S30 | `src/main/library-lifecycle/host-schema-maintenance.internal.ts` | 全文；当前未跟踪维护提取，资格未随之扩展 |
| S31 | `scripts/build-identity.mjs` | 全文；输入集合、生成文件排除与副作用 |
| S32 | `package.json`、lock与`electron.vite.config.ts` | 元数据/构建配置；不读整个依赖源码树 |
| S33 | `tsconfig.json`、`.gitattributes`、`.gitignore` | 配置与规则；TS仅include src，行尾和临时目录 |
| S34 | `scripts/handoff-preflight.mjs` | 全文及独立运行；仅存在性 |
| S35 | `scripts/local-dam-command-replay.test.ts` | 全文及独立运行；生产HTTP、合成业务回调 |
| S36 | `scripts/run-ts-test.mjs` | 全文；只输出dist-temp测试编译产物 |
| S37 | `.scratch/local-dual-client/final-suite-failure-triage.json` | 头部/来源与部分失败条款；未全文核验757行/全部raw日志 |

`final-checkpoint-20261003.json`只确认本机路径存在及上层报告引用；本次未重新逐blob验证其所有658源码/277选择文件，不作此类通过声明。

## 本次证据

| ID | 本包文件 | 性质 |
|---|---|---|
| E01 | `evidence/REPOSITORY-SNAPSHOT.json` | 现场Git/HEAD/平台seal/build identity结果整理 |
| E02 | `evidence/REMOTE-CHECKS.json` | 4条实际命令、各自exit/耗时/范围；context FAIL保留 |
| E03 | E02中的`real-http-replay-boundary` | 一个脚本的多断言，不编造“7项node:test”计数 |
| E04 | `evidence/WINDOWS-ADMISSION-PROBE.json` | 原生产函数、内存编译、实际Windows平台拒绝及传播 |
| E05 | `evidence/STATIC-DEPENDENCIES.json` | 634代码文件的限定静态导入图；不是删除证明 |
| E06 | `manifests/SOURCE-FINGERPRINTS.json` | 45份选定现场文件摘要，部分不在HEAD |
| E07 | `evidence/INVENTORY.json` | 文本/配置行数体量；JSON和注释计入，不等于纯代码LOC |
| E08 | `evidence/AUDIT-LIMITATIONS.json` | 审阅工具自身错误、修正、未运行与副作用边界 |

这些JSON是对工具返回值的整理/转录，**没有声称它们是远端测试原始日志的逐字节下载件**。它们足以定位命令和结论；需要独立复核时，在相同候选按工具脚本重新运行并保存本机原始输出。

## 历史规划副本

- B01：`baselines/MASTER-ROADMAP-20260930.md`，原DP路线的未修改Markdown。
- B02：`baselines/RUX-EXECUTION-PLAN-20261001.md`，原R00–R08计划的未修改Markdown。
- 来源在本对话已挂载的历史文件中确认；摘要列入`manifests/BASELINE-SOURCES.json`。
- 不带入旧压缩包、凭据、模型、运行中profile、数据库或无关截图。

## 外部资料边界

本次判断主要依赖用户给定规划和私有仓库现场，未新增厂商条款或SDK“最新版本”结论。涉及下一轮真实厂商认证/依赖升级时，执行者应按当时官方一手资料核验，不能把本报告的历史Provider矩阵当作永久规则。
