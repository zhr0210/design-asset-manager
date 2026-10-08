# DAM 双客户端任务拆分

状态：待用户批准拆分，2026-10-02。父规格：[Issue #23](https://github.com/zhr0210/design-asset-manager/issues/23)。
这23项是拟发布的实施/验收任务；未创建子Issue、未改变父Issue，也未开始产品代码。
上句记录任务拆分阶段。随后用户已批准实施；当前交付状态见
[实施证据矩阵](LOCAL-DUAL-CLIENT-IMPLEMENTATION.md)，子Issue仍未发布。

## 拆分规则

- T01 是必要的 expand prefactor：保留旧桥，让各业务能逐票迁移；T21 仅在全部迁移完成后 contract。
- T02–T20 每票交付一个可演示的完整用户路径，包含正式UI、业务调用、权威结果、错误/取消和必要验证；没有独立纯HTTP、事件总线或选择器外观票。
- T08 用描述编辑建立持久草稿完整闭环；笔记、工作集和OCR分别采用，不把所有编辑器塞进一个大票。
- T22/T23 汇集综合Browser和原生专项；各实施票自己做相关CU，不能全部推迟到最后。原生阻塞不清除Browser结果，也不阻止无该依赖的票推进。
- 所有验收仍只用合成profile。模型安装、真实数据/认证/推理与发布权限不扩大。

## 拟发布编号清单

1. **保留桌面行为，扩展共享业务入口** — 依赖：无，可立即开始。交付：桌面端经过新的 Shared Client / 唯一 Host 命令入口完成库状态、打开、关闭和重开，旧业务仍兼容可用。先增加新形态，允许后续按业务分批迁移。 [详细草稿](../../.scratch/local-dual-client/issues/01-desktop-client-expand.md)

2. **双入口连接唯一 Host，浏览器可普通启动** — 依赖：T01。交付：用户从桌面版或浏览器版入口启动同一 profile 的唯一 Host；Browser 无需可见桌面主窗口就能打开同一正式界面并核对构建、环境与连接状态。 [详细草稿](../../.scratch/local-dual-client/issues/02-dual-launch-local-host.md)

3. **页面内选择目录，创建和打开素材库** — 依赖：T02。交付：两端使用同一页面内选择器，完成盘符、目录、路径输入、明确创建目录、创建/打开/关开素材库，并观察同一库状态。 [详细草稿](../../.scratch/local-dual-client/issues/03-picker-library-lifecycle.md)

4. **多文件复制入库，预览并检索找回** — 依赖：T03。交付：用户在页面内选择合成文件，审查并复制入库，看到正式 Gallery/Focus 预览，用现有获准检索找回，再重开库核对。 [详细草稿](../../.scratch/local-dual-client/issues/04-copy-intake-gallery-discovery.md)

5. **文件夹、色板与配色复用** — 依赖：T04。交付：两端在正式文件夹页整理普通文件夹与色板，查看已有配色占比并复制颜色；保存结果同步且不丢正在编辑的内容。 [详细草稿](../../.scratch/local-dual-client/issues/05-folders-palettes-copy.md)

6. **标签、别名层级与 AI 文件夹** — 依赖：T04。交付：用户在任一端编辑已有标签、别名/层级和 AI 文件夹，另一端读取相同组织与动态引用；并发修改不静默覆盖。 [详细草稿](../../.scratch/local-dual-client/issues/06-tags-smart-folders.md)

7. **回收站、恢复与失败收录恢复** — 依赖：T04。交付：两端删除素材到既有 Trash、恢复并重开核对；用户还可审查失败收录记录，安全重选来源和重试。 [详细草稿](../../.scratch/local-dual-client/issues/07-trash-intake-recovery.md)

8. **描述冲突与本机草稿恢复闭环** — 依赖：T04。交付：两端编辑同一素材描述时保留冲突输入，定期暂存本机；刷新或 Host 重启后用户选择恢复/放弃，再明确正式保存。此票建立后续编辑器可复用的完整草稿协议。 [详细草稿](../../.scratch/local-dual-client/issues/08-description-recovery-draft.md)

9. **图片笔记保存、冲突与恢复** — 依赖：T08。交付：正式笔记在两端编辑、审查冲突、暂存并恢复，保存后重开读取；把首条草稿协议用于整本 Notebook 而不改原件。 [详细草稿](../../.scratch/local-dual-client/issues/09-notebook-draft-adoption.md)

10. **工作集内容编辑、引用与草稿恢复** — 依赖：T08。交付：浏览器使用共享参考展示编辑工作集、成员、笔记和颜色，处理版本冲突及本机草稿恢复，并在另一端/重开库后读取保存结果。 [详细草稿](../../.scratch/local-dual-client/issues/10-workset-content-recovery.md)

11. **浏览器控制原生工作窗口与单素材卡片** — 依赖：T09、T10。交付：用户从 Browser 打开、置顶、隐藏/关闭已有原生参考窗口，并保留单素材卡片兼容入口；原生表面使用相同正式展示与受限数据权限。 [详细草稿](../../.scratch/local-dual-client/issues/11-native-work-windows-card.md)

12. **图片工具审查与派生结果保存** — 依赖：T04。交付：用户在两端使用当前正式图片工具，审查效果，确认保存派生结果并重新读取；预览与正式保存清楚分开，原件保持不变。 [详细草稿](../../.scratch/local-dual-client/issues/12-image-tools-derived-save.md)

13. **共享设置、模型摘要与构建诊断** — 依赖：T03。交付：两端查看和修改同一份现有配置，使用页面选择器选择获准存储位置，查看 Model Workspace 已有摘要/诊断，并核对构建与受控环境。 [详细草稿](../../.scratch/local-dual-client/issues/13-settings-model-summary.md)

14. **双端连接配置与账号生命周期** — 依赖：T02。交付：Browser 配置现有准入连接、查看凭据与登录状态、发起/观察/取消登录；Desktop 观察同一账号操作，离页只解绑。 [详细草稿](../../.scratch/local-dual-client/issues/14-account-provider-lifecycle.md)

15. **已有视觉与标签 AI 的浏览器闭环** — 依赖：T08、T14。交付：用户从正式 Inspector 选择已有连接和能力，审查当前动作后运行或取消，检查视觉/描述/标签结果并核对正式保存及另一端同步。 [详细草稿](../../.scratch/local-dual-client/issues/15-visual-tag-ai-workflow.md)

16. **OCR 环境选择、识别与修订恢复** — 依赖：T08。交付：用户在两端选择已有合格 OCR 环境，完成当前正式识别、取消和人工修订；冲突与迟到推理不覆盖用户内容，修订可暂存恢复。 [详细草稿](../../.scratch/local-dual-client/issues/16-ocr-run-correct-recover.md)

17. **独立下载、取消与获准入库** — 依赖：T04。交付：两端从已有下载入口审查来源/目标、观察同一后台进度、取消或重试，并在当前已支持的获准入库路径核对保存结果。 [详细草稿](../../.scratch/local-dual-client/issues/17-independent-download-workflow.md)

18. **连接库入口与独立索引反馈** — 依赖：T04。交付：用户在两端操作当前正式连接库入口、查看资格与索引/同步反馈，浏览获准素材；第三方原件仍独立拥有，不转为 Managed Copy。 [详细草稿](../../.scratch/local-dual-client/issues/18-connected-library-entry.md)

19. **旧素材只读找回与准入反馈** — 依赖：T04。交付：两端在现有只读找回入口查看获准的旧素材与预览，明示不可用情况，不自动迁移或写入旧库。 [详细草稿](../../.scratch/local-dual-client/issues/19-legacy-readonly-discovery.md)

20. **跨客户端切库、未保存审查与安全退出** — 依赖：T11、T14。交付：任一端切库或退出时汇集另一端与原生窗口的草稿、暂存和账号任务；取消保留编辑，确认后冻结、排空、撤权并释锁。 [详细草稿](../../.scratch/local-dual-client/issues/20-global-transition-shutdown.md)

21. **移除旧桥回退，闭合双端能力与故障契约** — 依赖：T05、T06、T07、T12、T13、T15、T16、T17、T18、T19、T20。交付：所有正式调用方迁移后移除旧 Client回退，两端能力清单、事件、错误和恢复一致；提交未知、丢事件和重启不会盲目重发或复活权限。 [详细草稿](../../.scratch/local-dual-client/issues/21-client-contract-fault-closure.md)

22. **完整 Browser 用户路径与视觉验收** — 依赖：T21。交付：从普通浏览器入口贯穿本轮全部现有正式业务，验证同步、冲突、暂存恢复和退出，并分别核对批准视觉与正式数据链路。 [详细草稿](../../.scratch/local-dual-client/issues/22-browser-user-path-acceptance.md)

23. **原生系统专项与受影响路径复测** — 依赖：T05、T12、T18、T20。交付：核验本轮受影响的真正桌面窗口、单素材卡片、托盘、置顶、几何/跨屏、已有系统动作和Host退出，给与Browser分开的原生结论。 [详细草稿](../../.scratch/local-dual-client/issues/23-native-system-acceptance.md)

## 依赖与并行

最初可开始T01。T02完成后账号T14可与素材链并行；T03完成后设置/模型摘要T13无需等待素材收录。
T04完成后文件夹色板、标签、Trash、描述、图片工具、下载、连接库与旧素材入口分支并行。
T08完成后笔记T09、工作集T10、OCR T16并行。T20复用稳定的dirty/草稿登记协议，后续采用者各自演示审查接线；无需把所有能力迁移完工作为它的起步门槛。
T23只依赖受影响原生能力与生命周期，可以先于全量Browser完成执行；后续构建改变对应路径时复测。

每条边只列直接必要阻塞，不重复其传递依赖。尚未批准的编号是草稿编号，不是GitHub Issue编号。

## 发布规则

用户批准粒度、依赖和合并/拆分后，按依赖顺序逐票发布并加ready-for-agent。
GitHub原生blocked-by读取接口已确认可用；发布时为子票建立原生阻塞关系，并在正文写真实Issue引用。
正文引用父Issue，不修改、关闭父Issue，不通过新增父子关系改写父Issue；本轮不自动启动实施。

## 待确认

这些完整路径的粒度是否合适，阻塞是否真实，有无需要合并或进一步拆开的编号？
技能要求先批准拆分再发布：
[To Tickets](C:/Users/kilian/.agents/skills/to-tickets/SKILL.md) — “Iterate until the user approves the breakdown.”
