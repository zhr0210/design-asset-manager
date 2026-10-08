# P02｜临时库迁移与失败夹具设计

**SPEC：没有创建临时SQLite，没有执行DDL、备份、恢复或业务测试。** 下面的expected只是判定条件，不是PASS。

## 1. 夹具集合

- `version-capability-cases.json`：64组，v1–v8分别查询8项能力；验证已有能力不升级、缺失能力仅规划到所需版本。
- `temp-library-recipes.json`：14种临时库建造配方，包含v1–v8、未知高版本99、缺对象、身份不符、WAL/rollback sidecar、Eagle高版本和Legacy。
- `migration-failure-cases.json`：30个权限/并发/回滚/崩溃/新鲜性/版本分支场景。
- `backup-recovery-cases.json`：12个备份一致性、文件范围、来源替换、未知状态和恢复授权场景。

临时库仅在未来IMPLEMENT获准隔离测试时通过现有初始化方法创建；本阶段不生成二进制DB，也不导入用户素材。版本99是负向测试值，不是登记新产品版本。

## 2. 既有脚本导航

| 入口 | 已有关注点 | 本轮 |
| --- | --- | --- |
| `test-library-open-inspection` | 精确库打开/格式/身份 | NOT_RUN |
| `test-active-library-host` | 创建/打开/关闭/Host权限 | NOT_RUN |
| `test-persistent-download` | v3意图/事务、检查点与恢复 | NOT_RUN |
| `test-intake-recovery` | Copy/副本恢复与范围 | NOT_RUN |
| `test-asset-notebook` | v5保存/会话/版本冲突 | NOT_RUN |
| `test-library-organization` | v6组织/色板与回滚 | NOT_RUN |
| `test-work-sets` | v7集合/设备布局 | NOT_RUN |
| `scripts/asset-ocr-storage.test.ts` | v8、修订保留、更低助手不降级 | NOT_RUN |
| `test-external-connected-library-core` | Eagle独立索引/Journal | NOT_RUN |
| `test-legacy-readonly-workspace` | 只读旧库字节/sidecar保护 | NOT_RUN |

入口存在不意味着覆盖了本轮所有新场景。特别是F02/F03与迁移备份新协调器尚无本阶段运行日志。better-sqlite3用仓库Electron Node启动器，不能用shell Node ABI异常为理由重编依赖。

## 3. 验收层级与条件

| 追踪 | 未来方法 | 必须满足 | 状态 |
| --- | --- | --- | --- |
| T02 | 隔离Managed/Eagle/Legacy实例与伪造域/receipt | 不串库、Legacy零写、Eagle不进Managed迁移、原件不变 | NOT_RUN |
| T03 | 真实临时v1–v8建造+精确签名+64组查询 | 不靠表名/大于号猜兼容；高版本保留；未知先拒写 | NOT_RUN |
| T03 | 缺失链每一步DDL故障/首次业务写故障 | 外层事务整体回滚；v2特例与其他能力不同 | NOT_RUN |
| T03 | 一致备份完成/中断/损坏/空间不足 | 备份可验证才迁移；主文件拷贝不冒充WAL快照 | NOT_RUN |
| T07 | 独立进程终止并重开受控临时库 | 不假设无sidecar；不复用旧权限；记录与实际DB核对 | NOT_RUN |
| T07 | staged文件与DB提交交叉故障 | 不宣称全局原子，不误删来源/未知文件，不重复Promotion | NOT_RUN |
| T03/T07 | v8副本意图读取/重复pending登记 | 能复现当前分支遗漏；批准修复后验证期望，保留先前失败证据 | NOT_RUN |
| T03 | Eagle version99且缺表 | 必须在DDL前拒绝；单独记录当前实现和拟议修复行为 | NOT_RUN |
| T07 | 关闭/取消/备份/迁移等待 | 无自等待死锁，提交前后语义区分，lease释放顺序正确 | NOT_RUN |

SQLite正常关闭的测试不能冒充突然断电；单机macOS不能替代Windows、外置/网络卷或签名安装包验证。性能和备份空间数字需实际测量，不在设计中填PASS或拍固定值。

## 4. 用户数据与能力副作用的零例外断言

未知结构不能降版本/补表自修；无确认不能升级；读取不能创建备份；迁移只补结构不能启动模型/下载/外发；用户描述/确认标签/OCR修订/笔记/工作集引用必须保持；恢复不能悄悄丢弃备份之后的更改。

所有上述行为需要实际测试后才能被标为通过。本轮只做JSON可读、本地源码引用和已有工作保护等文档检查。
