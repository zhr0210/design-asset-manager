# 文档体系与索引重建：交付记录

2026-10-15，Asia/Shanghai。用户明确“开始实施方案”。本轮完成文档、索引及必要治理工具重整；下一次任务可以从[文档总入口](../../README.md)按功能进入[子系统](../../subsystems/README.md)，找到当前拥有者、平台/运行链、详细契约、源码/验证和反馈写回。产品本身的UI、推理和原生资格没有因本轮变化升级。

## 现在怎样使用

1. 新任务先看根AGENTS的相关行，再进所属子系统，按需跟模块/契约及源码。
2. `npm run context:route -- --task "具体任务" --json`返回源码/验证、`documentation`专题、适用的`contractReferences`、问题/经验与`promotion`。
3. 实施前把相关Check变成具体检查；结束更新同一问题/经验、事件/上海复盘日期与提升引用。三个不同日期的新同类事故列候选，严重安全/数据/越权立即提示；不会自动执行记录文字。
4. 写文档按唯一职责：视觉、用户契约、机制、任务、运行资格、证据、术语和重大取舍分别归属。

## 实际重整内容

- AGENTS从3397字符收敛到1627字符，保留四类常驻约定和任务读取/写回；秘密保护细项、WIP、真实验证、状态/事务等保证迁回具体拥有者，而非删除。
- 新建文档总入口及产品、设计、平台、历史分类；编写18个跨层子系统，覆盖完整方案19类职责中的合并协作关系，不按目录数机械拆文件。
- ARCHITECTURE重写平台/进程图，明确共享React与macOS B AppKit分工、B参数入口和普通Electron默认入口；修正活动库、Copy、managed模型、Runtime和检索旧摘要。
- 493篇决策均有分类/归属；其中195篇原Spec-candidate的1428个段落进入20份按能力组织的规格，ADR保留决定摘要与明确细节引用。保留所有迁出文字/数字/例外，分离旧“项目没有/本次不运行”等来源语境，不把目标变成实施队列。
- 根Main/Renderer/Shared、工作窗、Runtime、OCR、视觉、后台、Library等模块说明重写。117条局部规则按当前拥有者、保留Seam、已替代来源分组；112个模块技术段落另有明确版本/接口范围的详细契约；完整原文可追溯。
- 本地AI/双端、笔记、组织和工作集规格分离立项事实/当时验收与有效契约；双端/原生ADR清理旧交付陈述及已被后续确认替代的待定措辞。AI/双端编号需求、实现保证、验收和范围段落逐项保留。
- 词库保留原1409个定义条目的意义；合并一个等价Palette Folder重复，现1408个不同定义，仍为一个产品词库，不新增多个Bounded Context。
- 机器导航20个任务路由，新增工作窗路由；物理归属扩到native Swift与Pi Worker。已跟踪源码807/807有归属，6份原有未跟踪第一方源码继续警告，不冒称已纳入trusted集合。
- 本地反馈识别事件去重、上海日期、critical、已提升/暂缓、有效引用与预算。已有已确认规范直接引用，不伪造三次事故；一个事故多个模块仍是一条主记录。
- 文档同步仅评估明确候选/本地base，任意无关脚本或文档不能让它假绿。现有CI接当前结构/导航与治理行为检查，明确Python解释器；普通CI不依赖一次性本地ZIP，也不代替语义或真实产品验收。

## 保全、映射与身份

