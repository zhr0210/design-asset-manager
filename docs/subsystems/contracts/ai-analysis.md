# ai-analysis：接口、状态与兼容细节

本页从模块原说明提炼技术契约，逐段身份见[映射](../../checkpoints/documentation-rebuild-20261015/module-migration.json)。当前入口/拥有者以[ai-analysis](../ai-analysis.md)和实际源码为准。

这些条款按其命名接口、schema/协议版本及平台条件适用；**旧“尚未接线/未运行/当时仅”等来源语句不是今日交付事实，也不要求恢复退休通道。** 旧数值的具体适用版本需核对当前实现；不能从摘要放宽数据/权限/取消保证。来源冲突按已确认的新契约精确替代范围处理。原始日期和验收全文保留在before.zip及历史模块快照，当前资格仅归CURRENT-STATE。

## 详细机制

<a id="p-002"></a>

普通入口是素材详情“AI 分析与提示词反推”的三个单项按钮/一键基础分析，以及“AI 与模型 → 后台分析与资源”。Main 将 `basic-analysis-controller`、独立标签 Controller、OCR Controller 与生产 `background-analysis-controller` 接到唯一 Active Library Host；手动与后台共用 executor、资源账本和事务。浏览器仅发送命名动作，不选择任意执行文件或访问 SQL。

<a id="p-003"></a>

`basic-analysis.schema.ts` 的 v14 保存不可变请求、尝试、每能力证据/current、通知 outbox、持续规则、每日云调用预留与后台历史。升级通过 Host 私有维护/可读备份事务完成，现有小库资格与增长限制仍适用。基础描述保留模型、位置、配方、思考强度、服务实际返回的用量及物理调用次数；截断最多额外调用一次，摘要包括两次已报告用量。未报告用量与订阅费用保持未知。

<a id="p-004"></a>

基础分析不生成反推。人工描述、确认/拒绝标签与 OCR 修订优先；迟到结果只留历史。描述用量存入现有证据 JSON，旧正文证据仍可读，不因新增可选元数据再次升级 schema。

<a id="p-005"></a>

持续执行有独立确认：旧“收集计划”开关不授权推理或外发；只处理启用后的新素材，不自动回填。每能力按当前绑定与资格投影可执行/需配置/等待。单一循环轮转三个能力、持久 claim，发送/提交前复核会话、策略、配置和版本，成功证据与完成回执在同一事务中保存。外部调用按最多两次预留每日额度，本地 OCR 独立运行。

<a id="p-006"></a>

离开面板不取消后台；暂停/关库/退出先撤销准入并收敛自有工作。跨会话未发送项可重新准入，已发送但未确认结果的项保持 unknown，不自动重发。可见入口提供回执核对、保留、放弃等待与明确新执行；旧尝试保留。放弃不能证明此前未执行或零费用。成功回读与通知重放不重新推理。

<a id="p-007"></a>

`visual-admission.ts` 是共享 RAM 许可账本，负责材料、计算、模型驻留、OCR、Pi 和备份准入。前台优先，最多三个前台工作单元后给予可准入后台机会；压力立即收敛，恢复要求十秒余量。模型实际退出前不归还驻留，UNKNOWN 保守保留。

<a id="p-008"></a>

派发前按能力检查完整加载、准备与计算预算；领取后、登记新请求前再核对一次。资源不足只等待，不领取新 claim、不登记新请求或增加尝试；OCR 仍按自身预算独立准入。运行时投影使用真实的加载、验证、计算、退出及冷却状态，不使用固定 verified 对象。

<a id="p-009"></a>

模块/故障测试：`basic-analysis.integration.test.ts`（真实 Host/SQLite，模拟推理）、`basic-analysis-controller.test.ts`、`background-analysis.integration.test.ts`、`ai-resource-policy.test.ts`。正式 Windows 公开素材、本地 Qwen/RapidOCR、已有云连接、资源与中断结果见 [本轮记录](../../handoff/AI-CORE-20261006.md)；构建和模拟通过不替代该记录的用户结果。

<a id="p-013"></a>

