# DAM 分支与工作树

## 2026-10-13：B内容整合与后续工作

当前日常目录`/Users/meigong/Documents/design-asset-manager-macos`已检出本地main，工作区干净。`codex/floating-window-design`已解除其他worktree占用，可在日常目录切换；实际main→设计分支→main往返已验证。此前main已合并但普通目录仍在旧分支、且两个分支被worktree占用，导致用户看不到新文件并无法切换；该收尾问题已修正。

旧普通目录WIP保存为`codex/legacy-window-wip-20261013`的`9d63405`，16个文件与保存前SHA一致，不进入main。临时main整合工作树已通过Codex归档；B目录`/Users/meigong/.codex/worktrees/6699/design-asset-manager-macos`改为detached HEAD，保留本地运行资料/证据。以下原整合目录描述是过程记录，当前继续工作以日常目录为准。

本轮用户要求将B worktree的源码及设计文档提交后合入本地main，再从main继续悬浮窗模块。B来源分支为`codex/floating-window-b`，接续分支为`codex/floating-window-design`；整合使用独立干净工作树，普通目录的`codex/macos-migration`旧版WIP保留，不自动搬入B，不推送或发布。

B提交`63dc760`已快速前进合入本地main；main包含既有macOS迁移历史及本轮B内容。126个提交文件与B来源逐一哈希相同，普通目录15个已跟踪WIP及Git状态保持；类型、构建与相关内部保护检查通过，设备资格未扩大。见[整合回执](../checkpoints/b-main-integration-20261013/README.md)。

B工作目录为`/Users/meigong/.codex/worktrees/6699/design-asset-manager-macos`。main整合工作目录为`/Users/meigong/.codex/worktrees/main-integration/design-asset-manager-macos`；普通目录仍为`/Users/meigong/Documents/design-asset-manager-macos`。同一Git仓库中的工作树不是独立产品权威，运行时必须按所选分支重建/核对，不复用另一工作树的旧验收资格。

`codex/eagle-integration`已按用户要求删除，本地恢复标签`archive/eagle-integration-20261013`指向`8cf60c7b3fd2e165b574db134e1d7149e9116a3e`，保留其独有历史；没有合入Eagle分支独有变更。main原位置由`archive/main-before-b-20261013`保留。删除分支没有删除产品中的Eagle功能，后续移除见[EAGLE任务](../tasks/TASK-REGISTRY.md#eagle)。

主要操作色、生成CSS、原生材质与布局应用仍由[DESIGN-APPLY](../tasks/TASK-REGISTRY.md#design-apply)登记；下次继续当前任务时提醒用户安排，不创建定时自动化。本轮构建和内部检查不扩大物理指针、模糊及设备资格。

## 2026-10-10统一目录记录（历史）

2026-10-10 用户要求统一为一个源码目录，已执行并实测迁移→Eagle→迁移切换。

唯一源码目录：`/Users/meigong/Documents/design-asset-manager-macos`。

| 分支 | 用途 | 当前范围 |
| --- | --- | --- |
| main | GitHub源码整合基线 | 本地6b86ef0，未在本次操作刷新远端或合入功能分支 |
| codex/macos-migration | Mac迁移与A–D/F验收 | 当前检出；Eagle验收延期 |
| codex/eagle-integration | Eagle联动方向调整 | 0.2.1端口冲突修复、证据与接续；未完成真实配对/读写 |

上述是同一Git仓库里的独立分支，不是三个源码副本。没有其他worktree占用它们；旧 `design-asset-manager-eagle` checkout已移除，分支及历史保持。Eagle本地候选移到 `.scratch/eagle-isolated-20261010/`，12182个常规文件逐一SHA核对相同。没有复制凭据或profile。

在Codex中把上述唯一源码目录打开为项目，分支选择器才作用于正确仓库。旧中文资料目录的master是另一独立仓库，不再作为DAM源码入口；其资料保持未动。

终端切换也在同一目录执行：

```sh
cd /Users/meigong/Documents/design-asset-manager-macos
git switch codex/eagle-integration
git switch codex/macos-migration
```

当前两份未提交AGENTS/验收流程修改保持原字节、未提交或暂存。若Git认为切换会覆盖未保存修改，先处理对应工作，不能强制覆盖。切换后如需运行另一产品分支，先正常退出旧Host，再按该分支TASK构建和启动；out/node_modules属于本机准备，不会被Git自动变成另一分支的当前产物。

验证与保全记录：[unified-directory.json](../checkpoints/af-macos-20261010/unified-directory.json)。未push、未改main或自动合并，A–D/F继续按原Goal收敛。
