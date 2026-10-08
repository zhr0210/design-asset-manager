# 开发重新评估 · 2026-09-07

## 判断与适用范围

建议把下一轮产品投入集中在“无需模型即可安全收进、找回并复用素材”的
完整桌面流程。当前已有可复用的搜索、标签、预览和存储安全基础，主要
瓶颈是这些能力尚未组成可靠的日常工作流。继续扩张模型后端、网站适配
或高级组织能力，暂时不能补上这个缺口。

这是根据本次读取的当前源码、配置和本次执行的隔离测试作出的工程与
产品判断，没有沿用旧评估优先级、AL 阶段顺序或 Issue 依赖。
HEAD `3fa00df` 仅用于定位；开始时已有基础文档改动，均保留。
本轮交付为基础文件优化和开发建议，不改变运行时代码、公共契约或数据。
建议不构成自动运行的任务队列，也不废止现有安全与 ownership 约束。

未访问真实素材库、Runtime SQLite、模型缓存或外部服务；未启动桌面 App。
未做用户访谈、市场调研、真实模型质量评测或 Windows 实机验证。
因此不提供虚假的完成百分比、商业需求结论、跨平台认证或工期承诺。

## 定位与首个服务对象

长期定位继续是面向视觉创作者的本地优先素材工作台。当前建议先验证
“个人设计师管理静态图片与参考图”的使用场景：导入一组图，之后凭记忆
中的文件名、文字、标签或描述找到它，检查清晰度与来源，再安全交付副本。
这是收窄首个验收范围的建议，不是将剪辑师、编导从产品定位中删除。

选择该场景的依据是已有 Library/Inspector/词法检索接线，以及 Safe Copy
目前覆盖 PNG/JPEG/WebP 的事实。视频、复合原稿、递归目录和外部站点各自
引入解码、关系、来源权限与失败恢复问题，不宜与首次安全入库同时展开。
格式边界需在产品入口披露；存在图片归一化代码不等于任意格式都可入库。

真正应检验的产品价值是“更快找回并放心复用”，AI 描述和自动标签只有在
改善这个结果时才值得投入。离线、无模型、未分类和待确认标签都应是正常
可用状态。商业价值仍是待验证假设，不能由技术规模推导。

## 多维现状与证据

| 维度 | 当前证据与判断 | 开发含义 |
| --- | --- | --- |
| 产品主入口 | `app-navigation.workflow.ts` 默认路由为 Library，`App.tsx` 正式使用它 | 保留素材主表面；不需要再次重做导航来证明定位 |
| 首次入库 | Capture 提供 prepare/dispatch/inspect，隔离复制与 SQLite Promotion 测试通过；Main 尚未注册该流程 | 最高优先缺口是安全入库与正式 Library 的接线、真实预览和恢复 |
| 找回与解释 | Library 使用 `projectAssetDiscovery`；覆盖标题、文件名、标签、描述、OCR，展示命中证据；测试通过 | 复用现有词法基线，再验证整条读取链和规模表现；无需先做向量检索 |
| 数据安全与恢复 | 正式 `AssetService` 使用全局数据库；`deleteAsset` 删除 Asset/tag 记录。Session/Trash 测试仅验证隔离连接 | 新入库不能直接接旧 save/delete；可恢复删除需纳入同一用户闭环 |
| 检查与复用 | Inspector 和原图查看器存在；查看器复制 `asset.filePath`，保存链可能将该字段指向 normalized copy | 预览/复制路径不等于 Original 交付；应依据 ownership 与内容证据提供明确的复用动作 |
| AI 可用性 | Worker/运行时与 UI 路径存在；正式模型 Catalog release input 的 trust root 和 bundle 为空 | 必须分开描述已接线入口、可用模型和质量证据；本轮不据此断言所有 legacy AI 路径不可用 |
| Web 获取 | download store 对新请求返回不可用，历史为未核验记录；Main Download IPC 负责记录存取 | 维持诚实反馈，真实下载排在可信本地入库之后 |
| 架构与维护 | Main/Preload/Renderer/Shared 分层存在；新模块有窄接口，但正式 Asset 写入仍有 legacy 全局依赖和宽 DTO | 以用户流程推进局部替换，集中梳理写入权，不做无边界整体重写 |
| 性能与规模 | `listAssets` 无分页，Renderer 对所载集合匹配/排序，Grid 对全部 matches 渲染卡片 | 存在规模风险；先测 1k/10k 合成数据，不能直接宣称已发生卡顿或必须引入新数据库 |
| 测试与交付 | strict 类型检查通过，有行为测试、源码规则及跨平台 CI 配置；脚本不在 src typecheck 范围内 | 各类证据分别报告；CI 文件、单测和构建不等于可安装可恢复的产品 |
| 项目治理 | 基础文档已做分层，但入口仍引用旧计划，局部测试说明过期 | 保持短入口、按需证据与单一当前任务，避免再建一套阶段/索引系统 |

