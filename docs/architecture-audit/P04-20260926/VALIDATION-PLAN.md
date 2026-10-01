# 验证计划与执行边界

本轮仅运行文档静态检查；所有下列业务/schema语义/selector测试 **NOT_RUN**。JSON能解析、字段引用一致不等于validator执行、数据库事务或模型通过。

## 可复用入口（源码存在，未运行）

| 入口 | 未来可证明范围 | 不能证明 |
| --- | --- | --- |
| `node scripts/run-ts-test.mjs scripts/asset-ocr.test.ts` | 专用OCR当前结构约束 | 新独立Evidence或真实模型 |
| `node scripts/run-ts-test.mjs scripts/visual-ai-transport.test.ts` | 完整响应/有界重试兼容 | 新能力拆分提交 |
| `npm run test-visual-ai-download-integration` | 临时Managed库+合成Provider的既有Host链 | 新选择器、真实素材质量 |
| `node scripts/run-electron-node-test.mjs scripts/asset-ocr-storage.test.ts` | 当前v8升级、空值、修订、源版本、取消边界 | 区域修订迁移或新schema |
| `npm run test-asset-discovery-workflow` | 既有词法/AI文件夹纯投影 | Host增量索引或新Evidence持久状态 |

package命令映射与直接脚本路径见 `evidence/TEST-ENTRY-INVENTORY.json`。better-sqlite3需仓库Electron Node启动器；无ABI重编。本轮没有调用上述入口。

## 新实现需要的判定

| T / 层级 | 设计输入 | 必须断言 |
| --- | --- | --- |
| T05 / L1 | 24条validator-cases + 4合成Evidence | shape与semantic分开，UTF-16/累计OCR长度/面积/未知模型身份；运行Ajv并按冻结recipe检查 |
| T04/T06 / L1–L3 | 36条selection-scenarios，假时钟、延迟与重复回调 | 每能力成功独立、最后完成时间无权抢current、cancel/claim/重复不同payload冲突 |
| T02 / L2–L4 | 手工空caption、confirmed/rejected tag、OCR空修订、并发编辑 | 人工覆盖保持、CAS冲突不丢草稿、不写原件、不跨库 |
| T04/T05 / L3 | 完整JSON的一项无效；截断JSON同字段看似有效 | 前者新独立配方可部分成功；后者全拒绝；P03旧综合配方行为保持 |
| T02/T04/T06 / L2–L4 | 16条compatibility-cases，合成v1/v2/v8及未来已分配profile | 旧综合/专用OCR可读，unknown不补造，旧current种子、独立空值、新旧单写正确 |
| T06 / L2–L3 | 事务前/中/后故障，提交后响应丢失，通知失败 | 全事务回滚或完整提交；查询既有receipt而不是自动再次推理 |
| T02 / L2–L3 | 未知高schema、Eagle/Legacy、失效lease/session | 零Managed越权DDL/写入，旧Writer不可继续 |
| T04 / L4 | Inspector/搜索/AI文件夹读取同一projectionRevision | 标签立即可用但confirmed关系未新增；每能力来源准确 |

夹具都是JSON配方与期望，没有模型文本、私有路径或SQLite文件。未来测试应从同一Host小接口驱动，使用临时合成库、生成图片、内存Provider/受控故障，不用真实库补齐这些安全断言。

将 `analysis-evidence`、用户决定schema与有效/无效样例交给同一版Ajv作L1；Host/recipe语义校验补充JSON Schema不能表达的关联与权限。Python若需要共享该契约须另验证同样例，当前未安装/锁定新的Python schema库。

## 故障注入位置

1. 新请求代次已提交但推理尚未开始：结果仍可读，新任务等待/失败不清空。
2. 结构通过但Host写前发生取消、内容变更或手工编辑：重新检查对应权威，不信此前快照。
3. Evidence插入后pointer更新前异常：同事务回滚；其他能力已提交的结果保留。
4. 整事务成功但IPC/通知丢失：按效果键核对并返回既有receipt；不可因丢回执再生成新逻辑请求。
5. 旧controller仍可达时打开新模式：测试必须证明其委托同一writer或拒绝，不产生双存储竞争。
6. 新state存在而旧表又出现晚记录：effective不被created_at改变；并检测该不应存在的写入入口。

模型语义质量、实际Qwen/RapidOCR、Windows/打包、大库/断电均未覆盖。历史9月24日报告只是前序参考，不作为新schema/selector的PASS；本轮未重读全部历史报告或重跑。

## 实际文档检查

`python3 /tmp/validate-dam-p04-documents.py`只用标准库解析文档JSON、检查引用/状态/固定形状、对照源码指纹和Git摘要。输出 `evidence/STATIC-CHECKS.json`与`WORKTREE-PRESERVATION.json`。脚本不import业务模块、不运行Ajv/selector/SQLite/Provider；场景预期不与实际业务输出比较。
