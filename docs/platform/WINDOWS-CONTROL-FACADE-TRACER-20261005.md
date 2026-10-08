# WC01 合成 H facade / catalog-reference 兼容 tracer

2026-10-05（Asia/Shanghai）。用户批准[兼容设计交接](../handoff/WINDOWS-CONTROL-COMPATIBILITY-20261005.md)的下一建议，本批限定一个caption-shaped意图、双logical root/固定registered ref、H同步projection/epoch、独立token/awaited撤权ACK、lostACK核对与内存草稿。**Validated Tracer / STOP**；产品/public契约/schema、正式Adapter/Broker、OS身份/权限/安装与真实库保持。

## 实际模块与范围

- `scripts/fixtures/control-store-facade-profile.tracer.mjs`：固定refs、bounded profile、canonical `{assetId,caption,expectedCaption?}`。复用既有 `control-store-protocol-wire.tracer.mjs` codec原字节；不是生产wire/public契约。
- `scripts/fixtures/control-store-facade.tracer.mjs`：test-only A、唯一SQLite writer、固定resolver、caption/计数/receipt同MAIN事务、limited inspection与grant/revoke、受控faults。
- `scripts/fixtures/control-store-facade-client.tracer.mjs`：test-only H facade、真实child stdio、同步本地投影/epoch/issued scopes、独立hold、内存draft/outcome、owned fixture与readonly/cleanup。
- `scripts/control-store-facade.tracer.test.mjs`：17项实际跨进程验收；H business facade、A raw拒绝及readonly结果核对。private raw/fault只用于测试，不导出为产品入口。

正式产品仍在 Main 持有 Active Library SQLite。本模块不被 `src/main` 组合，不读用户profile/库/素材/账号/凭据/Runtime DB，不运行模型或Provider。与真实caption较贴近的optional baseline/COALESCE语义只在fixture中实现，**没有导入或验收正式caption handler**，也没有改变现`expectedCaption`契约、用户edited旗标、schema或86方法清单。

## 固定ref、双root与事务

每个fixture仅新建当前Temp下owned父目录，含nonce owner marker、`control/store.sqlite` 与 `material/binding.json`。二者是同父目录内的两个logical root，不是独立principal或受保护catalog；没有Original/preview/staging publication、hardlink或跨卷实验。material JSON只是固定合成binding；bytes/对象在清理前重验，不参与产品portable manifest。

A私有resolver只解析本fixture的固定registered reference；wire不接受任何metadata/material绝对路径、SQL、auto-register或caller coordination bypass。attach逐字段比较catalog/material/profile/client，业务hop再核对instance/session/permission epoch/library identity/generation。固定ref不是bearer capability；invalid ref/profile/client/未知字段不能跳到另一个库。实际loader、ACL/owner/ancestor、外部既有handles及H intent均未资格，P1+C★+T2仍只是候选。

fixture SQLite格式2：identity/bootstrap/binding，单caption(nullable)/revision/effects，最多16个完整receipt。caption提供expectedCaption时比较`COALESCE(caption,'')`，省略时保持无baseline的有限写语义；canonical digest区分省略与显式空字符串。计数revision仅合成效果观测，不替换caption baseline CAS。A同步事务更新caption/计数并插入原operation/payload/instance/session/epoch/store/profile/client/library/asset绑定receipt，COMMIT后才发ACK。RPC不进入SQLite同步transaction callback。

same-instance同ID/同payload可读历史receipt、不追加effect；different payload拒绝且不声称旧operation无effect。新ID在grant/revoke/CAS/容量门内；fresh instance永远拒绝旧ID执行，**允许在新有限inspection session查旧ID**。receipt缺失返回unknown；当前同文本/计数、readonly回读无effect不升级为协议rollback证明。容量拒绝不purge旧receipt。

## H projection、fence、草稿与结果

`inspect`/matches/issued-scope检查/localhold同步返回。断连或无效回复先退休H epoch、关闭本库业务门、失效模拟receipt/picker/native/media引用；保留identity/generation和draft scope/input/base/writer/sequence。模拟引用只证明H facade的有限行为，不证明现Main各caller已迁移或其真实UI权限。

hello/attach/fresh-readiness只获得inspection，显式合成authorize才授予业务grant。H reconnect不清unknown/fence/hold，也不自动重发。cycle token分别计数、release幂等；shutdown保持不可恢复的本地barrier，即使release token也不开业务门。revoke在await之前本地关闭权限、推进epoch；仅匹配applied ACK证明A fence。A序列化commit/revoke：commit先于fence保留历史效果，fence先于新commit拒绝。lost revoke ACK下，finally/token release、resource许可恢复和fresh attach均不恢复grant。

H记录bounded原请求/payload digest/原A scope/H epoch/draft sequence。已发送却无完整ACK或receipt mismatch → unknown、保稿/禁止盲重发；fresh inspection精确匹配原receipt后才保留committed证据。旧H epoch结果作为历史，不贴当前scope、不清新epoch草稿、不授权执行。当前epoch已提交版本可更新baseline，保存期间后来键入仍dirty；refresh callback失败仍返回committed+refresh-unavailable，不改“未保存”、不重写。H内存连续性不证明跨H重启的profile持久恢复。

资源UNKNOWN使用明确的**合成投影flag**，没有真实模型/Helper资源观测。committed receipt不解除该flag；其恢复不复活revoked grant。fixture child退出/数据库关闭另有真实工程观察，不能把flag测试当whole-lifetime ledger/Job/hardRSS资格。

