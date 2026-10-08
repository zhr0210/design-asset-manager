# WC01 Windows backup authority 设计交接

2026-10-05（Asia/Shanghai）。本批终点是可审阅设计和受控测试计划，**DESIGN_COMPLETE / STOP**。所有方案仍为 Target Architecture；productionQualified=false、restoreAllowed=false、namespaceMetadataQualified=false、formalAdapterWired=false、nextBatchAuthorized=false。设计完成不等于 Windows 备份实施或资格通过。

## 实际交付与 before / after

| 文件 | 本批实际变化 |
| --- | --- |
| [authority 设计](../platform/WINDOWS-BACKUP-AUTHORITY-DESIGN-20261005.md) | 新增 H/U/E/C/A/B/X、O1–O7、T0–T8；A/B1/B2 比较、native/OS 候选、事务接口、失败分类和33项未来矩阵，含 Microsoft primary-source 与访问日期。 |
| 本交接 | 新增设计结果、静态身份、未验证项和 Remote 接手入口。 |
| [CURRENT-STATE](CURRENT-STATE.md) | 仅添加2026-10-05 Target Architecture设计入口；2026-10-04实际实施/运行证据保持原日期。 |

产品源码、TASK.md、实际 index、root generated、现有WIP和失败日志未改变。没有账号/service/ACL/token/Broker/安装、正式Adapter、Runtime/model执行、真实数据读取、stage/commit/push。scratch分析与本批证据位于 `.scratch/windows-backup-authority-20261005/`，不是产品接线。

before：A协作Host/B独立principal只有候选边界，未明确独立authority究竟保护新备份还是所有源事务。after：B1只保护新snapshot/artifact，不能隔离现有MAIN；保留强源隔离目标的候选是B2，须迁移唯一Control Store connection与所有物理writer，并保持DDL/业务/marker同事务。该架构选择与公共seam尚未批准实施。

**实际行为没有变化**：正式Windows backup仍在backup/status/DDL前拒绝；基础NTFS Library路径不等于备份资格。当前lifecycle真实先传输/readback再完整verifier；设计提出先完整verifier再传输为未来改变，未修改当前顺序。Main的业务权限与A拟议物理提交分开，不能分裂事务或把远端marker接在本地COMMIT之后。

## 验证与独立复核

| 项目 | 本批事实 / 限制 |
| --- | --- |
| 当前源码静态复核 | 零source drift（root旧generated与实际candidate generated分别记录）；666产品inputs、14既有actual outputs SHA核对；121个前批evidence文件核验。没有把历史运行重报为新PASS。 |
| 文档验证 | 本批3文件的相对链接、33个场景ID、source引用、设计/实施标签与scope/index/WIP保持检查；详情见document-verification.json、closure-verification.json。 |
| Independent Standards / Spec | 结果与绑定的最终tree/rawdiff见本批standards-review-final.json、spec-review-final.json；只复核本批设计，不取得OS/runtime/UX资格。 |
| 产品测试 / build / Runtime / Pi | NOT_RUN；纯文档不重建产品、不重跑整套测试，不启动模型或外部服务。33项future matrix全部NOT_RUN。 |
| Computer Use | NOT_RUN；没有用户界面或业务接线变更。前批用户Esc的BLOCKED_UX_ACCEPTANCE仍有效，不能宣称UX完成。 |
| 历史测试 | 前批选定44PASS只归2026-10-04；所有attempts不是全绿，原失败和原断言仍保留。 |

本批静态read/hash是文档和身份检查，不能证明当前running process、physical release、PREVENT、nativeLoadedIdentity、directory durability或power-loss。

## 当前源码 / build / Runtime身份

