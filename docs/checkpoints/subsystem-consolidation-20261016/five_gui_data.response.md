只读评估结论：这项调整至少涉及 **GUI、Host、Library 三个系统**，不能统归“设置页面”。

| 调整 | 权威入口与直接影响 | 主要保护 |
| --- | --- | --- |
| 设置重排 | `docs/subsystems/gui-shell.md#settings-ui`；`Settings.tsx`、`AppShell.tsx`、导航 workflow | 设置仍覆盖整个主窗口；保留返回入口、分类搜索和未保存输入；稳定 `/settings` 生命周期 |
| 存储路径 | `local-host.md#configuration` → `library-lifecycle.md` | 区分“默认路径偏好”与“实际切库/迁移”；修订检查、原子保存、迁移审查、库身份/lease、失败恢复 |
| 工作集窗口 | GUI `#reference-windows` → Library `#organization`；拖出交付转 Host `#handoff` | 内容与设备布局分存；关闭不删工作集、移除引用不删原件；失效引用保留身份，保存冲突保留输入 |

源码核对得到的关键边界：

- `src/renderer/routes/Settings.tsx:102` 明确只是默认路径偏好，不切换当前资料库、不迁移文件。若目标包含移动现有库，属于新增业务范围，须独立定义执行和恢复契约。
- `src/renderer/components/layout/AppShell.tsx:42` 用稳定 `/settings` key；重排不能按分类重新挂载草稿拥有者。
- `src/main/index.ts:106,411` 用候选 flag 选择 B 原生窗口；默认仍为 Electron。B 是 AppKit，不是 SwiftUI，调整前须明确目标窗口。
- `docs/subsystems/storage-intake.md`、`work-mode.md` 已是兼容导航，正文分别在 Library 与 GUI，不应继续往旧页堆新规则。
- 工作窗菜单交付范围、性能门槛与原生进程合并仍未确认，不能顺带当已批准需求实施。

建议验证计划：

1. **设置**：导航、草稿生命周期、双端冲突与旧响应测试；从可见设置入口逐类切换、返回并保存重开，检查全屏覆盖、搜索范围、焦点及路径输入保留。
2. **路径偏好或迁移分列**：偏好检查 settings-order/conflict/compatibility；若迁移，再覆盖 migration-plan、IPC/panel、路径治理、库身份/独占锁和维护终态。真实迁移只用可恢复库副本，验证取消、权限不足、目标冲突、空间不足、中断及重启后回读。
3. **工作窗**：work-sets、frame-provenance、退出/切库参与者测试；默认 Electron 与 macOS B 各自验。实际操作紧凑/展开/停靠、中断动画、多屏边界、文本删除与空格、素材拖出及接收、备注自动保存、冲突、关闭重开与离线引用。
4. **分别记录视觉、交互、失败恢复**：依据 DESIGN 与 INTERACTIONS，在同一最终候选从正式入口验收；Browser 或静态检查不能替代原生动态与真实文件交接证据。

本轮仅查看指定工作区文档、源码和 package.json；未修改、联网、运行应用或执行测试，以上为影响范围与待执行计划。
