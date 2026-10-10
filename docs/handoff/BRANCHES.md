# DAM 分支与统一目录

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