Wiring at the B01 checkpoint: AI Console policy review and shared Main/card per-asset panel → trusted narrow IPC → owner/session/revision-fenced Main controller → held Active Library connection. At that checkpoint this module persisted **plans**, not execution jobs or model results; production returned `dispatchAvailable: false` and used a null automatic-runtime envelope. The 2026-10-06 production executor described above supersedes that limitation. The following paragraphs preserve the original foundation and validation scope.

<a id="p-014"></a>

The user-confirmed baseline capability choices are tags, short description and OCR. Embedding requires its own explicit opt-in; prompt reverse remains manual. Older four-default-capability target wording is not treated as a directive to enable embedding in this implementation.

<a id="p-015"></a>

New libraries stay profile1. Explicit first policy confirmation discloses backup and v12 incompatibility with older apps; migration uses the qualified local APFS/SQLite/native protocol and4MiB growth cap. Original profiles below10 receive existing combined tag-current seeding exactly once; already10/11 currents remain untouched. Historical DDL, seed, v12 schema/default policy(capabilities true, master false) and the chosen policy commit atomically. No historical asset backfill occurs.

<a id="p-016"></a>

A fixed SQL trigger at the last Promotion lifecycle registration writes at most three model-agnostic intent rows inside the same transaction. Keys use Capture source_generation and candidate preview_generation_identity, never a path or the lifecycle revision that changes on Trash/restore. Replay, opening, policy changes and restoration do not create new intents. The current Managed Copy path has no content-replacement event; changed source tuples project as superseded (cancelled decisions stay terminal) rather than inventing a new operation. Future content change integration is outside B01. Durable rows scale with registered assets; live UI queries return only3 capability aggregates/state groups or at most3 rows for one asset, never materialized images or an unbounded in-memory job queue.

<a id="p-017"></a>

Host configuration uses the [Host-private schema maintenance Module](../../../src/main/library-lifecycle/README.md#host-private-schema-maintenance)
for lifecycle drain, held-lease backup and transactional writes. Existing seeding,
policy revision checks, no-backfill behavior and error semantics remain unchanged.
Its isolated tests include actual SQLite rollback/commit faults and generated
Host profiles; they do not qualify production upgrades on Windows.

<a id="p-018"></a>

Policy/capability off is a projection and preserves user pause/cancel. Resume applies only to a user-paused row; cancelled is terminal. Individual decisions and policy changes require current session/revision. Card IPC is restricted to its trusted current asset; aggregate and policy modification are Main-only. Async returns recheck owner epoch/session, and GUI request epochs prevent stale polling/authority changes from reviving old state.

<a id="p-019"></a>

Resource readiness reads coarse host memory, power, thermal, idle and window visibility. Unsupported/unknown/stale signals remain unknown. Missing low-power and GPU evidence is not synthesized. The pure policy tests use asserted qualified envelopes; a positive fixture result is only a decision-function result, not inference or runtime qualification. Its conservative RAM reserve is max512MiB/10%total; it is not a measured model peak or a process RSS guarantee.

<a id="p-020"></a>

The first upgrade holds the shared visual barrier and stops/drains existing tags/combined/batch work. OCR's synchronous idle maintenance lock also fences configure-await, prepare and run, invalidates old reviews and refuses active work. It is **not** proof that an earlier cancelled Python process physically exited. OCR actual-exit drain, independent caption commits, runtime ownership/calibration and complete cross-capability resource scheduling remain prerequisites for a later execution round.

<a id="p-022"></a>

The v12 enabled flag authorizes collection of plans only. It is not an automatic-inference or external-upload grant; a later execution integration must introduce its own clearly reviewed authorization and qualification rather than silently reinterpret this preference.

<a id="p-024"></a>

B01 `enabled` authorizes collection of future plans only. At the early checkpoint,
`dispatchAvailable:false` was the general executor projection. The separately reviewed `../background-ocr/` module added session-specific
OCR consent, v13 execution effects and a qualified single-capability path. Production resource
qualification is absent, so the new control displays waiting rather than silently executing.
It neither backfills B01 intents nor reinterprets the existing plan switch as model permission.
