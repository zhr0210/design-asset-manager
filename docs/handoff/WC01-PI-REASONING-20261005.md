# WC01：DAM / Pi 思考强度接入交接（2026-10-05）

最新用户批注“完成该功能接入”已实施。连接级设置、目录资格、Pi 参数转换、执行冻结、能力证明及视觉证据已接通。正式 Browser 的 Luna low 生成图探测、单图分析和保存后重开通过；Desktop 仍未运行，整体第三项产品复测按用户要求排除。本轮完成后 STOP，不自动执行后续队列。

## 授权、数据与恢复点

- 仅实施本批 reasoning 及同路径 probe/review/快速取消修复；模型为 gpt-6-luna。
- 沿用已批准 ChatGPT 订阅、用户厂商登录、保留本机会话和公开测试图片副本授权。未读/导出 Cookie、vault、令牌、认证 URL 或身份；由 Main 正常解析及刷新获批会话。
- 没有私人旧库访问、模型/依赖下载、相邻模型服务启动、其他 Provider 开放、API 计费 fallback 或资格替代。无 reset/clean/stash/stage/commit/push/发布。
- 本轮 run：`.scratch/wc01-reasoning-20261005/run-J24R9B`；pointer：`.scratch/wc01-reasoning-20261005/selected-run.txt`。
- `baseline.json`保存3546候选文件与6个既有缺失路径、HEAD/index/上一锚点；31个关键源码、入口与旧 out 文件在 `before/`。其他既有 WIP 用全量 SHA 比较保护，不能把全仓库 diff 归为本轮。
- 上批终态 `.scratch/wc01-real-model-library-20261005/run-U4eFuo/terminal-anchor.json`，SHA `775a0bcea36a1d22974a474078eaa47457fb06db66a2dbd2e43c3614e1805a4a` 保留。

## Before / after 与适用范围

| 行为 | Before | After |
| --- | --- | --- |
| 设置与执行 | DAM无思考强度字段，始终 raw stream | 连接页可选模型默认或目录支持档位；显式档位经 streamSimple 传给 Pi |
| Luna 档位 | SDK有能力，DAM没有使用 | off/low/medium/high/xhigh/max；off→none，minimal拒绝 |
| 旧默认 | 原 Pi raw stream | 省略字段保持相同 raw stream 和 binding 字节；固定 Luna 的实际 wire 默认为 none，不能冒称 medium |
| 实际模型资格 | 未传 reasoning | 每次按实际任务模型重核；invalid/unsupported 在 Worker auth、refresh、fetch 前拒绝，不 clamp/fallback |
| 兼容服务 | 未声明 reasoning 能力 | 仍只允许模型默认；显式档位拒绝，不因为地址可用就放行 |
| 确认与重试 | 没有档位证据 | 配置、binding、单次确认、视觉/反推/独立标签和截断重试冻结相同档位；变更撤销旧授权 |
| 能力与结果 | 只保存模型及图片/JSON证据 | 能力证明和视觉结果带 reasoning；Inspector 显示并能重开读回 |
| probe自身保存 | 显示“另一界面修改” | 同配置下采用本次保存的证明；错误/草稿变化清除单次 review 与旧提示 |
| 快速取消 | 首构建反复请求静态目录，耗尽Worker槽位 | 配置页复用成功静态目录和同key在途请求；不缓存身份/推理/Runtime资格 |

入口：“AI 与模型 → 连接与账号 → 选择连接 → 思考强度 → 保存连接”。这是连接级选择；任务默认模型若另选模型，仍按实际模型资格执行。保存配置不授权上传素材。AI 建议仍是建议，不自动确认标签或覆盖人工修订。OCR与资源、备份、Provider门槛保持。

## 实际文件与候选闭包

精确路径、before/after SHA和新增候选见run内 `candidate-source-state.json`；执行源码见 `execution-source-manifest.json`，实际产品690输入及14输出见 `product-identity-recheck.json`。

