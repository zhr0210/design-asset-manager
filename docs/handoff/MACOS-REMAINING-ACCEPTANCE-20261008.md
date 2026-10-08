# 整合后补充：开发治理仍有阻塞

从GitHub main继续，先查[源码整合记录](GITHUB-CONSOLIDATION-20261008.md)和
[当前候选检查回执](GITHUB-CONSOLIDATION-CHECKS-20261008.json)。全量治理尚未通过；
Windows旧模型存储tracer、旧UI/目录治理断言和Python测试环境须逐项核对。
此清单中的WC/T23/A–F、Mac原生和Eagle验收状态不变，Git合并不关闭父级。

---

# 剩余验收与WC核对（2026-10-08）

本表是Windows真实源码/截至本轮历史证据的接续审计，没有新增产品
实测。**WC01父级保持PARTIAL，完整产品验收未完成。** 仓库目前明确
记录WC01系列及H01–H22、C01–C03、UX；没有查到独立WC02+清单，
不虚造编号。这里的C01–C03是WC代码/治理项，与包内C检索任务不同。

状态读法：“限定证据”不等于当前跨平台关闭；Mac未运行项目统一NOT_RUN。
源头是[WC初始交接](WC01-20261003.md)、[原22项逐文件队列](../history/handoff-snapshots/WC01-FAILURE-QUEUE-20261003-before-wc01-close-12.md)、
[两项限定收尾](WC01-CLOSE-12-20261005.md)、[当前WC历史队列](WC01-FAILURE-QUEUE-20261003.md)。
旧“Windows一律不支持”“真实测试未授权”已被后续正式接线/用户授权取代；
旧FAIL、UNKNOWN和未覆盖范围仍保留。不会机械重跑全部旧脚本来代替用户路径。

## WC逐项对账

| ID / 消费者 | 后续已补范围 | 尚需关闭的条件 |
| --- | --- | --- |
| H01 local transitions | WC协议回归、A/C/D正常退出/重开有限定记录 | Mac双端草稿、切库、退出、断连、迟到回应/多客户端真实验证 |
| H02 active-library-host | A/C/D公开副本开库；F实际万条内部开库/重开 | 当前候选实际恢复入口、错误/损坏副本与Mac锁/卷/保存重开；大型旧schema升级 |
| H03 legacy-readonly-workspace | 旧库只读边界代码保留 | 非隐私旧格式副本真实识别/只读/恢复；不以现代v1库冒称Legacy旧库 |
| H04 persistent-download | B模型传输暂停/恢复，D副本交付有实际结果 | 素材下载自己的持久恢复、取消/未知提交/重开；模型下载不能替代此模块 |
| H05 download-space-management | 正式资源/文件归属保护保留；F规模Copy可用 | 真实可恢复副本中的不足磁盘/清理/恢复；不删除唯一原件或不明缓存 |
| H06 visual-ai-download | A真实分析/Pi探测，D单独副本下载 | 拟支持Provider生成/下载素材的正式入口、落库/来源与失败恢复 |
| H07 visual-ai-provider | Qwen/现有Luna限定真实分析已记录 | 当前Mac消费者和首版声明Provider/能力矩阵；不是所有SDK Provider承诺 |
| H08 tag-batch | WC备份回归及A独立标签/一键/后台结果 | 批量标签自己的选择范围、部分失败/取消/分页/重开与用户确认优先 |
| H09 independent-tag-intent | WC内部分支、A正式保存/单次执行 | Mac身份/修订/权限、旧请求与新请求、正式交互完整矩阵 |
| H10 tag-decision | WC事务、A正式确认及人工保护 | 确认/拒绝跨重跑和双端编辑、冲突回读/重开；不自动确认建议 |
| H11 tag-recovery | A/T14基础描述unknown核对/明确新执行 | 独立标签自己的完整未知/未发/回执核对与恢复；描述恢复不关闭全部标签恢复 |
| H12 tag-execution | WC限定回归、A/B及T14实际标签 | Mac真实执行、撤权/取消/迟到与释放、失败保留旧结果，按原消费者证明 |
| H13 background-analysis | A三能力、T14 GGUF、F30分钟描述+OCR | Mac三能力与普通UI持续规则/暂停恢复；并发响应目标和更长负载未证明 |
| H14 background-ocr-runtime-observation | A正式RapidOCR资格和真实有字/无字，F有效空OCR | Mac实际资格/资源测量与当前使用消费者；不以固定verified或空文字证明有字质量 |
| H15 ai-acceptance | WC/Luna低档及本地模型真实挑战 | 首版声明组合的真实挑战/失效/错误/取消；挑战不代替素材使用 |
| H16 background-ocr | 旧内部回归与统一基础分析OCR消费者接线 | 核对现有独立/统一消费者，Mac持久OCR与暂停/退出/未知保护；不造重复后台 |
| H17 model-library-workspace | B及本地底座境内目录/安装/导入/资格/卸载有Windows证据 | Mac目标运行包/Metal或CPU、境内获取、离线/撤信任/损坏/重开；DAM签名目录仍未交付 |
| H18 pi-auth-prompts | 限定Windows应用内部账号使用/low持久化 | Mac应用内登录/取消/退出/系统锁定/重启/撤销及安全存储；Agent不读取秘密 |
| H19 pi-runtime | Windows固定Node/Pi seal/协议/实际Luna及F包逐文件核验 | Mac重新准备/封印/验证/同包运行，不能借Windows seal或旧macOS历史PASS |
| H20 workspace-motion | 当前共享UI/取消等有限操作 | 当前批准DESIGN下焦点/快捷键/减少动态/缩放/长内容/主题/原生窗口，不用静态图代替时序 |
| H21 pi-visual | 限定Luna低档实际探测/公开图与保存重开 | 声明支持的标签/描述/反推/细化任务及实际档位质量/用量边界；厂商硬cap/费用未知保持 |
| H22 gallery parity | 历史FAIL/STALE：1.097186% > 0.5% | 按当前已批准参考重新核对；不降低阈值或替换参考求绿，记录旧参考适用性 |
| C01 codec隔离 | WC修复局部拒绝不冻结OCR/Pi | 受影响Mac当前产品错误/资源分支；旧故障保持历史身份 |
| C02 visual admission | WC codec及后续Governor/真实推理已有限定证据 | Mac真实预处理、共享资源/活跃任务保护/物理释放；不可复制Windows预算授资格 |
| C03 context router | 历史预算缺陷已补；F当前check通过 | 69份untracked一方源码未纳入tracked ownership警告仍在；恢复Git基线/候选闭包并检查，不冒称全覆盖 |

