# 测试放行矩阵

**所有未来生产验收均NOT_RUN。** 存在测试入口不表示已覆盖新增规则；下列新断言均proposed，需要获准IMPLEMENT后编写。没有创建新的npm命令。

| Gate | 规则 | 最小反例 | 本轮参考模型范围 | 临时库/正式Electron验收 | 所属任务 |
| --- | --- | --- | --- | --- | --- |
| G01-single-writer | AC-02 / A | 旧combined g1、新tags g2；g2先成功或先失败，g1迟到 | 无新增模型；验收需求 | 临时库断言唯一current/效果，历史bundle可读、无双发；正式Inspector确认显示来源 | 03（04消费） |
| G02-shared-admission | AC-03 / B | 旧新同时prepare/run；2槽满、新tags1槽满；取消/异常/TTL释放 | 无native峰值模拟；额度参数仍需03冻结 | 同一Main准入实例；bounded reader分配前拦截、冻结字节上限、无部分reservation泄漏；UI waiting/cancel | 03（05批次扩展） |
| G03-session-fence | AC-01 / C | 同libraryGeneration G1：S1关、S2开，S1 claim迟到 | MC06：常量G1、仅session变化；非实际lease测试 | 真实临时Host reopen不改控制generation，S1提交拒绝，S2可读旧成功；正式重开不外发 | 02/03/06 |
| G04-schema-checkpoints | AC-04 / D | 02A未定profile/备份便开始02B；迁移/首写中失败 | 结构gate文档，不运行迁移 | 先记录version/profile/DDL/备份；临时库故障回滚、空间/备份校验失败零新schema；未知新profile旧程序拒写 | 02A→02B |
| G05-new-app-compat | AC-04 / D | 新版把自己升级库的OCR/笔记/工作集/下载拒绝 | 无模型；明确定义FAIL | 每现有功能读/写/关开保留用户内容；不以old-binary拒写断言替代；正式UI保存重读 | 02B（07集合） |
| G06-rollback | AC-04 / D | 升级后新增用户内容，再恢复旧备份宣称无损 | 无DB模型 | 兼容代码回退保留目标schema；恢复前计算差异/用户影响，不降版本；实际恢复另按批准范围 | 02A/02B |
| G07-close-write-kinds | AC-05 / E1 | closing→closed→commit(new)；关闭前pause；closed读回执；新会话重读 | 原CE-P26复现；MC01–MC06限纯状态 | 生产Host关闭屏障前后普通业务/协调记录/回执权限分开；SQLite已提交成功保留；异步旧claim拒绝；正式关库UI | 03基础/06恢复 |
| G08-conditional-fairness | AC-06 / E2 | priority10/0 ageCap5，持续前台100轮后台0；资源不满足对照 | 原CE-P13；MF01/MF02展示1/4配额条件，不是生产默认 | 未来实际scheduler假时钟/受控任务测quota/轮转与取消重入；压力不满足不声称必须完成 | 后续P13（不阻塞01） |
| G09-pagination-liveness | DEFER-16 / F | 无关AI展示更新持续触发全局cursor过期 | 风险登记，未运行参考或生产查询 | 未来QueryPort临时库持续写+翻页保持进展，命中集合变化按声明策略处理，权限/Trash即时过滤 | 后续P16（不阻塞01） |
| G10-variant-v8 | DEFER-V8 / F | 合成v8 pending副本intent由reader读取/重复恢复 | 源码白名单事实，未执行 | 最小临时v8及新profile复现并单独记录；若升级兼容涉及时关联02，不扩大01 | 独立复现/02兼容涉及时 |
| G11-eagle-guard-order | DEFER-EAGLE / F | 合成未知高version且部分表缺失，再调用initializer | 源码顺序事实，未执行 | 未来临时Eagle索引断言版本拒绝前零DDL；生产Eagle/真实库不访问 | 独立Eagle复现（不阻塞01） |
| G12-three-defaults | AC-07 / F | 默认基础plan误带Embedding或因替代删除旧向量 | 只记录产品目标，不执行策略 | 未来Planner默认精确tags/caption/OCR；Embedding在语义检索显式启用后合法准入，历史数据保留 | 后续P11/P17（不阻塞01） |

## 已核对命令与适用限制

- `npm run test-visual-ai-download-integration`：存在；本轮NOT_RUN。
- `npm run test-active-library-host`：存在；本轮NOT_RUN。
- `npm run test-exclusive-library-lock`：存在；本轮NOT_RUN。
- `npm run test-asset-notebook`：存在；本轮NOT_RUN。
- `npm run test-work-sets`：存在；本轮NOT_RUN。
- `npm run test-library-organization`：存在；本轮NOT_RUN。
- `npm run test-persistent-download`：存在；本轮NOT_RUN。
- `npm run test-owned-download-recovery`：存在；本轮NOT_RUN。
- `npm run test-active-library-electron-e2e`：存在；本轮NOT_RUN。
- `npm run test-library-canvas-electron`：存在；本轮NOT_RUN。
- `npm run test-asset-discovery-workflow`：存在；本轮NOT_RUN。
- `npm run typecheck`：存在；本轮NOT_RUN。
- `node scripts/run-ts-test.mjs scripts/visual-ai-transport.test.ts`：存在；本轮NOT_RUN。
- `node scripts/run-electron-node-test.mjs scripts/asset-ocr-storage.test.ts`：存在；本轮NOT_RUN。

源码导航见evidence/TEST-COMMANDS.json。G08/G11/G12没有现成新功能入口：新增测试文件/命令均标 **proposed，尚不存在**。G09当前词法测试仅作语义回归，不冒充分页实现；G10旧下载恢复入口也不当然覆盖v8 variant，需专门扩展合成fixture。

## 本轮实际执行

`python3 -B checks/minimal-spec-checks.py`（在本修订目录）仅运行已逐行查看的两个纯evaluate函数及小型新规则模型，日志evidence/MINIMAL-SPEC-CHECKS.json：2条原反例复现，8条最小示例通过。旧模型仍保留对应局限，没有覆盖改写旧PASS记录。
`python3 -B checks/verify-revision.py`仅检查JSON、来源摘要/行定位、supersedes、7任务与依赖、命令存在性、输入包与原工作区保护；记录evidence/REVISION-CHECKS.json。

MC05闭库拒读后以新scope重读既有效果；MC06明确保持G1，不能用改持久generation伪造会话测试。MF01用K=4的固定单后台示意验证可dispatch，MF02资源不满足时不承诺进展；不等价于生产多队列公平或墙钟完成证明。
205原案例与评审205重放仍是同一套历史测试；本轮没有重放它们，不相加成410，也不把8个例子加入生产测试统计。

本轮不运行任何生产测试集、应用、模型或HTTP服务；future命令开工前还需检查测试环境变量/输入范围，所有真实模型/数据权限仍单独核对。
