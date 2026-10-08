# P02｜集中 schema 能力查询与安全演进

2026-09-25。模式：**SPEC**。设计状态：**ready_for_review**；实施状态：**not_started**。

本轮用户“继续下一步”授权开展P02设计，不视为P01逐项评审通过或公共契约/数据迁移实施批准。P00/P01原报告保持原样。未改业务代码、未运行应用/模型、未创建或打开任何SQLite，包括临时库；未接触真实资料库。

## 交付

- [迁移登记ADR草案](adr/ADR-P02-SCHEMA-GOVERNANCE.proposed.md)
- [实际版本与能力矩阵](VERSION-CAPABILITY-MATRIX.md)
- [统一查询与编排设计](SCHEMA-GOVERNANCE-SPEC.md)
- [备份恢复说明](BACKUP-RECOVERY.md)
- [源码发现与缺口](SOURCE-FINDINGS.md)
- [临时库/失败夹具设计](VALIDATION-PLAN.md)
- [来源索引](REFERENCES.md)
- [阶段报告](reports/P02-REPORT.md)

机器可读清单：`manifests/VERSION-CAPABILITIES.json`、`MIGRATION-REGISTRY.proposed.json`。
夹具：64组版本×能力条件、14种临时库建造配方、30项迁移/失败场景、12项备份恢复场景。它们是待执行的设计，未生成真实DB文件，没有SQLite测试PASS。

两个需要后续隔离验证的源码发现：v8的`readVariantIntent`缺少版本分支；Eagle独立索引初始化先执行DDL再检查版本。它们不是本轮修复，也不能据此声称用户库已经损坏。

不分配v9，不把所有库升级到v8，不把当前Managed的DELETE模式改成WAL，不向旧版本表内偷偷添加迁移历史/Outbox表。完成P02后停止，不自动进入P03。