历史UX01（probe自身保存误报冲突）与快速取消耗槽已在reasoning批限定
修复/复测；后续不自动重开已关闭故障。UX02原生窗口、UX03错误位置
以及完整未保存导航/焦点/缩放等仍需当前Mac证据，不能以一次Browser通过关闭。
源测试入口由上述原22项队列逐行链接；当前调用链和用户任务优先。

## 与A–F及本地底座的对应

| 目标 | 已成立范围 | 仍未完成 / 接续结果 |
| --- | --- | --- |
| A | Windows指定CPU/资料/服务普通启动、生命周期、三能力、后台、未知核对/重开 | Mac重复这条实际消费者路径；不要求从零重做已采用代码 |
| B / T01–T22 | Windows境内来源、2B/4B/8B GGUF、资源、OOM、双语/以图索引等逐切片证据 | Mac实际运行包/设备联动与完整联合；目录链接不等于可运行，全切片不自动关闭父#24 |
| T23 / 父#24 | Browser大量联合路径、120分页/索引恢复等已去重 | 原Chrome“前端审美网站”指定原页压力操作仍超时；临时副本/F soak不能替代。Native延期，父级未关闭 |
| C | Windows公开165素材文字/颜色/图文覆盖与双语/以图，保存重开 | Mac目标模型/索引/数据与普通入口；保持旧211向量与7任务，31条旧副本时间错误保留 |
| D | WindowsBrowser视频/两帧/工作集/副本下载/重开 | Mac视频Adapter、创作应用真正接收、拖拽/置顶/隐藏/多屏/断屏与原生文件交接 |
| E | 正式配对/网关/Journal/Outbox/三方冲突代码；受控测试 | 用户明确全部留Mac：专用公开库→实际配对/读写回读/冲突/断连/恢复/重开，未实测 |
| F | Windows未签名包普通启动；10009记录/24不同内容；30.14分钟18效果；旧小库迁移/工程恢复/保护 | Browser完整大库路径、Windows/Mac安装升级卸载保库、Mac依赖/原生、4MiB以上旧schema升级、后台并发两秒目标；正式品牌/签名/发布另列 |

证据入口：[A](AI-CORE-20261006.md)、[B](MODEL-MANAGEMENT-20261006.md)、
[底座无界面收尾](LOCAL-AI-NON-UI-CLOSURE-20261007.md)、[T23](LOCAL-AI-T23-BROWSER-20261007.md)、
[C续验](SEARCH-C-COVERAGE-20261008.md)、[D](WORK-MODE-D-20261008.md)、
[E](EAGLE-E-20261008.md)、[F](RELEASE-SCALE-F-20261008.md)。

T23原Chrome页压力属于Windows原指定范围，Mac新压力样本可新增平台
证据，但不能将旧项改成通过。全部Provider、CLIP/WD/RAM++质量、
私人旧库、物理断电/kernel故障及十万条不是本轮新的自动队列；如果
拟声明相应首版支持，再固定范围并专门验收。历史质量弱项仍保留。

## 每项关闭要写的证据

普通可发现入口→适用的实际执行/推理→正确结果→保存重开→取消/失败/
用户状态和原件保护；注明新build、平台、客户端、目标设备/模型和资料
副本。分列PASS/FAIL/NOT_RUN/BLOCKED_UX_ACCEPTANCE，父级条件未成立就
保持未完成。包内存在或内部测试通过不等于真实应用通过。

商业首版总门仍见[发行验收](../product/RELEASE-ACCEPTANCE.md)。
本轮不会修改GitHub父issue、发布子票或标记商业交付完成。