关键源码入口（均为本次核验范围）：

- [Main composition](../../src/main/index.ts)、[Asset IPC](../../src/main/ipc/asset.ipc.ts)、[Asset Service](../../src/main/services/asset.service.ts)、[Preload](../../src/preload/index.ts)。
- [Library](../../src/renderer/routes/Library.tsx)、[Asset Store](../../src/renderer/stores/asset.store.ts)、[词法检索](../../src/shared/workflows/asset-discovery.workflow.ts)、[Grid](../../src/renderer/components/library/AssetWaterfallGrid.tsx)。
- [原图查看器](../../src/renderer/components/asset/AssetOriginalViewerModal.tsx)、[下载状态](../../src/renderer/stores/download.store.ts)。
- [Capture 边界](../../src/main/capture-intake/README.md)、[Library 边界](../../src/main/library-lifecycle/README.md)、[公开发布输入](../../src/main/model-library-workspace/official-model-catalog.release-input.json)。
- [构建与测试命令](../../package.json)、[TypeScript 范围](../../tsconfig.json)、[跨平台治理 CI](../../.github/workflows/cross-platform-governance.yml)。

另有两项需要在可信接线范围内核查：`local-file` 协议按路径读取文件，
Asset save 接口接受宽泛数据。本轮没有做完整威胁建模或可利用性验证，
不将它们直接标为漏洞；正式 Library 接线时应核验 sender、输入和文件访问
权是否被相同的 Library authority 约束。

## 建议的开发选择与验收

以下按用户阻塞与数据风险排序，每项都应独立复核前置条件，不作为旧阶段
的替代编号。先完成最小完整结果，再按观测反馈扩大范围。

| 建议顺序 | 用户结果与范围 | 前置条件 / 验收证据 |
| --- | --- | --- |
| 首选：安全的本地图片闭环 | 在显式新建的测试 Library 中选择支持的普通图片，确认 Copy，得到真实缩略图，重启可找回，能检查与安全复用，并能进入 Trash/恢复 | 明确批准 Library authority、IPC/契约与 schema 的具体接线范围；同步 Asset 读写和后台写入调用方。源字节不变、失败无假成功、重复确认不重复入库、锁丢失拒写、重启状态一致，删除恢复不走 legacy hard delete |
| 随该闭环验证：检索与复用 | 无模型也能按现有字段找回，说明命中，明确 Original 与派生副本 | 使用合成/授权夹具贯穿 UI→Main→SQLite→重开。缺失文件、空库、无匹配分别反馈；交付文件 hash/格式与所声明版本一致，目标重名不覆盖 |
| 有规模证据后：响应性 | 大量素材下可连续浏览和搜索 | 先记录固定硬件上的 1k/10k 数据集加载时间、查询 p50/p95、内存和滚动表现；依据热点决定分页/虚拟化/索引，不能用新增索引数量验收 |
| 基础流程成立后：一种有效的 AI 增强 | 选择 OCR、描述或标签中的一项，证明实际改善找回 | 固定能力、模型与设备的授权验证集；比较无 AI 基线的找回成功率与耗时，确认用户编辑不被覆写、失败不阻塞；未安装模型仍完成基础流程 |
| 来源扩展与分发 | Web 获取或更广格式，以及明确平台的可安装版本 | 复用同一 Candidate/Promotion 规则；真实传输、失败/取消/恢复与来源限制可验收。每个平台另有安装、冷启动、权限、升级及数据保全证据 |