| 类别 | 实际修改 / 新增文件 |
| --- | --- |
| 类型与公开契约 | `src/shared/types/ai-backend.types.ts`；`src/shared/contracts/ai-connection.contract.ts`；`src/shared/contracts/visual-ai.contract.ts`；新增 `src/shared/workflows/ai-reasoning.workflow.ts` |
| Main配置与冻结 | `src/main/ai-credentials/public-settings.ts`；`src/main/ipc/ai-backend.ipc.ts`；`src/main/ai-gateway/backend-binding.ts`；`src/main/ai-gateway/ai-connection-service.ts`；`src/main/ai-gateway/pi-runtime-host.ts` |
| 正式任务链 | `src/main/visual-ai/openai-vision.provider.ts`；`src/main/visual-ai/openai-vision.transport.ts`；`src/main/visual-ai/visual-ai-controller.ts`；`src/main/independent-tags/tag-recipe.ts`；`src/main/independent-tags/tag-execution-controller.ts` |
| UI | `src/renderer/components/asset/PiConnectionsPanel.tsx`；`src/renderer/components/asset/VisualAiPanel.tsx`；复用已有组件和样式 |
| Runtime与构建 | `pi-runtime/worker.mjs`；新增 `pi-runtime/model-reasoning.mjs`；`pi-runtime/release.json`；`src/main/ai-gateway/pi-runtime-release.ts`；`scripts/seal-pi-runtime.mjs`；`scripts/build-identity.mjs`；`src/shared/build-identity.generated.ts`；`package.json` 的 extraResources；实际 `out/` 重建 |
| 测试 | `scripts/pi-contract-fixture.mjs`；新增 `scripts/pi-reasoning.test.ts`、`scripts/pi-reasoning-ui.test.mjs`、`scripts/fixtures/wc01-reasoning-library-oracle.test.ts` |
| 文档 | `TASK.md`；`docs/handoff/CURRENT-STATE.md`；`docs/handoff/WC01-FAILURE-QUEUE-20261003.md`；本交接；`src/main/ai-gateway/README.md`；`pi-runtime/README.md` |
| 受控启动入口 | 新增 `.wc01-reasoning-profile-run-J24R9B.mjs`与`.wc01-reasoning-profile-run-J24R9B-02.mjs`；run父目录prepare/launch/make-second-launcher/verify-and-seal源码均显式封印，不能当作普通发行入口 |

`src/main/ai-acceptance/acceptance-service.ts`读取复核：它调用同一 Visual Controller 与 `invokeForAcceptance`，已有配置 digest/单次 permit；reasoning自动继承，无新增改动。未新增IPC channel或SQLite schema；可选字段变化已同步直接调用方。新untracked源码/测试/启动器纳入本轮候选，但没有stage。Router trusted ownership只覆盖tracked文件；不能把其708/708说成新增文件已受index覆盖。

## 必要检查与独立复核

| 检查 / 可重放命令 | 最终结果 | 日志（run/evidence） |
| --- | --- | --- |
| `node scripts/run-electron-node-test.mjs scripts/pi-reasoning.test.ts` | 19/19；SDK六档payload、默认none、拒绝时零auth/refresh/fetch；设置/binding/证明；任务与重试；正式Host提交/重开 | `pi-reasoning-02.log` |
| `node scripts/pi-reasoning-ui.test.mjs` | 7/7；完整React组件、保存/取消、不支持恢复、review/证明及目录请求复用 | `pi-reasoning-ui-03.log` |
| `node scripts/run-electron-node-test.mjs scripts/pi-visual.integration.test.ts` | 7/7 | `pi-visual-integration-01.log` |
| `node scripts/run-electron-node-test.mjs scripts/pi-credentials.test.ts` | 14/14 | `pi-credentials-01.log` |
| `node scripts/run-electron-node-test.mjs scripts/pi-runtime.test.ts` | 5/5 | `pi-runtime-01.log` |
| `node scripts/run-electron-node-test.mjs scripts/pi-runtime-verification.test.ts` | 17/17，资源/封印拒绝保持 | `pi-runtime-verification-01.log` |
| `node scripts/pi-ui.test.mjs` | 最后5/5，缓存修复后回归 | `pi-ui-02.log` |
| `npm run typecheck` / `npm run build` | PASS；最后typecheck包含oracle；最终build690输入 | `typecheck-03.log` / `build-02.log` |
| `npm run context:check` | PASS，tracked ownership708/708；1个新untracked一方源码排除警告保留 | `context-check-02.log` |
| `node scripts/run-electron-node-test.mjs scripts/fixtures/wc01-reasoning-library-oracle.test.ts` | PASS；独立于Host的direct readonly SQLite、integrity/FK与字节保护 | `independent-oracle-01.log` / `independent-oracle.json` |

