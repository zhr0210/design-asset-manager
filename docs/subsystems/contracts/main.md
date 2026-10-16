# 可信Main组合与命名业务：局部接口约束

这些条款来自src/main/README.md迁移前Rules段；全部原字句在[基线](../../checkpoints/documentation-rebuild-20261015/README.md)可追溯。现行入口从[local-host](../local-host.md)核对。条款限定具体拥有者/接口，不要求所有任务通读，也不冻结内部实现手段。

## 当前拥有者的局部保证

<a id="rule-001"></a>

- `index.ts` owns separate App storage and Active Library storage. Asset, Tag,
  Capture, preview and Trash operations route through the inspected and locked
  Active Library Host; disabled AI, migration and permanent-delete channels
  must not fall back to the App database.

<a id="rule-002"></a>

- Keep shared product workflow orchestration in main-process modules where possible; use platform adapters only for real OS/runtime differences.

<a id="rule-003"></a>

- Keep Copy Into Library behind `capture-intake`'s `prepare / dispatch /
  inspect` Interface. Renderer and producers cannot choose managed paths,
  create Candidate/Asset identity, copy originals, or write Promotion state.

<a id="rule-004"></a>

- Treat both in-memory/SQLite Capture persistence and injected Preview Adapters
  as tracer Implementations, not production evidence. Do not bypass Candidate
  Activation or System Preview Ready when adding SQLite, IPC, or UI Adapters.

<a id="rule-005"></a>

- Historical in-memory Model Library fixtures used an `installed` postcondition;
  it never proved real installation. The transactional tracer now reports
  `verified-stored` for generated fixtures, not Installed, Model Readiness,
  activation or production composition.

<a id="rule-006"></a>

- Treat signed Catalog admission as metadata eligibility only. Its sequence
  floor is process-local; it does not verify real artifact bytes, persist trust
  state or prove storage, compatibility, readiness or activation.

<a id="rule-011"></a>

- Keep AI Runtime IPC host platform, architecture, and home-dir reads inside the AI Runtime host-context helper; IPC handlers should consume that snapshot instead of reading Node globals directly.

<a id="rule-014"></a>

- Keep reusable runtime lane labels and runtime-kind matching in shared lane metadata; leave platform topology tables responsible for genuine lane membership and primary-lane differences, then resolve lane definitions through one shared resolver.

<a id="rule-017"></a>

- Keep Python Worker auto-start support and runtime app-data root selection in one bootstrap platform adapter so adding or removing OS support does not scatter bootstrap conditionals.

<a id="rule-018"></a>

- Keep runtime profile default, hardware-hint selection, and recommendation reason copy in ordered metadata/rule tables; hardware rules should use descriptor fields, not hand-coded Windows/macOS profile branches in resolver flow.

<a id="rule-019"></a>

- Keep Doctor command selection for npm and Python launchers in one platform-name resolver; individual checks should execute commands and shape results, not maintain separate Windows/macOS command tables or pass platform booleans.

<a id="rule-020"></a>

- Keep platform profile detection mappings in metadata rules; reserve direct platform checks in the detector for normalized OS capability booleans.

<a id="rule-024"></a>

- Keep OCR/Python managed venv executable paths and base interpreter discovery descriptor-driven; leave actual Windows search and macOS Homebrew probing inside platform adapters.

<a id="rule-025"></a>

- Keep explicit OCR evidence execution in main process, offline and timeout-bounded. Cache only path-free generated-image results for five minutes before projecting them into shared workflow status.

<a id="rule-029"></a>

- Keep Electron app lifecycle policy descriptor-driven; platform-specific AppUserModelId and quit-on-close behavior belong in startup policy metadata, not inline entry-point branches.

<a id="rule-030"></a>

- Keep packaged Python service sources read-only at runtime by disabling bytecode writes before any Python child process can inherit the main-process environment.

<a id="rule-032"></a>

- Keep release promotion behind `evaluateReleaseCandidate`; shared candidate stages own workflow truth while Windows and macOS trust checks remain platform gates.

## 保留模块/特定Seam的约束

以下名称对应保留接口、诊断/投影、隔离签名目录或旧运行lane。约束在修改该Seam时适用，**不代表其生产通道已注册、页面仍挂载，也不限制其他正式managed入口**。历史文件名以实际消费者为准。

<a id="rule-007"></a>

- Keep the production Model Library Workspace limited to `summarize` and
  `configureStorage`. Never expose a path, full Storage Identity, Registry
  fingerprint/session, publisher signature or model digest to Renderer. The
  workspace must not read `modelRootDir`, reuse Settings folder selection, or
  gain network/download/import/install/activation/Runtime authority.

<a id="rule-008"></a>

- Pin the Official Catalog Publisher public key independently from the bundled
  signed metadata. A bundle cannot nominate its own signer, and absence of
  either release input must fail closed.

<a id="rule-009"></a>

- Keep the public-only Official Model Catalog release input shared by runtime
  composition and signed-candidate admission. Release evidence may expose only
  catalog identity, sequence and aggregate counts; it must never sign, read
  signing secrets, use network access or authorize model payload transfer.

<a id="rule-010"></a>

- Keep Official Model Catalog preparation separate from the checked-in release
  input. It may validate explicit public JSON and exclusively create a
  candidate, but it must never overwrite the formal input, read signing
  secrets, sign metadata, contact a source or inspect model bytes.

<a id="rule-012"></a>

- Platform AI Branch Status projectors may read existing status/probe/settings state, but must not start runtimes, install dependencies, download models, or inspect user assets.

<a id="rule-013"></a>

- Keep shared Platform AI workflow titles and summaries separate from platform-specific runtime lane topology.

<a id="rule-015"></a>

- Keep branch-to-OS support checks in shared Platform AI runtime metadata so the projector consumes branch/platform semantics without local OS maps.

<a id="rule-016"></a>

- Keep Platform AI branch runtime provider registration descriptor-driven; concrete metadata keys and profile rules belong in descriptors, not duplicated provider blocks or resolver functions.

<a id="rule-021"></a>

- Keep Llama runtime accelerator defaults and package pattern selection in metadata rules with one matcher; reserve direct platform checks in Llama modules for artifact selection, paths, process names, and native installer adapters.

<a id="rule-022"></a>

- Keep read-only Llama governance adapter selection descriptor-driven; platform conditionals belong in concrete runtime adapters, not the governance plan flow.

<a id="rule-023"></a>

- Keep Llama runtime host platform, architecture, CPU, and memory reads inside the host-context helper; installer and planner flow should consume the context instead of reading Node globals directly.

<a id="rule-026"></a>

- Expose OCR evidence only through the user-triggered `aiRuntime:probeOcrRealEvidence` channel; the operation must not read user assets, install dependencies, or enable model downloads.

<a id="rule-027"></a>

- Keep Llama server executable, force-stop, chmod, and zip extraction process metadata descriptor-driven; do not scatter process branches through installer flow.

<a id="rule-028"></a>

- Keep Llama hardware detection dispatch descriptor-driven; leave actual OS probes in macOS, Windows, and generic hardware adapters.

<a id="rule-031"></a>

- Keep executable Runtime Package transactions inside `FileSystemRuntimePackageExecutor`; callers receive path-free progress while checksum, staging, extraction, promotion, registry commit, and rollback stay local to the module.

## 已被当前入口替代的来源规则

以下仅作来源，不要求恢复旧执行器/轮询或旧preload别名；当前Client、DESIGN和交互规格拥有相应现行契约。


