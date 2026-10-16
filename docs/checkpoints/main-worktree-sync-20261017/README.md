# 两工作树整合与同基线续改 · 2026-10-17

用户授权保全07c2的有效未提交成果、整合3bfa、验证后推送origin/main，保留目录并让两个独立开发分支从同一main提交续改。两个开发聊天已确认暂停写入；整合期间仅本聊天写入。

## 回退点

| 恢复标签 | 内容 |
| --- | --- |
| `archive/pre-sync-main-20261017` | 原main `e7189b5` |
| `archive/pre-sync-07c2-20261017` | 07c2原HEAD `a7b7803` |
| `archive/pre-sync-07c2-wip-20261017` | 07c2完整开发成果检查点 `6478b5f` |
| `archive/pre-sync-3bfa-20261017` | 原生成果 `8a4541b` |

本地另有完整历史Git bundle `/tmp/dam-main-integration-20261017/pre-integration.bundle`，已用`git bundle verify`验证；临时目录可能被系统清理，持久恢复以Git标签为准。原目录中忽略的Runtime、模型、profile和资料库不进入提交，也未删除或迁移。另一个历史工作树6699保持不动。普通目录原有`build/eagle-companion/`生成产物保留，仅在仓库本地info/exclude隐藏，不把旧构建产物重新加入已退役产品源码。

回退优先从标签创建恢复工作树，例如：`git worktree add -b codex/recovery-07c2 /绝对路径/新恢复目录 archive/pre-sync-07c2-wip-20261017`。这不会覆盖当前main或原工作树。已推送main如需正式撤回，用经检查的revert提交，不强推历史。

## 冲突处理

- 保留07c2全窗口设置、Eagle接线移除及素材下载执行退役，不复活已删除服务；保留历史schema/记录与本地Copy。
- 保留B原生工作窗、v16显式备份退役、输入/取消/Host保护；测试组合新WorkSet字段与历史下载记录保全夹具。
- 保留统一交互正文/旧路径导航，把B新增交互写入统一正文；0494补进ADR元数据和主题索引。
- TASK/CURRENT-STATE保留两边原候选记录，其历史PASS或PARTIAL不转为整合候选资格。生成构建身份由生成器重建。

## 验证与交接

整合候选构建身份`dam-727af59846e5c7cc`。类型、正式构建、五组AppKit、31项聚焦测试脚本、文档结构/ADR路由/源码拥有者检查及10项文档治理测试通过，设计token同步通过。B旧版读取测试接入既有历史schema适配器后复验通过，原冻结源码及SHA/兼容拒绝/备份/取消/原件断言保留。

`visual-ai-intake.integration.test.ts`在整合候选90秒超时，原07c2检查点同一测试30秒也超时；原因未定位，不算通过，不以相同现象证明无风险。其余历史全量回归缺口继续保留。原始原生验收typecheck-final.txt末尾有空行，diff检查提示保留，不重写历史证据来消除告警。

桌面普通入口使用新空profile，实际点击可发现的设置入口，确认设置全窗显示、主页导航/搜索收起、返回入口可见；截图已人工查看，无空白页或框架错误覆盖。控制台仍出现空库`[Store] Failed to load assets from DB`及未打包Electron的CSP警告；前者在07c2报告中已记录，本轮未修，不能宣称控制台全绿。应用已从设置的“退出整个DAM”正常退出。Browser插件/技能未提供，使用现有Playwright Electron；这仅为空profile冒烟，不证明原生工作窗或真实资料/模型资格。临时截图与原始日志在`/tmp/dam-main-integration-20261017/`，摘要见[检查结果](checks.json)。

备份bundle已实际克隆为独立裸仓，并从检查点恢复1304个现存修改/新增文件，逐项SHA256与保全前一致。忽略的本机资料保持原目录；无需删除重建工作树。

## 共同起点与恢复工作

整合提交固定标签`integration/shared-baseline-20261017`。预期交接状态：普通目录main、origin/main、07c2的`codex/design-alignment`和3bfa的`codex/native-worksets`共同指向该提交。最终SHA和推送/切换实际结果以本次交接消息及`git rev-parse`核对，不把后续开发中的分歧视为同步失败。

开发聊天恢复时应先核对分支/HEAD/最新TASK、读取本报告与各自剩余事项，不重新按旧detached HEAD接续。旧物理资格及视觉AI超时保留，不自动启动长期愿景或第三个工作树。