七套自动化合计74检查通过；UI组件合成测试不计Desktop Computer Use。主Agent人工复核调用链和本轮源码差异，见 `evidence/direct-source-review.diff`、`evidence/source-review.json`。独立oracle指独立读取权威数据库和文件并核对，不声称另有独立人员/Agent审查。

真实库副本是上批 `baseline-v13` 的普通独立复制：本轮 `work-browser`，61文件、24资产/schema13；无hardlink、未修改上批副本。独立oracle确认恰好新增一条 public-01-astronaut / Luna low证据，source/revision/preview一致；其他23素材、人工字段/确认标签/组织关系、61 baseline文件及48原件/预览保持。结果是AI建议，未自动确认。

保留首次失败：参数首轮16/19的默认wire/同步throw/夹具默认disabled假设，首UI未先展开高级选项，tests-map尝试纳入untracked命令被严格拒绝，首构建快速取消耗尽槽位。修正对应夹具或最小产品实现后复测；旧FAIL、截图、首build完整out均保留，不删除测试、降低断言或放宽门槛。tests-map本轮尝试已恢复原字节，未绕过index准入。

## Browser CU：环境、操作、结果

普通 `--dam-browser` 入口，共享正式Electron Local Host、Main handlers和权威库提交。先尝试Codex IAB普通origin，显示“请使用 DAM 浏览器版入口”；未复制grant/cookie，转普通入口自动打开的Chrome，以同一Browser客户端完成。没有桌面输入或后台调用冒充CU。

profile label `WC01-REASONING-R2`，复用获批 `WC01-REAL-N04` 会话。Main import前同时隔离userData与legacy home；实际safeStorage可用；没有synthetic credential protection、network/dialog资格override。证据 `ordinary-02-profile-qualification.json`及封印launcher。首构建正常Browser退出后换最终build，旧Main也正常退出；未强杀或替换认证。

实测浅色、普通Browser默认2321×1253及1366×768；较小尺寸验证新增控件、Tab焦点、滚动与取消，之后reset viewport。其他缩放/主题/完整焦点矩阵未覆盖。

| 用户任务 / 实际操作 | 预期 | 实际与状态 | 截图 / 记录（evidence） |
| --- | --- | --- | --- |
| 工作区AI与模型→连接→Luna目录 | 仅六个支持档位及模型默认，无minimal | PASS；保存low、换最终构建/刷新仍low，证明保持 | `browser-low-saved.png`；`browser-final-configuration.png/txt` |
| 手动换gpt-4.1-mini/max或compatible草稿 | 不自动降档，拒绝保存，取消回原配置 | PASS；未保存草稿、未推理 | `browser-unsupported-model.png/txt` |
| off/default/high/max选择及取消 | 不写未保存草稿，不发推理 | PASS | `browser-rapid-cancel-pass.png`；`browser-1366-cancel.png` |
| high→取消连续三次 | 不耗尽目录/Worker槽位，恢复low且保存可用 | 首build FAIL，最终build PASS | `browser-rapid-cancel-fail.png/txt`→`browser-rapid-cancel-pass.png` |
| low生成图review→改medium→取消 | 披露low，草稿变化清旧review，恢复low | PASS | `browser-probe-low-review.png` |
| 点击同意发送生成测试图 | 单次获批真实low，保存有效图片/JSON/颜色证明 | PASS；过期会话由Main正常refresh；无假外部冲突，review已退休 | `browser-probe-low-pass.png/txt` |
| Browser实际目录选择器打开work-browser→Inspector→分析确认 | 仅public-01-astronaut的1024RGB预览及low披露 | PASS；单独确认后真实订阅分析，541输入/267输出tokens，费用null | `browser-formal-low-review.png`→`browser-formal-low-pass.png/txt` |
| 正常关库→重新打开上次素材库→Inspector | 读回同一low证据及时间/用量，不再推理 | PASS；oracle另核对正式落盘和用户状态 | `browser-formal-low-reopen.png/txt` |
| high未保存→返回工作区→重新选连接 | 保存值保持low | PASS数据保持；当前既有导航直接丢弃草稿，无离开确认，不能声称保护提示通过 | `browser-unsaved-navigation.txt` |
| 1366×768 Tab及取消 | 新控件可见、焦点可辨、可滚动到取消并恢复low | PASS限定路径；不等于全套快捷键验收 | `browser-1366-configuration.png`；`browser-1366-cancel.png` |
| 关于页及终态关库 | UI显示最终build，素材库关闭 | PASS | `browser-final-build.png/txt`；`browser-final-library-closed.png` |

