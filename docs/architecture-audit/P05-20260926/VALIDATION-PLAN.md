# P05验证计划

以下均是计划 **NOT_RUN**。本轮实际检查限于文档JSON/引用、状态机声明一致性与工作区摘要；没有执行状态机、Ajv、SQLite、崩溃实验、HTTP服务或模型。

| 测试 / 最低层级 | 夹具设计 | 判定 |
| --- | --- | --- |
| T06 / L2–L3 | journal-claim-cases 24项 | 入队重投/强制重跑分开，双claim只有一个成功，旧worker与重复不同payload拒绝，最多一个Job效果 |
| T07 / L2–L4 | recovery-fault-cases 20项 | 各事务/发送/通知切点恢复；**同libraryGeneration重开**也拒旧token；热sidecar先阻塞到P02恢复 |
| T08 / L2–L3 | outbox-cases 14项 | Evidence/Job/事件全或无；重复消费无重复效果；checkpoint不跳过失败；Overlay变更同源投影 |
| T13 / L3 | remote-unknown-cases 12项 | 已发送未知不自动重发；取消不清计费未知；恢复核对重新授权；一个physical只计一次 |

附加必须覆盖：paused unknown恢复仍等待；reconcile-result ticket不能推理；reuse-valid不伪造Attempt；质量held不替换current；不同能力generation不能用作同一投影排序；无效/未知事件版本不跳过。上述策略需要真实实现后驱动Host接口验证，字符串断言不构成行为验收。

## 现有入口（已核对package/文件，未运行）

- `npm run test-active-library-host`：当前Host生命周期、drain/lease、schema与生成库边界；其中generation变化由测试显式改表，不是普通重开语义。
- `npm run test-exclusive-library-lock`：真实锁Tracer的临时合成环境；不能替代新任务claim逻辑。
- `npm run test-persistent-download`：领域Journal/恢复设计参考，不能证明AI任务恢复。
- `npm run test-visual-ai-download-integration`：当前视觉Host与下载合成集成；非P05新框架。
- `node scripts/run-electron-node-test.mjs scripts/asset-ocr-storage.test.ts`：当前OCR存储/会话/取消回归。

所有涉及better-sqlite3的计划使用仓库Electron Node启动器，不为shell ABI重编依赖。新Journal聚焦测试文件尚未创建；未来可分别验证纯状态机(L1)、临时DB事务(L2)、合成Provider未知结果(L3)、正式Main/Preload关闭与重开(L4)。命令最终以新增脚本和package实际内容为准，不杜撰已存在入口。

崩溃夹具未来只使用临时生成素材/库，明确进程ID和故障点。kill测试进程只能终止测试拥有的进程，不能终止用户模型服务。强制崩溃可能留下热日志，预期先验证数据库恢复边界，再进入Job扫描；不能为了通过删除sidecar。

## 实际检查记录

`python3 /tmp/validate-dam-p05-documents.py`使用标准库检查：JSON语法、状态名/转换引用、terminal无恢复边、committing非持久、场景唯一ID/NOT_RUN、前置状态/追踪/链接、P02登记摘要、源码和Git保护。它不模拟或运行状态机、不验schema实例、不触发任何业务模块。

检查结果在evidence/STATIC-CHECKS.json；源码和原工作区保护在WORKTREE-PRESERVATION.json。历史测试只作导航，未作为本次PASS。真实模型/Windows/打包、规模/断电、真实云账单/API和真实资料库均未覆盖。
