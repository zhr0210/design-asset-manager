# R00–R08 有限代码交付报告

阶段/Run ID：rux-auth-20261001-6a9cf104
当前授权与日期：用户批准本包R00–R08连续实施；2026-10-01。
HEAD与WIP基线：3fa00df3bbb605478da6d0af18724d64021e723c / codex/product-reassessment-20260905。R00记录2270开发文件；原index/staged字节不变，未提交/推送。
本次source/build标识：dam-3c75658c506c8e70，BUILD-IDENTITY当前源码重算匹配；SOURCE-MANIFEST绑定668输入，仅增量正文，不是全仓库审计。

## 实际完成

代码归属已集中到AI Workspace：可见全局“AI与模型”目的地、唯一连接编辑器、任务模型/本地模型与OCR/后台/高级诊断分页。Settings只提供相应摘要链接；原2583行控制台成为薄兼容出口，没有新堆叠面板。旧路由转同一归属；App账号流程与Library源操作权限分开；同scope暂存筛选/视图/滚动，人工草稿仍由现有状态与Host保持。

Main持有登录操作，离页仅退订观察。回调、交换、签名身份、保险库提交与终态有白名单阶段；合法拒绝即结案、错误state不能终止别人的尝试。浏览器回调不显示持久成功。仅身份授权与模型调用权限区分，无access或缺scope不能绕过Main/Vault；更新失败保留旧账号；UNKNOWN与退出清理仍有屏障。Pi/Node未升级，没有新增Provider或解除其他准入限制。

5个无正式消费者模块删除、2个仅测试适配器迁移；旧数据、权限拒绝、Eagle/旧库只读、当前OCR和12批准原型保留。帮助页加入只读build身份；锚点读取时再计算STALE；AGENTS/DESIGN明确CU证据不能用内部捷径替代。

以上是源码和有限集成行为的完成，**不是正常用户屏幕交互已验收或真实订阅可用声明**。

## 文件与清理

DELTA：77项，53修改、17新增、7旧路径移出（5源码删除+2保留行为的测试支持迁移）。before 65份，其中64份有R00原hash匹配，module-map单独捕获before，不冒称R00覆盖。源码清单668项；原WIP范围外已纳baseline文件无变化。未纳基线的HTML/sh/media等不作本批新增结论。

每个删除有before、零执行引用、替代归属、无数据所有权与回退条件。测试迁移只变type-only import和sole测试导入，两个原脚本保留并通过。静态图325可达/2597边/25计算导入/0未解析字面导入，后两者不表示所有Runtime已知。资源与许可证未裁剪，模型/数据库/profile未删除。回退须先匹配after并逐块逆向合并，不覆盖后续或用户WIP。

## 证据

六类结论：implementation=CODE_IMPLEMENTED_SCOPED；contract=TARGETED_PASS_WITH_ONE_LEGACY_SOURCE_POLICY_RED；uiIntegration=PASS_TARGETED_CONTROLLED；computerUse=BLOCKED_INSTANCE_SELECTION；realAuthentication=AUTH_REAL_NOT_RUN；safeCleanup=5删除+2测试支持迁移有限通过。

最终选定34个检查命令记录，33退出0，1退出1；不把复跑相加或plain assertions当新增行为数。契约/集成158个具名测试或显式场景（含13个当前构建正式Canvas场景与2个Runtime资源契约），另锚点28、路由评估268个治理任务。详细计数方式和每条入口见TEST-REGISTRY，不称268是产品用户任务。

