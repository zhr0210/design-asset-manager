# 来源、版本与未取得证据

| ID | 来源/范围 | 本轮使用与限制 |
| --- | --- | --- |
| S00 | 仓库 `docs/handoff/PROJECT-ARCHITECTURE-HANDOFF-20260924.md`，原交接稿2026-09-24 | §2边界、§5调用链、§7数据、§9视觉/OCR、§10分级；历史测试摘要不是本轮通过 |
| U01 | 原包 `sources/USER-REQUIREMENTS-20260924.md` | 独立执行/成功立即可用、人工优先；只是需求，不证明已实现 |
| TARGET | 原包 `05-AI-CONTEXT-HANDOFF.md`、CURRENT-STATE、P04、模板、整体AI-06/EVIDENCE-11/DATA-12/VAL-22，2026-09-24 v1.0.0 | 目标与执行模式；状态以本轮独立报告补充，不覆盖原包 |
| P02 | `../P02-20260925/reports/P02-REPORT.md`与MIGRATION-REGISTRY.proposed.json | 设计ready_for_review、实现not_started；本轮只追加登记提案，未实际合并 |
| P03 | `../P03-20260926/reports/P03-REPORT.md` | 同为待审；综合配方兼容模式与新独立模式不能混淆 |
| SRC | 本目录SOURCE-INVENTORY列出真实源码/锁文件、相关测试 | 查阅相关symbol/片段，不声称逐行全库审计；指纹只用于保护与定位 |

查阅日2026-09-26。本阶段没有新增外部资料或联网查询，技术事实以当前本地源码与锁版本为准；没有借滚动文档推断框架已接入。P01约定的draft-07/既有Ajv仅用于文档契约，未运行schema engine。

实际未取得/未执行：新Evidence/selector/Overlay实现、目标迁移DDL与最终版本、其运行日志、真实库状态、当前模型/Runtime文件与授权范围、新模型质量/平台结果。不存在的未来文件只列为拟改边界，不伪称源码。

导航修正：P02登记实际是 `manifests/MIGRATION-REGISTRY.proposed.json`；查询过的小写migration-registry路径不存在。一次shell通配导航未命中后改用真实路径查询；这些是查找过程，不是业务测试失败/通过。CONTEXT只作为术语表；TASK最新内容是历史真实测试恢复点，没有作为本轮执行队列。
