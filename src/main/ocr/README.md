# 当前 A 接线（2026-10-06）

“AI 与模型 → 本地模型与 OCR”正式选择可信本地 OCR 环境，Main 核对文件/依赖并进行真实识别挑战。重启自动复核；资格等待共享资源时状态读取保持可用，明确显示未就绪原因，不凭 manifest 或固定 verified 对象放行。控制器与 runtime 的 suspend/drain 等待自动复核及真实进程释放，未确认退出不恢复执行或归还许可。

手动 OCR、一键基础分析与持续后台复用本模块及同一 `visual-admission` RAM 账本；既有人工文字修订保持。A 的 Windows/RapidOCR/公开素材实际范围见 [本轮记录](../../../docs/handoff/AI-CORE-20261006.md)。下面保留早期模块说明及当时验收边界，其中“生产资格缺失”已由本段接线替代。

# Dedicated OCR process adapter — retained earlier checkpoint

Registered production surface: `asset-ocr:*`, restricted to the trusted main workspace. Formal Electron acceptance uses generated materials and the actual isolated RapidOCR runtime.
`local-ocr-process.ts` sends one bounded controlled-preview payload through stdin to a
Main-selected Python interpreter and bundled runner. No shell, original-file path or
Renderer-selected executable is accepted. Timeout/cancel/malformed output fail explicitly;
valid empty observations are distinct from failures. stderr is drained without logging paths.

`shared/contracts/asset-ocr.contract.ts` defines bounded text, confidence and normalized
quadrilateral observations. `ai-service/tools/local_ocr_worker.py` uses only the pinned
RapidOCR package's local model files and records their hashes; it neither opens a listener
nor installs/downloads models. Python-level network blocking is defense in depth, not a
security sandbox for arbitrary packages.

Approved evaluation setup is separate: `scripts/prepare-approved-ocr-runtime.mjs` defaults
to review only. The explicit `--approved` mode requires prior user authorization of the
fixed manifest. It downloads verified wheels, creates an isolated environment and installs
offline. `scripts/prepare-ocr-fixtures.mjs` generates 11 original synthetic fixtures.
`test-dedicated-ocr-evaluation.ts` requires explicit opt-in, uses only those temporary fixtures,
and reports recognized text, normalized character error rate, empty-image false positives
and per-process wall time. It does not assert quality from a successful exit alone.

`ocr-controller.ts` freezes the scope, source revision, preview bytes, runtime fingerprint and
OCR revision in a five-minute single-use review receipt. One local batch runs at a time (up to eight assets).
Closing/switching libraries revokes plans and cancels execution. Runtime selection uses a native folder
picker on Desktop and the requester-owned page picker on Browser, stores only the chosen app-level
configuration, and does not execute until a batch is confirmed.
The selected directory must have the validated profile written by the isolated installer. This is a trusted
local environment selection, not a sandbox for arbitrary executables; automatic in-app installation is not delivered.

`ocr-storage.ts` uses the held library connection. First successful confirmed save adds schema v8;
reads/cancel/failure do not migrate. Dedicated empty results override visual-model OCR only, while tags,
captions and prompts remain independent. Corrections are revisioned and survive model reruns; old/stale
sessions, source changes, Trash and cancellation reject writes. Existing results and raw text remain retained.
If an edited result belongs to a different preview, re-analysis fails explicitly rather than discarding it.
`active-library-asset-queries.ts` batches the OCR projection with asset reads; no per-card inference or IPC fanout.

The Library inspector/focus detail uses DedicatedOcrPanel. OCR corrections survive closing the inspector,
route changes and save failures in memory; explicit library close/switch asks about unsaved drafts. Saved
results survive application restart. The raw observation's whitespace is preserved; the model can omit spaces.
No cloud OCR, real-user-library migration or Windows packaged-runtime execution was validated in this task.

After a successful configuration changes the Runtime fingerprint, Main publishes the payload-free
`asset-ocr:runtime-changed` notification through the shared Desktop/Browser Client. Equivalent selection,
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

Checks: `node scripts/run-ts-test.mjs scripts/asset-ocr.test.ts` and
`ai-service/tests/test_local_ocr_result.py`; these use no real model or private inputs.

Storage/controller checks: `node scripts/run-electron-node-test.mjs scripts/asset-ocr-storage.test.ts`.
Formal real-model UI: set `DAM_E2E_OCR=1` and `DAM_SYNTHETIC_OCR_RUNTIME` to the approved isolated
runtime root, then run `scripts/library-canvas-electron.e2e.test.mjs` with generated fixtures only.

The frozen model hashes are checked before constructing RapidOCR and after the worker result returns.
Previously committed OCR survives Trash/restore for an unchanged preview; all new commits still require
matching lifecycle revisions, so late tasks cannot write through a Trash round trip.


## Owned subprocess exit and close drain (2026-09-29)

`runLocalOcr` succeeds only after the owned child's `close` and validated output. A result on
stdout, a termination request, or a terminal UI job is not physical release evidence.
Cancel, timeout and transport failure request SIGTERM; after 250ms without observed exit,
only that held ChildProcess handle receives SIGKILL. Observed exit suppresses further
signals. The close/transport deadline is 2250ms. If close cannot be confirmed, local streams
are destroyed and `OCR_PROCESS_EXIT_UNCONFIRMED` rejects the request while an internal
resource token remains occupied until a late close. Quarantine is shared across runtime
handles; no new spawn is allowed while any unknown token remains. This is owned-child
accounting, not a process-tree sandbox or a device-wide resource governor.

The original inference deadline remains 60s (maximum 120s); each output stream is capped
at 1MiB cumulative transport bytes. Neither stderr nor raw protocol errors are logged.
`exit` and `close` are intentionally distinct: a process may exit while inherited streams
remain open. We conservatively retain the token until close and never signal an exited PID.

The controller keeps resource occupancy separate from public job state, fences prepare,
configure and run verification, and bounds `suspendAndDrain()` to 5s. Unknown resources,
ongoing preparation and execution block maintenance. Separate maintenance releases do not
unlock other holds. Main suspends OCR before awaiting other authority drains and waits for
OCR before closing Host/app storage. Authority completion cannot resume OCR during shutdown.
Failed drain requires retry after the actual resource/preparation settles; old receipts and
late results remain revoked. No schema, IPC shape or background execution consent changes.

Validation: `scripts/ocr-process-lifecycle.test.ts` uses stdlib Python children plus explicit
fault-injected process events; `scripts/ocr-controller-lifecycle.test.ts` uses synthetic
adapters and executes the actual Main authority-completion callback. The formal
`scripts/ocr-exit-electron.e2e.test.mjs` uses generated images and a stdlib transport fixture
through the production Runtime/Controller/IPC/Host, including saved correction preservation,
close/reopen and application quit. This fixture does not validate RapidOCR or OCR quality.
Windows signal behavior, real model execution and user libraries remain NOT_RUN this batch.

## Shared manual/background admission (2026-09-29)

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