| 案例 | 类型 | 结果 | 用例/场景数 | 日志 |
|---|---|---|---:|---|
| r02-navigation-canonical | contract | PASS | 1 | logs/r02-navigation-canonical.log |
| r02-context | contract | PASS | 1 | logs/r02-context.log |
| r08-auth-crypto-final | contract | PASS | 10 | logs/r08-auth-crypto-final.log |
| r03-denial | contract | PASS | 2 | logs/r03-denial.log |
| r08-qualification | contract | PASS | 8 | logs/r08-qualification.log |
| r03-credentials-scoped | contract | PASS | 14 | logs/r03-credentials-scoped.log |
| r03-prompts-storage | contract | PASS | 5 | logs/r03-prompts-storage.log |
| r03-oauth-old | contract | PASS | 9 | logs/r03-oauth-old.log |
| r07-admission | contract | PASS | 8 | logs/r07-admission.log |
| r07-owned-stages-final | contract | PASS | 1 | logs/r07-owned-stages-final.log |
| r07-native-sdk | contract | PASS | 17 | logs/r07-native-sdk.log |
| r07-sdk-auth-current | integration | PASS | 3 | logs/r07-sdk-auth-current.log |
| r07-ui-final | integration | PASS | 5 | logs/r07-ui-final.log |
| r04-formal-startup | integration | PASS | 3 | logs/r04-formal-startup.log |
| r04-formal-acceptance | integration | PASS | 1 | logs/r04-formal-acceptance.log |
| r08-formal-reselect | integration | PASS | 1 | logs/r08-formal-reselect.log |
| r07-ocr-lifecycle | integration | PASS | 12 | logs/r07-ocr-lifecycle.log |
| r07-background | integration | PASS | 35 | logs/r07-background.log |
| r07-visual-host | integration | PASS | 7 | logs/r07-visual-host.log |
| r07-runtime-packaging | integration | PASS | 2 | logs/r07-runtime-packaging.log |
| r08-canvas-formal | integration | PASS | 13 | logs/r08-canvas-formal.log |
| r08-canvas-state | integration | PASS | plain assertions | logs/r08-canvas-state.log |
| r04-retired-console | sourceContracts | PASS | plain assertions | logs/r04-retired-console.log |
| r04-tag-guard | sourceContracts | PASS | plain assertions | logs/r04-tag-guard.log |
| r08-doctor-current | sourceContracts | PASS | plain assertions | logs/r08-doctor-current.log |
| r08-readiness-current | sourceContracts | PASS | plain assertions | logs/r08-readiness-current.log |
| r08-test-support-ai | sourceContracts | PASS | plain assertions | logs/r08-test-support-ai.log |
| r08-test-support-model | sourceContracts | PASS | plain assertions | logs/r08-test-support-model.log |
| r08-runtime-current | sourceContracts | FAIL_RETAINED | plain assertions | logs/r08-runtime-current.log |
| r08-anchor-runtime-source | governance | PASS | 28 | logs/r08-anchor-runtime-source.log |
| r06-deferred-context | governance | PASS | plain assertions | logs/r06-deferred-context.log |
| r08-context-check | governance | PASS | plain assertions | logs/r08-context-check.log |
| r08-typecheck-final | build | PASS | plain assertions | logs/r08-typecheck-final.log |
| r08-build-final | build | PASS | plain assertions | logs/r08-build-final.log |

正式Electron集成使用生成图片、受控临时Host、合成保险库或实际SDK+假网络。其selector/IPC/Store辅助属于integration；**没有替代Computer Use**。日志保持各自产生时间与原始失败，最终构建只是最终候选身份；未把旧日志改名成CU或全体新构建测试。

CU U01–U32没有接受的屏幕轨迹。原生工具可列app，但同bundle Electron实例只能可靠绑定个人软件，受控身份未确认；两个独立wrapper失败记录不算通过。已向用户请求退出之前个人软件，尚未确认。由本次创建的旧受控PID4659已按精确持有标识停止，个人PID90914不操作。账号原生合成故障还需受控假网络profile，现有普通互动launcher不得拿真实厂商请求冒称合成。

A01–A03未运行，真实厂商认证请求0、付费推理0、素材外发0。用户在本机厂商浏览器辅助登录是后续门槛，先完成合成屏幕验证、明确单profile保存范围；不在聊天请求token/code/回调。真实用户登录故障rootCause仍UNKNOWN。

## 失败与限制

认证、凭据、表单重选与旧挂载断言的红灯及后续修复日志均保留。旧Runtime全src平台比较断言仍期望空列表，实际有13个Main文件；R00 hash/保存before确认相应平台条件已在基线，未删除或放宽断言。该脚本FAIL，不能写“所有回归通过”；见RUNTIME-REGRESSION-LIMIT。单独评估平台Adapter策略属于后续问题，本批未大改Main来隐去红灯。

独立复核是只读源码审查，未独立重跑测试、CU或真实账号；末次图增补有匹配hash工件，随后任务额度错误明确保留。Windows、真实Keychain、安装/签名、真实模型质量、用户旧库迁移都未运行。约1.58→1.27MB仅Renderer脚本构建大小变化，非内存/安装包结论。

## 下一动作与停止

本批以有限增量交接STOP，产品验收仍受阻，nextBatchAuthorized=false、automaticResume=false。优先恢复受控Computer Use：用户保存草稿并退出之前个人测试软件→核对工作区/源摘要→普通启动独立profile→通过屏幕进入帮助核build→执行U01–U32，账号场景只用受控假网络。之后才由用户厂商浏览器辅助A01–A03，仅认证不推理。个人软件与真实数据不因存在而获准操作。

START-HERE指向manifest/delta/证据/复核。Remote先核对before，不盲套整个代码包。不要自动进入DP02、新Provider、模型下载或发布。

交接发布初次拒绝 SOURCE_BOUNDARY_INVALID：工具把正式 src/main/runtime 类型源码误当Runtime数据目录。只允许该精确代码前缀及源码扩展名，仍拒绝runtime依赖/SQLite/JSON缓存；28个锚点测试通过。属于主Agent补充工具修复，没有声称独立复核该补充。原始失败保留。