真实模型调用仅1次生成probe及1次单图动作（至多一次截断重试），计划推理attempt上界3；准确wire数未观测。SDK订阅仍省略max_output_tokens/temperature；requested maxTokens不是厂商硬cap，不能声称额度或费用硬上限。目录及选择UI操作不追加素材推理。

## 身份及接手入口

| 身份 | 本轮值 |
| --- | --- |
| HEAD / branch | `b5cc954f90d248694aedc2d6ca1aa5188fa0aa11` / `codex/windows-workspace-1001` |
| index | `a15e17ebf7ccf5fc372772ec11b867a2ca4cf50b6b59750b2cb3d60c7b7bfb1c`；本轮不变 |
| source / build | `dam-ddd88ccd17321322`；sourceDigest `ddd88ccd17321322c9d4991f58a3b6bc8d6d6ecce6d5f0cabac1171a8ffaeb3b`；690输入/14实际输出 |
| build时间 | `2026-10-05T14:37:00.033Z`；完整重算使用build-identity的同排序算法，不再生成builtAt |
| Main bytes / 实测进程 | SHA `8371968e6079038dc5aabaa0d2ff392f8bf2fb76b8e19799d69bb36f9a74ea9d`；PID52160 / `WC01-REASONING-R2` |
| Electron / Node / ABI | 30.5.1 / 20.16.0 / 123，Windows x64 |
| Pi / 独立Node | 0.99.1 / 24.21.0，win32-x64 |
| Pi release | SHA `27be409a4075f4bdae2cfa1a2587e6ade200ba44989b4c1d7ff4d24e8e27ba6e`；11838文件，Main pin及完整inventory核对 |
| native backup | `bundle-VMRDqd`；manifest SHA `4023c30f82aa8db0a5fa459aece908db7cbe4b1b49d51036bcddc563c0e89112`；原NTFS/x64/初始≤1MiB/growth4MiB资格保持 |

Remote Desktop Commander先读run内 `terminal-anchor.json`，再读本交接和 `terminal-process-state.json`。最后观察Browser `http://127.0.0.1:62288/`，测试库已关闭、会话保留、owned Pi worker及模型helper为0；origin/PID是截止点，进程失效必须重新核验，不能拿旧About或generated身份冒认。可通过已有Browser入口选ChatGPT连接查看low/证明，或从普通UI重新打开本轮公开测试副本读既有结果；新推理与桌面操作按后续批准执行。launcher的源码和Main字节绑定见执行manifest，重启前先确认没有仍存活的唯一Main，不盲目重跑启动器。

终态锚点关联候选SHA、build输入/输出、Pi全封印、未变native、执行源码、独立oracle、Browser矩阵和白名单证据manifest；profile/vault/cookies/身份/认证URL及数据库/图片raw字节不进入manifest。索引/上批锚点/无关WIP保持。历史build `dam-de66991c9eecccab`保存在`build-01/`，不是当前进程。

## 未验证及下一批建议（不自动执行）

- 真实 low 以外档位、云端独立标签/反推/细化的实际模型质量：本轮仅合成SDK/正式Host契约通过，未追加云端调用。
- Desktop/原生CU仍NOT_RUN：原生窗口/焦点/系统快捷键、账号取消/退出和safeStorage系统锁定恢复、跨应用交接；需要后续批准。Browser通过不能覆盖这些路径，完整UI/UX仍未宣称完成。
- 安装包extraResources实际分发、签名安装、macOS、私人旧库、大库迁移、kernel/断电/restore未覆盖。
- 既有profile路径权威、未保存导航确认、原gpt-4.1-mini probe根因UNKNOWN及订阅token硬cap限制继续列入队列。静态准入说明仍使用历史“尚未验收”字样，实际范围以当前proof/本交接为准，未扩改所有Provider文案。
- 下一批可选：获批桌面专项；或限定生成图比较其他档位的等待/用量/质量；或单独授权处理RAM离线依赖、CLIP/WD质量。均不由本交接新增授权。

本功能实现及限定Browser关键路径完成；当前失败分类与后续边界见[队列](WC01-FAILURE-QUEUE-20261003.md)。STOP。