- [baseline.json](baseline.json)与本地before.zip：1283份文档/相关工具的迁移前身份与原字节；[git-status.before.txt](git-status.before.txt)保留原WIP。ZIP按原忽略规则仅作本地可恢复检查点，未改变忽略政策。
- [document-disposition.json](document-disposition.json)：1272份基线Markdown的职责与保留/迁移决定；分类不冒称每一段历史都重新成为当前规则。
- [adr-migration.json](adr-migration.json)：493篇决定及1428个迁出段落的来源身份/正文去向。
- [module-migration.json](module-migration.json)、[guidance-migration.json](guidance-migration.json)：模块条款与53个根指南/方法段落对应关系。
- [constraint-decisions.json](constraint-decisions.json)：取消固定文件禁改、改为消费者/兼容/所有权保证的明确决定；不放宽资料、秘密或真实结果要求。
- [product-contract-preservation.json](product-contract-preservation.json)、[glossary-index.json](glossary-index.json)：产品编号条款保全与术语合并记录。
- [冻结原文目录](../../history/documentation-rebuild-20261015/README.md)：原路径/相对引用基准与摘要；原有摘要绑定历史/证据保持原字节。
- [task-manifest.json](task-manifest.json)：本轮315份正文/索引/工具文件身份；本检查点的证据另列，不混入其他产品WIP。没有暂存、提交、推送或发布。

## 实际验证

| 对象 | 实际结果与证据 |
| --- | --- |
| 正式context工具 | [router-verified.log](router-verified.log)：268项原路由场景、追加的子系统/迁出契约导航检查及10项反馈行为通过；7文件/16000估算token和4000元数据上限保持 |
| 六类普通任务导航 | [navigation-acceptance.json](navigation-acceptance.json)：检索、Mac工作窗、OCR分析、Copy、设置、打包均找到预期路由与专题；[迁出契约](extracted-contract-route.json)直接到对应规格段落 |
| 当前文档结构与本次迁移 | [documentation-delivery.json](documentation-delivery.json)：125份现行权威文档链接/锚点、18子系统/20路由、1428迁出段落、112模块技术段落及冻结来源检查通过；不是产品验收 |
| 文档/候选检查行为 | [documentation-tests-completion.log](documentation-tests-completion.log)：7项通过，包括无关改动不能求绿、明确不变声明、最具体拥有者、缺失链接/锚点、数值/例外丢失及仓库外读取拒绝 |
| 三日期功能的原实现反证 | [promotion-before-red.log](promotion-before-red.log)：迁移前反馈模块在三次独立日期输入下因不返回candidate实际失败；[feedback-final.log](feedback-final.log)的新行为与旧预算/闭环检查通过 |
| 候选文档归属 | [candidate-doc-sync.json](candidate-doc-sync.json)：仅本任务路径，不需“契约不变”声明，拥有者正文已更新；初次未映射测试文件的失败保留在before-map-fix记录，补映射后复验 |
| ADR/context/保护 | adr-verified.log、context-verified.log与path-check.log：493篇分类/引用、源码归属与既有路径保护检查通过；文档变更仍为advisory监控 |
| 现有CI配置约束 | ci-governance-final.log、ci-hygiene-final.log：相关本地检查通过；未触发远端Windows/macOS Actions，不称远端CI已绿 |

本轮只做文档/治理工具，没有产品TypeScript/Swift/Python推理实现变化；未重建或启动正式应用、未做新UI预览、未运行模型、未下载权重、未操作资料库。它们不适用于本次纯工程文档结果，也不被内部检查替代。

## 审查与保留限制

同会话自审，核对了变更职责、精确来源映射、正式消费者与默认/候选、现状/目标/历史边界。未使用独立审查者，不冒称另一次工程师复核。

旧来源的131个缺失链接候选分类见[historical-link-findings.json](historical-link-findings.json)：原相对位置缺失不等于已确认退休/丢失。笔记/组织三张旧图按文件名在仓库docs/artifacts未定位；原链接和日期证据保留，不造新图或转记当前PASS。当前权威入口没有未解释的失效链接。

P006旧导航摘要已按源码/路径与治理回归修复并关闭；P001–P003仍待复现，不在本轮启动。未来规格、菜单待定/性能门槛、原生设备/模型/安装缺口继续由原权威记录，不因文档重整关闭。

本轮目标完成。下一任务从文档总入口按新用户结果选择，不再恢复这轮迁移或历史产品队列。
