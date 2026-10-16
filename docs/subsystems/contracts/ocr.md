# ocr：接口、状态与兼容细节

本页从模块原说明提炼技术契约，逐段身份见[映射](../../checkpoints/documentation-rebuild-20261015/module-migration.json)。当前入口/拥有者以[ocr](../ocr.md)和实际源码为准。

这些条款按其命名接口、schema/协议版本及平台条件适用；**旧“尚未接线/未运行/当时仅”等来源语句不是今日交付事实，也不要求恢复退休通道。** 旧数值的具体适用版本需核对当前实现；不能从摘要放宽数据/权限/取消保证。来源冲突按已确认的新契约精确替代范围处理。原始日期和验收全文保留在before.zip及历史模块快照，当前资格仅归CURRENT-STATE。

## 详细机制

<a id="p-002"></a>

Mac 使用独立 Python 3.12.11/RapidOCR 1.4.4，det/cls/rec 从 ModelScope RapidAI/RapidOCR 固定提交获取并完整核验。环境发现支持实际 Python 版本与 venv 符号链接，不采用系统解释器丢失依赖。

<a id="p-003"></a>

最大1600输入实测约875MB，原1GiB工作集预留在25%余量要求下不足。Mac改为1280MiB Worker预留，并把全部增量计入共享Governor；Windows原预留不变。输入、识字/空图挑战、25%余量、运行时指纹与实际close要求均保留。POSIX峰值采用真实getrusage，实际测量而非固定资格。当前内部Runtime已真实产生资格并识别指定公开page/coffee；活动profile资格与素材UI保存仍待Mac手动解锁后验收，不能转记内部结果为用户完成。

<a id="p-004"></a>

见 [迁移记录](../../history/handoff-snapshots/macos-20261009-20261010/MACOS-MIGRATION-20261009.md)。下面是历史。

<a id="p-005"></a>

---

<a id="p-007"></a>

“AI 与模型 → 本地模型与 OCR”正式选择可信本地 OCR 环境，Main 核对文件/依赖并进行真实识别挑战。重启自动复核；资格等待共享资源时状态读取保持可用，明确显示未就绪原因，不凭 manifest 或固定 verified 对象放行。控制器与 runtime 的 suspend/drain 等待自动复核及真实进程释放，未确认退出不恢复执行或归还许可。

<a id="p-008"></a>

手动 OCR、一键基础分析与持续后台复用本模块及同一 `visual-admission` RAM 账本；既有人工文字修订保持。A 的 Windows/RapidOCR/公开素材实际范围见 [本轮记录](../../handoff/AI-CORE-20261006.md)。下面保留早期模块说明及当时验收边界，其中“生产资格缺失”已由本段接线替代。

<a id="p-010"></a>

Registered production surface: `asset-ocr:*`, restricted to the trusted main workspace. Formal Electron acceptance uses generated materials and the actual isolated RapidOCR runtime.
`local-ocr-process.ts` sends one bounded controlled-preview payload through stdin to a
Main-selected Python interpreter and bundled runner. No shell, original-file path or
Renderer-selected executable is accepted. Timeout/cancel/malformed output fail explicitly;
valid empty observations are distinct from failures. stderr is drained without logging paths.

<a id="p-011"></a>

`shared/contracts/asset-ocr.contract.ts` defines bounded text, confidence and normalized
quadrilateral observations. `ai-service/tools/local_ocr_worker.py` uses only the pinned
RapidOCR package's local model files and records their hashes; it neither opens a listener
nor installs/downloads models. Python-level network blocking is defense in depth, not a
security sandbox for arbitrary packages.

<a id="p-012"></a>

Approved evaluation setup is separate: `scripts/prepare-approved-ocr-runtime.mjs` defaults
to review only. The explicit `--approved` mode requires prior user authorization of the
fixed manifest. It downloads verified wheels, creates an isolated environment and installs
offline. `scripts/prepare-ocr-fixtures.mjs` generates 11 original synthetic fixtures.
`test-dedicated-ocr-evaluation.ts` requires explicit opt-in, uses only those temporary fixtures,
and reports recognized text, normalized character error rate, empty-image false positives
and per-process wall time. It does not assert quality from a successful exit alone.

<a id="p-013"></a>

`ocr-controller.ts` freezes the scope, source revision, preview bytes, runtime fingerprint and
OCR revision in a five-minute single-use review receipt. One local batch runs at a time (up to eight assets).
Closing/switching libraries revokes plans and cancels execution. Runtime selection uses a native folder
picker on Desktop and the requester-owned page picker on Browser, stores only the chosen app-level
configuration, and does not execute until a batch is confirmed.
The selected directory must have the validated profile written by the isolated installer. This is a trusted
local environment selection, not a sandbox for arbitrary executables; automatic in-app installation is not delivered.

<a id="p-014"></a>

`ocr-storage.ts` uses the held library connection. First successful confirmed save adds schema v8;
reads/cancel/failure do not migrate. Dedicated empty results override visual-model OCR only, while tags,
captions and prompts remain independent. Corrections are revisioned and survive model reruns; old/stale
sessions, source changes, Trash and cancellation reject writes. Existing results and raw text remain retained.
If an edited result belongs to a different preview, re-analysis fails explicitly rather than discarding it.
`active-library-asset-queries.ts` batches the OCR projection with asset reads; no per-card inference or IPC fanout.

