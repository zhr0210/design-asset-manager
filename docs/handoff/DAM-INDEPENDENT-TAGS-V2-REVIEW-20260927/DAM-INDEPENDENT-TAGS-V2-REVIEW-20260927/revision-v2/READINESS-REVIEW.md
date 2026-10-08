# 首轮独立标签实施前收敛评审

日期2026-09-27；**MODE=SPEC，ready_for_review / implementation not_started**。
本轮用户在提供完整交接包并确认SPEC范围后要求“开始修改”。授权仅为本轮受限文档修订与独立纯规格检查；包内历史授权不是新增IMPLEMENT/模型/库操作授权。

## 1. 输入、工作区与证据边界

真实工作区可访问：`codex/product-reassessment-20260905`，HEAD `3fa00df3bbb605478da6d0af18724d64021e723c`；本轮保护2127份已有文本和Git index/staged/unstaged diff摘要，完整记录见evidence/WORKTREE-BEFORE.json。仅阅读相关symbol，不宣称全库逐行审计。
输入包清单541项SHA逐项一致、CRC通过；选定35份输入保留字节副本。包内路径/章节/行范围及源码摘要统一在[REFERENCES](REFERENCES.md)、evidence/SOURCE-REVIEW.json；以下B-标记是材料事实，S-标记是本轮真实源码定位。
已读工程REPORT、首轮SPEC/PLAN、测试边界/导航和7张任务，评审报告/检查/反例，以及本轮所需P02/P04/P05/P08/P13/P16/P26。AGENTS当前内容已在会话，CONTEXT按标签/视觉术语查阅，TASK只作历史恢复点，DESIGN核对共享UI边界；没有设计新UI。

计数澄清：原205案例和评审者重放205是同一套案例的两次执行，不是410个独立测试。本轮没有重跑205全套，更没有生产/数据库/模型测试。输入包评审检查自身明确没访问真实源码；本轮源码核对另有具体S-定位，不能借用评审者记录代替。[B-CHECKS；输入REPORT §4]

## 2. 逐项分类、修订与放行点

| 项目 | 来源及事实/推导/待核验分类 | 本轮修订 | 放行点与最小缺口 |
| --- | --- | --- | --- |
| A / REV-01 | 材料事实：03已有代次/session/claim/cancel，单写drain原明确列在04；推导：只按03做可能留下两套current。[B-R01/B-T03/B-T04/B-SPEC53] 源码事实：现行完整bundle事务+created_at current。[S-WRITE/S-CURRENT] | AC-02，03新增G01，04消费已成立规则；原防线保留 | 03首次新写前跨新旧路径临时库验收；新writer/模式切换实现尚缺，不称生产已修 |
| B / REV-02 | 材料事实：03泛称预算，05明确共享准入。[B-R02/B-T05] 源码：当前最多2批，prepare先保存冻结图。[S-PREPARE/S-RUN] | AC-03，03前移共享槽/字节账，05只扩批次验证 | 03开并存前填有限AdmissionProfile及安全夹具依据；native峰值未知，不冒充外部VRAM限制 |
| C / REV-03 | 材料事实：P04第7/11/25行身份混用，P05已纠正。[B-P04/B-P05-FACT/B-P05-CONTRACT] 源码：open读持久generation、lease/new session另产生。[S-OPEN/S-LEASE] | AC-01、SUPERSEDES显式替代；02/03/06加入同generation旧claim拒绝 | 新Host session绑定及token registry尚未实现；最小参考MC06非实际Host证明 |
| D / REV-04 | 材料事实：02含“回归或安全拒绝”歧义。[B-T02/B-SPEC55/B-R04] 当前源码已知1–8、DELETE/FULL。[S-SCHEMA] | AC-04，02A决定→02B持久意图；新版已有功能必须可用 | 当前没有目标DDL/版本/备份运行证据；本轮不占新版本；新profile功能回归不能用统一拒绝替代 |
| E1 / REV-05A | 已复现的参考模型事实：原P26 closing→close→commit(new)产生1效果；不是生产漏洞。[B-COUNTER/B-P26] Host普通run非ready拒绝。[S-HOST/S-CLOSE] | AC-05区分普通业务、关闭协调记录、回执重读；G07映射03/06 | 本轮纯模型8例之一系列通过；真正Host事务/关闭竞争仍NOT_RUN |
| E2 / REV-05B | 已复现的参考模型事实：priority10 vs0、ageCap5、100轮后台0次。[B-COUNTER/B-P13] | AC-06有条件配额/轮转，登记未来P13 G08，不给01新增依赖 | 后续生产scheduler需明确K/后台轮转/可执行前提与真实轨迹；当前手动标签不实现完整公平调度 |
| F1 / REV-06 | 设计推导：全局projectionRevision失效与持续后台更新可能妨碍分页，未实测。[B-P16；B-REVIEW §5] | DEFER-16，区分成员排序变化与展示变化，权限每页即时复核 | P16实施前分页活性用例；不阻塞01 |
| F2 / REV-07 | 源码事实：v8 reader漏项；Eagle DDL在版本guard前。运行影响仍未复现。[S-VARIANT/S-EAGLE] | 分别登记DEFER-V8/DEFER-EAGLE | 各自最小合成数据复现；V8若影响02兼容必须面对，Eagle不成标签前置；不访问真实库 |
| F3 / REV-08 | 已定用户目标默认tags/caption/OCR与历史自动Embedding条款不同。[B-REVIEW §5；B-SPEC80；S-ADR] | AC-07及SUP-AUTO-01，仅替代默认自动项范围，保留能力/历史 | P11/P17实施时更新正式ADR/启用策略；不重复询问已确定产品答案 |

## 3. 当前可开始与不能据此放行的范围

任务01保持原父任务、原验收与无schema/公共接口变更边界；本轮未新增其阻塞依赖。它是唯一下一实施候选，不是已被本文件自动授权执行。开始仍需明确IMPLEMENT。
任务02A/02B、任务03首次新写两门槛都尚未获得生产证据；readiness只表示修订后的规则可供评审，不代表任务02/03可跳过。7父任务id/title/blockers/stories不变，只有02–06必要条款修改，01/07副本字节不变。

## 4. 本轮实际验证

- 原参考模型反例：2条已复现；目标不变量在旧模型中未满足，记录counterexampleReproduced，不粉饰成旧模型修好了。
- 修订规则最小示例：8条纯规格检查通过，覆盖关闭类别、同generation新session及有条件配额。只是局部谓词/计数模型，没有SQLite/Sharp/真实scheduler。
- 输入完整性、定位/替代索引、7父任务/依赖、命令存在性与工作区保护见evidence/REVISION-CHECKS.json。
- 生产测试、真实临时SQLite、正式Electron、模型、Windows均NOT_RUN；没有扩大为全平台/完整资源治理验收。

## 5. 剩余项与停止点

最小待定技术项为02A精确迁移/备份方案、03有限预处理预算与真实分配依据；这些是对应任务放行点，不是让任务01先建设整个平台。生产回归用例需在现有测试入口扩展，矩阵明确标proposed。
本轮不改原包/历史报告/根控制文件，不发布Issue、不改index、不提交推送、不启动服务。下一步仅见[HANDOFF](HANDOFF.md)中的任务01候选，完成本轮后停止。
