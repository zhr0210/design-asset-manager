# B01 后台分析基础层交付报告

启动：2026-09-28；交付：2026-09-29。用户授权“批准进入下一轮”。本轮按真实依赖缺口限定为**后台分析意图与保守准入基础层**，已完成实现、验证和独立只读源码签收；不是自动模型推理或全局资源Governor交付。

## 当前可用

- AI Console可显式启用“收集新素材分析计划”，默认三能力为标签、短描述、OCR；关闭主开关或某能力只影响计划，不删除人工结果或意图历史。
- 开启之后，受支持Managed Copy的新素材Promotion在同一事务登记0–3条轻量意图。不开模型、不保存图片/proxy/路径/凭据，不补扫历史库，重复确认不重复登记。
- Inspector与原生卡片共享等待状态、暂停/恢复/取消。用户暂停跨关库重开及Trash/restore保留；取消不能被恢复操作复活；失效来源标为superseded，取消项仍保留终态。
- Main读取粗粒度内存、供电、温控、交互及主窗可见性。缺失/过期证据保持unknown，不伪造GPU余量或节能状态；纯政策评估提供可解释原因。
- 生产绑定固定为not-integrated，dispatchAvailable=false，界面明确“只管理计划、尚未自动执行”。v12的enabled仅授权收集计划，不是未来自动推理或上传许可。

```text
AI Console：策略review / 三能力计数
Inspector与card：当前素材意图 / pause-resume-cancel
  → 窄Preload和可信IPC（Main全库，card限当前素材）
  → owner/session/revision守卫 + 只读资源政策投影
  → 持独占lease的ActiveLibraryHost
      ├─ 明确确认后：备份 + 原子升级/配置
      ├─ Promotion事务末尾：登记三能力轻量意图
      └─ 普通读取/控制：无推理、无图片物化、无历史回填

自动执行适配器 / 独立caption效果 / 全资源调度：未接入
```

## schema与兼容

新库仍为1，首次保存计划设置经review启用12。沿用已验证的本机APFS/SQLite/native备份、空间和4MiB增长限制；历史DDL、必要的tag current种子、v12表及配置一次事务完成，失败回滚或按实际提交/恢复故障隔离。原版本<10才seed，10/11不重seed。

意图身份使用Capture source_generation和preview_generation_identity，不使用会随Trash变化的lifecycle.revision。策略/轮询/重开/恢复不会触发历史入库；当前没有正式内容替换入口，未伪造该事件。

1/8/9/10/11升级及v2旧current种子已测；冻结v11 reader拒绝12且数据库字节不变。v12的手动tags、combined、拒绝、OCR人工修订、Notebook、WorkSet/layout、组织及下载Journal写读和重开通过。真实旧库没有迁移。

OCR只新增idle维护准入锁，跟踪configure-await、prepare/run并撤销旧review。它用于防止迁移期间并发可写操作，不代表此前取消的Python已经物理退出。

## 证据

| 层次 | 最终证据 |
|---|---|
| 生成临时Host/控制器 | 19/19：原子升级/故障、无回填、Replay、开关和用户决定、Trash/restore、正常resume、源失效、权限/旧会话、OCR维护、旧能力兼容、v11拒12、CAS安全上限 |
| 资源政策函数 | 4/4：qualified CPU的局部正向fixture，缺资格/外部所有权/unknown/stale/内存余量/电源/温控/前台等拒绝；不代表实际执行资格 |
| 正式React共享组件 | 2/2；独立复核发现的旧poll覆盖新pause、关库迟到review均先失败再修复通过 |
| 正式Electron Main/Preload/Renderer | 1/1：Console确认、旧素材不补建、新素材三等待、暂停、card越界拒绝、完整退出重开；生成源hash不变 |
| 受影响回归 | 8条命令exit0：intent30、tag execution30、decision13、batch12、recovery22、OCR storage、Host、旧Provider9；后两类断言脚本按日志单列，不编造发现数量 |
| 静态与构建 | typecheck及最终build通过；交付截图单独目检 |

网络证据限定为**已配置的本次合成HTTP端点收到0请求，加上B01源码无自动派发入口**；没有监测或宣称全进程任意网络绝对0。

初始Host接口红灯、两项UI竞态红灯、安全revision边界红灯均保留。两次夹具错误（Trash receipt嵌套读取、旧visual schema初始化）也保留，并与产品缺陷区分。最终源码/测试/日志绑定见FINAL-SOURCES与EVIDENCE-MAP。

## 独立复核与范围保护

/root/background_boundary_review核对了精确DDL/版本/调用方、实际源码、原始日志、截图和工作区保护，限定签收B01。未由reviewer重跑测试，不把只读审查冒充重跑。

本轮33文件摘要：`ea7fc678678c16714fffdbb4c3836adc0bd7b8aeab52eadb2f946865364716c3`。
相关121文件摘要：`db0db486be25dd0e33380f4094cefad95bb851632058e9b7c02cbd4869f1f121`。
基线1071文件仅17个获准既有文件变化（含TASK），无范围外变动/缺失；原索引条目和staged diff保持。没有暂存、提交、推送或发布。

## 未完成项及停止点

后续接实际执行器前仍需：独立caption recipe/提交、OCR实际child-exit drain、可信Runtime所有权/执行包络、完整资源与生命周期调度，以及新的清楚执行授权。当前计划开关不可被静默解释为这些权限。

未运行真实模型、读取真实用户库/模型缓存、安装依赖、做Windows或安装签名测试；旧RUN_AS_NODE原生等待未定位。B01只证明本机开发基础层，不代表所有自动基础分析已经运行。

本轮结束，FINAL-HANDOFF为最高终态，nextBatchAuthorized=false，不自动恢复旧队列或进入下一批。交付包不是完整仓库，patch仅适用于匹配before的WIP，不可盲目覆盖。

最终包已通过独立完整性补核：240条目、917,656字节，239载荷hash/CRC匹配，33文件补丁在内存重建。ZIP SHA256：`d6e93cafb0c88d79d77948684652b8d1195d13957bf9384f57350e650705b923`。包已冻结，交付补核旁证见REVIEW-PACKAGE.md。