首选工作应先在新建合成 Library 上完成正式流程验证。既有用户库继续保留；
不得为了演示成功推断旧素材 ownership 或静默迁移。真实旧库迁移是独立的
数据兼容决策，需要明确目标、预检、备份/恢复方案及经过验证的切换路径。
这一隔离不允许创建可绕过写锁的第二条生产写入通道。

首个可评审的开发切片建议是：列清 Library 激活及 Asset/Tag/AI/palette
等当前写入方，在合成新库上实现受检查与锁保护的最窄正式接线，并验证
失败时旧数据保持原状。它是整个用户闭环的前置成果，单独完成不能宣称
“安全导入已交付”。UI、真实预览、恢复和复用要纳入完整结果验收。

暂缓多根迁移、复杂 Compound/视频、更多模型后端、更多网站和大型 UI 重做。
暂缓表示当前收益与依赖不优先，不代表删除现有实现或废止 ADR。

## 如何判断投入有效

先采集基线，再确定体验阈值；以下为建议测量方式，尚无实测产品数值：

- 新用户从空库到第一张可找回图片的耗时、成功率和操作阻塞点。
- 固定检索题在无 AI/有 AI 条件下的找回成功率与耗时；单独记录错误命中。
- 复制、取消、重复提交、进程中断、重启、Trash/Restore 的失败恢复结果。
- 原始字节保全、派生物身份正确与重复提交不产生重复 Asset，应为硬性通过条件。
- 大库下首屏、查询延迟与内存；记录硬件与数据集，避免无条件性能承诺。

收集方式优先使用本地合成夹具与经同意的用户任务观察，不新增默认永久
查询历史，也不把私有素材上传成评测数据。若观察表明主要需求是视频而非
静态参考图，应重新评估首个场景，而不是沿本建议机械继续。

## 本轮基础文件优化

AGENTS 增补以用户闭环和可观察验收为依据的开发判断；TASK 清除继承待办；
README 区分能力接线与交付限制，并链接本轮结论。Capture 修复过期 ABI
切换指令；Library 文档解除旧 Issue 对下一任务的指派，保留 authority 约束。
Python 测试入口统一到已有仓库启动器；披露 dev 启动会触达真实数据库和
调色扫描，避免把正式启动当作隔离检查。

CONTEXT 与 ADR 的领域语义不变，已有历史搬移保留。配置未发现需要为本轮
文档工作更改的理由，不升级依赖、不修改打包或测试实现。更详细的文档问题
见 [基础审查](../agents/FOUNDATION-AUDIT-20260907.md)。

## 本轮验证

已通过：`typecheck`、`test-asset-discovery-workflow`、
`test-download-store-integrity`（含 download-status-workflow）、
`test-asset-authority-baseline`、`test-capture-intake-workflow`、
`test-capture-intake-sqlite-persistence`、`test-active-library-session`、
`test-asset-trash-sqlite-persistence`。

这些结果分别证明纯检索投影/部分源码接线规则、下载 store 行为、静态写入
边界和生成夹具上的隔离存储语义。SQLite 测试使用 Electron Node；未重编
原生依赖。它们不替代正式桌面入库、真实卷锁、迁移或跨平台端到端证据。

文档检查通过：Agent context（内部包含索引核验，486/486 一方源码归属）、
Context Router tests（268 个路由评估用例）、ADR router、forbidden paths、
docs sync、34 个本地链接目标存在性、暂存区与工作区 diff 格式检查。
链接检查未验证标题锚点；docs sync 仅为路径启发式，不能证明文档语义。
纯文档修改不重新构建 App，
也不运行需要真实模型或完整 Python 推理环境的测试；现有 AI 质量和发布
状态仍保留为待验证，不能由本次通过项目推断。