<a id="p-015"></a>

The Library inspector/focus detail uses DedicatedOcrPanel. OCR corrections survive closing the inspector,
route changes and save failures in memory; explicit library close/switch asks about unsaved drafts. Saved
results survive application restart. The raw observation's whitespace is preserved; the model can omit spaces.
No cloud OCR, real-user-library migration or Windows packaged-runtime execution was validated in this task.

<a id="p-016"></a>

After a successful configuration changes the Runtime fingerprint, Main publishes the payload-free
`asset-ocr:runtime-changed` notification through the shared Desktop/Browser Client. A new Main's
nonblocking automatic real recheck also publishes availability after successful verification and
actual process release, so an already open inspector becomes usable without navigation. Failed
checks do not produce a recheck event loop; lost notification does not revoke real qualification.
Equivalent selection,
cancel and failed selection do not publish. Both environment displays reread only status; lifecycle and
request checks reject obsolete replies without altering correction snapshots or drafts. This global
configuration notification is distinct from scoped `asset-ocr:changed` evidence updates. Job
polling schedules the next request only after the current poll settles, so slow status replies
cannot starve completion. A returned running job invalidates older status queries. Selection/operation
errors retain priority over later status-read feedback, including unknown-outcome guidance; successful
environment rereads clear only their own read errors. Synthetic
checks: `local-dam-ocr-runtime-status-view.test.mjs`, `local-dam-ocr-runtime-event.test.ts`,
`local-dam-ocr-environment-view.test.mjs` and `ocr-controller-lifecycle.test.ts`; these are not formal CU
or model-execution evidence.

<a id="p-017"></a>

Real opt-in regression: `DAM_TEST_OCR_ROOT=/absolute/trusted/ocr-root node scripts/run-electron-node-test.mjs scripts/ocr-auto-revalidation.test.ts`.
It runs the bundled stock worker's real recognition/empty/maximum-input challenges twice against
an isolated SQLite profile, verifies cold status remains nonblocking and notification follows release,
and never seeds qualification or writes an active application profile.

<a id="p-019"></a>

Storage/controller checks: `node scripts/run-electron-node-test.mjs scripts/asset-ocr-storage.test.ts`.
Formal real-model UI: set `DAM_E2E_OCR=1` and `DAM_SYNTHETIC_OCR_RUNTIME` to the approved isolated
runtime root, then run `scripts/library-canvas-electron.e2e.test.mjs` with generated fixtures only.

<a id="p-020"></a>

The frozen model hashes are checked before constructing RapidOCR and after the worker result returns.
Previously committed OCR survives Trash/restore for an unchanged preview; all new commits still require
matching lifecycle revisions, so late tasks cannot write through a Trash round trip.

<a id="p-022"></a>

`runLocalOcr` succeeds only after the owned child's `close` and validated output. A result on
stdout, a termination request, or a terminal UI job is not physical release evidence.
Cancel, timeout and transport failure request SIGTERM; after 250ms without observed exit,
only that held ChildProcess handle receives SIGKILL. Observed exit suppresses further
signals. The close/transport deadline is 2250ms. If close cannot be confirmed, local streams
are destroyed and `OCR_PROCESS_EXIT_UNCONFIRMED` rejects the request while an internal
resource token remains occupied until a late close. Quarantine is shared across runtime
handles; no new spawn is allowed while any unknown token remains. This is owned-child
accounting, not a process-tree sandbox or a device-wide resource governor.

<a id="p-023"></a>

The original inference deadline remains 60s (maximum 120s); each output stream is capped
at 1MiB cumulative transport bytes. Neither stderr nor raw protocol errors are logged.
`exit` and `close` are intentionally distinct: a process may exit while inherited streams
remain open. We conservatively retain the token until close and never signal an exited PID.

<a id="p-024"></a>

The controller keeps resource occupancy separate from public job state, fences prepare,
configure and run verification, and bounds `suspendAndDrain()` to 5s. Unknown resources,
ongoing preparation and execution block maintenance. Separate maintenance releases do not
unlock other holds. Main suspends OCR before awaiting other authority drains and waits for
OCR before closing Host/app storage. Authority completion cannot resume OCR during shutdown.
Failed drain requires retry after the actual resource/preparation settles; old receipts and
late results remain revoked. No schema, IPC shape or background execution consent changes.

<a id="p-027"></a>

The internal `runBackground` entry shares the manual controller's preparation, running,
maintenance and UNKNOWN gates. It never fabricates a manual review receipt. Both paths
reserve host-side material through Main's VisualAdmission before reading/decoding previews.
Manual review retains its bounded material reservation until consumed, invalidated or its
five-minute expiry; an UNKNOWN child retains the reservation until its actual close token
settles. This is local accounting, not a measured model peak or operating-system memory cap.
The background caller must additionally supply a qualified full execution envelope, and
recheck current resources/Runtime immediately before marking sent. Production qualification
is currently absent; only the explicit isolated synthetic E2E composition supplies test evidence.
See `../background-ocr/README.md` for independent session consent and durable effects.