| 身份 | 值 / 证据日期 |
| --- | --- |
| HEAD / branch | b5cc954f90d248694aedc2d6ca1aa5188fa0aa11 / codex/windows-workspace-1001；本批只读重新核对。 |
| 当前raw WIP/doc tree | 全tracked/untracked raw字节闭包（含未跟踪源码）；tree与逐文件SHA见本批candidate-manifest.json/terminal-anchor.json。该tree使用workspace root旧generated，不冒充新build tree。 |
| 前批实际sealed candidate | d08a5dd8d01db054c2e4c173577ee5109035572c；本批产品source与此前相同。 |
| actual build / sourceDigest | dam-4c583238a11c002d / 4c583238a11c002d03925b3e5a0d9cfdb879ef8c705a7b7331d7b18c6bb53bff；builtAt=2026-10-04T07:17:49.145Z，666inputs/14outputs，无本批build。 |
| artifactDigest | aa23d1b4f766527cd9345333db3275cdb21215f2caa9fcdd2620ec4acef577ac。 |
| actual index SHA | 250b713476614d1cfbd7073e80439a2fbc8612ea8ba7ac913786032c9c06bb76；本批保持byte/semantic/staged。 |
| root旧generated SHA | d227f4ee0bf43ce8ee65df87641ed832eea0ae33f88648c138d459be360c569d；本批不覆盖。 |
| actualcandidate generated SHA | 16df0552c4233672ce933e4cb08bc763e3f5c6cec3dd18bb9c5f34094ebca173；在前批candidate，非root当前值。 |
| Runtime最后观测 | 2026-10-04：Windowsx64 10.0.26200、Electron30.5.1、Node20.16.0、ABI123、NAPI9、libuv1.46.0；本批仅检查安装Electron package version=30.5.1，未新执行Runtime。 |
| SQLite | 最后运行3.53.1；sourceId=2026-05-05 10:34:17 c88b22011a54b4f6fbd149e9f8e4de77658ce58143a1af0e3785e4e6475127e9。native SHA=258341bfff296ac7a779c1dfc35e0b781c18c1a1b9ec3406551dbb473b4fe359，本批静态重验。 |
| Pi | source Node24.21.0/SDK0.99.1/pin99e47ca53d91aa342d134125f1980106105e27186ef4f61640c3bc3b98c651c0；NOT_EXECUTED。 |

前批anchor SHA=84f8b83ab579ba2e054c0b438272d6e7bdaae2d957b7c146e822200eac17279c；manifest SHA=28b46f093937cac6794f107155a788d58e25e9903b13a24eb72c55f882dee37d。旧证据以日期/来源保留。

## 未验证项与失败队列

- 强source隔离、既有writable section/handle、owner/WRITE_DAC/WRITE_OWNER、ancestor/继承/metadata、释放后保护均未获资格。当前endpoint SHA反例仍被完整written/source比较拒绝，不是假称绕过。
- B2全部writer迁移、H业务endpoint真实授权与Host/process/code trust、principal/provisioning、受保护安装/update/dependency closure、真实loaded identity仍是设计缺口。SID/PID认证不证明用户意图，未测实际H DACL不能断言注入可行或不可行。
- 准备/compiler/guardian/firstload全生命周期预算、hardRSS、所有knownhandle/view释放、普通appquit、真实kernel/MAINclose fault、namespace留存/目录/断电未验证。部分旧普通CloseHandle返回未检查，不以PROCESS signaled扩张保证。
- 原3次EBUSY及当前3/72首次rename EBUSY owner/timing仍UNKNOWN；48instrumented成功和稍后Host PSS不归因失败时点。name-only controls、scanner工程停止、observer初始环境失败保留。Router BUDGET_UNSATISFIABLE未清除。
- 当前commit marker只能证明current recorded存储事实；arbitrary complete writer可构造合法记录。status/exit/取消不授restore，不自动重试事务。无真实库、模型、账号、Provider、安装或macOS新验证。

## 下一批建议与Remote Desktop Commander锚点

建议下一批先做 **B2 Control Store全部writer/reader/transaction迁移清单与最小兼容协议草案**，明确Host endpoint信任和principal/provisioning选项，再给出可批准的bounded native/全新合成authority试验范围。尚未授权执行；不自动进入N/S prototype或正式Adapter，不修改真实旧库ownership。

快速接手：先读CURRENT-STATE的2026-10-05设计入口、本交接和authority设计。核对本机 `.scratch/windows-backup-authority-20261005/terminal-anchor.json` → `evidence-manifest-final.json` → `candidate-manifest.json` / `incremental-review.diff` / 两路review。所有精确tree/SHA与终态在anchor，禁止使用旧root generated或历史PASS推断当前进程。前批运行证据在 `.scratch/windows-backup-boundary-20261004/`，本批未启动测试Host，未执行任何远程接手动作。

本批完成后STOP；后续建议、矩阵、旧TASK和旧批准不扩张当前授权。
