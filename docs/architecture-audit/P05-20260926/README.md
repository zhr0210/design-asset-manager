# P05｜持久任务、幂等提交与中断恢复

2026-09-26 · **MODE=SPEC** · 设计ready_for_review · 实施not_started。

本阶段交付持久分析意图、执行认领、同事务结果提交、Outbox重复消费与关库/崩溃恢复的设计。没有修改业务代码、运行应用/模型、创建或打开SQLite。

- [阶段报告](reports/P05-REPORT.md)
- [源码现状与会话身份纠正](CURRENT-BASELINE.md)
- [身份、状态机与重试](JOB-STATE-MACHINE.md)
- [Journal / claim / commit接口](JOURNAL-CONTRACT.md)
- [Outbox消费协议](OUTBOX-PROTOCOL.md)
- [关闭、恢复与云端不确定结果](RECOVERY-AND-AUTHORITY.md)
- [迁移与回退](COMPATIBILITY-MIGRATION.md)
- [验证计划](VALIDATION-PLAN.md)、[来源](REFERENCES.md)、[ADR提案](adr/ADR-P05-JOURNAL-COMMIT.proposed.md)

```text
用户操作 / 有效后台策略（后续阶段）
└── Batch：一次已审阅范围
    ├── Job：素材 × 内容 × 能力 × 请求代次
    │   ├── 意图去重：重复投递返回原任务
    │   ├── waiting：模型 / 资源 / 授权 / 配置 / 恢复条件
    │   └── Attempt：认领epoch + 本次Host会话 + 短时token
    ├── PhysicalInvocation：一次真实后端调用，可服务多个兼容Job
    │   └── 完整响应后，每项能力独立验证
    └── Host单事务
        ├── Evidence与当前选择（P04）
        ├── Job/Attempt成功与幂等回执
        └── Outbox事件
            ├── 库内投影：幂等更新与checkpoint
            └── 界面：事件提示后重新读取；掉通知不丢结果
```

关键纠正：源码中的library generation不保证每次重开改变；新设计必须额外检查本次Host会话/lease identity。详见CURRENT-BASELINE。P02/P04直接前置仍待审，不把本轮续行视为实施批准。完成后停止，不自动进入P06。
