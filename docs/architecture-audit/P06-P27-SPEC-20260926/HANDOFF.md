# DAM 目标架构交接｜P00–P27

2026-09-26 · MODE=SPEC · **设计待审，目标改动未实施**。

已完成P00–P27阶段设计。P06–P27按用户授权连续执行，每阶段先测试再推进；共205项可执行合成规格测试通过，每阶段9项文档/保护检查通过。最终重跑22个规格模型结果一致。P00–P05原报告与历史记录保留，未重跑生产测试。

## 阅读入口

1. [目标与实际差异、清理/开源边界](P27/DESIGN.md)
2. [完整R/T/决定追踪矩阵](P27/TRACEABILITY.md)
3. [P27阶段报告](P27/reports/P27-REPORT.md)
4. [P06–P27各阶段索引](README.md)
5. [最终检查记录](FINAL-VALIDATION.json)

## 项目与框架树

```text
DAM：本地优先素材工作台
├── 当前正式权威（源码核对；历史测试另列）
│   ├── Electron Main / Active Library Host / 独占lease与SQLite
│   ├── Visual AI综合输出、专用OCR/修订、受控预览与配色
│   ├── Capture/Download/Trash各自Journal
│   └── 组织、笔记、WorkSet及多窗口成员权限
├── 本轮目标架构（SPEC，未接线）
│   ├── 契约/安全迁移：P01–P02
│   ├── Recipe/Profile/独立Evidence/持久Job：P03–P05
│   ├── 输入谱系/遥测/原子资源/Runtime：P06–P09
│   ├── 标签/基础分析/手动反推/自适应/云授权/安装：P10–P15
│   ├── Host查询/EmbeddingSpace/混合检索：P16–P18
│   ├── 缓存与GC/组织服务/设计助手/IPC：P19–P22
│   └── MLX/Windows实验/诊断/全负载/验收：P23–P27
└── 未来X01–X04：未执行，另行确定范围
```

## 必须注意的源码与设计缺口

- libraryGeneration不保证重开即变化：P05明确加入Host session/lease身份防旧ticket复活，纠正P04简化假设。
- 视觉current仍按完成时间；独立能力/代次/Job-Outbox只是设计。
- P02的v8副本intent reader遗漏、Eagle初始化检查顺序尚未修复。
- 正式模型目录trust root/catalog为空；主窗口sandbox=false未修改。
- FTS/tokenizer/vector engine、质量阈值/资源参数/DDL版本未定；MLX/Windows/签名/真实库迁移/新模型运行未验收。

## 验证口径

SPEC-EXEC：用标准库运行独立设计参考模型及合成输入，测试部分不变量；没有import生产模块/创建DB/解码素材/HTTP服务/模型调用。每阶段说明未覆盖的生产验收，不能将205 PASS解释为新后端代码通过。
当前源码1865份文本与Git index/diffs保持；新产物均在本独立目录。未删除旧代码、未改根AGENTS/CONTEXT/TASK、未启动X或IMPLEMENT。

## 开源准备与交付范围

项目package声明MIT；许可文本/第三方NOTICE、安全报告及贡献入口、精确Python/native/模型Runtime SBOM仍待独立核对/补充，不构成可分发所有模型的法律结论。CI存在不代表本次发布/签名成功。
交接包仅含架构文档、报告、契约、合成规格测试/日志。源码、模型、数据库、用户素材、密钥及完整工作区未打包；文档中的源码链接需在原仓库查看。包不是可运行应用或可复现源码快照。

## 后续实施建议（未授权执行）

先由设计师评审P02/P04/P05与资源/授权边界，再明确IMPLEMENT范围；按P10标签纵向链验证生产权限/提交/显示后扩展。真实库/模型/云端等仍按具体范围授权。用户续行SPEC不自动成为任何ADR批准。
