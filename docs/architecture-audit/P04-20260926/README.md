# P04｜独立分析证据与用户覆盖层

2026-09-26 · **MODE=SPEC** · 设计 `ready_for_review` · 实施 `not_started`。

本阶段把标签、描述、OCR、反推的保存与选用规则拆开，保护已有有效结果与用户修改。所有接口、schema和夹具均为设计，业务代码未修改；未创建或打开SQLite，未启动应用/模型，未运行新选择器或schema验证器。

- [阶段报告](reports/P04-REPORT.md)：范围、事实、验证与停止点。
- [源码现状与缺口](CURRENT-BASELINE.md)：完成时间选择、拒绝范围、OCR修订与兼容限制。
- [证据契约与验证规则](EVIDENCE-CONTRACT.md)：按能力值、来源和完整性门槛。
- [当前结果选择器](CURRENT-SELECTION.md)：请求代次、重试、取消、固定与旧结果保留。
- [用户覆盖规则](USER-OVERLAYS.md)：描述、标签确认/拒绝、OCR修订及空值。
- [兼容读取与schema交接](COMPATIBILITY-MIGRATION.md)：P02增量提案，不分配新版本号。
- [验证计划](VALIDATION-PLAN.md)、[来源](REFERENCES.md)、[Proposed ADR](adr/ADR-P04-EVIDENCE-AND-OVERLAY.proposed.md)。

```text
目标：每素材 × 每能力（标签 / 描述 / OCR / 反推）
├── 有效的执行结果
│   ├── 完整传输与结构校验
│   ├── 每项能力自己的质量规则
│   └── Host持有效权限，按执行凭据提交
├── 追加式 Evidence：保留来源，不改历史内容
├── 当前选择：请求代次 + 当前成功指针 + 显式固定
│   └── 失败不清空上次有效结果，迟到旧任务不夺回当前
└── 用户覆盖层
    ├── 人工描述（空字符串也有效）
    ├── 确认标签 / 拒绝建议
    └── OCR修订（保留原证据关联）
        ↓
    各能力有效投影 → Inspector / 词法检索 / AI文件夹
```

P02/P03是直接前置，设计均待审，实施均未开始。本轮“继续完成长目标”按既有SPEC模式授权本阶段细化，不代表接受前序ADR或批准实施。按阶段卡完成P04后停止，不自动启动P05。
