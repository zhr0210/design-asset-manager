# 来源与版本

| ID | 来源 | 本轮使用与限制 |
| --- | --- | --- |
| S00 | docs/handoff/PROJECT-ARCHITECTURE-HANDOFF-20260924.md，前序已读§5/7/8.3/9/10 | 2026-09-24历史源码交接；当前Host/控制器/Journal重新核查，不把历史测试当本轮证据 |
| U01 | 包sources/USER-REQUIREMENTS-20260924.md | 持久素材×能力进度，恢复未完成部分；不是token/KV续生成承诺 |
| TARGET | 包05交接、CURRENT-STATE、P05、JOB-07/DATA-12/SEC-10、模板、R/DAM-A | 目标参考；本轮仅SPEC |
| S23 | [SQLite Write-Ahead Logging](https://www.sqlite.org/wal.html) | 官方滚动文档，2026-09-26读取；核对WAL/sidecar/checkpoint机制，未启用WAL，未证明锁定依赖已包含某SQLite修复 |
| P02 | ../P02-20260925/reports/P02-REPORT.md、迁移登记 | 设计待审/未实施；P05只交增量提案 |
| P04 | ../P04-20260926/reports/P04-REPORT.md、CURRENT-SELECTION | 复用单一slot/Evidence/覆盖；本轮纠正重开generation假设，不覆盖前序文件 |
| SRC | evidence/SOURCE-INVENTORY.json | 相关symbol/片段和摘要，不是全文件审计 |

依赖锁版本：better-sqlite3 12.10.0、Electron30.5.1、Ajv6.15.0；本轮未加载原生模块，SQLite实际版本和平台行为未验证。DATA-12沿P02/P04已读取约束，不因P05自动扩展迁移或数据库恢复授权。

缺少的新实现/DDL/报告明确为未取得或NOT_RUN；没有访问模型缓存、真实资料库、用户私有素材。公开S23查询不传素材。初次导航用过未匹配的路径通配，已通过真实文件名定位control-store/lock源码；查找过程不当成业务测试。
