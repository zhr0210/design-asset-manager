# P02｜来源与版本口径

访问/核对日期：2026-09-25。仅访问公开官方技术文档，未外发素材或仓库内容。

| ID | 资料 | 采用范围 | 限制 |
| --- | --- | --- | --- |
| S00 | 项目原交接稿与P00/P01报告 | 当前数据边界、v1–v8、已知历史证据 | 工作区/源码再次核对；历史通过不是本次运行 |
| 包DATA-12/HOST-03/MIG-23 | 目标架构与P02任务卡 | 统一查询/迁移、域隔离、增量策略 | 不是当前已实现事实，不预占v9 |
| S22 | [SQLite Online Backup API](https://www.sqlite.org/backup.html) | 完成备份形成一致DB快照，处理中止/写入变化 | 不覆盖文件系统原件或全库备份 |
| S23 | [SQLite Write-Ahead Logging](https://www.sqlite.org/wal.html) | WAL与主文件的共同持久状态、不能丢弃sidecar | 当前Managed仍为DELETE；不借文档转换模式或修用户库 |
| S22-A | [better-sqlite3 v12.10.0 API](https://raw.githubusercontent.com/WiseLibs/better-sqlite3/v12.10.0/docs/api.md) | backup Promise、取消/进度、同步transaction和嵌套边界 | 对应lock版本；本轮未加载原生模块或证明运行SQLite版本 |

设计推断：在Host暂停本应用新写、保留lease并验证备份前后状态后再执行同步迁移，有利于把一致备份与当前业务首写结合。它仍需实际并发/崩溃/文件系统实验，不是阅读官方文档就已完成验证。

源码取证索引见`evidence/SCHEMA-SOURCE-INVENTORY.json`。每项摘要针对源码文本，不是用户库内容或实际schema签名。CONTEXT和既有ADR的未来备份/资源词汇只作为约束，不把未来格式直接加入当前库。
