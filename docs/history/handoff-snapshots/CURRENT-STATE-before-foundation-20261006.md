# 当前：DAM / Pi 思考强度接入完成（2026-10-05）

最新获批reasoning设置及Pi参数透传已接通，限定正式Browser关键路径通过。Desktop/原生仍NOT_RUN、需后续批准；整体第三项产品复测仍USER_EXCLUDED，不宣称完整WC01 UI/UX通过。完成STOP，不自动执行其他队列。

恢复先读`.scratch/wc01-reasoning-20261005/run-J24R9B/terminal-anchor.json`，再读[本轮交接](WC01-PI-REASONING-20261005.md)、[TASK](../../TASK.md)、[失败队列](WC01-FAILURE-QUEUE-20261003.md)。profile仅用非敏感label表示，凭据/Cookie/身份/认证URL未读导出且不进入manifest。

| 本轮路径 | 当前证据 / 层级 | 限制 |
| --- | --- | --- |
| 思考强度 | Current Implementation：共享设置、Main/Worker、正式Controller/Host及Browser接线 | 连接级；按实际任务模型再核资格，不为其他Provider新增授权 |
| Luna目录 | Pi0.99.1支持off/low/medium/high/xhigh/max；off→none；minimal拒绝 | 目录静态声明不是云端质量证明；compatible不声明档位 |
| 旧默认兼容 | 省略保持原raw stream与binding字节；固定Luna旧wire为none | 显式选择使用streamSimple；未知/不支持在Worker auth/refresh/network前拒绝，无降档 |
| 自动化 | 七套74检查、typecheck/build PASS；独立oracle PASS | 合成UI/SDK不算Desktop CU；其他真实档位不计通过 |
| Router | context:check PASS，tracked ownership708/708 | 1个新untracked源码排除警告保留；新文件由候选/执行manifest纳入，未stage/降预算或阈值 |
| Browser CU | low保存与刷新、六档/取消/不支持恢复、review清理、三次快速取消、低强度probe、单图分析及关库重开PASS | 默认2321×1253、1366×768局部焦点/取消；完整缩放/主题/键盘矩阵未覆盖 |
| 真实订阅 | 用户已登录，Main真实safeStorage；本轮Luna low双色probe+public-01-astronaut分析 | 541输入/267输出tokens，费用null；计划attempt上界3，wire数未观测；SDK maxTokens非硬cap |
| 独立保护核对 | 24资产/schema13、恰好一条low证据；其他23资产/人工字段/确认关系、61 baseline及48原件/预览保持 | direct readonly SQLite/FK/integrity/byte oracle独立于Host；仅获批公开图副本 |
| 同路径修复 | probe自身证明不再假报外部修改；草稿/失败清单次review；目录成功缓存/同key请求复用 | 首build rapid-cancel FAIL及首次测试失败保留；不缓存账号或Runtime资格 |

| 身份 | 当前值 |
| --- | --- |
| HEAD / branch | b5cc954f90d248694aedc2d6ca1aa5188fa0aa11 / codex/windows-workspace-1001 |
| index | a15e17ebf7ccf5fc372772ec11b867a2ca4cf50b6b59750b2cb3d60c7b7bfb1c；本轮保持 |
| source / build | dam-ddd88ccd17321322；sourceDigest ddd88ccd17321322c9d4991f58a3b6bc8d6d6ecce6d5f0cabac1171a8ffaeb3b；690输入/14实际输出；builtAt2026-10-05T14:37:00.033Z |
| Main bytes / process | SHA8371968e6079038dc5aabaa0d2ff392f8bf2fb76b8e19799d69bb36f9a74ea9d；PID52160 / WC01-REASONING-R2 |
| 平台 | Windows x64；Electron30.5.1 / Node20.16.0 / ABI123 |
| Pi Runtime | Pi0.99.1 / 独立Node24.21.0 Windows x64；release SHA27be409a4075f4bdae2cfa1a2587e6ade200ba44989b4c1d7ff4d24e8e27ba6e；11838文件 |
| native backup | bundle-VMRDqd；manifest SHA4023c30f82aa8db0a5fa459aece908db7cbe4b1b49d51036bcddc563c0e89112；NTFS/x64/初始≤1MiB/growth4MiB资格未扩大 |

候选state核对3546原文件、既有6缺失路径及本轮新增/允许变更；HEAD/index/上批锚点/无关WIP保持。新reasoning源码、测试、受控launcher和交接均明确入闭包但未stage。实际out与sourceDigest重算不改generated时间；执行与证据manifest排除profile及库raw字节。

终态Browser `http://127.0.0.1:62288/`，公开测试副本work-browser已正常关闭，owned Pi worker/模型helper0，Main授权会话保留。R2在Main import前同时隔离userData及legacy home，实际safeStorage/network/dialog/资格均保持。origin/PID只是截止点，恢复必须核对进程和Main字节，旧generated/截图不证明新进程。

## 仍未覆盖与历史来源

- Desktop/原生系统路径、账号取消/退出/锁定恢复、安装包实际extraResources、签名安装、macOS、私人旧库及大库迁移：NOT_RUN。
- low以外真实档位、云端标签/反推/细化质量、完整产品矩阵：NOT_RUN；新功能不能替代这些证明。
- 未保存配置导航现在会直接丢弃草稿且保存值保持；未新增离开确认。原gpt-4.1-mini probe根因UNKNOWN、SDK订阅无输出硬cap仍列队列。
- 上批Qwen4B正式Host真实tracer、CLIP/WD真实wrapper、RAM离线vocab失败与8B资源拒绝，按[真实模型交接](WC01-REAL-MODEL-LIBRARY-20261005.md)及其run-U4eFuo锚点追溯；本轮未重跑/加载权重，不升级为正式Runtime Package或质量全绿。
- 上批Windows316后端、限定NTFSAdapter、Router268场景/三route及63命令入index，见[两项实施](WC01-CLOSE-12-20261005.md)、router-version锚点和[公开图交接](WC01-DIVERSE-IMAGE-LIBRARY-20261005.md)；本轮index不变，未机械重跑。
- N01–N03旧startup读取全局settings偏差、旧Browser反馈FAIL/首build失败保留原证据和日期；本轮前CURRENT完整原件在run/before。历史不是新批准，旧build/PID/PASS不能冒作当前事实。

下一批只建议获批桌面专项或限定生成图的其他档位比较；相邻离线依赖/质量另获批准。无commit/push/发布。STOP。