## 实际有限矩阵

最终选定run和source/command/log/results SHA见本机`.scratch/windows-control-facade-20261005/tracer-verification.json`及终态anchor。run-01、run-02、run-03均17PASS；后两次因退出分类/inspection fail-closed和marker/object/bounded cleanup修订而复测，保留各自原源码摘要与日志，不移用早期PASS。

| ID | 实际覆盖 | 最终结果 |
| --- | --- | --- |
| FC01 | 固定ref/显式grant、caption/effect/同MAIN匹配receipt、readonly完整性。 | PASS |
| FC02 | catalog/profile/client/generation/session/rawpath/未知字段/伪material/register拒绝，zero effect。 | PASS |
| FC03 | A退出后同步epoch/issued scopes失效，identity/generation/draft保留，fresh attach不grant。 | PASS |
| FC04 | live stdio延迟已COMMIT ACK跨本地epoch只为历史，不清新输入。 | PASS |
| FC05 | cycle/shutdown token独立、重复release幂等、shutdown不重开门。 | PASS |
| FC06 | revoke即时H关门、pending与applied ACK分开；A raw新写与regrant拒绝。 | PASS |
| FC07 | commit先于A fence保留one effect，late ACK不恢复H授权。 | PASS |
| FC08 | applied revoke丢ACK，release/resource恢复/fresh attach仍未知且不grant；旧ID拒绝。 | PASS |
| FC09 | before-COMMIT工程死亡，readonly无effect/receipt；fresh查询仍unknown、不重写、不丢稿。 | PASS |
| FC10 | after-COMMIT丢ACK，fresh原scope receipt核对one effect，历史结果不重grant/清稿。 | PASS |
| FC11 | live ACK错digest导致unknown/工程收敛，fresh真实存储receipt匹配后保留历史证据。 | PASS |
| FC12 | optional baseline/NULL COALESCE、stale CAS无effect、sameID replay及省略baseline digest差异。 | PASS |
| FC13 | 保存期间后来键入保留sequence/input/dirty，只推进已提交baseline。 | PASS |
| FC14 | knowncommit后合成refresh失败仍saved分类，refresh期间新键入保留。 | PASS |
| FC15 | live A malformed stdio回复触发H gate关闭，fresh receipt恢复历史证据。 | PASS |
| FC16 | committed与合成resource UNKNOWN正交，resource恢复不复活撤权。 | PASS |
| FC17 | H/A有限16receipt容量拒绝、草稿保留、历史replay不purge/追加。 | PASS |

这是[兼容设计](WINDOWS-CONTROL-COMPATIBILITY-DESIGN-20261005.md)CA01–04/06–08/11/13等的有限合成子集；原20项**完整产品/OS验收仍NOT_RUN**。没有覆盖真实work/download drain、OCR/tag claim/sent/outbox、Native dirty-window、Browser/Desktop错误桥接、全transport backpressure、H重启持久恢复、catalog/manifest注册saga或真实目录攻击矩阵。FC15为live H malformed-channel，不再仅是codec；其他未实现故障分支不能因这一例视作全覆盖。

## 资源、退出与清理

实际H/A：Windowsx64 10.0.26200 / Electron30.5.1 / Node20.16.0 / ABI123 / NAPI9 / libuv1.46.0；SQLite3.53.1，native SHA保持。outer Node25.7.0仅证据launcher。A参数heap64MiB，文本256 UTF8 bytes、frame8192 bytes、8 pending、16receipt、page4096/max256、5000ms有限deadline；startupRSS另列，仅23次起点观察，不是生命周期峰值、Job或总RSS硬限。

最终run：17个新fixture、23次A，全部child close/stdio退出已知、readonly reader0、uncertain=false；17个正常fixture数据库close ACK/exit0，6个精确owned工程停止（disconnect/cut/无效receipt/malformed回复）。工程停止不称ordinary appquit或断电；Windows native句柄/section/Job/物理资源全关闭资格未完成。

仅当前owned已知对象：root/control/material identity+realpath、owner/binding固定bytes/单链接/bounded handle read、store观察identity、leaf regular/no-symlink/单链接、所有A退出/readers0，之后非递归逐文件unlink/已知empty目录rmdir。正常17fixture全部移除；unknown/replaced/陌生对象会retain。该批未执行恶意namespace替换、符号链接/多链接或cleanup failure branch实验，不能将happy cleanup当OS PREVENT证明。

## before / after与终点

before为设计；after是一个真实stdio/SQLite合成H facade证明：即时epoch/gate、精确结果分类、有限refs、可选caption CAS、lostACK保稿与fresh有限核对。**正式产品行为未改变**，强Windows backup拒绝与资源/Runtime权限门保持。4新脚本syntax、范围/rawtree/当前源码与666inputs/14actualoutputs、独立两轴复核及终态证据见[交接](../handoff/WINDOWS-CONTROL-FACADE-TRACER-20261005.md)。

实际产品build仍dam-4c583238a11c002d；产品Runtime最后观察2026-10-04，当前running app未观测；本批新Runtime只归合成H/A。产品tests/typecheck/build/Pi/模型/Provider/Computer Use NOT_RUN，Esc BLOCKED_UX_ACCEPTANCE、EBUSY UNKNOWN、Router BUDGET_UNSATISFIABLE、TASK历史23missinglinks FAIL保留。productionQualified/restoreAllowed/namespaceMetadataQualified/formalAdapterWired=false，nextBatchAuthorized=false；**VALIDATED_TRACER / STOP**。
